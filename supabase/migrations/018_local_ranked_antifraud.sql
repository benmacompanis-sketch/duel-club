-- DUEL CLUB · 018 · Partidas locales COMPETITIVAS con el ELO global + protección antifraude
--  · Dos cuentas reales en la misma compu pueden jugar CASUAL (sin ELO) o COMPETITIVA (mismo ELO global y mismo
--    ranking mundial que el online). La competitiva necesita una SESIÓN abierta con las dos cuentas (cada jugador
--    confirma con su propia sesión) ANTES de la primera partida; no se puede pasar de casual a competitiva a mitad.
--  · Un solo cálculo de ELO para todo: dc.elo_calc (lo usan el online y el local).
--  · Antifraude con varias señales independientes (nunca una sola, nunca la IP): volumen entre la misma pareja,
--    cuentas nuevas que pierden, flujo de ELO de un solo lado, derrotas sin sumar puntos, cuentas que solo juegan contra
--    una misma cuenta, varias cuentas nuevas "alimentando" a una. Según el puntaje el ELO se ACREDITA, se RETIENE
--    para revisión (los dos pueden seguir jugando casual) o queda LIMITADO por volumen (no es castigo).
--  · Las retenciones se liberan solas después de un tiempo si no hay más señales, o las decide un admin.
--  · Todos los parámetros están en la tabla fraud_config (se ajustan desde el backend, sin tocar el juego).
--  · Todo queda registrado (fraud_signals, elo_holds) para auditoría.
-- No borra nada. Requiere 009.

-- ------------------------------------------------------------------ tablas
create table if not exists public.fraud_config (
  key text primary key,
  value numeric not null,
  note text
);
insert into public.fraud_config(key, value, note) values
  ('pair_day_soft', 8, 'Partidas competitivas entre la misma pareja en 24 h a partir de las cuales suma una señal'),
  ('pair_day_cap', 16, 'Tope de partidas competitivas que dan ELO entre la misma pareja en 24 h (después: ELO 0, sin castigo)'),
  ('pair_week_cap', 60, 'Tope semanal de partidas competitivas con ELO entre la misma pareja'),
  ('new_days', 3, 'Una cuenta es "nueva" si tiene menos de estos días'),
  ('new_played', 15, '...o menos de estos minijuegos jugados'),
  ('flow_window', 30, 'Partidas competitivas recientes de la pareja que se analizan para el flujo de ELO'),
  ('flow_elo', 120, 'ELO neto transferido de una cuenta a la otra que se considera sospechoso'),
  ('flow_wr', 0.85, 'Porcentaje de victorias de un lado que se considera sospechoso (con al menos 6 partidas)'),
  ('zero_losses', 5, 'Derrotas sin sumar puntos en las últimas 8 partidas de la pareja'),
  ('exclusive_ratio', 0.8, 'Proporción de partidas competitivas del perdedor contra la misma cuenta'),
  ('exclusive_min', 10, 'Mínimo de partidas para evaluar la exclusividad'),
  ('feeder_new', 3, 'Cuentas nuevas distintas que le dieron ELO a la misma cuenta en 7 días'),
  ('hold_score', 3, 'Puntaje de riesgo desde el cual el ELO se retiene para revisión'),
  ('review_score', 6, 'Puntaje de riesgo alto: la retención no se libera sola, la decide un admin'),
  ('auto_release_hours', 72, 'Horas después de las cuales una retención de riesgo medio se libera sola si no hubo más señales')
on conflict (key) do nothing;

create table if not exists public.ranked_sessions (
  id uuid primary key default gen_random_uuid(),
  p1 uuid not null references public.accounts(id) on delete cascade,
  p2 uuid not null references public.accounts(id) on delete cascade,
  comp_id text,
  status text not null default 'active' check (status in ('active', 'closed')),
  confirmed1_at timestamptz not null,
  confirmed2_at timestamptz not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  matches integer not null default 0
);
create index if not exists ranked_sessions_pair on public.ranked_sessions(p1, p2, created_at desc);

create table if not exists public.elo_holds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  session_id uuid references public.ranked_sessions(id) on delete set null,
  a1 uuid not null, a2 uuid not null, d1 integer not null, d2 integer not null,
  score numeric not null, reasons jsonb not null default '[]'::jsonb,
  status text not null default 'held' check (status in ('held', 'released', 'voided')),
  created_at timestamptz not null default now(),
  decided_at timestamptz, decided_by text
);
create index if not exists elo_holds_status on public.elo_holds(status, created_at);

create table if not exists public.fraud_signals (
  id bigserial primary key,
  at timestamptz not null default now(),
  match_id uuid, session_id uuid, winner uuid, loser uuid,
  score numeric not null, decision text not null, reasons jsonb not null default '[]'::jsonb
);
create index if not exists fraud_signals_pair on public.fraud_signals(winner, loser, at desc);

alter table public.matches add column if not exists ranked_session uuid;
alter table public.matches add column if not exists elo_status text;
alter table public.fraud_config enable row level security;
alter table public.ranked_sessions enable row level security;
alter table public.elo_holds enable row level security;
alter table public.fraud_signals enable row level security;

create or replace function dc.cfg(p_key text) returns numeric
language sql stable security definer set search_path = public as $$ select value from fraud_config where key = p_key $$;

-- ------------------------------------------------------------------ ELO: un solo cálculo para todo el juego
create or replace function dc.elo_calc(r1 integer, r2 integer, pl1 integer, pl2 integer, p_winner integer, out d1 integer, out d2 integer)
language plpgsql immutable as $$
declare e1 numeric; s1 numeric; k1 integer; k2 integer;
begin
  e1 := 1 / (1 + power(10, (r2 - r1) / 400.0));
  s1 := case p_winner when 0 then 1 when 1 then 0 else 0.5 end;
  k1 := case when pl1 < 15 then 36 when r1 >= 2000 then 16 else 24 end;
  k2 := case when pl2 < 15 then 36 when r2 >= 2000 then 16 else 24 end;
  d1 := round(k1 * (s1 - e1));
  d2 := round(k2 * ((1 - s1) - (1 - e1)));
end $$;

-- el online usa el mismo cálculo (misma fórmula que tenía, ahora centralizada)
do $$
declare d text;
begin
  d := pg_get_functiondef('dc.online_record(uuid,jsonb)'::regprocedure);
  if position('dc.elo_calc' in d) = 0 then
    d := replace(d, '  e1 := 1 / (1 + power(10, (r2 - r1) / 400.0));
  s1 := case v_winner when 0 then 1 when 1 then 0 else 0.5 end;
  k1 := case when pl1 < 15 then 36 when r1 >= 2000 then 16 else 24 end;
  k2 := case when pl2 < 15 then 36 when r2 >= 2000 then 16 else 24 end;
  d1 := round(k1 * (s1 - e1));
  d2 := round(k2 * ((1 - s1) - (1 - e1)));', '  select x.d1, x.d2 into d1, d2 from dc.elo_calc(r1, r2, pl1, pl2, v_winner) x;');
    if position('dc.elo_calc' in d) = 0 then raise exception 'no se pudo unificar el cálculo de ELO del online'; end if;
    execute d;
  end if;
end $$;

-- ------------------------------------------------------------------ análisis antifraude de un resultado
create or replace function dc.fraud_check(p_sess uuid, a1 uuid, a2 uuid, p_winner integer, p_loser_score numeric default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare w uuid; l uuid; v_score numeric := 0; v_reasons jsonb := '[]'::jsonb; la accounts; n24 integer; n7 integer;
  v_flow integer; v_wins integer; v_n integer; v_zero integer; v_tot integer; v_vs integer; v_feed integer;
begin
  select count(*) into n24 from matches m where m.ranked_session is not null and m.created_at > now() - interval '24 hours'
    and ((m.p1 = a1 and m.p2 = a2) or (m.p1 = a2 and m.p2 = a1));
  select count(*) into n7 from matches m where m.ranked_session is not null and m.created_at > now() - interval '7 days'
    and ((m.p1 = a1 and m.p2 = a2) or (m.p1 = a2 and m.p2 = a1));
  if n24 >= dc.cfg('pair_day_cap') or n7 >= dc.cfg('pair_week_cap') then
    return jsonb_build_object('decision', 'capped', 'score', 0, 'reasons', jsonb_build_array('volumen'));
  end if;
  if n24 >= dc.cfg('pair_day_soft') then v_score := v_score + 1; v_reasons := v_reasons || '"volumen_alto"'; end if;
  if p_winner = -1 then
    return jsonb_build_object('decision', 'credit', 'score', v_score, 'reasons', v_reasons);
  end if;
  w := case when p_winner = 0 then a1 else a2 end;
  l := case when p_winner = 0 then a2 else a1 end;
  select * into la from accounts where id = l;
  -- 1) la cuenta que pierde es nueva
  if la.created_at > now() - make_interval(days => dc.cfg('new_days')::int) or la.played < dc.cfg('new_played') then
    v_score := v_score + 1.5; v_reasons := v_reasons || '"perdedor_nuevo"';
    if la.created_at > now() - interval '24 hours' then v_score := v_score + 1; v_reasons := v_reasons || '"cuenta_recien_creada"'; end if;
  end if;
  -- 1b) en esta misma partida el perdedor no sumó ni un punto
  if p_loser_score is not null and p_loser_score = 0 then v_score := v_score + 1; v_reasons := v_reasons || '"derrota_en_cero"'; end if;
  -- 2) flujo de ELO de un solo lado entre la pareja
  select coalesce(sum(case when m.p1 = w then m.delta1 else m.delta2 end), 0),
         count(*) filter (where (m.p1 = w and m.winner = 0) or (m.p2 = w and m.winner = 1)), count(*)
    into v_flow, v_wins, v_n
  from (select * from matches m where (m.ranked_session is not null or m.mode = 'online') and m.delta1 is not null
          and ((m.p1 = w and m.p2 = l) or (m.p1 = l and m.p2 = w)) order by m.created_at desc limit dc.cfg('flow_window')::int) m;
  if v_n >= 6 and v_flow >= dc.cfg('flow_elo') and v_wins::numeric / v_n >= dc.cfg('flow_wr') then
    v_score := v_score + 2; v_reasons := v_reasons || '"flujo_unilateral"';
  end if;
  -- 3) el perdedor no suma puntos (se deja ganar)
  select count(*) filter (where coalesce((case when m.p1 = l then m.p1_flags else m.p2_flags end->>'score')::numeric, 1) = 0), count(*)
    into v_zero, v_tot
  from (select * from matches m where m.ranked_session is not null and ((m.p1 = w and m.p2 = l) or (m.p1 = l and m.p2 = w))
          order by m.created_at desc limit 8) m;
  if v_zero >= dc.cfg('zero_losses') then v_score := v_score + 1.5; v_reasons := v_reasons || '"derrotas_sin_puntos"'; end if;
  -- 4) el perdedor juega casi solo contra esta cuenta
  select count(*), count(*) filter (where m.p1 = w or m.p2 = w) into v_tot, v_vs
  from matches m where (m.p1 = l or m.p2 = l) and (m.ranked_session is not null or m.mode = 'online') and m.created_at > now() - interval '30 days';
  if v_tot >= dc.cfg('exclusive_min') and v_vs::numeric / v_tot >= dc.cfg('exclusive_ratio') then
    v_score := v_score + 1; v_reasons := v_reasons || '"rival_exclusivo"';
  end if;
  -- 5) varias cuentas nuevas distintas le dieron ELO al ganador
  select count(distinct o.id) into v_feed
  from matches m join accounts o on o.id = case when m.p1 = w then m.p2 else m.p1 end
  where (m.p1 = w or m.p2 = w) and m.ranked_session is not null and m.created_at > now() - interval '7 days'
    and ((m.p1 = w and m.winner = 0) or (m.p2 = w and m.winner = 1))
    and (o.created_at > now() - make_interval(days => dc.cfg('new_days')::int + 7));
  if v_feed >= dc.cfg('feeder_new') then v_score := v_score + 2; v_reasons := v_reasons || '"red_de_cuentas"'; end if;
  return jsonb_build_object('decision', case when v_score >= dc.cfg('hold_score') then 'hold' else 'credit' end,
    'score', v_score, 'reasons', v_reasons);
end $$;

-- ------------------------------------------------------------------ aplicar / liberar ELO retenido
create or replace function dc.elo_release(p_hold uuid, p_by text) returns void
language plpgsql security definer set search_path = public as $$
declare hd elo_holds;
begin
  select * into hd from elo_holds where id = p_hold and status = 'held' for update;
  if not found then return; end if;
  update accounts set rating = greatest(100, rating + hd.d1), best_rating = greatest(best_rating, rating + hd.d1) where id = hd.a1;
  update accounts set rating = greatest(100, rating + hd.d2), best_rating = greatest(best_rating, rating + hd.d2) where id = hd.a2;
  update matches set delta1 = hd.d1, delta2 = hd.d2, elo_status = 'credited_late' where id = hd.match_id;
  insert into rating_history(account_id, rating, delta, match_id) select hd.a1, rating, hd.d1, hd.match_id from accounts where id = hd.a1;
  insert into rating_history(account_id, rating, delta, match_id) select hd.a2, rating, hd.d2, hd.match_id from accounts where id = hd.a2;
  update elo_holds set status = 'released', decided_at = now(), decided_by = p_by where id = p_hold;
  perform dc.notify(hd.a1, 'elo', 'ELO acreditado', 'Una partida competitiva local que estaba en revisión ya sumó al ranking.', jsonb_build_object('match', hd.match_id));
  perform dc.notify(hd.a2, 'elo', 'ELO acreditado', 'Una partida competitiva local que estaba en revisión ya sumó al ranking.', jsonb_build_object('match', hd.match_id));
end $$;

-- Libera solas las retenciones de riesgo medio viejas si la pareja no tuvo más señales (se llama de vez en cuando)
create or replace function dc.fraud_sweep() returns integer
language plpgsql security definer set search_path = public as $$
declare hd elo_holds; n integer := 0;
begin
  for hd in select * from elo_holds h where h.status = 'held' and h.score < dc.cfg('review_score')
      and h.created_at < now() - make_interval(hours => dc.cfg('auto_release_hours')::int)
      and not exists (select 1 from fraud_signals s where s.decision = 'hold' and s.at > h.created_at and s.match_id is distinct from h.match_id
        and ((s.winner = h.a1 and s.loser = h.a2) or (s.winner = h.a2 and s.loser = h.a1)))
      limit 50
  loop
    perform dc.elo_release(hd.id, 'auto'); n := n + 1;
  end loop;
  return n;
end $$;

-- ------------------------------------------------------------------ sesiones competitivas locales
create or replace function public.dc_local_ranked_open(p_tok1 text, p_tok2 text, p_comp text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a1 uuid := dc.auth(p_tok1); a2 uuid := dc.auth(p_tok2); v_id uuid; n24 integer; n7 integer;
begin
  if a1 is null or a2 is null then perform dc.err('no_account'); end if;
  if a1 = a2 then perform dc.err('same_account'); end if;
  if p_comp is not null and (p_comp !~ '^[A-Za-z0-9_-]{8,64}$' or exists (select 1 from matches where comp_client_id = p_comp)) then
    perform dc.err('ranked_too_late'); -- no se puede pasar a competitiva una competición ya empezada
  end if;
  perform dc.fraud_sweep();
  update ranked_sessions set status = 'closed', closed_at = now()
    where status = 'active' and (p1 in (a1, a2) or p2 in (a1, a2)) and created_at < now() - interval '6 hours';
  select count(*) into n24 from matches m where m.ranked_session is not null and m.created_at > now() - interval '24 hours'
    and ((m.p1 = a1 and m.p2 = a2) or (m.p1 = a2 and m.p2 = a1));
  select count(*) into n7 from matches m where m.ranked_session is not null and m.created_at > now() - interval '7 days'
    and ((m.p1 = a1 and m.p2 = a2) or (m.p1 = a2 and m.p2 = a1));
  if n24 >= dc.cfg('pair_day_cap') or n7 >= dc.cfg('pair_week_cap') then
    return jsonb_build_object('ranked', false, 'reason', 'pair_limit');
  end if;
  insert into ranked_sessions(p1, p2, comp_id, confirmed1_at, confirmed2_at) values (a1, a2, p_comp, now(), now()) returning id into v_id;
  return jsonb_build_object('ranked', true, 'session', v_id, 'left_today', dc.cfg('pair_day_cap')::int - n24);
end $$;

create or replace function public.dc_local_ranked_close(p_tok text, p_session uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_tok);
begin
  update ranked_sessions set status = 'closed', closed_at = now() where id = p_session and status = 'active' and v_me in (p1, p2);
  return jsonb_build_object('ok', true);
end $$;

-- ------------------------------------------------------------------ envío de partidas locales (casual o competitiva)
create or replace function public.dc_submit_match(p_tok1 text, p_tok2 text, p_match jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a1 uuid; a2 uuid; g games; v_cid text := p_match->>'client_id'; v_winner integer; v_dur real;
  r1 integer; r2 integer; pl1 integer; pl2 integer;
  d1 integer := 0; d2 integer := 0; v_mid uuid; v_out1 jsonb; v_out2 jsonb; v_names text[]; v_mode text; v_diff text;
  v_sess uuid; rs ranked_sessions; v_dec jsonb; v_status text; hd1 integer; hd2 integer; v_ranked jsonb;
begin
  if p_tok1 is not null then a1 := dc.auth(p_tok1); end if;
  if p_tok2 is not null then a2 := dc.auth(p_tok2); end if;
  if a1 is null and a2 is null then perform dc.err('no_account'); end if;
  if a1 = a2 then perform dc.err('same_account'); end if;
  if v_cid is null or v_cid !~ '^[A-Za-z0-9_-]{8,64}$' then perform dc.err('invalid_match'); end if;
  if exists (select 1 from matches where client_id = v_cid) then
    return jsonb_build_object('duplicate', true);
  end if;
  select * into g from games where id = p_match->>'game';
  if not found then perform dc.err('invalid_match'); end if;
  v_winner := (p_match->>'winner')::int;
  if v_winner not in (-1, 0, 1) then perform dc.err('invalid_match'); end if;
  v_dur := (p_match->>'duration')::real;
  if v_dur is null or v_dur < 8 or v_dur > 3600 then perform dc.err('invalid_match'); end if;
  v_mode := coalesce(p_match->>'mode', 'quick');
  if v_mode not in ('quick', 'duel', 'tournament', 'survival', 'bot') then perform dc.err('invalid_match'); end if;
  if v_mode = 'bot' and (a1 is null or a2 is not null) then perform dc.err('invalid_match'); end if;

  -- competitiva: la sesión tiene que existir, estar activa, ser de estas dos cuentas (J1 y J2) y de esta competición
  if coalesce(p_match->>'ranked_session', '') <> '' then
    begin v_sess := (p_match->>'ranked_session')::uuid; exception when others then perform dc.err('ranked_invalid'); end;
    select * into rs from ranked_sessions where id = v_sess for update;
    if not found or rs.status <> 'active' or a1 is null or a2 is null or rs.p1 <> a1 or rs.p2 <> a2
       or v_mode not in ('quick', 'duel', 'tournament') or coalesce(rs.comp_id, '') <> coalesce(p_match->>'comp_id', '') then
      perform dc.err('ranked_invalid');
    end if;
  end if;

  v_diff := coalesce(p_match->>'difficulty', 'normal');
  if v_diff not in ('easy', 'normal', 'hard', 'caos') then perform dc.err('invalid_match'); end if;
  if exists (select 1 from accounts where id in (a1, a2) and last_match_at > now() - make_interval(secs => greatest(6, v_dur * 0.5))) then
    perform dc.err('too_fast');
  end if;
  v_names := array[coalesce(nullif(dc.clean_name(p_match->'names'->>0), ''), 'J1'), coalesce(nullif(dc.clean_name(p_match->'names'->>1), ''), 'J2')];
  if a1 is not null then v_names[1] := (select display_name from accounts where id = a1); end if;
  if a2 is not null then v_names[2] := (select display_name from accounts where id = a2); end if;
  if v_mode = 'bot' then v_names[2] := 'BOT ' || upper(case when p_match->>'bot' in ('easy', 'normal', 'hard', 'expert') then p_match->>'bot' else 'normal' end); end if;

  if v_sess is not null then
    select rating, played into r1, pl1 from accounts where id = a1 for update;
    select rating, played into r2, pl2 from accounts where id = a2 for update;
    select x.d1, x.d2 into d1, d2 from dc.elo_calc(r1, r2, pl1, pl2, v_winner) x;
    v_dec := dc.fraud_check(v_sess, a1, a2, v_winner,
      case when v_winner in (0, 1) and jsonb_typeof(p_match->'scores'->(1 - v_winner)) = 'number' then (p_match->'scores'->>(1 - v_winner))::numeric end);
    v_status := case v_dec->>'decision' when 'hold' then 'held' when 'capped' then 'capped' else 'credited' end;
    if v_status <> 'credited' then hd1 := d1; hd2 := d2; d1 := 0; d2 := 0; end if;
  end if;

  insert into matches(client_id, comp_client_id, game_id, mode, difficulty, p1, p2, p1_name, p2_name, p1_color, p2_color,
                      winner, score1, score2, delta1, delta2, duration, p1_flags, p2_flags, ranked_session, elo_status)
  values (v_cid, nullif(left(p_match->>'comp_id', 64), ''), g.id, v_mode, v_diff, a1, a2, v_names[1], v_names[2],
          case when p_match->'colors'->>0 ~ '^#[0-9A-Fa-f]{6}$' then p_match->'colors'->>0 end,
          case when p_match->'colors'->>1 ~ '^#[0-9A-Fa-f]{6}$' then p_match->'colors'->>1 end,
          v_winner, left(p_match->'display'->>0, 24), left(p_match->'display'->>1, 24), d1, d2, v_dur,
          dc.clean_flags(p_match->'flags'->0), dc.clean_flags(p_match->'flags'->1), v_sess, v_status)
  returning id into v_mid;

  if v_sess is not null then
    update ranked_sessions set matches = matches + 1 where id = v_sess;
    insert into fraud_signals(match_id, session_id, winner, loser, score, decision, reasons)
      values (v_mid, v_sess, case when v_winner = 1 then a2 else a1 end, case when v_winner = 1 then a1 else a2 end,
              (v_dec->>'score')::numeric, v_dec->>'decision', v_dec->'reasons');
    if v_status = 'held' then
      insert into elo_holds(match_id, session_id, a1, a2, d1, d2, score, reasons)
        values (v_mid, v_sess, a1, a2, hd1, hd2, (v_dec->>'score')::numeric, v_dec->'reasons');
      perform dc.notify(a1, 'elo', 'ELO en revisión', 'Una partida competitiva local quedó en revisión antes de sumar ELO. Podés seguir jugando.', jsonb_build_object('match', v_mid));
      perform dc.notify(a2, 'elo', 'ELO en revisión', 'Una partida competitiva local quedó en revisión antes de sumar ELO. Podés seguir jugando.', jsonb_build_object('match', v_mid));
    end if;
    v_ranked := jsonb_build_object('status', v_status, 'd', jsonb_build_array(coalesce(hd1, d1), coalesce(hd2, d2)));
  end if;

  if a1 is not null then v_out1 := dc.apply_minigame(a1, 0, p_match, a2, case when a2 is not null then d1 end, g); end if;
  if a2 is not null then v_out2 := dc.apply_minigame(a2, 1, p_match, a1, case when a1 is not null then d2 end, g); end if;
  if d1 <> 0 or d2 <> 0 then
    insert into rating_history(account_id, rating, delta, match_id)
      select a1, rating, d1, v_mid from accounts where id = a1;
    insert into rating_history(account_id, rating, delta, match_id)
      select a2, rating, d2, v_mid from accounts where id = a2;
  end if;
  return jsonb_build_object('match_id', v_mid, 'ranked', v_ranked, 'slots', jsonb_build_array(
    case when a1 is not null then v_out1 || jsonb_build_object('me', dc.me(a1)) end,
    case when a2 is not null then v_out2 || jsonb_build_object('me', dc.me(a2)) end));
end $$;

-- ------------------------------------------------------------------ administración (solo cuentas admin)
create or replace function public.dc_admin_fraud(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  if not coalesce((select is_admin from accounts where id = v_me), false) then perform dc.err('forbidden'); end if;
  return jsonb_build_object(
    'holds', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'at', h.created_at, 'status', h.status, 'score', h.score, 'reasons', h.reasons,
        'p1', (select display_name from accounts where id = h.a1), 'p2', (select display_name from accounts where id = h.a2), 'd', jsonb_build_array(h.d1, h.d2))
      order by h.created_at desc) from (select * from elo_holds order by created_at desc limit 100) h), '[]'::jsonb),
    'config', (select jsonb_object_agg(key, jsonb_build_object('value', value, 'note', note)) from fraud_config));
end $$;

create or replace function public.dc_admin_fraud_decide(p_token text, p_hold uuid, p_action text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  if not coalesce((select is_admin from accounts where id = v_me), false) then perform dc.err('forbidden'); end if;
  if p_action = 'release' then perform dc.elo_release(p_hold, v_me::text);
  elsif p_action = 'void' then
    update elo_holds set status = 'voided', decided_at = now(), decided_by = v_me::text where id = p_hold and status = 'held';
    update matches set elo_status = 'voided' where id = (select match_id from elo_holds where id = p_hold);
  else perform dc.err('bad_input'); end if;
  return public.dc_admin_fraud(p_token);
end $$;

create or replace function public.dc_admin_fraud_config(p_token text, p_key text, p_value numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  if not coalesce((select is_admin from accounts where id = v_me), false) then perform dc.err('forbidden'); end if;
  update fraud_config set value = p_value where key = p_key;
  if not found then perform dc.err('bad_input'); end if;
  return public.dc_admin_fraud(p_token);
end $$;

revoke all on function dc.fraud_check(uuid, uuid, uuid, integer, numeric), dc.elo_release(uuid, text), dc.fraud_sweep(), dc.cfg(text) from public, anon, authenticated;
grant execute on function public.dc_local_ranked_open(text, text, text), public.dc_local_ranked_close(text, uuid),
  public.dc_admin_fraud(text), public.dc_admin_fraud_decide(text, uuid, text), public.dc_admin_fraud_config(text, text, numeric) to anon, authenticated;

-- DUEL CLUB · 005 · Juego online: cada jugador en su compu
-- Matchmaking por SUSI, salas privadas con código, desafíos entre amigos, señalización WebRTC (conexión
-- directa entre las dos compus) y resultados validados: una ronda solo cuenta cuando las DOS compus
-- informan el mismo resultado. Si alguien abandona o deja de responder, pierde la ronda en curso y la serie.

alter table public.accounts add column if not exists online_played integer not null default 0;
alter table public.accounts add column if not exists online_wins integer not null default 0;

create table if not exists public.online_matches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ranked', 'room', 'challenge')),
  code text,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished', 'cancelled')),
  host uuid not null references public.accounts(id) on delete cascade,     -- J1
  guest uuid references public.accounts(id) on delete cascade,             -- J2
  invited uuid references public.accounts(id) on delete cascade,           -- desafío: solo esta cuenta puede entrar
  seed bigint not null,                                                     -- semilla compartida de los minijuegos
  games text[] not null,                                                    -- orden de minijuegos (decidido por el servidor)
  best_of smallint not null check (best_of in (1, 3, 5)),
  caos boolean not null default false,
  secret text not null,                                                     -- nombre del canal de respaldo (solo lo conocen los dos)
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  host_seen timestamptz not null default now(),
  guest_seen timestamptz,
  round smallint not null default 0,                                        -- ronda en curso (intentos, incluye anuladas)
  round_at timestamptz,
  wins smallint[] not null default '{0,0}',
  played smallint not null default 0,
  winner smallint,
  end_reason text,
  rounds jsonb not null default '[]'::jsonb,
  rematch_of uuid references public.online_matches(id) on delete set null
);
create unique index if not exists online_matches_code_idx on public.online_matches (code) where status in ('waiting', 'playing');
create index if not exists online_matches_host_idx on public.online_matches (host, created_at desc);
create index if not exists online_matches_guest_idx on public.online_matches (guest, created_at desc);
create index if not exists online_matches_invited_idx on public.online_matches (invited) where status = 'waiting';
create index if not exists online_matches_active_idx on public.online_matches (status) where status in ('waiting', 'playing');
create index if not exists online_matches_rematch_idx on public.online_matches (rematch_of);

create table if not exists public.online_queue (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  rating integer not null,
  joined_at timestamptz not null default now(),
  seen_at timestamptz not null default now(),
  match_id uuid references public.online_matches(id) on delete set null
);
create table if not exists public.online_signals (
  id bigserial primary key,
  match_id uuid not null references public.online_matches(id) on delete cascade,
  slot smallint not null check (slot in (0, 1)),
  at timestamptz not null default now(),
  payload jsonb not null
);
create index if not exists online_signals_idx on public.online_signals (match_id, id);
create table if not exists public.online_reports (
  match_id uuid not null references public.online_matches(id) on delete cascade,
  round smallint not null,
  slot smallint not null check (slot in (0, 1)),
  at timestamptz not null default now(),
  report jsonb not null default '{}'::jsonb,
  out jsonb,
  primary key (match_id, round, slot)
);

-- RLS activado sin políticas: el navegador no puede leer ni escribir estas tablas directo
do $$
declare t text;
begin
  foreach t in array array['online_matches', 'online_queue', 'online_signals', 'online_reports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke all on sequence public.online_signals_id_seq from anon, authenticated;

-- logros: nuevas estadísticas online_played / online_wins
create or replace function dc.cond_ok(p_acc uuid, c jsonb, ctx jsonb)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  acc accounts; t text := c->>'t'; v numeric; f numeric; op text; v_opp uuid;
begin
  select * into acc from accounts where id = p_acc;
  if not found then return false; end if;
  ctx := coalesce(ctx, '{}'::jsonb);
  if t = 'stat' then
    v := case c->>'k'
      when 'wins' then acc.wins when 'played' then acc.played when 'best_streak' then acc.best_streak
      when 'comp_wins' then acc.comp_wins when 'tournaments' then acc.tournaments when 'survival_best' then acc.survival_best
      when 'best_rating' then acc.best_rating when 'pies_spent' then acc.pies_spent when 'time_played' then acc.time_played
      when 'draws' then acc.draws when 'draw_streak' then acc.draw_streak when 'loss_streak' then acc.loss_streak
      when 'online_played' then acc.online_played when 'online_wins' then acc.online_wins
      else null end;
    return v is not null and v >= (c->>'gte')::numeric;
  elsif t = 'level' then
    return dc.level_of(acc.keke) >= (c->>'gte')::int;
  elsif t = 'gwins' then
    return coalesce((select wins from mastery where account_id = p_acc and game_id = c->>'g'), 0) >= (c->>'gte')::int;
  elsif t = 'gstreak' then
    return coalesce((select best_streak from mastery where account_id = p_acc and game_id = c->>'g'), 0) >= (c->>'gte')::int;
  elsif t = 'grank' then
    return coalesce((select rank from mastery where account_id = p_acc and game_id = c->>'g'), 0) >= (c->>'gte')::int;
  elsif t = 'ranks' then
    return (select count(*) from mastery where account_id = p_acc and rank >= (c->>'gte')::int) >= (c->>'count')::int;
  elsif t = 'gameswon' then
    return (select count(*) from mastery m join games g on g.id = m.game_id
            where m.account_id = p_acc and m.wins > 0 and (c->>'set' is distinct from 'orig' or g.original)) >= (c->>'count')::int;
  elsif t = 'gamesplayed' then
    return (select count(*) from mastery where account_id = p_acc and played > 0) >= (c->>'count')::int;
  elsif t = 'flag' then
    if ctx->>'type' is distinct from 'minigame' then return false; end if;
    if c ? 'g' and c->>'g' is distinct from ctx->>'game' then return false; end if;
    if coalesce((c->>'win')::boolean, false) and not coalesce((ctx->>'win')::boolean, false) then return false; end if;
    if coalesce((c->>'lose')::boolean, false) and not coalesce((ctx->>'lose')::boolean, false) then return false; end if;
    if jsonb_typeof(ctx->'flags'->(c->>'k')) is distinct from 'number' then return false; end if;
    f := (ctx->'flags'->>(c->>'k'))::numeric;
    v := (c->>'v')::numeric; op := c->>'op';
    return case op when 'lt' then f < v when 'lte' then f <= v when 'eq' then f = v when 'gte' then f >= v when 'gt' then f > v else false end;
  elsif t = 'comp' then
    if ctx->>'type' is distinct from 'comp' then return false; end if;
    if c ? 'mode' and c->>'mode' is distinct from ctx->>'mode' then return false; end if;
    if coalesce((c->>'win')::boolean, false) and not coalesce((ctx->>'win')::boolean, false) then return false; end if;
    if coalesce((c->>'lose')::boolean, false) and not coalesce((ctx->>'lose')::boolean, false) then return false; end if;
    if c ? 'deficit_gte' and coalesce((ctx->>'deficit')::numeric, 0) < (c->>'deficit_gte')::numeric then return false; end if;
    if c ? 'margin_gte' and coalesce((ctx->>'margin')::numeric, 0) < (c->>'margin_gte')::numeric then return false; end if;
    if c ? 'margin_eq' and coalesce((ctx->>'margin')::numeric, -1) <> (c->>'margin_eq')::numeric then return false; end if;
    if c ? 'games_gte' and coalesce((ctx->>'games')::numeric, 0) < (c->>'games_gte')::numeric then return false; end if;
    if c ? 'diff' and ctx->>'diff' is distinct from c->>'diff' then return false; end if;
    return true;
  elsif t = 'diffwin' then
    return ctx->>'type' = 'minigame' and coalesce((ctx->>'win')::boolean, false) and ctx->>'diff' = c->>'d';
  elsif t = 'charwin' then
    return ctx->>'type' = 'minigame' and coalesce((ctx->>'win')::boolean, false) and 'char_' || acc.char = c->>'c';
  elsif t = 'friends' then
    return (select count(*) from friendships where status = 'accepted' and (friendships.a = p_acc or friendships.b = p_acc)) >= (c->>'gte')::int;
  elsif t = 'items' then
    return (select count(*) from inventory where account_id = p_acc) >= (c->>'gte')::int;
  elsif t = 'achs' then
    return (select count(*) from achievements_unlocked where account_id = p_acc) >= (c->>'gte')::int;
  elsif t = 'buys' then
    return (select count(*) from transactions where account_id = p_acc and reason = 'buy') >= (c->>'gte')::int;
  elsif t = 'daily' then
    return coalesce((select matches from daily_counters where account_id = p_acc and day = dc.today()), 0) >= (c->>'gte')::int;
  elsif t = 'rival' then
    v_opp := nullif(ctx->>'opp', '')::uuid;
    if v_opp is null then return false; end if;
    return (select count(*) from matches where (p1 = p_acc and p2 = v_opp) or (p1 = v_opp and p2 = p_acc)) >= (c->>'gte')::int;
  elsif t = 'friendwin' then
    v_opp := nullif(ctx->>'opp', '')::uuid;
    if v_opp is null or not coalesce((ctx->>'win')::boolean, false) then return false; end if;
    return exists (select 1 from friendships where status = 'accepted' and friendships.a = least(p_acc, v_opp) and friendships.b = greatest(p_acc, v_opp));
  end if;
  return false;
end $$;

create or replace function dc.me(p_acc uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a accounts; v jsonb;
begin
  select * into a from accounts where id = p_acc;
  v := dc.public_card(a) || jsonb_build_object(
    'pies', a.pies, 'pies_earned', a.pies_earned, 'pies_spent', a.pies_spent,
    'stats', jsonb_build_object(
      'played', a.played, 'wins', a.wins, 'losses', a.losses, 'draws', a.draws, 'streak', a.streak,
      'best_streak', a.best_streak, 'draw_streak', a.draw_streak, 'loss_streak', a.loss_streak,
      'comp_wins', a.comp_wins, 'comp_losses', a.comp_losses, 'comp_draws', a.comp_draws, 'tournaments', a.tournaments,
      'survival_best', a.survival_best, 'time_played', a.time_played, 'best_rating', a.best_rating, 'pies_spent', a.pies_spent,
      'online_played', a.online_played, 'online_wins', a.online_wins),
    'inventory', coalesce((select jsonb_agg(item_id order by acquired_at) from inventory where account_id = p_acc), '[]'::jsonb),
    'achievements', coalesce((select jsonb_object_agg(ach_id, unlocked_at) from achievements_unlocked where account_id = p_acc), '{}'::jsonb),
    'mastery', coalesce((select jsonb_object_agg(game_id, jsonb_build_object('played', played, 'wins', wins, 'losses', losses, 'draws', draws,
        'streak', streak, 'best_streak', best_streak, 'best_record', best_record, 'time_played', time_played, 'rank', rank))
        from mastery where account_id = p_acc), '{}'::jsonb),
    'friends', (select count(*) from friendships where status = 'accepted' and (friendships.a = p_acc or friendships.b = p_acc)),
    'requests', (select count(*) from friendships where status = 'pending' and requested_by <> p_acc and (friendships.a = p_acc or friendships.b = p_acc)),
    'items_count', (select count(*) from inventory where account_id = p_acc),
    'buys', (select count(*) from transactions where account_id = p_acc and reason = 'buy'),
    'unread', (select count(*) from notifications where account_id = p_acc and not read),
    'today', coalesce((select matches from daily_counters where account_id = p_acc and day = dc.today()), 0)
  );
  return v;
end $$;

-- ------------------------------------------------------------------ utilidades internas del modo online
create or replace function dc.online_slot(m public.online_matches, p_acc uuid) returns integer
language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if m.host = p_acc then return 0; end if;
  if m.guest = p_acc then return 1; end if;
  perform dc.err('not_found');
end $$;

create or replace function dc.online_code() returns text
language plpgsql volatile set search_path = public, pg_temp as $$
declare v text;
begin
  loop
    select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') into v from generate_series(1, 5);
    exit when not exists (select 1 from online_matches where code = v and status in ('waiting', 'playing'));
  end loop;
  return v;
end $$;

-- Crea una partida online. Los minijuegos y la semilla los decide el servidor (iguales para los dos).
create or replace function dc.online_new(p_kind text, p_host uuid, p_guest uuid, p_invited uuid, p_opts jsonb, p_rematch uuid default null)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_best integer := coalesce(nullif(p_opts->>'best_of', '')::int, 3);
  v_game text := coalesce(nullif(p_opts->>'game', ''), 'random');
  v_caos boolean := coalesce((p_opts->>'caos')::boolean, false);
  v_games text[]; v_id uuid; v_play boolean := p_guest is not null;
begin
  if v_best not in (1, 3, 5) then perform dc.err('invalid'); end if;
  if (select count(*) from online_matches where host = p_host and created_at > now() - interval '1 hour') >= 60 then
    perform dc.err('too_many_requests');
  end if;
  if v_game = 'random' then
    select array_agg(id) into v_games from (select id from games order by random() limit v_best + 3) x;
  else
    if not exists (select 1 from games where id = v_game) then perform dc.err('invalid'); end if;
    v_games := array_fill(v_game, array[v_best + 3]);
  end if;
  insert into online_matches(kind, code, status, host, guest, invited, seed, games, best_of, caos, secret,
                             host_seen, guest_seen, started_at, round_at, rematch_of)
  values (p_kind, case when p_kind = 'ranked' then null else dc.online_code() end,
          case when v_play then 'playing' else 'waiting' end, p_host, p_guest, p_invited,
          floor(random() * 2147483646)::bigint + 1, v_games, v_best, v_caos, encode(gen_random_bytes(12), 'hex'),
          now(), case when v_play then now() end, case when v_play then now() end, case when v_play then now() end, p_rematch)
  returning id into v_id;
  return v_id;
end $$;

-- Vista de una partida para uno de sus dos jugadores (nunca incluye datos privados del rival)
create or replace function dc.online_view(p_id uuid, p_slot integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m online_matches; h accounts; g accounts; v_rm online_matches;
begin
  select * into m from online_matches where id = p_id;
  select * into h from accounts where id = m.host;
  if m.guest is not null then select * into g from accounts where id = m.guest; end if;
  select * into v_rm from online_matches where rematch_of = m.id and status in ('waiting', 'playing') order by created_at desc limit 1;
  return jsonb_build_object(
    'id', m.id, 'kind', m.kind, 'code', m.code, 'status', m.status, 'slot', p_slot,
    'seed', m.seed, 'games', to_jsonb(m.games), 'best_of', m.best_of, 'caos', m.caos, 'secret', m.secret,
    'round', m.round, 'wins', to_jsonb(m.wins), 'played', m.played, 'winner', m.winner, 'end_reason', m.end_reason,
    'rounds', m.rounds,
    'players', jsonb_build_array(dc.public_card(h), case when m.guest is not null then dc.public_card(g) end),
    'invited', (select username from accounts where id = m.invited),
    'opp_seen', round(extract(epoch from now() - case when p_slot = 0 then coalesce(m.guest_seen, m.created_at) else m.host_seen end)::numeric, 1),
    'reported', exists (select 1 from online_reports r where r.match_id = m.id and r.round = m.round and r.slot = p_slot),
    'outs', coalesce((select jsonb_object_agg(r.round::text, r.out) from online_reports r where r.match_id = m.id and r.slot = p_slot and r.out is not null), '{}'::jsonb),
    'rematch', case when v_rm.id is not null then jsonb_build_object('id', v_rm.id, 'mine', v_rm.host = case when p_slot = 0 then m.host else m.guest end) end,
    'created_at', m.created_at
  );
end $$;

-- Registra un minijuego online ya validado (misma lógica que dc_submit_match: SUSI, KEKE, PIES, dominio, récords, logros)
create or replace function dc.online_record(p_id uuid, p_m jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  m online_matches; g games; a1 uuid; a2 uuid; v_winner integer := (p_m->>'winner')::int; v_cid text; v_comp text;
  r1 integer; r2 integer; pl1 integer; pl2 integer; e1 numeric; s1 numeric; k1 integer; k2 integer;
  d1 integer; d2 integer; v_pair integer; v_mid uuid; v_out1 jsonb; v_out2 jsonb; v_n1 text; v_n2 text;
begin
  select * into m from online_matches where id = p_id;
  a1 := m.host; a2 := m.guest;
  select * into g from games where id = p_m->>'game';
  v_cid := 'o' || replace(m.id::text, '-', '') || '_' || m.round;
  v_comp := 'o' || replace(m.id::text, '-', '');
  if exists (select 1 from matches where client_id = v_cid) then return null; end if;
  select display_name, rating, played into v_n1, r1, pl1 from accounts where id = a1 for update;
  select display_name, rating, played into v_n2, r2, pl2 from accounts where id = a2 for update;
  e1 := 1 / (1 + power(10, (r2 - r1) / 400.0));
  s1 := case v_winner when 0 then 1 when 1 then 0 else 0.5 end;
  k1 := case when pl1 < 15 then 36 when r1 >= 2000 then 16 else 24 end;
  k2 := case when pl2 < 15 then 36 when r2 >= 2000 then 16 else 24 end;
  d1 := round(k1 * (s1 - e1));
  d2 := round(k2 * ((1 - s1) - (1 - e1)));
  select count(*) into v_pair from matches
    where created_at > now() - interval '24 hours' and ((p1 = a1 and p2 = a2) or (p1 = a2 and p2 = a1));
  if v_pair >= 12 then d1 := 0; d2 := 0;
  elsif v_pair >= 6 then d1 := d1 / 2; d2 := d2 / 2; end if;

  update accounts set online_played = online_played + 1, online_wins = online_wins + (v_winner = 0)::int where id = a1;
  update accounts set online_played = online_played + 1, online_wins = online_wins + (v_winner = 1)::int where id = a2;

  insert into matches(client_id, comp_client_id, game_id, mode, difficulty, p1, p2, p1_name, p2_name, p1_color, p2_color,
                      winner, score1, score2, delta1, delta2, duration, p1_flags, p2_flags)
  values (v_cid, v_comp, g.id, 'online', case when m.caos then 'caos' else 'normal' end, a1, a2, v_n1, v_n2,
          case when p_m->'colors'->>0 ~ '^#[0-9A-Fa-f]{6}$' then p_m->'colors'->>0 end,
          case when p_m->'colors'->>1 ~ '^#[0-9A-Fa-f]{6}$' then p_m->'colors'->>1 end,
          v_winner, left(p_m->'display'->>0, 24), left(p_m->'display'->>1, 24), d1, d2, (p_m->>'duration')::real,
          dc.clean_flags(p_m->'flags'->0), dc.clean_flags(p_m->'flags'->1))
  returning id into v_mid;

  v_out1 := dc.apply_minigame(a1, 0, p_m, a2, d1, g);
  v_out2 := dc.apply_minigame(a2, 1, p_m, a1, d2, g);
  insert into rating_history(account_id, rating, delta, match_id) select a1, rating, d1, v_mid from accounts where id = a1;
  insert into rating_history(account_id, rating, delta, match_id) select a2, rating, d2, v_mid from accounts where id = a2;
  return jsonb_build_object('match_id', v_mid, 'd', jsonb_build_array(d1, d2),
    'outs', jsonb_build_array(v_out1 || jsonb_build_object('me', dc.me(a1)), v_out2 || jsonb_build_object('me', dc.me(a2))));
end $$;

-- Cierra la serie: guarda la competición (modo online) y entrega sus recompensas
create or replace function dc.online_finish(p_id uuid, p_winner integer, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  m online_matches; v_s integer; acc uuid; v_res integer; v_n integer; v_f numeric; v_keke integer; v_pies integer;
  v_lv jsonb; v_ach jsonb; v_ctx jsonb; v_cid text;
begin
  update online_matches set status = 'finished', finished_at = now(), winner = p_winner, end_reason = p_reason
    where id = p_id and status = 'playing' returning * into m;
  if not found then return; end if;
  delete from online_signals where match_id = p_id;
  if m.played < 1 then return; end if;
  v_cid := 'o' || replace(m.id::text, '-', '');
  insert into competitions(client_id, mode, p1, p2, winner, summary)
    values (v_cid, 'online', m.host, m.guest, p_winner, jsonb_build_object('points', to_jsonb(m.wins), 'games', m.played,
      'best_of', m.best_of, 'reason', p_reason, 'difficulty', case when m.caos then 'caos' else 'normal' end,
      'names', jsonb_build_array((select display_name from accounts where id = m.host), (select display_name from accounts where id = m.guest))))
    on conflict (client_id) do nothing;
  foreach v_s in array array[0, 1] loop
    acc := case v_s when 0 then m.host else m.guest end;
    v_res := case when p_winner = -1 then 0 when p_winner = v_s then 1 else -1 end;
    insert into daily_counters(account_id, day, comps) values (acc, dc.today(), 1)
      on conflict (account_id, day) do update set comps = daily_counters.comps + 1 returning comps into v_n;
    v_f := case when v_n <= 12 then 1 when v_n <= 24 then 0.5 else 0 end;
    -- una serie corta (al mejor de 1) rinde menos que una larga
    if m.best_of = 1 then v_f := v_f * 0.5; end if;
    v_keke := round((20 + case v_res when 1 then 60 when 0 then 20 else 0 end) * v_f);
    v_pies := round((15 + case v_res when 1 then 40 when 0 then 10 else 0 end) * v_f);
    update accounts set comp_wins = comp_wins + (v_res = 1)::int, comp_losses = comp_losses + (v_res = -1)::int,
      comp_draws = comp_draws + (v_res = 0)::int where id = acc;
    if v_pies > 0 then perform dc.add_pies(acc, v_pies, 'competition', 'online'); end if;
    v_lv := dc.add_keke(acc, v_keke, 'competition');
    v_ctx := jsonb_build_object('type', 'comp', 'mode', 'online', 'win', v_res = 1, 'lose', v_res = -1, 'deficit', 0,
      'margin', abs(m.wins[1] - m.wins[2]), 'games', m.played, 'diff', case when m.caos then 'caos' else 'normal' end);
    v_ach := dc.check_achievements(acc, v_ctx);
    insert into online_reports(match_id, round, slot, out)
      values (m.id, -1, v_s, jsonb_build_object('slot', v_s, 'res', v_res, 'keke', v_keke, 'pies', v_pies, 'levels', v_lv,
        'achievements', v_ach, 'me', dc.me(acc)))
      on conflict (match_id, round, slot) do nothing;
  end loop;
end $$;

-- Después de cada ronda: ¿terminó la serie?
create or replace function dc.online_advance(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m online_matches; v_need integer;
begin
  select * into m from online_matches where id = p_id;
  if m.status <> 'playing' then return; end if;
  v_need := m.best_of / 2 + 1;
  if m.wins[1] >= v_need or m.wins[2] >= v_need then
    perform dc.online_finish(m.id, case when m.wins[1] > m.wins[2] then 0 else 1 end, 'complete');
  elsif m.played >= m.best_of and (m.wins[1] <> m.wins[2] or m.played >= m.best_of + 1) then
    -- empate al final: se juega UN desempate; si vuelve a empatar, la serie queda empatada
    perform dc.online_finish(m.id, case when m.wins[1] > m.wins[2] then 0 when m.wins[2] > m.wins[1] then 1 else -1 end, 'complete');
  elsif m.round >= m.best_of + 3 then
    perform dc.online_finish(m.id, case when m.wins[1] > m.wins[2] then 0 when m.wins[2] > m.wins[1] then 1 else -1 end, 'limit');
  end if;
end $$;

-- Resuelve la ronda actual con los reportes recibidos (o anula si no coinciden)
create or replace function dc.online_resolve(p_id uuid, p_single_slot integer default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  m online_matches; r0 jsonb; r1 jsonb; rep jsonb; v_void text; v_game text; v_dur real; v_winner integer; v_rec jsonb; v_m jsonb; v_s integer;
begin
  select * into m from online_matches where id = p_id for update;
  if m.status <> 'playing' then return; end if;
  select report into r0 from online_reports where match_id = m.id and round = m.round and slot = 0;
  select report into r1 from online_reports where match_id = m.id and round = m.round and slot = 1;
  v_game := m.games[m.round + 1];
  if p_single_slot is not null then
    rep := case p_single_slot when 0 then r0 else r1 end;
    if rep is null then return; end if;
  elsif r0 is null or r1 is null then
    return;
  else
    rep := r0;
  end if;
  if coalesce((r0->>'desync')::boolean, false) or coalesce((r1->>'desync')::boolean, false) then v_void := 'desync';
  elsif rep->>'game' is distinct from v_game then v_void := 'mismatch';
  elsif p_single_slot is null and ((r0->>'winner') is distinct from (r1->>'winner') or (r0->'scores') is distinct from (r1->'scores')) then
    v_void := 'mismatch';
  end if;
  v_winner := (rep->>'winner')::int;
  if v_void is null and (v_winner is null or v_winner not in (-1, 0, 1)) then v_void := 'mismatch'; end if;
  -- la duración no puede ser mayor que el tiempo real que pasó desde que empezó la ronda
  v_dur := least(coalesce((rep->>'duration')::real, 0), extract(epoch from now() - m.round_at)::real + 3);
  if v_void is null and v_dur < 8 then v_void := 'too_short'; end if;

  if v_void is not null then
    update online_matches set rounds = rounds || jsonb_build_object('r', m.round, 'game', v_game, 'void', true, 'reason', v_void),
      round = round + 1, round_at = now() where id = m.id;
  else
    v_m := jsonb_build_object('game', v_game, 'winner', v_winner, 'scores', rep->'scores', 'display', rep->'display',
      'margin', rep->'margin', 'flags', rep->'flags', 'records', rep->'records', 'display_records', rep->'display_records',
      'colors', rep->'colors', 'duration', round(v_dur::numeric, 1), 'difficulty', case when m.caos then 'caos' else 'normal' end);
    v_rec := dc.online_record(m.id, v_m);
    if v_rec is not null then
      foreach v_s in array array[0, 1] loop
        insert into online_reports(match_id, round, slot, out) values (m.id, m.round, v_s, v_rec->'outs'->v_s)
          on conflict (match_id, round, slot) do update set out = excluded.out;
      end loop;
    end if;
    update online_matches set
      rounds = rounds || jsonb_build_object('r', m.round, 'game', v_game, 'winner', v_winner, 'scores', rep->'scores',
        'display', rep->'display', 'd', coalesce(v_rec->'d', '[0,0]'::jsonb), 'single', p_single_slot is not null),
      wins = case v_winner when 0 then array[wins[1] + 1, wins[2]] when 1 then array[wins[1], wins[2] + 1] else wins end,
      played = played + 1, round = round + 1, round_at = now()
    where id = m.id;
  end if;
  perform dc.online_advance(m.id);
end $$;

-- Un jugador abandona (se fue o dejó de responder): pierde la ronda en curso y la serie
create or replace function dc.online_forfeit(p_id uuid, p_leaver integer, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare m online_matches; v_game text; v_rec jsonb; v_m jsonb; v_s integer; v_dur real; v_rep integer;
begin
  select * into m from online_matches where id = p_id for update;
  if m.status = 'waiting' then
    update online_matches set status = 'cancelled', finished_at = now(), end_reason = p_reason where id = m.id;
    return;
  end if;
  if m.status <> 'playing' then return; end if;
  -- si la ronda en curso ya tiene un reporte (terminó en alguna de las dos compus), vale ese resultado
  select slot into v_rep from online_reports where match_id = m.id and round = m.round and report <> '{}'::jsonb
    order by (slot = p_leaver) limit 1;
  if v_rep is not null then
    perform dc.online_resolve(m.id, v_rep);
    perform dc.online_finish(m.id, 1 - p_leaver, p_reason);
    return;
  end if;
  v_game := m.games[m.round + 1];
  v_dur := greatest(8, least(900, extract(epoch from now() - m.round_at)::real));
  v_m := jsonb_build_object('game', v_game, 'winner', 1 - p_leaver, 'scores', jsonb_build_array(null, null),
    'display', jsonb_build_array(case when p_leaver = 0 then 'abandonó' else '—' end, case when p_leaver = 1 then 'abandonó' else '—' end),
    'flags', jsonb_build_array('{}'::jsonb, '{}'::jsonb), 'records', jsonb_build_array(null, null),
    'duration', round(v_dur::numeric, 1), 'difficulty', case when m.caos then 'caos' else 'normal' end);
  v_rec := dc.online_record(m.id, v_m);
  if v_rec is not null then
    foreach v_s in array array[0, 1] loop
      insert into online_reports(match_id, round, slot, out) values (m.id, m.round, v_s, v_rec->'outs'->v_s)
        on conflict (match_id, round, slot) do update set out = excluded.out;
    end loop;
  end if;
  update online_matches set
    rounds = rounds || jsonb_build_object('r', m.round, 'game', v_game, 'winner', 1 - p_leaver, 'forfeit', true,
      'display', v_m->'display', 'd', coalesce(v_rec->'d', '[0,0]'::jsonb)),
    wins = case p_leaver when 1 then array[wins[1] + 1, wins[2]] else array[wins[1], wins[2] + 1] end,
    played = played + 1, round = round + 1, round_at = now()
  where id = m.id;
  perform dc.online_finish(m.id, 1 - p_leaver, p_reason);
end $$;

-- Controles perezosos: rival sin señales, reporte que nunca llega, salas abandonadas
create or replace function dc.online_tick(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m online_matches; v_single integer;
begin
  select * into m from online_matches where id = p_id;
  if m.status = 'waiting' and m.host_seen < now() - interval '45 seconds' then
    update online_matches set status = 'cancelled', finished_at = now(), end_reason = 'timeout' where id = m.id and status = 'waiting';
    return;
  end if;
  if m.status <> 'playing' then return; end if;
  if m.host_seen < now() - interval '25 seconds' and coalesce(m.guest_seen, now()) > now() - interval '25 seconds' then
    perform dc.online_forfeit(m.id, 0, 'abandon');
    return;
  elsif coalesce(m.guest_seen, m.created_at) < now() - interval '25 seconds' and m.host_seen > now() - interval '25 seconds' then
    perform dc.online_forfeit(m.id, 1, 'abandon');
    return;
  elsif m.host_seen < now() - interval '3 minutes' and coalesce(m.guest_seen, m.created_at) < now() - interval '3 minutes' then
    perform dc.online_finish(m.id, case when m.wins[1] > m.wins[2] then 0 when m.wins[2] > m.wins[1] then 1 else -1 end, 'timeout');
    return;
  end if;
  -- un solo reporte hace más de 30 s y el otro jugador sigue conectado pero no informa: vale el reporte recibido
  select slot into v_single from online_reports r where r.match_id = m.id and r.round = m.round and r.at < now() - interval '30 seconds'
    and not exists (select 1 from online_reports o where o.match_id = m.id and o.round = m.round and o.slot <> r.slot);
  if v_single is not null then perform dc.online_resolve(m.id, v_single); end if;
end $$;

-- Sale de todas las partidas activas de una cuenta (salvo p_except)
create or replace function dc.online_leave_all(p_acc uuid, p_except uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  delete from online_queue where account_id = p_acc;
  for r in select id, host, guest, status from online_matches
           where (host = p_acc or guest = p_acc) and status in ('waiting', 'playing') and id is distinct from p_except loop
    perform dc.online_forfeit(r.id, case when r.host = p_acc then 0 else 1 end, 'left');
  end loop;
end $$;

create or replace function dc.online_cleanup() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from online_queue where seen_at < now() - interval '2 minutes';
  update online_matches set status = 'cancelled', finished_at = now(), end_reason = 'timeout'
    where status = 'waiting' and host_seen < now() - interval '45 seconds';
  delete from online_signals where at < now() - interval '3 hours';
end $$;

-- ================================================================== RPC PÚBLICAS DEL MODO ONLINE
-- Buscar rival (cola por SUSI). Se llama cada ~2 s mientras se busca: también sirve de "sigo acá".
create or replace function public.dc_online_find(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := dc.auth(p_token); q online_queue; o online_queue; m online_matches; v_rating integer; v_waited real; v_id uuid;
begin
  perform dc.online_cleanup();
  select * into q from online_queue where account_id = v_me;
  if q.match_id is not null then
    select * into m from online_matches where id = q.match_id;
    delete from online_queue where account_id = v_me;
    if m.status = 'playing' then
      update online_matches set host_seen = case when host = v_me then now() else host_seen end,
        guest_seen = case when guest = v_me then now() else guest_seen end where id = m.id;
      return dc.online_view(m.id, dc.online_slot(m, v_me));
    end if;
  end if;
  if q.account_id is null then
    -- entrar a la cola: deja cualquier otra partida activa
    perform dc.online_leave_all(v_me, null);
  end if;
  select rating into v_rating from accounts where id = v_me;
  insert into online_queue(account_id, rating, joined_at, seen_at) values (v_me, v_rating, now(), now())
    on conflict (account_id) do update set seen_at = now(), rating = excluded.rating, match_id = null,
      joined_at = case when online_queue.match_id is null then online_queue.joined_at else now() end
    returning * into q;
  v_waited := extract(epoch from now() - q.joined_at);
  -- el rango de SUSI aceptado se abre con la espera de cualquiera de los dos
  select * into o from online_queue c
    where c.account_id <> v_me and c.match_id is null and c.seen_at > now() - interval '8 seconds'
      and abs(c.rating - v_rating) <= least(2000, 150 + 20 * greatest(v_waited, extract(epoch from now() - c.joined_at)))
    order by abs(c.rating - v_rating), c.joined_at
    limit 1 for update skip locked;
  if o.account_id is not null then
    v_id := dc.online_new('ranked', o.account_id, v_me, null, '{"best_of": 3}'::jsonb);
    update online_queue set match_id = v_id where account_id = o.account_id;
    delete from online_queue where account_id = v_me;
    return dc.online_view(v_id, 1);
  end if;
  return jsonb_build_object('status', 'searching', 'waited', round(v_waited::numeric, 1),
    'queue', (select count(*) from online_queue where seen_at > now() - interval '8 seconds' and match_id is null));
end $$;

create or replace function public.dc_online_cancel(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  delete from online_queue where account_id = v_me and match_id is null;
  update online_matches set status = 'cancelled', finished_at = now(), end_reason = 'cancelled'
    where host = v_me and status = 'waiting';
  return jsonb_build_object('ok', true);
end $$;

-- Crear una sala privada (código para compartir)
create or replace function public.dc_online_room(p_token text, p_opts jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_id uuid;
begin
  perform dc.online_cleanup();
  perform dc.online_leave_all(v_me, null);
  v_id := dc.online_new('room', v_me, null, null, coalesce(p_opts, '{}'::jsonb));
  return dc.online_view(v_id, 0);
end $$;

-- Desafiar a un amigo (le llega una notificación y lo ve en el CLUB)
create or replace function public.dc_online_challenge(p_token text, p_username text, p_opts jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_o uuid; v_id uuid; v_name text; v_code text;
begin
  select id into v_o from accounts where username = lower(p_username);
  if v_o is null or v_o = v_me then perform dc.err('not_found'); end if;
  if not exists (select 1 from friendships where a = least(v_me, v_o) and b = greatest(v_me, v_o) and status = 'accepted') then
    perform dc.err('not_friends');
  end if;
  perform dc.online_cleanup();
  perform dc.online_leave_all(v_me, null);
  v_id := dc.online_new('challenge', v_me, null, v_o, coalesce(p_opts, '{}'::jsonb));
  select display_name into v_name from accounts where id = v_me;
  select code into v_code from online_matches where id = v_id;
  perform dc.notify(v_o, 'challenge', 'Desafío online', v_name || ' te desafía a un duelo online.',
    jsonb_build_object('match', v_id, 'code', v_code, 'user', (select username from accounts where id = v_me)));
  return dc.online_view(v_id, 0);
end $$;

-- Desafíos pendientes para mí (el que desafía tiene que seguir esperando)
create or replace function public.dc_online_inbox(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'code', m.code, 'best_of', m.best_of, 'caos', m.caos,
      'game', case when m.games[1] = all(m.games) then m.games[1] else 'random' end,
      'rematch', m.rematch_of is not null, 'from', dc.public_card(h), 'at', m.created_at) order by m.created_at desc)
    from online_matches m join accounts h on h.id = m.host
    where m.invited = v_me and m.status = 'waiting' and m.host_seen > now() - interval '20 seconds'), '[]'::jsonb);
end $$;

create or replace function public.dc_online_decline(p_token text, p_match uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  update online_matches set status = 'cancelled', finished_at = now(), end_reason = 'declined'
    where id = p_match and invited = v_me and status = 'waiting';
  return jsonb_build_object('ok', true);
end $$;

-- Entrar a una sala con su código (o aceptar un desafío)
create or replace function public.dc_online_join(p_token text, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); m online_matches;
begin
  perform dc.online_cleanup();
  select * into m from online_matches where code = upper(trim(p_code)) and status in ('waiting', 'playing') for update;
  if not found then perform dc.err('room_not_found'); end if;
  if m.host = v_me then return dc.online_view(m.id, 0); end if;
  if m.guest = v_me then return dc.online_view(m.id, 1); end if;
  if m.status <> 'waiting' or m.guest is not null then perform dc.err('room_full'); end if;
  if m.invited is not null and m.invited <> v_me then perform dc.err('room_private'); end if;
  if m.host_seen < now() - interval '45 seconds' then perform dc.err('room_not_found'); end if;
  perform dc.online_leave_all(v_me, m.id);
  update online_matches set guest = v_me, status = 'playing', started_at = now(), round_at = now(), guest_seen = now()
    where id = m.id;
  return dc.online_view(m.id, 1);
end $$;

-- Estado de la partida + "sigo conectado" + mensajes de conexión del rival (WebRTC)
create or replace function public.dc_online_state(p_token text, p_match uuid, p_after bigint default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); m online_matches; v_slot integer;
begin
  select * into m from online_matches where id = p_match;
  if not found then perform dc.err('not_found'); end if;
  v_slot := dc.online_slot(m, v_me);
  if m.status in ('waiting', 'playing') then
    update online_matches set host_seen = case when v_slot = 0 then now() else host_seen end,
      guest_seen = case when v_slot = 1 then now() else guest_seen end where id = m.id;
    perform dc.online_tick(m.id);
  end if;
  return dc.online_view(m.id, v_slot) || jsonb_build_object('signals',
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'p', s.payload) order by s.id)
      from (select * from online_signals where match_id = m.id and slot = 1 - v_slot and id > coalesce(p_after, 0) order by id limit 40) s), '[]'::jsonb));
end $$;

create or replace function public.dc_online_signal(p_token text, p_match uuid, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); m online_matches; v_slot integer; v_id bigint;
begin
  select * into m from online_matches where id = p_match;
  if not found or m.status <> 'playing' then perform dc.err('not_found'); end if;
  v_slot := dc.online_slot(m, v_me);
  if octet_length(p_payload::text) > 16000 then perform dc.err('invalid'); end if;
  if (select count(*) from online_signals where match_id = m.id and slot = v_slot) >= 300 then perform dc.err('too_many_requests'); end if;
  insert into online_signals(match_id, slot, payload) values (m.id, v_slot, p_payload) returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

-- Resultado de la ronda visto desde esta compu. Cuenta cuando las dos compus informan lo mismo.
create or replace function public.dc_online_report(p_token text, p_match uuid, p_round integer, p_report jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); m online_matches; v_slot integer;
begin
  select * into m from online_matches where id = p_match for update;
  if not found then perform dc.err('not_found'); end if;
  v_slot := dc.online_slot(m, v_me);
  if m.status = 'playing' and p_round = m.round then
    if octet_length(p_report::text) > 8000 then perform dc.err('invalid'); end if;
    insert into online_reports(match_id, round, slot, report) values (m.id, m.round, v_slot, p_report)
      on conflict (match_id, round, slot) do nothing;
    update online_matches set host_seen = case when v_slot = 0 then now() else host_seen end,
      guest_seen = case when v_slot = 1 then now() else guest_seen end where id = m.id;
    perform dc.online_resolve(m.id);
  end if;
  return dc.online_view(m.id, v_slot);
end $$;

-- Abandonar (o cancelar la sala si todavía no entró nadie)
create or replace function public.dc_online_leave(p_token text, p_match uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); m online_matches; v_slot integer;
begin
  select * into m from online_matches where id = p_match;
  if not found then perform dc.err('not_found'); end if;
  v_slot := dc.online_slot(m, v_me);
  perform dc.online_forfeit(m.id, v_slot, 'left');
  return dc.online_view(m.id, v_slot);
end $$;

-- Revancha: el primero que la pide crea la sala; el otro, al pedirla, entra
create or replace function public.dc_online_rematch(p_token text, p_match uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); m online_matches; r online_matches; v_slot integer; v_opp uuid; v_id uuid;
begin
  select * into m from online_matches where id = p_match;
  if not found then perform dc.err('not_found'); end if;
  v_slot := dc.online_slot(m, v_me);
  if m.status not in ('finished', 'cancelled') or m.guest is null then perform dc.err('invalid'); end if;
  v_opp := case v_slot when 0 then m.guest else m.host end;
  select * into r from online_matches where rematch_of = m.id and status in ('waiting', 'playing') order by created_at desc limit 1 for update;
  if found then
    if r.host = v_me then return dc.online_view(r.id, 0); end if;
    if r.guest = v_me then return dc.online_view(r.id, 1); end if;
    if r.status = 'waiting' and r.invited = v_me then
      perform dc.online_leave_all(v_me, r.id);
      update online_matches set guest = v_me, status = 'playing', started_at = now(), round_at = now(), guest_seen = now() where id = r.id;
      return dc.online_view(r.id, 1);
    end if;
    perform dc.err('room_full');
  end if;
  perform dc.online_leave_all(v_me, null);
  v_id := dc.online_new('challenge', v_me, null, v_opp, jsonb_build_object('best_of', m.best_of, 'caos', m.caos,
    'game', case when m.games[1] = all(m.games) then m.games[1] else 'random' end), m.id);
  return dc.online_view(v_id, 0);
end $$;

-- permisos: internas cerradas, públicas solo por RPC
revoke all on all functions in schema dc from public, anon, authenticated;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dc\_online\_%' loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
end $$;

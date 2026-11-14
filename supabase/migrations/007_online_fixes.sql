-- DUEL CLUB · 007 · Arreglos del modo online
--  · Volver a entrar a una partida en curso (después de recargar la página): se pierde solo la ronda que estaba
--    en juego, no la serie.
--  · Una ronda corta pero legítima (p. ej. Reaction Rush con salidas en falso) ya no se anula: mínimo 4 s.
--  · Una ronda que nadie informa en 12 minutos se anula sola (la serie nunca queda trabada).

-- ------------------------------------------------------------------ ronda perdida por abandono (sin cerrar la serie)
create or replace function dc.online_round_forfeit(p_id uuid, p_leaver integer, p_note text default 'abandonó') returns void
language plpgsql security definer set search_path = public as $$
declare m online_matches; v_game text; v_rec jsonb; v_m jsonb; v_s integer; v_dur real;
begin
  select * into m from online_matches where id = p_id for update;
  if m.status <> 'playing' then return; end if;
  v_game := m.games[m.round + 1];
  v_dur := greatest(8, least(900, extract(epoch from now() - m.round_at)::real));
  v_m := jsonb_build_object('game', v_game, 'winner', 1 - p_leaver, 'scores', jsonb_build_array(null, null),
    'display', jsonb_build_array(case when p_leaver = 0 then p_note else '—' end, case when p_leaver = 1 then p_note else '—' end),
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
end $$;

-- Un jugador abandona (se fue o dejó de responder): pierde la ronda en curso y la serie
create or replace function dc.online_forfeit(p_id uuid, p_leaver integer, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare m online_matches; v_rep integer;
begin
  select * into m from online_matches where id = p_id for update;
  if m.status = 'waiting' then
    update online_matches set status = 'cancelled', finished_at = now(), end_reason = p_reason where id = m.id;
    return;
  end if;
  if m.status <> 'playing' then return; end if;
  -- si la ronda en curso ya tiene un resultado informado (terminó en alguna de las dos compus), vale ese resultado
  select slot into v_rep from online_reports where match_id = m.id and round = m.round
    and report <> '{}'::jsonb and not coalesce((report->>'desync')::boolean, false)
    order by (slot = p_leaver) limit 1;
  if v_rep is not null then
    perform dc.online_resolve(m.id, v_rep);
  else
    perform dc.online_round_forfeit(m.id, p_leaver);
  end if;
  perform dc.online_finish(m.id, 1 - p_leaver, p_reason);
end $$;

-- ------------------------------------------------------------------ informe de ronda (con "volví a entrar")
create or replace function public.dc_online_report(p_token text, p_match uuid, p_round integer, p_report jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); m online_matches; v_slot integer; v_other jsonb;
begin
  select * into m from online_matches where id = p_match for update;
  if not found then perform dc.err('not_found'); end if;
  v_slot := dc.online_slot(m, v_me);
  if m.status = 'playing' and p_round = m.round then
    if octet_length(p_report::text) > 8000 then perform dc.err('invalid'); end if;
    update online_matches set host_seen = case when v_slot = 0 then now() else host_seen end,
      guest_seen = case when v_slot = 1 then now() else guest_seen end where id = m.id;
    if p_report->>'reason' = 'rejoin' then
      -- recargó la página con la ronda en juego: si el rival ya informó un resultado vale ese; si no, pierde la ronda
      select report into v_other from online_reports where match_id = m.id and round = m.round and slot = 1 - v_slot;
      if v_other is not null and v_other <> '{}'::jsonb and not coalesce((v_other->>'desync')::boolean, false) then
        perform dc.online_resolve(m.id, 1 - v_slot);
      else
        perform dc.online_round_forfeit(m.id, v_slot, 'se desconectó');
        perform dc.online_advance(m.id);
      end if;
    else
      insert into online_reports(match_id, round, slot, report) values (m.id, m.round, v_slot, p_report)
        on conflict (match_id, round, slot) do nothing;
      perform dc.online_resolve(m.id);
    end if;
  end if;
  return dc.online_view(m.id, v_slot);
end $$;

-- ------------------------------------------------------------------ mi partida en curso (para volver a entrar)
create or replace function public.dc_online_active(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); m online_matches;
begin
  select * into m from online_matches where status = 'playing' and (host = v_me or guest = v_me)
    order by started_at desc limit 1;
  if not found then return jsonb_build_object('active', false); end if;
  perform dc.online_tick(m.id);
  select * into m from online_matches where id = m.id;
  if m.status <> 'playing' then return jsonb_build_object('active', false); end if;
  return jsonb_build_object('active', true, 'match', dc.online_view(m.id, dc.online_slot(m, v_me)));
end $$;

-- ------------------------------------------------------------------ ajustes en funciones existentes
do $$
declare d text; n text;
begin
  -- duración mínima de una ronda online: 4 s (antes 8 s, que anulaba rondas cortas legítimas)
  d := pg_get_functiondef('dc.online_resolve(uuid,integer)'::regprocedure);
  n := replace(d, 'if v_void is null and v_dur < 8 then', 'if v_void is null and v_dur < 4 then');
  if n = d and position('v_dur < 4' in d) = 0 then raise exception 'online_resolve: no se encontró el texto'; end if;
  execute n;
  -- ronda sin ningún informe en 12 minutos: se anula sola
  d := pg_get_functiondef('dc.online_tick(uuid)'::regprocedure);
  if position('round_timeout' in d) = 0 then
    n := replace(d, '  select slot into v_single from online_reports r', $r$  if m.round_at < now() - interval '12 minutes'
     and not exists (select 1 from online_reports r0 where r0.match_id = m.id and r0.round = m.round and r0.report <> '{}'::jsonb) then
    update online_matches set rounds = rounds || jsonb_build_object('r', m.round, 'game', m.games[m.round + 1], 'void', true, 'reason', 'round_timeout'),
      round = round + 1, round_at = now() where id = m.id;
    perform dc.online_advance(m.id);
    return;
  end if;
  select slot into v_single from online_reports r$r$);
    if n = d then raise exception 'online_tick: no se encontró el texto'; end if;
    execute n;
  end if;
end $$;

revoke all on all functions in schema dc from public, anon, authenticated;
revoke all on function public.dc_online_active(text) from public;
grant execute on function public.dc_online_active(text) to anon, authenticated;

-- DUEL CLUB · parte B de la migración 023 (salas 2v2 online).
-- La parte A (tablas, ranking 2v2, historial, reportes) ya está instalada.
-- Pegar TODO este archivo en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.

create or replace function public.dc_room_create(p_token text, p_dev text, p_mode text default 'friendly') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_id uuid;
begin
  if p_mode not in ('friendly', 'competitive') or length(coalesce(p_dev, '')) < 8 then perform dc.err('invalid_request'); end if;
  if (select count(*) from rooms r join room_devices d on d.room_id = r.id where d.account_id = v_me and r.created_at > now() - interval '1 hour') >= 30 then perform dc.err('too_many_rooms'); end if;
  insert into rooms(code, mode) values (dc.room_code(), p_mode) returning id into v_id;
  insert into room_devices(room_id, idx, dev_key, account_id) values (v_id, 0, p_dev, v_me);
  return dc.room_view(v_id, 0);
end $$;

create or replace function public.dc_room_join(p_token text, p_code text, p_dev text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); r rooms; d room_devices; v_idx integer;
begin
  select * into r from rooms where code = upper(trim(p_code)) and status in ('lobby', 'playing', 'confirm') order by created_at desc limit 1 for update;
  if not found then perform dc.err('room_not_found'); end if;
  select * into d from room_devices where room_id = r.id and dev_key = p_dev;
  if found then
    if d.account_id <> v_me then perform dc.err('not_in_room'); end if;
    update room_devices set seen_at = now() where room_id = r.id and idx = d.idx;
    return dc.room_view(r.id, d.idx);
  end if;
  if r.status <> 'lobby' then perform dc.err('room_busy'); end if;
  select min(i) into v_idx from generate_series(0, 3) i where i not in (select idx from room_devices where room_id = r.id);
  if v_idx is null then perform dc.err('room_full'); end if;
  insert into room_devices(room_id, idx, dev_key, account_id) values (r.id, v_idx, p_dev, v_me);
  update rooms set updated_at = now() where id = r.id;
  return dc.room_view(r.id, v_idx);
end $$;

-- estado + señales WebRTC + reglas de desconexión (la llama cada compu ~cada segundo)
create or replace function public.dc_room_state(p_token text, p_room uuid, p_dev text, p_after bigint default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev); r rooms; gone record;
begin
  select * into r from rooms where id = p_room for update;
  -- una compu dejó de responder durante una partida: la ronda se corta (ver dc.room_abandon)
  if r.status = 'playing' then
    for gone in select idx from room_devices where room_id = p_room and seen_at < now() - interval '25 seconds' loop
      perform dc.room_abandon(p_room, gone.idx, 'Una compu se desconectó durante la partida.');
    end loop;
  elsif r.status = 'confirm' and r.confirm_until < now() then
    perform dc.room_cancel_match(p_room);
  elsif r.status = 'lobby' and r.queued_at is not null then
    perform dc.queue2_try(p_room);
  end if;
  delete from room_signals where room_id = p_room and at < now() - interval '10 minutes';
  return dc.room_view(p_room, d.idx, p_after);
end $$;

create or replace function public.dc_room_slot(p_token text, p_room uuid, p_dev text, p_slot integer, p_action text,
  p_acc_token text default null, p_arg text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev); r rooms; s room_slots; v_acc uuid;
begin
  select * into r from rooms where id = p_room for update;
  if r.status <> 'lobby' then perform dc.err('room_busy'); end if;
  if p_slot not between 0 and 3 then perform dc.err('invalid_request'); end if;
  select * into s from room_slots where room_id = p_room and slot = p_slot;
  if p_action = 'clear' then
    if found and (d.idx = 0 or s.dev_idx = d.idx) then delete from room_slots where room_id = p_room and slot = p_slot; end if;
  else
    if found then perform dc.err('slot_taken'); end if;
    if p_action = 'take' then
      v_acc := dc.auth(p_acc_token); -- cada jugador entra con SU sesión
      if exists (select 1 from room_slots where room_id = p_room and account_id = v_acc) then perform dc.err('already_in_room'); end if;
      insert into room_slots(room_id, slot, kind, dev_idx, account_id) values (p_room, p_slot, 'local', d.idx, v_acc);
    elsif p_action = 'guest' then
      if r.mode = 'competitive' then perform dc.err('competitive_rules'); end if;
      insert into room_slots(room_id, slot, kind, dev_idx, guest_name) values (p_room, p_slot, 'local', d.idx, left(coalesce(nullif(dc.clean_name(p_arg), ''), 'Invitado'), 16));
    elsif p_action = 'bot' then
      if d.idx <> 0 then perform dc.err('host_only'); end if;
      if r.mode = 'competitive' then perform dc.err('competitive_rules'); end if;
      if p_arg not in ('easy', 'normal', 'hard', 'expert') then perform dc.err('invalid_request'); end if;
      insert into room_slots(room_id, slot, kind, dev_idx, bot_level) values (p_room, p_slot, 'bot', 0, p_arg);
    else perform dc.err('invalid_request');
    end if;
  end if;
  update rooms set updated_at = now(), queued_at = null where id = p_room;
  delete from queue2 where room_id = p_room;
  return dc.room_view(p_room, d.idx);
end $$;

-- anfitrión: modalidad y minijuego
create or replace function public.dc_room_kick(p_token text, p_room uuid, p_dev text, p_idx integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev);
begin
  if d.idx <> 0 or p_idx = 0 then perform dc.err('host_only'); end if;
  if (select status from rooms where id = p_room) <> 'lobby' then perform dc.err('room_busy'); end if;
  delete from room_slots where room_id = p_room and dev_idx = p_idx;
  delete from room_devices where room_id = p_room and idx = p_idx;
  return dc.room_view(p_room, d.idx);
end $$;

-- salir: si sale el anfitrión se cancela la sala; durante una partida cuenta como abandono
create or replace function public.dc_room_leave(p_token text, p_room uuid, p_dev text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev); r rooms;
begin
  select * into r from rooms where id = p_room for update;
  if r.status = 'playing' then perform dc.room_abandon(p_room, d.idx, 'Una compu salió de la partida.'); end if;
  delete from queue2 where room_id = p_room;
  if d.idx = 0 then
    update rooms set status = 'cancelled', updated_at = now(), note = 'El anfitrión cerró la sala.' where id = p_room;
  else
    delete from room_slots where room_id = p_room and dev_idx = d.idx;
    delete from room_devices where room_id = p_room and idx = d.idx;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ------------------------------------------------------------------ partida
create or replace function public.dc_room_start(p_token text, p_room uuid, p_dev text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev); r rooms; v_why text;
begin
  if d.idx <> 0 then perform dc.err('host_only'); end if;
  select * into r from rooms where id = p_room for update;
  if r.status <> 'lobby' then perform dc.err('room_busy'); end if;
  v_why := dc.room_why(p_room);
  if v_why is not null then raise exception using errcode = 'P0001', message = 'room_not_ready', detail = v_why; end if;
  delete from queue2 where room_id = p_room;
  update rooms set status = 'playing', round = round + 1, round_at = now(), seed = (random() * 2147483647)::bigint, queued_at = null, note = null,
    last = null, updated_at = now() where id = p_room;
  update room_devices set seen_at = now() where room_id = p_room;
  return dc.room_view(p_room, d.idx);
end $$;

-- ELO 2v2: equipo = promedio de sus dos jugadores; cada humano cambia según su K (más grande al principio)
create or replace function dc.room_abandon(p_room uuid, p_idx integer, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare r rooms; teams integer[]; out jsonb;
begin
  select * into r from rooms where id = p_room;
  if r.status <> 'playing' then return; end if;
  select array_agg(distinct slot % 2) into teams from room_slots where room_id = p_room and dev_idx = p_idx and kind = 'local';
  if r.mode = 'competitive' and array_length(teams, 1) = 1 then
    out := dc.room_rate(p_room, (1 - teams[1])::smallint, 'ok', jsonb_build_object('abandon', true));
  else
    out := jsonb_build_object('winner', null, 'status', 'void', 'mode', r.mode, 'round', r.round, 'deltas', '{}'::jsonb);
  end if;
  delete from room_slots where room_id = p_room and dev_idx = p_idx;
  delete from room_devices where room_id = p_room and idx = p_idx;
  update rooms set status = case when p_idx = 0 then 'cancelled' else 'lobby' end, last = out || jsonb_build_object('abandon_idx', p_idx), note = p_note, updated_at = now() where id = p_room;
end $$;

-- ------------------------------------------------------------------ BÚSQUEDA DE PARTIDA (competitivo)
-- Una sala con 1 o 2 cuentas en el equipo azul (y nada en el rojo) puede buscar rivales. Se arman:
-- dúo contra dúo, dúo contra dos solos, o cuatro solos. El rango de ELO arranca en ±150 y se abre 10 por segundo
-- (máximo ±800). Al encontrar: se crea una sala nueva, cada compu tiene 25 s para confirmar.
create or replace function public.dc_room_queue(p_token text, p_room uuid, p_dev text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev); r rooms; n integer; nr integer; av integer;
begin
  if d.idx <> 0 then perform dc.err('host_only'); end if;
  select * into r from rooms where id = p_room for update;
  if r.status <> 'lobby' then perform dc.err('room_busy'); end if;
  if not p_on then
    delete from queue2 where room_id = p_room; update rooms set queued_at = null where id = p_room;
    return dc.room_view(p_room, d.idx);
  end if;
  select count(*) filter (where slot % 2 = 0 and kind = 'local' and account_id is not null), count(*) filter (where slot % 2 = 1 or kind <> 'local' or account_id is null),
         avg(dc.r2(account_id))::int into n, nr, av from room_slots where room_id = p_room;
  if n < 1 or n > 2 or nr > 0 then raise exception using errcode = 'P0001', message = 'room_not_ready', detail = 'Para buscar partida: 1 o 2 jugadores con cuenta en el equipo azul y el equipo rojo vacío.'; end if;
  update rooms set mode = 'competitive', queued_at = now() where id = p_room;
  insert into queue2(room_id, size, avg_rating) values (p_room, n, av) on conflict (room_id) do update set size = excluded.size, avg_rating = excluded.avg_rating, since = now();
  perform dc.queue2_try(p_room);
  return dc.room_view(p_room, d.idx);
end $$;

create or replace function dc.queue2_try(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q queue2; win integer; grp uuid[]; g record; nr uuid; i integer; t integer; slot_t0 integer; slot_t1 integer; parts record; teams_of jsonb := '{}'::jsonb; v_idx integer;
begin
  select * into q from queue2 where room_id = p_room for update skip locked;
  if not found then return; end if;
  -- salas en la cola que siguen vivas (alguna compu respondió hace poco)
  delete from queue2 x where not exists (select 1 from room_devices d where d.room_id = x.room_id and d.seen_at > now() - interval '20 seconds');
  win := least(800, 150 + extract(epoch from now() - q.since)::int * 10);
  -- dúo: busco otro dúo, o dos solos. solo: busco otro solo y un dúo, o tres solos
  grp := array[p_room];
  for g in select x.room_id, x.size from queue2 x where x.room_id <> p_room and abs(x.avg_rating - q.avg_rating) <= win order by abs(x.avg_rating - q.avg_rating), x.since for update skip locked loop
    if (select sum(size) from queue2 where room_id = any(grp)) + g.size <= 4 then grp := grp || g.room_id; end if;
    exit when (select sum(size) from queue2 where room_id = any(grp)) = 4;
  end loop;
  if (select sum(size) from queue2 where room_id = any(grp)) <> 4 then return; end if;
  -- armar equipos: los dúos quedan juntos
  insert into rooms(code, kind, mode, status, game, confirm_until) values (dc.room_code(), 'match', 'competitive', 'confirm', (dc.team_games())[1 + floor(random() * 6)::int], now() + interval '25 seconds') returning id into nr;
  v_idx := 0; slot_t0 := 0; slot_t1 := 1;
  for parts in select x.room_id, x.size from queue2 x where x.room_id = any(grp) order by x.size desc, x.since loop
    -- equipo para esta sala: el que tenga lugar (azul primero)
    t := case when slot_t0 + (parts.size - 1) * 2 <= 2 then 0 else 1 end;
    for g in select d.idx, d.dev_key, d.account_id from room_devices d where d.room_id = parts.room_id order by d.idx loop
      insert into room_devices(room_id, idx, dev_key, account_id) values (nr, v_idx, g.dev_key, g.account_id);
      for i in select s.slot from room_slots s where s.room_id = parts.room_id and s.dev_idx = g.idx order by s.slot loop
        if t = 0 then insert into room_slots(room_id, slot, kind, dev_idx, account_id) select nr, slot_t0, 'local', v_idx, s.account_id from room_slots s where s.room_id = parts.room_id and s.slot = i; slot_t0 := slot_t0 + 2;
        else insert into room_slots(room_id, slot, kind, dev_idx, account_id) select nr, slot_t1, 'local', v_idx, s.account_id from room_slots s where s.room_id = parts.room_id and s.slot = i; slot_t1 := slot_t1 + 2; end if;
      end loop;
      v_idx := v_idx + 1;
    end loop;
  end loop;
  delete from queue2 where room_id = any(grp);
  update rooms set status = 'moved', moved_to = nr, queued_at = null, updated_at = now() where id = any(grp);
end $$;

revoke all on function public.dc_room_create(text, text, text), public.dc_room_join(text, text, text), public.dc_room_state(text, uuid, text, bigint),
  public.dc_room_signal(text, uuid, text, integer, jsonb), public.dc_room_slot(text, uuid, text, integer, text, text, text), public.dc_room_set(text, uuid, text, text, text),
  public.dc_room_kick(text, uuid, text, integer), public.dc_room_leave(text, uuid, text), public.dc_room_start(text, uuid, text),
  public.dc_room_report(text, uuid, text, integer, smallint, jsonb), public.dc_room_queue(text, uuid, text, boolean), public.dc_room_confirm(text, uuid, text),
  public.dc_ranking2(text, integer), public.dc_history2(text) from public;
grant execute on function public.dc_room_create(text, text, text), public.dc_room_join(text, text, text), public.dc_room_state(text, uuid, text, bigint),
  public.dc_room_signal(text, uuid, text, integer, jsonb), public.dc_room_slot(text, uuid, text, integer, text, text, text), public.dc_room_set(text, uuid, text, text, text),
  public.dc_room_kick(text, uuid, text, integer), public.dc_room_leave(text, uuid, text), public.dc_room_start(text, uuid, text),
  public.dc_room_report(text, uuid, text, integer, smallint, jsonb), public.dc_room_queue(text, uuid, text, boolean), public.dc_room_confirm(text, uuid, text),
  public.dc_ranking2(text, integer), public.dc_history2(text) to anon, authenticated;

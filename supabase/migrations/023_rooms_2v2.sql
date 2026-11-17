-- 023 · 2v2 FLEXIBLE: salas con código, varias compus, varias cuentas por compu, bots, AMISTOSO y COMPETITIVO,
--        ELO 2v2 separado del 1v1, ranking 2v2, búsqueda de partida y reglas de desconexión.
-- Conceptos:
--  · DISPOSITIVO (room_devices): una compu conectada a la sala. Se identifica con una clave aleatoria de la pestaña
--    (dev_key) y la cuenta que la conectó. Una compu puede tener 1 a 4 jugadores: NO es lo mismo que un jugador.
--  · LUGARES (room_slots): 4 lugares (0..3). Equipo = lugar % 2 (0 y 2 azul, 1 y 3 rojo). Cada lugar es:
--    'local' (cuenta con su propia sesión, o invitado sin cuenta solo en amistoso), o 'bot' (solo amistoso).
--    Cada cuenta ocupa como máximo un lugar por sala, y para ocuparlo hay que presentar SU sesión (no la de otro).
--  · AMISTOSO: nunca cambia el ELO. COMPETITIVO: 4 cuentas humanas distintas, sin bots ni invitados.
--  · El resultado lo informa cada compu; se resuelve cuando todas coinciden (o la mayoría tras un plazo). Si no
--    coinciden: no cuenta para el ELO.
-- Nada de esto toca el ELO 1v1 ni su ranking.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null default 'private' check (kind in ('private', 'match')),
  mode text not null default 'friendly' check (mode in ('friendly', 'competitive')),
  status text not null default 'lobby' check (status in ('lobby', 'confirm', 'playing', 'moved', 'finished', 'cancelled')),
  game text,
  seed bigint,
  secret text not null default encode(extensions.gen_random_bytes(12), 'hex'),
  round integer not null default 0,
  round_at timestamptz,
  moved_to uuid,
  queued_at timestamptz,
  confirm_until timestamptz,
  last jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.room_devices (
  room_id uuid not null references public.rooms(id) on delete cascade,
  idx integer not null check (idx between 0 and 3),
  dev_key text not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  seen_at timestamptz not null default now(),
  confirmed boolean not null default false,
  primary key (room_id, idx),
  unique (room_id, dev_key)
);
create table if not exists public.room_slots (
  room_id uuid not null references public.rooms(id) on delete cascade,
  slot integer not null check (slot between 0 and 3),
  kind text not null check (kind in ('local', 'bot')),
  dev_idx integer,
  account_id uuid references public.accounts(id) on delete cascade,
  guest_name text,
  bot_level text,
  primary key (room_id, slot)
);
create unique index if not exists room_slots_acc on public.room_slots(room_id, account_id) where account_id is not null;
create table if not exists public.room_signals (
  id bigserial primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  from_idx integer not null,
  to_idx integer not null,
  payload jsonb not null,
  at timestamptz not null default now()
);
create index if not exists room_signals_to on public.room_signals(room_id, to_idx, id);
create table if not exists public.room_reports (
  room_id uuid not null references public.rooms(id) on delete cascade,
  round integer not null,
  dev_idx integer not null,
  winner smallint,
  scores jsonb,
  at timestamptz not null default now(),
  primary key (room_id, round, dev_idx)
);
-- ELO 2v2: individual, separado del 1v1
create table if not exists public.rating2 (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  rating integer not null default 1000,
  best integer not null default 1000,
  played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  updated_at timestamptz not null default now()
);
-- historial 2v2 (amistoso y competitivo, separados por mode)
create table if not exists public.matches2 (
  id bigserial primary key,
  room_id uuid,
  mode text not null,
  game text not null,
  team0 uuid[] not null default '{}',
  team1 uuid[] not null default '{}',
  names jsonb,
  winner smallint,
  scores jsonb,
  deltas jsonb,
  status text not null default 'ok',
  at timestamptz not null default now()
);
create index if not exists matches2_at on public.matches2(at desc);
create table if not exists public.queue2 (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  size integer not null,
  avg_rating integer not null,
  since timestamptz not null default now()
);
alter table public.rooms enable row level security;
alter table public.room_devices enable row level security;
alter table public.room_slots enable row level security;
alter table public.room_signals enable row level security;
alter table public.room_reports enable row level security;
alter table public.rating2 enable row level security;
alter table public.matches2 enable row level security;
alter table public.queue2 enable row level security;

create or replace function dc.r2(p_acc uuid) returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select rating from rating2 where account_id = p_acc), 1000)
$$;
-- juegos que existen en 2v2 (se validan en el servidor)
create or replace function dc.team_games() returns text[] language sql immutable as $$ select array['pong', 'color'] $$;

-- dispositivo que llama: valida sesión + clave de la pestaña
create or replace function dc.room_dev(p_token text, p_room uuid, p_dev text) returns room_devices
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); d room_devices;
begin
  select * into d from room_devices where room_id = p_room and dev_key = p_dev and account_id = v_me;
  if not found then perform dc.err('not_in_room'); end if;
  update room_devices set seen_at = now() where room_id = p_room and idx = d.idx;
  return d;
end $$;

create or replace function dc.room_code() returns text language plpgsql volatile as $$
declare c text;
begin
  loop
    c := upper(substr(translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/=01OIl', 'XYZ23456'), 1, 6));
    exit when not exists (select 1 from rooms where code = c and status not in ('finished', 'cancelled'));
  end loop;
  return c;
end $$;

-- ¿se puede empezar? (y por qué no)
create or replace function dc.room_why(p_room uuid) returns text language plpgsql stable security definer set search_path = public as $$
declare r rooms; n integer; nb integer; ng integer; na integer;
begin
  select * into r from rooms where id = p_room;
  select count(*), count(*) filter (where kind = 'bot'), count(*) filter (where kind = 'local' and account_id is null), count(distinct account_id)
    into n, nb, ng, na from room_slots where room_id = p_room;
  if n < 4 then return 'Faltan jugadores: tienen que estar los 4 lugares ocupados.'; end if;
  if r.mode = 'competitive' then
    if nb > 0 then return 'En COMPETITIVO no puede haber bots: cambiá a AMISTOSO o quitá el bot.'; end if;
    if ng > 0 then return 'En COMPETITIVO todos tienen que jugar con su cuenta (no se permiten invitados).'; end if;
    if na < 4 then return 'En COMPETITIVO tienen que ser 4 cuentas distintas.'; end if;
  end if;
  if r.game is null or not (r.game = any(dc.team_games())) then return 'Elegí un minijuego 2v2.'; end if;
  if exists (select 1 from room_devices where room_id = p_room and seen_at < now() - interval '20 seconds') then return 'Hay una compu desconectada.'; end if;
  return null;
end $$;

create or replace function dc.room_view(p_room uuid, p_me_idx integer, p_after bigint default 0) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r rooms;
begin
  select * into r from rooms where id = p_room;
  return jsonb_build_object(
    'id', r.id, 'code', r.code, 'kind', r.kind, 'mode', r.mode, 'status', r.status, 'game', r.game, 'seed', r.seed, 'secret', r.secret,
    'round', r.round, 'moved_to', r.moved_to, 'queued', r.queued_at is not null, 'queued_at', r.queued_at, 'confirm_until', r.confirm_until,
    'last', r.last, 'note', r.note, 'my_idx', p_me_idx, 'why', dc.room_why(p_room), 'now', now(),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('idx', d.idx, 'owner', a.username, 'name', a.display_name, 'online', d.seen_at > now() - interval '15 seconds',
        'confirmed', d.confirmed, 'me', d.idx = p_me_idx) order by d.idx) from room_devices d join accounts a on a.id = d.account_id where d.room_id = p_room), '[]'::jsonb),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('slot', s.slot, 'kind', s.kind, 'dev', s.dev_idx, 'bot', s.bot_level, 'guest', s.guest_name,
        'username', a.username, 'name', coalesce(a.display_name, s.guest_name), 'char', a."char", 'color', a.color, 'equipped', a.equipped,
        'rating2', case when a.id is null then null else dc.r2(a.id) end) order by s.slot)
      from room_slots s left join accounts a on a.id = s.account_id where s.room_id = p_room), '[]'::jsonb),
    'signals', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'from', from_idx, 'p', payload) order by id)
      from room_signals where room_id = p_room and to_idx = p_me_idx and id > coalesce(p_after, 0)), '[]'::jsonb));
end $$;

-- ------------------------------------------------------------------ crear, entrar, ver
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

create or replace function public.dc_room_signal(p_token text, p_room uuid, p_dev text, p_to integer, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev); v_id bigint;
begin
  if p_to = d.idx or not exists (select 1 from room_devices where room_id = p_room and idx = p_to) then perform dc.err('invalid_request'); end if;
  if length(p_payload::text) > 20000 then perform dc.err('invalid_request'); end if;
  insert into room_signals(room_id, from_idx, to_idx, payload) values (p_room, d.idx, p_to, p_payload) returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

-- ------------------------------------------------------------------ lugares
-- p_action: 'take' (la cuenta de p_acc_token ocupa el lugar desde esta compu), 'guest' (invitado, solo amistoso),
--           'bot' (solo el anfitrión, solo amistoso), 'clear' (anfitrión, o la compu dueña del lugar)
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
create or replace function public.dc_room_set(p_token text, p_room uuid, p_dev text, p_mode text, p_game text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev); r rooms;
begin
  if d.idx <> 0 then perform dc.err('host_only'); end if;
  select * into r from rooms where id = p_room for update;
  if r.status <> 'lobby' then perform dc.err('room_busy'); end if;
  if r.kind = 'match' and p_mode <> 'competitive' then perform dc.err('invalid_request'); end if;
  if p_mode not in ('friendly', 'competitive') or (p_game is not null and not (p_game = any(dc.team_games()))) then perform dc.err('invalid_request'); end if;
  update rooms set mode = p_mode, game = p_game, updated_at = now() where id = p_room;
  return dc.room_view(p_room, d.idx);
end $$;

-- anfitrión: echar a una compu (y sus jugadores)
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
create or replace function dc.room_rate(p_room uuid, p_winner smallint, p_status text, p_scores jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r rooms; t0 uuid[]; t1 uuid[]; ra real; rb real; e real; sres real; v_k integer; v_d integer; acc uuid; deltas jsonb := '{}'::jsonb;
  v_status text := p_status; v_names jsonb; v_same integer;
begin
  select * into r from rooms where id = p_room;
  select array_agg(account_id order by slot) filter (where slot % 2 = 0), array_agg(account_id order by slot) filter (where slot % 2 = 1),
         jsonb_agg(jsonb_build_object('slot', slot, 'name', coalesce((select display_name from accounts where id = s.account_id), s.guest_name, 'BOT ' || upper(s.bot_level))) order by slot)
    into t0, t1, v_names from room_slots s where room_id = p_room;
  if r.mode = 'competitive' and v_status = 'ok' then
    -- antifraude: cuentas recién creadas no mueven ELO; el mismo grupo de 4 como mucho 5 partidas con ELO por día
    if exists (select 1 from accounts where id = any(t0 || t1) and created_at > now() - interval '24 hours') then v_status := 'new_accounts';
    else
      select count(*) into v_same from matches2 where mode = 'competitive' and status = 'ok' and at > now() - interval '24 hours'
        and (team0 || team1) @> (t0 || t1) and (t0 || t1) @> (team0 || team1);
      if v_same >= 5 then v_status := 'limit'; end if;
    end if;
    if v_status = 'ok' then
      ra := (dc.r2(t0[1]) + dc.r2(t0[2])) / 2.0; rb := (dc.r2(t1[1]) + dc.r2(t1[2])) / 2.0;
      foreach acc in array t0 || t1 loop
        insert into rating2(account_id) values (acc) on conflict do nothing;
        e := case when acc = any(t0) then 1 / (1 + power(10, (rb - ra) / 400)) else 1 / (1 + power(10, (ra - rb) / 400)) end;
        sres := case when p_winner = -1 then 0.5 when (p_winner = 0) = (acc = any(t0)) then 1 else 0 end;
        v_k := case when (select played from rating2 where account_id = acc) < 10 then 40 else 28 end;
        v_d := round(v_k * (sres - e));
        update rating2 set rating = greatest(100, rating + v_d), best = greatest(best, rating + v_d), played = played + 1,
          wins = wins + (sres = 1)::int, losses = losses + (sres = 0)::int, draws = draws + (sres = 0.5)::int, updated_at = now() where account_id = acc;
        deltas := deltas || jsonb_build_object((select username from accounts where id = acc), v_d);
      end loop;
    end if;
  end if;
  insert into matches2(room_id, mode, game, team0, team1, names, winner, scores, deltas, status)
    values (p_room, r.mode, coalesce(r.game, '?'), coalesce(array_remove(t0, null), '{}'), coalesce(array_remove(t1, null), '{}'), v_names, p_winner, p_scores, deltas, v_status);
  return jsonb_build_object('winner', p_winner, 'deltas', deltas, 'status', v_status, 'mode', r.mode, 'round', r.round, 'scores', p_scores);
end $$;

-- cada compu informa el resultado de la ronda; se resuelve cuando informan todas (o la mayoría tras 40 s)
create or replace function public.dc_room_report(p_token text, p_room uuid, p_dev text, p_round integer, p_winner smallint, p_scores jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev); r rooms; n_dev integer; n_rep integer; n_win integer; v_w smallint; first_at timestamptz; out jsonb;
begin
  select * into r from rooms where id = p_room for update;
  if r.status <> 'playing' or r.round <> p_round then return dc.room_view(p_room, d.idx); end if;
  -- 0 / 1 = equipo ganador, -1 = empate, 2 = ronda sin resultado (desincronización o corte): nunca cambia el ELO
  if p_winner not in (-1, 0, 1, 2) then perform dc.err('invalid_request'); end if;
  insert into room_reports(room_id, round, dev_idx, winner, scores) values (p_room, p_round, d.idx, p_winner, p_scores) on conflict do nothing;
  select count(*) into n_dev from room_devices where room_id = p_room;
  select count(*), min(at) into n_rep, first_at from room_reports where room_id = p_room and round = p_round;
  select winner, count(*) into v_w, n_win from room_reports where room_id = p_room and round = p_round group by winner order by count(*) desc limit 1;
  if n_rep >= n_dev or (n_rep * 2 > n_dev and first_at < now() - interval '40 seconds') then
    if v_w = 2 then out := jsonb_build_object('winner', null, 'status', 'void', 'mode', r.mode, 'round', r.round, 'deltas', '{}'::jsonb);
    else out := dc.room_rate(p_room, v_w, case when n_win = n_rep then 'ok' else 'disputed' end, p_scores); end if;
    update rooms set status = 'lobby', last = out, updated_at = now() where id = p_room;
  end if;
  return dc.room_view(p_room, d.idx);
end $$;

-- abandono/desconexión durante una ronda: la ronda se corta. En COMPETITIVO, si los jugadores de esa compu son todos
-- de un mismo equipo, ese equipo pierde; si la compu tenía jugadores de los dos equipos, la ronda no cuenta.
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
  insert into rooms(code, kind, mode, status, game, confirm_until) values (dc.room_code(), 'match', 'competitive', 'confirm', (dc.team_games())[1 + floor(random() * 2)::int], now() + interval '25 seconds') returning id into nr;
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

create or replace function public.dc_room_confirm(p_token text, p_room uuid, p_dev text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d room_devices := dc.room_dev(p_token, p_room, p_dev); r rooms;
begin
  select * into r from rooms where id = p_room for update;
  if r.status <> 'confirm' then return dc.room_view(p_room, d.idx); end if;
  update room_devices set confirmed = true where room_id = p_room and idx = d.idx;
  if not exists (select 1 from room_devices where room_id = p_room and not confirmed) then
    update rooms set status = 'lobby', confirm_until = null, updated_at = now() where id = p_room;
  end if;
  return dc.room_view(p_room, d.idx);
end $$;

-- nadie (o no todos) confirmaron: la partida encontrada se cancela y cada uno vuelve a su sala
create or replace function dc.room_cancel_match(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update rooms set status = 'cancelled', note = 'Alguien no confirmó a tiempo. Podés volver a buscar.', updated_at = now() where id = p_room and status = 'confirm';
  update rooms set status = 'lobby', moved_to = null, note = 'Alguien no confirmó a tiempo. Podés volver a buscar.', updated_at = now() where moved_to = p_room;
end $$;

-- ------------------------------------------------------------------ ranking e historial 2v2
create or replace function public.dc_ranking2(p_token text default null, p_limit integer default 10) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid;
begin
  if p_token is not null then begin v_me := dc.auth(p_token); exception when others then v_me := null; end; end if;
  return jsonb_build_object(
    'total', (select count(*) from rating2 where played > 0),
    'rows', coalesce((select jsonb_agg(x order by (x->>'pos')::int) from (
      select jsonb_build_object('pos', row_number() over (order by r.rating desc, r.played desc), 'username', a.username, 'name', a.display_name, 'char', a."char",
        'color', a.color, 'equipped', a.equipped, 'value', r.rating, 'value2', r.best, 'played', r.played, 'wins', r.wins) x
      from rating2 r join accounts a on a.id = r.account_id where r.played > 0 order by r.rating desc, r.played desc limit least(100, greatest(1, p_limit))) t), '[]'::jsonb),
    'me', case when v_me is null then null else (select jsonb_build_object('pos', 1 + (select count(*) from rating2 o where o.played > 0 and o.rating > r.rating), 'value', r.rating, 'played', r.played)
      from rating2 r where r.account_id = v_me and r.played > 0) end);
end $$;

create or replace function public.dc_history2(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('at', at, 'mode', mode, 'game', game, 'names', names, 'winner', winner, 'status', status,
      'team', case when v_me = any(team0) then 0 else 1 end, 'delta', deltas->>(select username from accounts where id = v_me)) order by id desc)
    from (select * from matches2 where v_me = any(team0) or v_me = any(team1) order by id desc limit 30) m), '[]'::jsonb);
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

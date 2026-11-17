-- 022 · TOP 10 DE MINIJUEGOS + CHAT PRIVADO ENTRE AMIGOS + BLOQUEOS, SILENCIOS Y REPORTES
-- · Top 10: cuenta partidas REALES registradas (tabla matches). Nada inventado: sin partidas, lista vacía.
-- · Chat privado: solo entre dos amigos aceptados (nada de grupos). Mensajes de 1 a 300 caracteres, palabras
--   ofensivas tapadas con asteriscos, límite contra spam (5 cada 10 s y 60 por hora), bloqueos en los dos sentidos.
-- · Bloquear: el otro no te puede escribir y no ves sus mensajes de partida. Silenciar: no ves sus mensajes de partida.
-- · Reportes: quedan guardados con el texto, para revisión (el creador los ve en dc_admin_chat_reports).

-- ------------------------------------------------------------------ TOP 10
create or replace function public.dc_top_games() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from matches),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('game', game_id, 'n', n, 'pos', pos) order by pos) from (
      select game_id, count(*) n, row_number() over (order by count(*) desc, game_id) pos
      from matches where game_id is not null group by game_id order by n desc, game_id limit 10) t), '[]'::jsonb))
$$;
grant execute on function public.dc_top_games() to anon, authenticated;

-- ------------------------------------------------------------------ texto limpio
-- tapa con asteriscos cada palabra que no pasa el filtro de nombres (la lista de palabras bloqueadas es la misma)
create or replace function dc.clean_msg(p text) returns text language plpgsql immutable as $$
declare w text; out text := '';
begin
  p := regexp_replace(coalesce(p, ''), '[\x01-\x1F\x7F\u200B-\u200F\u202A-\u202E\u2060-\u206F]', '', 'g');
  p := btrim(regexp_replace(p, '\s+', ' ', 'g'));
  if p = '' then return ''; end if;
  foreach w in array regexp_split_to_array(p, ' ') loop
    out := out || case when out = '' then '' else ' ' end || case when dc.name_ok(w) and lower(w) !~ 'forr[oa]|boludo|culiad|culo' then w else repeat('*', char_length(w)) end;
  end loop;
  return left(out, 300);
end $$;

create or replace function dc.are_friends(x uuid, y uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where status = 'accepted' and ((a = x and b = y) or (a = y and b = x)))
$$;

-- ------------------------------------------------------------------ bloqueos y silencios
create table if not exists public.user_blocks (
  account_id uuid not null references public.accounts(id) on delete cascade,
  target_id uuid not null references public.accounts(id) on delete cascade,
  kind text not null check (kind in ('block', 'mute')),
  at timestamptz not null default now(),
  primary key (account_id, target_id, kind)
);
alter table public.user_blocks enable row level security;
create or replace function dc.blocked(x uuid, y uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks where kind = 'block' and ((account_id = x and target_id = y) or (account_id = y and target_id = x)))
$$;

create or replace function public.dc_block(p_token text, p_user text, p_kind text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_t uuid;
begin
  if p_kind not in ('block', 'mute') then perform dc.err('invalid_request'); end if;
  select id into v_t from accounts where username = lower(trim(p_user));
  if v_t is null or v_t = v_me then perform dc.err('user_not_found'); end if;
  if p_on then insert into user_blocks(account_id, target_id, kind) values (v_me, v_t, p_kind) on conflict do nothing;
  else delete from user_blocks where account_id = v_me and target_id = v_t and kind = p_kind; end if;
  return public.dc_blocks(p_token);
end $$;

create or replace function public.dc_blocks(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('username', a.username, 'name', a.display_name, 'kind', b.kind) order by b.at desc)
    from user_blocks b join accounts a on a.id = b.target_id where b.account_id = v_me), '[]'::jsonb);
end $$;

-- ------------------------------------------------------------------ chat privado
create table if not exists public.dm_messages (
  id bigserial primary key,
  from_id uuid not null references public.accounts(id) on delete cascade,
  to_id uuid not null references public.accounts(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists dm_pair on public.dm_messages(least(from_id, to_id), greatest(from_id, to_id), id desc);
create index if not exists dm_unread on public.dm_messages(to_id) where read_at is null;
create index if not exists dm_from_at on public.dm_messages(from_id, at desc);
alter table public.dm_messages enable row level security;

create or replace function dc.user_id(p_user text) returns uuid language sql stable security definer set search_path = public as $$
  select id from accounts where username = lower(trim(p_user))
$$;

create or replace function public.dc_dm_send(p_token text, p_to text, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_to uuid := dc.user_id(p_to); v_body text := dc.clean_msg(p_body); m dm_messages;
begin
  if v_to is null or v_to = v_me then perform dc.err('user_not_found'); end if;
  if not dc.are_friends(v_me, v_to) then perform dc.err('dm_not_friends'); end if;
  if dc.blocked(v_me, v_to) then perform dc.err('blocked'); end if;
  if v_body = '' then perform dc.err('invalid_request'); end if;
  if (select count(*) from dm_messages where from_id = v_me and at > now() - interval '10 seconds') >= 5
     or (select count(*) from dm_messages where from_id = v_me and at > now() - interval '1 hour') >= 60 then perform dc.err('chat_too_fast'); end if;
  insert into dm_messages(from_id, to_id, body) values (v_me, v_to, v_body) returning * into m;
  return jsonb_build_object('id', m.id, 'body', m.body, 'at', m.at, 'mine', true);
end $$;

-- conversación con un amigo (los últimos 60, o desde p_after para actualizar); marca como leídos los recibidos
create or replace function public.dc_dm_thread(p_token text, p_with text, p_after bigint default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_o uuid := dc.user_id(p_with);
begin
  if v_o is null then perform dc.err('user_not_found'); end if;
  update dm_messages set read_at = now() where to_id = v_me and from_id = v_o and read_at is null;
  return jsonb_build_object(
    'friend', dc.are_friends(v_me, v_o), 'blocked', dc.blocked(v_me, v_o),
    'msgs', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'body', body, 'at', at, 'mine', from_id = v_me, 'read', read_at is not null) order by id) from (
      select * from dm_messages where ((from_id = v_me and to_id = v_o) or (from_id = v_o and to_id = v_me)) and (p_after is null or id > p_after)
      order by id desc limit 60) t), '[]'::jsonb));
end $$;

-- bandeja: no leídos por amigo + último mensaje (para la lista de amigos y el aviso del menú)
create or replace function public.dc_dm_inbox(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return jsonb_build_object(
    'unread', (select count(*) from dm_messages d where d.to_id = v_me and d.read_at is null and not dc.blocked(v_me, d.from_id)),
    'threads', coalesce((select jsonb_agg(x order by (x->>'at') desc) from (
      select jsonb_build_object('username', a.username, 'name', a.display_name, 'color', a.color,
        'unread', (select count(*) from dm_messages u where u.to_id = v_me and u.from_id = a.id and u.read_at is null),
        'last', l.body, 'at', l.at, 'mine', l.from_id = v_me) x
      from (select distinct on (case when from_id = v_me then to_id else from_id end) case when from_id = v_me then to_id else from_id end other, body, at, from_id
            from dm_messages where from_id = v_me or to_id = v_me order by case when from_id = v_me then to_id else from_id end, id desc) l
      join accounts a on a.id = l.other where not dc.blocked(v_me, a.id)) t), '[]'::jsonb));
end $$;

-- ------------------------------------------------------------------ reportes de mensajes
create table if not exists public.chat_reports (
  id bigserial primary key,
  reporter uuid not null references public.accounts(id) on delete cascade,
  target uuid references public.accounts(id) on delete set null,
  kind text not null check (kind in ('dm', 'match')),
  msg_id bigint,
  body text,
  context text,
  at timestamptz not null default now(),
  status text not null default 'open'
);
alter table public.chat_reports enable row level security;
create or replace function public.dc_chat_report(p_token text, p_user text, p_kind text, p_msg bigint, p_body text, p_context text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_t uuid := dc.user_id(p_user); v_body text := left(coalesce(p_body, ''), 300);
begin
  if p_kind not in ('dm', 'match') or v_t is null then perform dc.err('invalid_request'); end if;
  if (select count(*) from chat_reports where reporter = v_me and at > now() - interval '1 hour') >= 20 then perform dc.err('chat_too_fast'); end if;
  -- en el chat privado el texto se toma del servidor (no se puede inventar un mensaje ajeno)
  if p_kind = 'dm' then
    select body into v_body from dm_messages where id = p_msg and from_id = v_t and to_id = v_me;
    if v_body is null then perform dc.err('invalid_request'); end if;
  end if;
  insert into chat_reports(reporter, target, kind, msg_id, body, context) values (v_me, v_t, p_kind, p_msg, v_body, left(p_context, 200));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.dc_block(text, text, text, boolean), public.dc_blocks(text), public.dc_dm_send(text, text, text),
  public.dc_dm_thread(text, text, bigint), public.dc_dm_inbox(text), public.dc_chat_report(text, text, text, bigint, text, text) from public;
grant execute on function public.dc_block(text, text, text, boolean), public.dc_blocks(text), public.dc_dm_send(text, text, text),
  public.dc_dm_thread(text, text, bigint), public.dc_dm_inbox(text), public.dc_chat_report(text, text, text, bigint, text, text) to anon, authenticated;

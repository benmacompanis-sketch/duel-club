-- DUEL CLUB · 010 · Usuarios en línea (presencia real) y moderación de nombres
--  · Cada navegador abierto avisa cada 30 s que sigue ahí ("latido"). El contador muestra cuántos navegadores
--    distintos dieron señales en los últimos 75 s (no es un número inventado).
--  · Nombres: se normalizan (minúsculas, sin acentos, números "leet" a letras, sin repeticiones) y se bloquean
--    insultos y palabras ofensivas. No se puede usar un nombre que ya usa otra cuenta.
--  · Cambio de nombre visible: una vez cada 7 días.

create table if not exists public.presence (
  client_id text primary key,
  account_id uuid references public.accounts(id) on delete cascade,
  place text,
  seen_at timestamptz not null default now()
);
create index if not exists presence_seen_idx on public.presence(seen_at);
alter table public.presence enable row level security;
alter table public.accounts add column if not exists name_changed_at timestamptz;

create or replace function public.dc_presence(p_client text, p_token text default null, p_place text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_acc uuid;
begin
  if p_client is null or p_client !~ '^[A-Za-z0-9_-]{8,40}$' then perform dc.err('invalid'); end if;
  if p_token is not null then
    begin v_acc := dc.auth(p_token); exception when others then v_acc := null; end;
  end if;
  insert into presence(client_id, account_id, place, seen_at) values (p_client, v_acc, left(p_place, 16), now())
    on conflict (client_id) do update set account_id = excluded.account_id, place = excluded.place, seen_at = now();
  if random() < 0.05 then delete from presence where seen_at < now() - interval '30 minutes'; end if;
  return jsonb_build_object(
    'online', (select count(*) from presence where seen_at > now() - interval '75 seconds'),
    'accounts', (select count(distinct account_id) from presence where seen_at > now() - interval '75 seconds' and account_id is not null),
    'playing', (select count(*) from presence where seen_at > now() - interval '75 seconds' and place in ('match', 'online')));
end $$;

-- ------------------------------------------------------------------ moderación de nombres
create or replace function dc.norm_name(p text) returns text language sql immutable as $$
  select regexp_replace(
    regexp_replace(
      translate(lower(coalesce(p, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç0134578@$!|', 'aaaaaeeeeiiiiooooouuuuncoieastbasii'),
      '[^a-z]', '', 'g'),
    '(.)\1+', '\1', 'g')
$$;

create or replace function dc.name_ok(p text) returns boolean language plpgsql immutable as $$
declare n text := dc.norm_name(p); w text;
begin
  -- palabras comunes que contienen una raíz bloqueada (para no bloquear nombres sanos)
  n := replace(replace(replace(replace(replace(n, 'computa', ''), 'disputa', ''), 'imputa', ''), 'reputa', ''), 'diputa', '');
  foreach w in array array[
    'puto', 'puta', 'putit', 'pelotud', 'forro', 'hdp', 'hijodeput', 'conchetumad', 'conchatumad', 'conchasumad', 'conchudo',
    'verga', 'lapija', 'pijud', 'pajer', 'mogolic', 'retrasad', 'mierda', 'cagon', 'trolo', 'maricon', 'marica', 'sorete', 'chupal', 'chupame',
    'nazi', 'hitler', 'violad', 'violar', 'pedof', 'porno', 'sexo', 'cocain', 'faloper',
    'niger', 'niga', 'fuck', 'shit', 'bitch', 'cunt', 'whore', 'faget', 'retard', 'pusy', 'slut'
  ] loop
    if position(w in n) > 0 then return false; end if;
  end loop;
  return true;
end $$;

-- ¿Otra cuenta ya usa ese nombre (como nombre visible o de usuario)?
create or replace function dc.name_taken(p_name text, p_except uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts where id is distinct from p_except
    and (lower(display_name) = lower(trim(p_name)) or username = lower(trim(p_name))))
$$;

create or replace function public.dc_rename(p_token text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_name text := dc.clean_name(p_name); a accounts;
begin
  select * into a from accounts where id = v_me for update;
  if char_length(v_name) < 3 then perform dc.err('name_invalid'); end if;
  if not dc.name_ok(v_name) then perform dc.err('name_blocked'); end if;
  if lower(v_name) = lower(a.display_name) then return jsonb_build_object('me', dc.me(v_me)); end if;
  if dc.name_taken(v_name, v_me) then perform dc.err('name_taken'); end if;
  if a.name_changed_at is not null and a.name_changed_at > now() - interval '7 days' then perform dc.err('name_cooldown'); end if;
  update accounts set display_name = v_name, name_changed_at = now() where id = v_me;
  return jsonb_build_object('me', dc.me(v_me));
end $$;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.dc_register(text,text,text)'::regprocedure);
  if position('name_ok' in d) = 0 then
    n := replace(d, $a$  if char_length(v_name) < 3 then perform dc.err('name_invalid'); end if;$a$,
      $a$  if char_length(v_name) < 3 then perform dc.err('name_invalid'); end if;
  if not dc.name_ok(v_name) or not dc.name_ok(v_user) then perform dc.err('name_blocked'); end if;
  if dc.name_taken(v_name, null) then perform dc.err('name_taken'); end if;$a$);
    if n = d then raise exception 'dc_register: no se encontró el texto'; end if;
    execute n;
  end if;
end $$;

revoke all on all functions in schema dc from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['dc_presence(text,text,text)', 'dc_rename(text,text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

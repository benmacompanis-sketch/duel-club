-- DUEL CLUB · 013 · Entrar con Google o con email (Supabase Auth)
-- Supabase Auth verifica a la persona (Google o un link al mail) y entrega un token firmado. Con ese token,
-- estas funciones abren la sesión del juego en la cuenta vinculada, crean una cuenta nueva o vinculan una
-- cuenta existente. El usuario y contraseña de siempre (y la recuperación con PIN) siguen funcionando.

alter table public.accounts add column if not exists auth_user uuid unique;
alter table public.accounts add column if not exists email text;

create or replace function public.dc_auth_external(p_username text default null, p_name text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_email text := auth.jwt()->>'email'; v_id uuid;
  v_user text := lower(trim(coalesce(p_username, ''))); v_name text := dc.clean_name(p_name);
begin
  if v_uid is null then perform dc.err('auth_required'); end if;
  select id into v_id from accounts where auth_user = v_uid;
  if v_id is not null then
    return jsonb_build_object('token', dc.new_session(v_id), 'me', dc.me(v_id));
  end if;
  if p_username is null then
    return jsonb_build_object('needs_signup', true, 'email', v_email);
  end if;
  -- cuenta nueva vinculada (mismas reglas que el registro común)
  if v_user !~ '^[a-z0-9_-]{3,16}$' then perform dc.err('username_invalid'); end if;
  if char_length(v_name) < 3 then perform dc.err('name_invalid'); end if;
  if not dc.name_ok(v_name) or not dc.name_ok(v_user) then perform dc.err('name_blocked'); end if;
  if exists (select 1 from accounts where username = v_user) then perform dc.err('username_taken'); end if;
  if dc.name_taken(v_name, null) then perform dc.err('name_taken'); end if;
  insert into accounts(username, display_name, pass_hash, auth_user, email)
    values (v_user, v_name, crypt(gen_random_uuid()::text, gen_salt('bf', 10)), v_uid, left(v_email, 200))
    returning id into v_id;
  perform dc.add_pies(v_id, 300, 'welcome');
  perform dc.notify(v_id, 'welcome', '¡Bienvenido a DUEL CLUB!', 'Te regalamos 300 PIES para estrenar la PIE STORE.');
  return jsonb_build_object('token', dc.new_session(v_id), 'me', dc.me(v_id));
end $$;

-- Vincular Google o email a la cuenta con la que ya estás jugando
create or replace function public.dc_auth_link(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_uid uuid := auth.uid();
begin
  if v_uid is null then perform dc.err('auth_required'); end if;
  if exists (select 1 from accounts where auth_user = v_uid and id <> v_me) then perform dc.err('auth_in_use'); end if;
  update accounts set auth_user = v_uid, email = left(auth.jwt()->>'email', 200) where id = v_me;
  return jsonb_build_object('me', dc.me(v_me));
end $$;

revoke all on function public.dc_auth_external(text, text) from public;
revoke all on function public.dc_auth_link(text) from public;
grant execute on function public.dc_auth_external(text, text) to anon, authenticated;
grant execute on function public.dc_auth_link(text) to anon, authenticated;

-- DUEL CLUB · 004 · Eliminar la propia cuenta (con contraseña).
-- Borra todo lo personal (en cascada: sesiones, inventario, logros, dominio, amistades, notificaciones, movimientos).
-- Las partidas con otros jugadores conservan el nombre del rival; se borran sus récords mundiales.
create or replace function public.dc_delete_account(p_token text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid := dc.auth(p_token); v_hash text;
begin
  select pass_hash into v_hash from accounts where id = v_id;
  if v_hash is null or v_hash <> crypt(coalesce(p_password, ''), v_hash) then perform dc.err('bad_credentials'); end if;
  delete from world_records where account_id = v_id;
  delete from accounts where id = v_id;
  delete from matches where p1 is null and p2 is null;
  delete from competitions where p1 is null and p2 is null;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.dc_delete_account(text, text) from public;
grant execute on function public.dc_delete_account(text, text) to anon, authenticated;

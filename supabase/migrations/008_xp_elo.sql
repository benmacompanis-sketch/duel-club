-- DUEL CLUB · 008 · KEKE pasa a llamarse XP (y SUSI/RESISTENCIA pasa a llamarse ELO, que en la base ya era "rating").
-- No se duplica nada: se RENOMBRA la columna (los valores quedan iguales) y se reescriben las funciones que la usan.
--  · accounts.keke → accounts.xp
--  · dc.add_keke → dc.add_xp, dc.tier_keke → dc.tier_xp
--  · claves "keke" de las respuestas JSON → "xp"; ranking p_kind 'keke' → 'xp' (se sigue aceptando 'keke')

do $$
declare r record; d text; n text; v_names text[] := '{}';
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'accounts' and column_name = 'keke') then
    alter table public.accounts rename column keke to xp;
  end if;
  for r in
    select p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('dc', 'public') and p.prokind = 'f' and pg_get_functiondef(p.oid) ~ 'keke|KEKE'
  loop
    d := pg_get_functiondef(r.oid);
    n := replace(replace(replace(d, 'keke', 'xp'), 'KEKE', 'XP'), 'Keke', 'Xp');
    -- el ranking sigue aceptando el nombre viejo
    n := replace(n, $q$if p_kind not in ('rating', 'level', 'xp', 'wins', 'game')$q$, $q$if p_kind = 'keke' then p_kind := 'xp'; end if;
  if p_kind not in ('rating', 'level', 'xp', 'wins', 'game')$q$);
    execute n;
    if r.proname ~ 'keke' then
      execute format('drop function %I.%I(%s)', r.nspname, r.proname, r.args);
    end if;
    v_names := v_names || (r.nspname || '.' || r.proname);
  end loop;
  raise notice 'funciones reescritas: %', v_names;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname in ('dc', 'public') and p.prokind = 'f' and replace(pg_get_functiondef(p.oid), $q$p_kind = 'keke'$q$, '') ~ 'keke') then
    raise exception 'quedó alguna función con keke';
  end if;
end $$;

revoke all on all functions in schema dc from public, anon, authenticated;

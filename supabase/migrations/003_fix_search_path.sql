-- DUEL CLUB · 003 · search_path fijo en las funciones internas (aviso del linter de Supabase)
alter function dc.mastery_rank(integer) set search_path = public, pg_temp;
alter function dc.clean_name(text) set search_path = public, pg_temp;
alter function dc.ip() set search_path = public, pg_temp;
alter function dc.today() set search_path = public, pg_temp;
alter function dc.tier_keke(text) set search_path = public, pg_temp;
alter function dc.tier_pies(text) set search_path = public, pg_temp;
alter function dc.clean_flags(jsonb) set search_path = public, pg_temp;
alter function dc.err(text) set search_path = public, pg_temp;
alter function dc.level_of(integer) set search_path = public, pg_temp;

-- DUEL CLUB · 017 · Arranque del CLUB PASS (correr DESPUÉS de 016 y de supabase/seed/pass.sql)
--  · Cada cuenta empieza con toda la XP que ya ganó (o la del pase T1 si es mayor) y conserva el Premium de T1.
--  · No borra nada: la Temporada 1 queda archivada (sus filas siguen en la base).
insert into public.pass_progress(account_id, season_id, xp, premium, premium_at)
select a.id, 'club', greatest(a.xp, coalesce(p.xp, 0)), coalesce(p.premium, false), p.premium_at
from public.accounts a
left join public.pass_progress p on p.account_id = a.id and p.season_id = 's1'
where exists (select 1 from public.seasons where id = 'club')
on conflict (account_id, season_id) do nothing;

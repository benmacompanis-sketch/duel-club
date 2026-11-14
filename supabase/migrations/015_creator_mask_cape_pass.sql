-- DUEL CLUB · 015 · Antifaz y capa del creador + Pase Premium T1 regalado a benuchinb2
insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values
('face_creador', 'face', 'mythic', null, 1, false),
('body_creador', 'body', 'mythic', null, 1, false)
on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = null;
insert into public.inventory(account_id, item_id, source)
  select a.id, i.id, 'creator' from public.accounts a cross join (values ('face_creador'), ('body_creador')) as i(id)
  where a.username = 'benuchinb2'
  on conflict do nothing;
insert into public.pass_progress(account_id, season_id, premium, premium_at)
  select id, 's1', true, now() from public.accounts where username = 'benuchinb2'
  on conflict (account_id, season_id) do update set premium = true, premium_at = coalesce(pass_progress.premium_at, now());

-- DUEL CLUB · 025 · Insignia exclusiva del creador (benuchinb2). No se vende, no sale en cofres, no da ventajas. No borra nada.
insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values
('badge_creador', 'badge', 'mythic', null, 1, false)
on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = null;
insert into public.inventory(account_id, item_id, source)
  select a.id, 'badge_creador', 'creator' from public.accounts a where a.username = 'benuchinb2'
  on conflict do nothing;
update public.accounts set equipped = coalesce(equipped, '{}'::jsonb) || jsonb_build_object('badge', 'badge_creador')
  where username = 'benuchinb2';

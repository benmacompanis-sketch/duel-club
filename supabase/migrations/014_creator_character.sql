-- DUEL CLUB · 014 · Personaje exclusivo "El Creador" + corona, entrada y victoria del creador (benuchinb2)
insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values
('char_creador', 'char', 'mythic', null, 1, false),
('hat_corona_creador', 'hat', 'mythic', null, 1, false),
('ent_creador', 'entrance', 'mythic', null, 1, false),
('vic_creador', 'victory', 'mythic', null, 1, false)
on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = null;
insert into public.inventory(account_id, item_id, source)
  select a.id, i.id, 'creator' from public.accounts a cross join (values ('char_creador'), ('hat_corona_creador'), ('ent_creador'), ('vic_creador')) as i(id)
  where a.username = 'benuchinb2'
  on conflict do nothing;

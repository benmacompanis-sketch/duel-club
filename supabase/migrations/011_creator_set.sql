-- DUEL CLUB · 011 · Set exclusivo del creador (benuchinb2). No se vende, no da ventajas.
insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values
('title_creador', 'title', 'mythic', null, 1, false),
('card_creador', 'card', 'mythic', null, 1, false),
('frame_creador', 'frame', 'mythic', null, 1, false),
('emo_creador', 'emote', 'mythic', null, 1, false),
('skin_creador', 'skin', 'mythic', null, 1, false)
on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = null;
insert into public.inventory(account_id, item_id, source)
  select a.id, i.id, 'creator' from public.accounts a cross join (values ('title_creador'), ('card_creador'), ('frame_creador'), ('emo_creador'), ('skin_creador')) as i(id)
  where a.username = 'benuchinb2'
  on conflict do nothing;

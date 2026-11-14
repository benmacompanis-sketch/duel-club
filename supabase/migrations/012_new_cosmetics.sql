-- DUEL CLUB · 012 · 8 cosméticos nuevos (2 entradas, 2 victorias, 4 fondos de perfil)
insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values
('ent_burbujas', 'entrance', 'uncommon', 250, 1, false),
('ent_teletransporte', 'entrance', 'epic', 1000, 1, false),
('vic_arcoiris', 'victory', 'rare', 500, 1, false),
('vic_corona', 'victory', 'epic', 1000, 1, false),
('card_lluvia', 'card', 'uncommon', 250, 1, false),
('card_cerezo', 'card', 'rare', 500, 1, false),
('card_lava', 'card', 'epic', 1000, 1, false),
('card_arcade', 'card', 'rare', 500, 1, false)
on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = excluded.price;

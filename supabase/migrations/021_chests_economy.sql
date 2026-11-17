-- 021 · COFRES + ECONOMÍA (GENERADO por scripts/gen-chests.mjs — no editar a mano)
-- · Precios nuevos por rareza (solo cambia el precio de lo que se vende; nadie pierde nada de lo que ya tiene).
-- · Pase Premium: 6000 PIES.
-- · Cofres de bronce, plata, oro y mítico: el SERVIDOR elige el premio (random() de Postgres), nunca el navegador.
-- · Se consiguen jugando (desafíos, niveles, logros, Daily Chaos, Historia) y con fragmentos; bronce/plata/oro también con PIES.
-- · Lo que ya se había hecho antes de esta versión no cuenta para cofres (solo un cofre de plata de bienvenida),
--   así nadie recibe decenas de cofres de golpe.

update public.catalog_items set price = case rarity when 'common' then 200 when 'uncommon' then 500 when 'rare' then 1200 when 'epic' then 3000 when 'legendary' then 7000 when 'mythic' then 15000 else price end where price is not null;
update public.seasons set premium_price = 6000 where id = 'club';

insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values
('cx_card_galaxia', 'card', 'rare', null, 1, false),
('cx_card_plasma', 'card', 'rare', null, 1, false),
('cx_card_aurora', 'card', 'rare', null, 1, false),
('cx_card_magma', 'card', 'epic', null, 1, false),
('cx_card_zafiro', 'card', 'epic', null, 1, false),
('cx_card_rubi', 'card', 'epic', null, 1, false),
('cx_card_esmeralda', 'card', 'epic', null, 1, false),
('cx_card_amatista', 'card', 'legendary', null, 1, false),
('cx_card_oroviejo', 'card', 'legendary', null, 1, false),
('cx_card_tormenta', 'card', 'legendary', null, 1, false),
('cx_card_turquesa', 'card', 'mythic', null, 1, false),
('cx_card_fucsia', 'card', 'mythic', null, 1, false),
('cx_frame_cobre', 'frame', 'uncommon', null, 1, false),
('cx_frame_hielo', 'frame', 'rare', null, 1, false),
('cx_frame_acido', 'frame', 'rare', null, 1, false),
('cx_frame_ocaso', 'frame', 'epic', null, 1, false),
('cx_frame_cereza', 'frame', 'epic', null, 1, false),
('cx_frame_uva', 'frame', 'legendary', null, 1, false),
('cx_frame_lima', 'frame', 'legendary', null, 1, false),
('cx_frame_coral', 'frame', 'mythic', null, 1, false),
('cx_skin_mostaza', 'skin', 'common', null, 1, false),
('cx_skin_chicle', 'skin', 'common', null, 1, false),
('cx_skin_menta', 'skin', 'uncommon', null, 1, false),
('cx_skin_medianoche', 'skin', 'uncommon', null, 1, false),
('cx_skin_volcan', 'skin', 'rare', null, 1, false),
('cx_skin_oceano', 'skin', 'rare', null, 1, false),
('cx_skin_sandia', 'skin', 'epic', null, 1, false),
('cx_skin_lavanda', 'skin', 'epic', null, 1, false),
('cx_skin_cielo', 'skin', 'legendary', null, 1, false),
('cx_skin_durazno', 'skin', 'mythic', null, 1, false),
('cx_title_1', 'title', 'uncommon', null, 1, false),
('cx_title_2', 'title', 'common', null, 1, false),
('cx_title_3', 'title', 'common', null, 1, false),
('cx_title_4', 'title', 'rare', null, 1, false),
('cx_title_5', 'title', 'rare', null, 1, false),
('cx_title_6', 'title', 'epic', null, 1, false),
('cx_title_7', 'title', 'epic', null, 1, false),
('cx_title_8', 'title', 'legendary', null, 1, false),
('cx_title_9', 'title', 'legendary', null, 1, false),
('cx_title_10', 'title', 'mythic', null, 1, false),
('cx_title_11', 'title', 'uncommon', null, 1, false),
('cx_title_12', 'title', 'rare', null, 1, false),
('cx_emo_1', 'emote', 'uncommon', null, 1, false),
('cx_emo_2', 'emote', 'common', null, 1, false),
('cx_emo_3', 'emote', 'epic', null, 1, false),
('cx_emo_4', 'emote', 'common', null, 1, false),
('cx_emo_5', 'emote', 'rare', null, 1, false),
('cx_emo_6', 'emote', 'legendary', null, 1, false)
on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = null;

create table if not exists public.chest_state (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  shards integer not null default 0 check (shards >= 0),
  base_level integer not null default 1,
  base_ach integer not null default 0,
  opened integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.chest_inv (
  account_id uuid not null references public.accounts(id) on delete cascade,
  kind text not null check (kind in ('bronze', 'silver', 'gold', 'mythic')),
  n integer not null default 0 check (n >= 0),
  primary key (account_id, kind)
);
create table if not exists public.chest_grants (
  account_id uuid not null references public.accounts(id) on delete cascade,
  src text not null,
  kind text not null,
  n integer not null,
  at timestamptz not null default now(),
  primary key (account_id, src)
);
create table if not exists public.chest_log (
  id bigserial primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  kind text not null,
  rarity text,
  item_id text,
  dup boolean not null default false,
  pies integer not null default 0,
  shards integer not null default 0,
  special text,
  at timestamptz not null default now()
);
create index if not exists chest_log_acc on public.chest_log(account_id, id desc);
alter table public.chest_state enable row level security;
alter table public.chest_inv enable row level security;
alter table public.chest_grants enable row level security;
alter table public.chest_log enable row level security;

create or replace function dc.chest_cfg() returns jsonb language sql immutable as $cfg$ select '{"chests":{"bronze":{"odds":[65,25,8,2,0,0],"price":450,"craft":6},"silver":{"odds":[40,35,17,7,1,0],"price":1400,"craft":15},"gold":{"odds":[20,30,30,17,3,0],"price":4000,"craft":40},"mythic":{"odds":[0,10,25,35,20,10],"price":null,"craft":null}},"jackpot":{"gold":0.5,"mythic":2},"jackComp":{"pies":2500,"shards":25},"piesDrop":15,"piesBy":[60,140,350,800,1800,4000],"dup":[[25,1],[60,2],[150,4],[350,8],[800,15],[2000,30]]}'::jsonb $cfg$;
create or replace function dc.chest_rarities() returns text[] language sql immutable as $$ select array['common','uncommon','rare','epic','legendary','mythic'] $$;

-- entrega idempotente: cada fuente (src) da su premio una sola vez
create or replace function dc.chest_give(p_me uuid, p_kind text, p_n integer, p_src text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into chest_grants(account_id, src, kind, n) values (p_me, p_src, p_kind, p_n) on conflict do nothing;
  if not found then return false; end if;
  if p_kind = 'shard' then update chest_state set shards = shards + p_n where account_id = p_me;
  else
    insert into chest_inv(account_id, kind, n) values (p_me, p_kind, p_n) on conflict (account_id, kind) do update set n = chest_inv.n + p_n;
  end if;
  return true;
end $$;

-- revisa todo lo que da cofres (solo lo logrado desde que existe el sistema) y entrega lo que falte
create or replace function dc.chest_sync(p_me uuid) returns void
language plpgsql security definer set search_path = public as $$
declare st chest_state; v_lv integer; v_ach integer; m integer; r record;
begin
  select * into st from chest_state where account_id = p_me;
  if not found then
    select dc.level_of(xp) into v_lv from accounts where id = p_me;
    select count(*) into v_ach from achievements_unlocked where account_id = p_me;
    insert into chest_state(account_id, base_level, base_ach) values (p_me, coalesce(v_lv, 1), v_ach) on conflict do nothing;
    select * into st from chest_state where account_id = p_me;
    perform dc.chest_give(p_me, 'silver', 1, 'welcome');
  end if;
  -- desafíos diarios y semanales reclamados
  for r in select ch_id, period_key from challenge_progress where account_id = p_me and claimed_at >= st.created_at loop
    if r.ch_id like 'd\_%' then perform dc.chest_give(p_me, 'shard', 1, 'cd:' || r.ch_id || ':' || r.period_key);
    elsif r.ch_id like 'w\_%' then perform dc.chest_give(p_me, 'silver', 1, 'cw:' || r.ch_id || ':' || r.period_key);
    end if;
  end loop;
  for r in select period_key from challenge_progress where account_id = p_me and claimed_at >= st.created_at and ch_id like 'w\_%'
           group by period_key having count(*) >= 3 loop
    perform dc.chest_give(p_me, 'gold', 1, 'cw3:' || r.period_key);
  end loop;
  -- niveles
  select dc.level_of(xp) into v_lv from accounts where id = p_me;
  for m in (st.base_level + 1)..coalesce(v_lv, 1) loop
    if m % 50 = 0 then perform dc.chest_give(p_me, 'mythic', 1, 'lv50:' || m);
    elsif m % 25 = 0 then perform dc.chest_give(p_me, 'gold', 1, 'lv25:' || m);
    elsif m % 5 = 0 then perform dc.chest_give(p_me, 'silver', 1, 'lv5:' || m);
    end if;
  end loop;
  -- logros (cada 10)
  select count(*) into v_ach from achievements_unlocked where account_id = p_me;
  for m in (st.base_ach / 10 + 1)..(v_ach / 10) loop
    perform dc.chest_give(p_me, 'silver', 1, 'ach:' || m);
  end loop;
  -- Daily Chaos con 3 estrellas
  for r in select period from sp_scores where account_id = p_me and kind = 'daily' and stars >= 3 and period >= to_char(st.created_at, 'YYYY-MM-DD') loop
    perform dc.chest_give(p_me, 'shard', 2, 'sp:' || r.period);
  end loop;
  -- Historia completa
  if (select count(*) from story_progress where account_id = p_me and stages >= 4) >= 5 then
    perform dc.chest_give(p_me, 'mythic', 1, 'story');
  end if;
end $$;

create or replace function dc.chest_view(p_me uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'inv', coalesce((select jsonb_object_agg(kind, n) from chest_inv where account_id = p_me), '{}'::jsonb),
    'shards', coalesce((select shards from chest_state where account_id = p_me), 0),
    'opened', coalesce((select opened from chest_state where account_id = p_me), 0),
    'log', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'rarity', rarity, 'item', item_id, 'dup', dup, 'pies', pies, 'shards', shards, 'special', special, 'at', at) order by id desc)
                     from (select * from chest_log where account_id = p_me order by id desc limit 30) l), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('src', src, 'kind', kind, 'n', n) order by at desc)
                     from (select * from chest_grants where account_id = p_me and at > now() - interval '7 days' order by at desc limit 12) g), '[]'::jsonb));
$$;

create or replace function public.dc_chests(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  perform dc.chest_sync(v_me);
  return dc.chest_view(v_me);
end $$;

-- abrir un cofre: rareza según la tabla, a veces una bolsa de PIES, y aparte el premio especial del PASE PREMIUM
create or replace function public.dc_chest_open(p_token text, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); cfg jsonb := dc.chest_cfg(); odds jsonb; v_n integer; v_roll real; v_acc real := 0; v_ri integer := 1;
  v_rar text; v_item text; v_dup boolean := false; v_pies integer := 0; v_shards integer := 0; v_special text; s seasons; v_prem boolean;
begin
  if not (cfg->'chests' ? p_kind) then perform dc.err('invalid_item'); end if;
  perform dc.chest_sync(v_me);
  select n into v_n from chest_inv where account_id = v_me and kind = p_kind for update;
  if coalesce(v_n, 0) < 1 then perform dc.err('no_chest'); end if;
  update chest_inv set n = n - 1 where account_id = v_me and kind = p_kind;
  update chest_state set opened = opened + 1 where account_id = v_me;
  -- PASE PREMIUM (independiente de la tabla de rarezas)
  if (cfg->'jackpot' ? p_kind) and random() * 100 < (cfg->'jackpot'->>p_kind)::real then
    s := dc.current_season();
    insert into pass_progress(account_id, season_id) values (v_me, s.id) on conflict do nothing;
    select premium into v_prem from pass_progress where account_id = v_me and season_id = s.id for update;
    if coalesce(v_prem, false) then
      v_special := 'pass_comp'; v_pies := (cfg->'jackComp'->>'pies')::int; v_shards := (cfg->'jackComp'->>'shards')::int;
    else
      v_special := 'pass';
      update pass_progress set premium = true, premium_at = now() where account_id = v_me and season_id = s.id;
      perform dc.notify(v_me, 'pass', '¡PASE PREMIUM EN UN COFRE!', 'Te tocó el premio más raro del club: el Pase Premium. Ya podés reclamar sus recompensas.', jsonb_build_object('chest', p_kind));
    end if;
  else
    odds := cfg->'chests'->p_kind->'odds';
    v_roll := random() * 100;
    for i in 0..5 loop
      v_acc := v_acc + (odds->>i)::real;
      if v_roll < v_acc then v_ri := i + 1; exit; end if;
      v_ri := i + 1;
    end loop;
    -- nunca una rareza con probabilidad 0 (por redondeo)
    while (odds->>(v_ri - 1))::real = 0 and v_ri > 1 loop v_ri := v_ri - 1; end loop;
    v_rar := (dc.chest_rarities())[v_ri];
    if random() * 100 < (cfg->>'piesDrop')::real then
      v_pies := (cfg->'piesBy'->>(v_ri - 1))::int;
    else
      -- objetos posibles: exclusivos de cofres + los de la tienda de esa rareza (60 %: uno que todavía no tenés)
      if random() < 0.6 then
        select c.id into v_item from catalog_items c where c.rarity = v_rar and (c.id like 'cx\_%' or c.price is not null)
          and not dc.owns(v_me, c.id) order by random() limit 1;
      end if;
      if v_item is null then
        select c.id into v_item from catalog_items c where c.rarity = v_rar and (c.id like 'cx\_%' or c.price is not null) order by random() limit 1;
      end if;
      if v_item is null then v_pies := (cfg->'piesBy'->>(v_ri - 1))::int;
      elsif dc.owns(v_me, v_item) then
        v_dup := true; v_pies := (cfg->'dup'->(v_ri - 1)->>0)::int; v_shards := (cfg->'dup'->(v_ri - 1)->>1)::int;
      else
        perform dc.grant_item(v_me, v_item, 'chest');
      end if;
    end if;
  end if;
  if v_pies > 0 then perform dc.add_pies(v_me, v_pies, case when v_dup then 'chest_dup' else 'chest' end, p_kind); end if;
  if v_shards > 0 then update chest_state set shards = shards + v_shards where account_id = v_me; end if;
  insert into chest_log(account_id, kind, rarity, item_id, dup, pies, shards, special) values (v_me, p_kind, v_rar, v_item, v_dup, v_pies, v_shards, v_special);
  return jsonb_build_object('kind', p_kind, 'rarity', v_rar, 'item', v_item, 'dup', v_dup, 'pies', v_pies, 'shards', v_shards, 'special', v_special,
    'chests', dc.chest_view(v_me), 'me', dc.me(v_me));
end $$;

create or replace function public.dc_chest_craft(p_token text, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_cost integer := (dc.chest_cfg()->'chests'->p_kind->>'craft')::int; v_sh integer;
begin
  if v_cost is null then perform dc.err('invalid_item'); end if;
  perform dc.chest_sync(v_me);
  select shards into v_sh from chest_state where account_id = v_me for update;
  if v_sh < v_cost then perform dc.err('not_enough_shards'); end if;
  update chest_state set shards = shards - v_cost where account_id = v_me;
  insert into chest_inv(account_id, kind, n) values (v_me, p_kind, 1) on conflict (account_id, kind) do update set n = chest_inv.n + 1;
  return jsonb_build_object('chests', dc.chest_view(v_me));
end $$;

create or replace function public.dc_chest_buy(p_token text, p_kind text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_price integer := (dc.chest_cfg()->'chests'->p_kind->>'price')::int; v_pies integer;
begin
  if v_price is null then perform dc.err('not_for_sale'); end if;
  perform dc.chest_sync(v_me);
  select pies into v_pies from accounts where id = v_me for update;
  if v_pies < v_price then perform dc.err('not_enough_pies'); end if;
  perform dc.add_pies(v_me, -v_price, 'chest_buy', p_kind);
  insert into chest_inv(account_id, kind, n) values (v_me, p_kind, 1) on conflict (account_id, kind) do update set n = chest_inv.n + 1;
  return jsonb_build_object('chests', dc.chest_view(v_me), 'me', dc.me(v_me));
end $$;

revoke all on function public.dc_chests(text), public.dc_chest_open(text, text), public.dc_chest_craft(text, text), public.dc_chest_buy(text, text) from public;
grant execute on function public.dc_chests(text), public.dc_chest_open(text, text), public.dc_chest_craft(text, text), public.dc_chest_buy(text, text) to anon, authenticated;

-- DUEL CLUB · 016 · CLUB PASS permanente (250 niveles + prestigio infinito, sin temporadas ni reinicios)
--  · Una "temporada" permanente ('club', termina en 'infinity') reemplaza a la Temporada 1.
--  · Curva de XP: el nivel L→L+1 pide xp_base + xp_growth·(L−1); después del nivel 250 cada nivel de
--    prestigio pide prestige_xp. El nivel nunca tiene tope.
--  · Premios de prestigio: cada 10 niveles después del 250 (libre: 150 PIES o un título en 300/400/500/750/1000;
--    premium: 250 PIES). Se calculan con una regla, no hace falta cargar filas infinitas.
--  · Bono de regreso: si pasaron 48 h sin sumar XP de pase, los próximos 300 XP de pase cuentan doble.
--    Premia volver; nunca castiga descansar.
--  · Arranque: cada cuenta empieza el CLUB PASS con toda la XP que ya ganó (o la del pase T1 si es mayor) y
--    conserva el Premium si lo tenía en la Temporada 1. Las recompensas del pase T1 están todas en el CLUB PASS.
-- No borra nada: la Temporada 1 queda archivada con sus datos. Requiere 009.
-- Los objetos y recompensas se cargan con supabase/seed/pass.sql (scripts/gen-pass.mjs).

alter table public.seasons add column if not exists xp_base integer;
alter table public.seasons add column if not exists xp_growth integer not null default 0;
alter table public.seasons add column if not exists prestige_xp integer;
alter table public.seasons add column if not exists permanent boolean not null default false;
alter table public.pass_progress add column if not exists last_gain_at timestamptz;
alter table public.pass_progress add column if not exists bonus_left integer not null default 0;

-- XP total necesaria para llegar al nivel L
create or replace function dc.pass_xp_for(s seasons, p_level integer) returns bigint
language plpgsql immutable as $$
declare k bigint;
begin
  if p_level <= 1 then return 0; end if;
  if s.xp_base is null then return (least(p_level, s.levels) - 1)::bigint * s.xp_per_level; end if;
  k := least(p_level, s.levels) - 1;
  return k * s.xp_base + (s.xp_growth * k * (k - 1)) / 2 + greatest(0, p_level - s.levels)::bigint * coalesce(s.prestige_xp, 0);
end $$;

create or replace function dc.pass_level(s seasons, p_xp integer) returns integer
language plpgsql immutable as $$
declare v_xp bigint := greatest(0, coalesce(p_xp, 0)); v_cap bigint; a numeric; b numeric; v_l integer;
begin
  if s.xp_base is null then return least(s.levels, 1 + v_xp / s.xp_per_level)::int; end if;
  v_cap := dc.pass_xp_for(s, s.levels);
  if v_xp >= v_cap then
    if coalesce(s.prestige_xp, 0) <= 0 then return s.levels; end if;
    return s.levels + ((v_xp - v_cap) / s.prestige_xp)::int;
  end if;
  if s.xp_growth = 0 then v_l := 1 + (v_xp / s.xp_base)::int;
  else
    a := s.xp_growth / 2.0; b := s.xp_base - s.xp_growth / 2.0;
    v_l := 1 + floor((-b + sqrt(b * b + 4 * a * v_xp)) / (2 * a))::int;
  end if;
  while dc.pass_xp_for(s, v_l + 1) <= v_xp loop v_l := v_l + 1; end loop;
  while v_l > 1 and dc.pass_xp_for(s, v_l) > v_xp loop v_l := v_l - 1; end loop;
  return v_l;
end $$;

-- Premio de un nivel de prestigio (null si ese nivel no tiene premio)
create or replace function dc.pass_prestige_reward(s seasons, p_level integer, p_track text, out item_id text, out pies integer)
language plpgsql immutable as $$
begin
  item_id := null; pies := 0;
  if not s.permanent or p_level <= s.levels or (p_level - s.levels) % 10 <> 0 then pies := null; return; end if;
  if p_track = 'free' then
    item_id := case p_level when 300 then 'title_cp_p300' when 400 then 'title_cp_p400' when 500 then 'title_cp_p500'
      when 750 then 'title_cp_p750' when 1000 then 'title_cp_p1000' end;
    pies := case when item_id is null then 150 else 0 end;
  else
    pies := 250;
  end if;
end $$;

-- Suma XP al pase (con bono de regreso en el pase permanente)
create or replace function dc.pass_add(p_acc uuid, p_amount integer) returns void
language plpgsql security definer set search_path = public as $$
declare s seasons := dc.current_season(); pp pass_progress; v_extra integer := 0;
begin
  if s.id is null or p_amount is null or p_amount <= 0 then return; end if;
  insert into pass_progress(account_id, season_id) values (p_acc, s.id) on conflict do nothing;
  select * into pp from pass_progress where account_id = p_acc and season_id = s.id for update;
  if s.permanent then
    if pp.last_gain_at is null or pp.last_gain_at < now() - interval '48 hours' then pp.bonus_left := 300; end if;
    v_extra := least(p_amount, greatest(0, pp.bonus_left));
  end if;
  update pass_progress set xp = xp + p_amount + v_extra, bonus_left = greatest(0, pp.bonus_left - v_extra), last_gain_at = now()
    where account_id = p_acc and season_id = s.id;
end $$;

-- Cantidad de premios listos para reclamar (filas + prestigio)
create or replace function dc.pass_ready(s seasons, pp pass_progress, v_lv integer) returns integer
language sql stable security definer set search_path = public as $$
  select (select count(*) from pass_rewards r where r.season_id = s.id and r.level <= v_lv
      and (r.item_id is not null or r.pies > 0)
      and ((r.track = 'free' and not (r.level = any(coalesce(pp.claimed_free, '{}'))))
        or (r.track = 'premium' and coalesce(pp.premium, false) and not (r.level = any(coalesce(pp.claimed_premium, '{}'))))))::int
    + case when s.permanent and v_lv >= s.levels + 10 then
        (select count(*) from generate_series(s.levels + 10, v_lv, 10) g(l) where not (g.l = any(coalesce(pp.claimed_free, '{}'))))::int
        + case when coalesce(pp.premium, false) then
            (select count(*) from generate_series(s.levels + 10, v_lv, 10) g(l) where not (g.l = any(coalesce(pp.claimed_premium, '{}'))))::int
          else 0 end
      else 0 end
$$;

create or replace function dc.pass_summary(p_acc uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s seasons := dc.current_season(); pp pass_progress; v_lv integer;
begin
  if s.id is null then return null; end if;
  select * into pp from pass_progress where account_id = p_acc and season_id = s.id;
  v_lv := dc.pass_level(s, coalesce(pp.xp, 0));
  return jsonb_build_object('season', s.id, 'name', s.name, 'ends_at', s.ends_at, 'permanent', s.permanent, 'xp', coalesce(pp.xp, 0), 'level', v_lv,
    'levels', s.levels, 'xp_per_level', s.xp_per_level, 'xp_level', dc.pass_xp_for(s, v_lv), 'xp_next', dc.pass_xp_for(s, v_lv + 1),
    'premium', coalesce(pp.premium, false), 'ready', dc.pass_ready(s, pp, v_lv));
end $$;

create or replace function public.dc_pass(p_token text, p_season text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); s seasons; pp pass_progress; v_cur seasons := dc.current_season(); v_lv integer;
begin
  if p_season is null then s := v_cur; else select * into s from seasons where id = p_season; end if;
  if s.id is null then
    return jsonb_build_object('season', null, 'archive', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'starts_at', starts_at, 'ends_at', ends_at) order by starts_at desc) from seasons where not permanent), '[]'::jsonb));
  end if;
  select * into pp from pass_progress where account_id = v_me and season_id = s.id;
  v_lv := dc.pass_level(s, coalesce(pp.xp, 0));
  return jsonb_build_object(
    'season', jsonb_build_object('id', s.id, 'name', s.name, 'starts_at', s.starts_at, 'ends_at', s.ends_at, 'permanent', s.permanent,
      'premium_price', s.premium_price, 'levels', s.levels, 'xp_per_level', s.xp_per_level, 'xp_base', s.xp_base, 'xp_growth', s.xp_growth,
      'prestige_xp', s.prestige_xp, 'current', s.id = v_cur.id),
    'xp', coalesce(pp.xp, 0), 'level', v_lv, 'xp_level', dc.pass_xp_for(s, v_lv), 'xp_next', dc.pass_xp_for(s, v_lv + 1),
    'premium', coalesce(pp.premium, false), 'bonus_left', case when pp.last_gain_at is null or pp.last_gain_at < now() - interval '48 hours' then 300 else coalesce(pp.bonus_left, 0) end,
    'claimed_free', to_jsonb(coalesce(pp.claimed_free, '{}')), 'claimed_premium', to_jsonb(coalesce(pp.claimed_premium, '{}')),
    'ready', dc.pass_ready(s, pp, v_lv),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('level', level, 'track', track, 'item', item_id, 'pies', pies) order by level, track)
      from pass_rewards where season_id = s.id), '[]'::jsonb),
    'archive', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'starts_at', starts_at, 'ends_at', ends_at) order by starts_at desc)
      from seasons where starts_at <= now() and not permanent), '[]'::jsonb),
    'pies', (select pies from accounts where id = v_me));
end $$;

-- Reclama una recompensa (nivel + fila) o todas las disponibles. Idempotente: nada se entrega dos veces.
create or replace function public.dc_pass_claim(p_token text, p_level integer default null, p_track text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); s seasons := dc.current_season(); pp pass_progress; v_lv integer;
  v_got jsonb := '[]'::jsonb; v_comp integer; v_new boolean; rec record; v_tr text; v_l integer;
begin
  if s.id is null then perform dc.err('no_season'); end if;
  if p_track is not null and p_track not in ('free', 'premium') then perform dc.err('bad_input'); end if;
  insert into pass_progress(account_id, season_id) values (v_me, s.id) on conflict do nothing;
  select * into pp from pass_progress where account_id = v_me and season_id = s.id for update;
  v_lv := dc.pass_level(s, pp.xp);
  if p_level is not null and (p_level > v_lv or p_level < 1) then perform dc.err('level_required'); end if;
  if p_track = 'premium' and not pp.premium then perform dc.err('premium_required'); end if;
  for rec in
    select r.level, r.track, r.item_id, r.pies from pass_rewards r where r.season_id = s.id and r.level <= v_lv
      and (p_level is null or r.level = p_level) and (p_track is null or r.track = p_track) and (r.track = 'free' or pp.premium)
    union all
    select g.l, t.tr, (dc.pass_prestige_reward(s, g.l, t.tr)).item_id, (dc.pass_prestige_reward(s, g.l, t.tr)).pies
      from generate_series(s.levels + 10, greatest(v_lv, s.levels), 10) g(l) cross join (values ('free'), ('premium')) t(tr)
      where s.permanent and v_lv >= s.levels + 10 and (p_level is null or g.l = p_level) and (p_track is null or t.tr = p_track)
        and (t.tr = 'free' or pp.premium)
    order by 1, 2
  loop
    v_l := rec.level; v_tr := rec.track;
    if v_tr = 'free' and v_l = any(pp.claimed_free) then continue; end if;
    if v_tr = 'premium' and v_l = any(pp.claimed_premium) then continue; end if;
    if v_tr = 'free' then pp.claimed_free := pp.claimed_free || v_l; else pp.claimed_premium := pp.claimed_premium || v_l; end if;
    v_comp := 0;
    if rec.item_id is not null then
      v_new := dc.grant_item(v_me, rec.item_id, 'pass');
      if not v_new then v_comp := 100; end if;
    end if;
    if coalesce(rec.pies, 0) + v_comp > 0 then perform dc.add_pies(v_me, coalesce(rec.pies, 0) + v_comp, 'pass_reward', s.id || ':' || v_l || ':' || v_tr); end if;
    v_got := v_got || jsonb_build_object('level', v_l, 'track', v_tr, 'item', rec.item_id, 'pies', coalesce(rec.pies, 0) + v_comp, 'dup', v_comp > 0);
  end loop;
  update pass_progress set claimed_free = pp.claimed_free, claimed_premium = pp.claimed_premium where account_id = v_me and season_id = s.id;
  return public.dc_pass(p_token) || jsonb_build_object('claimed', v_got, 'me', dc.me(v_me));
end $$;

revoke all on function dc.pass_xp_for(seasons, integer), dc.pass_prestige_reward(seasons, integer, text), dc.pass_ready(seasons, pass_progress, integer) from public, anon, authenticated;

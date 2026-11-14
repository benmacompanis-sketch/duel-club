-- DUEL CLUB · actualización de base (008 a 011 + datos del pase). Pegar TODO en Supabase → SQL Editor → Run. Se puede correr más de una vez.
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

-- DUEL CLUB · 009 · Pase de Batalla (libre + Premium con PIES), desafíos diarios/semanales, partidas contra bots
-- y ELO solo en partidas online.
--  · Toda la XP que se gana durante una temporada suma también al pase (un solo nivel para las dos filas).
--  · El Premium se compra UNA vez por temporada con PIES (nunca con dinero real). Al comprarlo, las recompensas
--    Premium de los niveles ya alcanzados quedan para reclamar (retroactivo). Cada recompensa se reclama una sola vez.
--  · El ELO solo cambia en partidas COMPETITIVAS online (Buscar rival). Partidas locales, salas con código,
--    desafíos a amigos, bots y práctica dan XP y PIES pero no ELO.
--  · Partidas contra bots (mode = 'bot'): XP y PIES reducidos, sin ELO, sin récords, sin dominio, sin estadísticas
--    competitivas (van a bot_stats aparte).
-- Requiere 008. Los datos (temporadas, recompensas, desafíos) se cargan con supabase/seed/pass.sql.

-- ------------------------------------------------------------------ tablas
create table if not exists public.seasons (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  premium_price integer not null check (premium_price > 0),
  levels integer not null default 40,
  xp_per_level integer not null default 500
);
create table if not exists public.pass_rewards (
  season_id text not null references public.seasons(id) on delete cascade,
  level integer not null,
  track text not null check (track in ('free', 'premium')),
  item_id text references public.catalog_items(id),
  pies integer not null default 0,
  primary key (season_id, level, track)
);
create table if not exists public.pass_progress (
  account_id uuid not null references public.accounts(id) on delete cascade,
  season_id text not null references public.seasons(id) on delete cascade,
  xp integer not null default 0,
  premium boolean not null default false,
  premium_at timestamptz,
  claimed_free integer[] not null default '{}',
  claimed_premium integer[] not null default '{}',
  primary key (account_id, season_id)
);
create table if not exists public.challenge_defs (
  id text primary key,
  period text not null check (period in ('daily', 'weekly')),
  metric text not null,
  game text,
  target integer not null check (target > 0),
  xp integer not null default 0,
  pies integer not null default 0,
  label text not null,
  active boolean not null default true
);
create table if not exists public.challenge_progress (
  account_id uuid not null references public.accounts(id) on delete cascade,
  period_key text not null,
  ch_id text not null references public.challenge_defs(id) on delete cascade,
  progress integer not null default 0,
  claimed_at timestamptz,
  primary key (account_id, period_key, ch_id)
);
alter table public.accounts add column if not exists bot_stats jsonb not null default '{}'::jsonb;
alter table public.seasons enable row level security;
alter table public.pass_rewards enable row level security;
alter table public.pass_progress enable row level security;
alter table public.challenge_defs enable row level security;
alter table public.challenge_progress enable row level security;

-- ------------------------------------------------------------------ pase
create or replace function dc.current_season() returns seasons
language sql stable security definer set search_path = public as $$
  select * from seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1
$$;

create or replace function dc.pass_add(p_acc uuid, p_amount integer) returns void
language plpgsql security definer set search_path = public as $$
declare s seasons := dc.current_season();
begin
  if s.id is null or p_amount is null or p_amount <= 0 then return; end if;
  insert into pass_progress(account_id, season_id, xp) values (p_acc, s.id, p_amount)
    on conflict (account_id, season_id) do update set xp = pass_progress.xp + excluded.xp;
end $$;

create or replace function dc.pass_level(s seasons, p_xp integer) returns integer
language sql immutable as $$ select least(s.levels, 1 + coalesce(p_xp, 0) / s.xp_per_level) $$;

create or replace function dc.pass_summary(p_acc uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s seasons := dc.current_season(); pp pass_progress; v_lv integer; v_ready integer;
begin
  if s.id is null then return null; end if;
  select * into pp from pass_progress where account_id = p_acc and season_id = s.id;
  v_lv := dc.pass_level(s, coalesce(pp.xp, 0));
  select count(*) into v_ready from pass_rewards r where r.season_id = s.id and r.level <= v_lv
    and (r.item_id is not null or r.pies > 0)
    and ((r.track = 'free' and not (r.level = any(coalesce(pp.claimed_free, '{}'))))
      or (r.track = 'premium' and coalesce(pp.premium, false) and not (r.level = any(coalesce(pp.claimed_premium, '{}')))));
  return jsonb_build_object('season', s.id, 'name', s.name, 'ends_at', s.ends_at, 'xp', coalesce(pp.xp, 0), 'level', v_lv,
    'levels', s.levels, 'xp_per_level', s.xp_per_level, 'premium', coalesce(pp.premium, false), 'ready', v_ready);
end $$;

create or replace function public.dc_pass(p_token text, p_season text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); s seasons; pp pass_progress; v_cur seasons := dc.current_season();
begin
  if p_season is null then s := v_cur; else select * into s from seasons where id = p_season; end if;
  if s.id is null then
    return jsonb_build_object('season', null, 'archive', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'starts_at', starts_at, 'ends_at', ends_at) order by starts_at desc) from seasons), '[]'::jsonb));
  end if;
  select * into pp from pass_progress where account_id = v_me and season_id = s.id;
  return jsonb_build_object(
    'season', jsonb_build_object('id', s.id, 'name', s.name, 'starts_at', s.starts_at, 'ends_at', s.ends_at,
      'premium_price', s.premium_price, 'levels', s.levels, 'xp_per_level', s.xp_per_level, 'current', s.id = v_cur.id),
    'xp', coalesce(pp.xp, 0), 'level', dc.pass_level(s, coalesce(pp.xp, 0)), 'premium', coalesce(pp.premium, false),
    'claimed_free', to_jsonb(coalesce(pp.claimed_free, '{}')), 'claimed_premium', to_jsonb(coalesce(pp.claimed_premium, '{}')),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('level', level, 'track', track, 'item', item_id, 'pies', pies) order by level, track)
      from pass_rewards where season_id = s.id), '[]'::jsonb),
    'archive', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'starts_at', starts_at, 'ends_at', ends_at) order by starts_at desc)
      from seasons where starts_at <= now()), '[]'::jsonb),
    'pies', (select pies from accounts where id = v_me));
end $$;

create or replace function public.dc_pass_buy(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); s seasons := dc.current_season(); v_pies integer; v_prem boolean;
begin
  if s.id is null then perform dc.err('no_season'); end if;
  select pies into v_pies from accounts where id = v_me for update;
  insert into pass_progress(account_id, season_id) values (v_me, s.id) on conflict do nothing;
  select premium into v_prem from pass_progress where account_id = v_me and season_id = s.id for update;
  if v_prem then perform dc.err('already_owned'); end if;
  if v_pies < s.premium_price then perform dc.err('not_enough_pies'); end if;
  perform dc.add_pies(v_me, -s.premium_price, 'pass', s.id);
  update pass_progress set premium = true, premium_at = now() where account_id = v_me and season_id = s.id;
  perform dc.notify(v_me, 'pass', '¡Pase Premium activado!', 'Ya podés reclamar las recompensas Premium de todos los niveles que alcanzaste.', jsonb_build_object('season', s.id));
  return public.dc_pass(p_token) || jsonb_build_object('me', dc.me(v_me));
end $$;

-- Reclama una recompensa (p_level + p_track) o todas las disponibles (sin parámetros). Idempotente: lo ya
-- reclamado no se vuelve a dar. Si un objeto ya estaba en el inventario se compensa con PIES.
create or replace function public.dc_pass_claim(p_token text, p_level integer default null, p_track text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); s seasons := dc.current_season(); pp pass_progress; v_lv integer; r pass_rewards;
  v_got jsonb := '[]'::jsonb; v_comp integer; v_new boolean;
begin
  if s.id is null then perform dc.err('no_season'); end if;
  insert into pass_progress(account_id, season_id) values (v_me, s.id) on conflict do nothing;
  select * into pp from pass_progress where account_id = v_me and season_id = s.id for update;
  v_lv := dc.pass_level(s, pp.xp);
  if p_level is not null and (p_level > v_lv or p_level < 1) then perform dc.err('level_required'); end if;
  if p_track = 'premium' and not pp.premium then perform dc.err('premium_required'); end if;
  for r in select * from pass_rewards where season_id = s.id and level <= v_lv
      and (p_level is null or level = p_level) and (p_track is null or track = p_track)
      and (track = 'free' or pp.premium) order by level, track
  loop
    if r.track = 'free' and r.level = any(pp.claimed_free) then continue; end if;
    if r.track = 'premium' and r.level = any(pp.claimed_premium) then continue; end if;
    if r.track = 'free' then pp.claimed_free := pp.claimed_free || r.level; else pp.claimed_premium := pp.claimed_premium || r.level; end if;
    v_comp := 0;
    if r.item_id is not null then
      v_new := dc.grant_item(v_me, r.item_id, 'pass');
      if not v_new then v_comp := 100; end if;
    end if;
    if r.pies + v_comp > 0 then perform dc.add_pies(v_me, r.pies + v_comp, 'pass_reward', s.id || ':' || r.level || ':' || r.track); end if;
    v_got := v_got || jsonb_build_object('level', r.level, 'track', r.track, 'item', r.item_id, 'pies', r.pies + v_comp, 'dup', v_comp > 0);
  end loop;
  update pass_progress set claimed_free = pp.claimed_free, claimed_premium = pp.claimed_premium where account_id = v_me and season_id = s.id;
  return public.dc_pass(p_token) || jsonb_build_object('claimed', v_got, 'me', dc.me(v_me));
end $$;

-- ------------------------------------------------------------------ desafíos
create or replace function dc.period_key(p text) returns text language sql stable as $$
  select case p when 'daily' then 'd:' || dc.today()::text else 'w:' || date_trunc('week', dc.today())::date::text end
$$;
create or replace function dc.active_challenges() returns setof challenge_defs
language sql stable security definer set search_path = public as $$
  (select * from challenge_defs where period = 'daily' and active order by md5(id || dc.period_key('daily')) limit 3)
  union all
  (select * from challenge_defs where period = 'weekly' and active order by md5(id || dc.period_key('weekly')) limit 3)
$$;
create or replace function dc.challenge_bump(p_acc uuid, p_metrics jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare c challenge_defs; v_n integer;
begin
  for c in select * from dc.active_challenges() loop
    v_n := coalesce((p_metrics->>(case when c.metric = 'game' then 'game:' || c.game else c.metric end))::int, 0);
    if v_n <= 0 then continue; end if;
    insert into challenge_progress(account_id, period_key, ch_id, progress) values (p_acc, dc.period_key(c.period), c.id, least(c.target, v_n))
      on conflict (account_id, period_key, ch_id) do update set progress = least(c.target, challenge_progress.progress + v_n);
  end loop;
end $$;
create or replace function public.dc_challenges(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return jsonb_build_object(
    'list', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'period', c.period, 'label', c.label, 'target', c.target,
        'xp', c.xp, 'pies', c.pies, 'progress', coalesce(cp.progress, 0), 'claimed', cp.claimed_at is not null) order by c.period, c.target)
      from dc.active_challenges() c
      left join challenge_progress cp on cp.account_id = v_me and cp.ch_id = c.id and cp.period_key = dc.period_key(c.period)), '[]'::jsonb),
    'daily_reset', (dc.today() + 1)::timestamp at time zone 'utc',
    'weekly_reset', (date_trunc('week', dc.today()) + interval '7 days')::timestamp at time zone 'utc');
end $$;
create or replace function public.dc_challenge_claim(p_token text, p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); c challenge_defs; cp challenge_progress; v_lv jsonb;
begin
  select * into c from dc.active_challenges() where id = p_id;
  if not found then perform dc.err('not_found'); end if;
  select * into cp from challenge_progress where account_id = v_me and ch_id = c.id and period_key = dc.period_key(c.period) for update;
  if not found or cp.progress < c.target then perform dc.err('not_ready'); end if;
  if cp.claimed_at is not null then perform dc.err('already_claimed'); end if;
  update challenge_progress set claimed_at = now() where account_id = v_me and ch_id = c.id and period_key = cp.period_key;
  if c.pies > 0 then perform dc.add_pies(v_me, c.pies, 'challenge', c.id); end if;
  v_lv := dc.add_xp(v_me, c.xp, 'challenge');
  return public.dc_challenges(p_token) || jsonb_build_object('levels', v_lv, 'me', dc.me(v_me));
end $$;

-- ------------------------------------------------------------------ partidas contra bots
create or replace function dc.apply_bot(p_acc uuid, p_m jsonb, p_game games) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_winner integer := (p_m->>'winner')::int; v_res integer; v_lvl text := coalesce(p_m->>'bot', 'normal');
  v_n integer; v_f numeric; v_xp integer; v_pies integer; v_levels jsonb; v_key text;
begin
  if v_lvl not in ('easy', 'normal', 'hard', 'expert') then v_lvl := 'normal'; end if;
  v_res := case when v_winner = -1 then 0 when v_winner = 0 then 1 else -1 end;
  insert into daily_counters(account_id, day, matches) values (p_acc, dc.today(), 1)
    on conflict (account_id, day) do update set matches = daily_counters.matches + 1 returning matches into v_n;
  v_f := (case when v_n <= 40 then 1 when v_n <= 80 then 0.5 else 0 end)
       * (case v_lvl when 'easy' then 0.4 when 'normal' then 0.6 when 'hard' then 0.8 else 1 end);
  v_xp := round((10 + case v_res when 1 then 15 when 0 then 5 else 0 end) * v_f);
  v_pies := round((4 + case v_res when 1 then 8 when 0 then 2 else 0 end) * v_f);
  v_key := case v_res when 1 then 'w' when 0 then 'd' else 'l' end;
  update accounts set last_match_at = now(),
    bot_stats = jsonb_set(bot_stats, array[v_lvl], coalesce(bot_stats->v_lvl, '{}'::jsonb)
      || jsonb_build_object(v_key, coalesce((bot_stats->v_lvl->>v_key)::int, 0) + 1))
  where id = p_acc;
  if v_pies > 0 then perform dc.add_pies(p_acc, v_pies, 'bot', p_game.id); end if;
  v_levels := dc.add_xp(p_acc, v_xp, 'bot');
  perform dc.challenge_bump(p_acc, jsonb_build_object('bot_win', (v_res = 1)::int, 'game:' || p_game.id, 1));
  return jsonb_build_object('slot', 0, 'res', v_res, 'xp', v_xp, 'pies', v_pies, 'factor', v_f, 'delta', 0, 'bot', v_lvl,
    'levels', v_levels, 'mastery', null, 'record', false, 'achievements', '[]'::jsonb, 'flags', '{}'::jsonb);
end $$;

-- ------------------------------------------------------------------ ajustes en funciones existentes
do $$
declare d text; n text;
begin
  -- toda la XP suma al pase de la temporada
  d := pg_get_functiondef('dc.add_xp(uuid,integer,text)'::regprocedure);
  if position('pass_add' in d) = 0 then
    n := replace(d, 'returning xp into v_xp;', 'returning xp into v_xp;
  perform dc.pass_add(p_acc, p_amount);');
    if n = d then raise exception 'add_xp: no se encontró el texto'; end if;
    execute n;
  end if;

  -- minijuegos: partidas contra bots aparte + progreso de desafíos
  d := pg_get_functiondef('dc.apply_minigame(uuid,integer,jsonb,uuid,integer,games)'::regprocedure);
  if position('apply_bot' in d) = 0 then
    n := replace(d, '  v_res := case when v_winner = -1 then 0 when v_winner = p_slot then 1 else -1 end;', '  if p_m->>''mode'' = ''bot'' then return dc.apply_bot(p_acc, p_m, p_game); end if;
  v_res := case when v_winner = -1 then 0 when v_winner = p_slot then 1 else -1 end;');
    n := replace(n, '  v_ach := dc.check_achievements(p_acc, v_ctx);
', '  v_ach := dc.check_achievements(p_acc, v_ctx);
  perform dc.challenge_bump(p_acc, jsonb_build_object(''play'', 1, ''win'', (v_res = 1)::int, ''game:'' || p_game.id, 1,
    ''online'', (p_m->>''mode'' = ''online'')::int, ''online_win'', (p_m->>''mode'' = ''online'' and v_res = 1)::int,
    ''caos'', (p_m->>''difficulty'' = ''caos'')::int));
');
    if position('apply_bot' in n) = 0 or position('challenge_bump' in n) = 0 then raise exception 'apply_minigame: no se encontró el texto'; end if;
    execute n;
  end if;

  -- partidas locales: sin ELO (pueden ser dos cuentas de la misma persona); acepta partidas contra bots
  d := pg_get_functiondef('public.dc_submit_match(text,text,jsonb)'::regprocedure);
  if position('''bot''' in d) = 0 then
    n := replace(d, $a$  if a1 is not null and a2 is not null then
    select rating, played into r1, pl1 from accounts where id = a1 for update;$a$, $a$  if false then -- el ELO solo cambia en partidas online
    select rating, played into r1, pl1 from accounts where id = a1 for update;$a$);
    n := replace(n, $a$  if a1 is not null and a2 is not null then
    insert into rating_history$a$, $a$  if d1 <> 0 or d2 <> 0 then
    insert into rating_history$a$);
    n := replace(n, $a$if v_mode not in ('quick', 'duel', 'tournament', 'survival') then perform dc.err('invalid_match'); end if;$a$,
      $a$if v_mode not in ('quick', 'duel', 'tournament', 'survival', 'bot') then perform dc.err('invalid_match'); end if;
  if v_mode = 'bot' and (a1 is null or a2 is not null) then perform dc.err('invalid_match'); end if;
$a$);
    n := replace(n, $a$  if a2 is not null then v_names[2] := (select display_name from accounts where id = a2); end if;$a$,
      $a$  if a2 is not null then v_names[2] := (select display_name from accounts where id = a2); end if;
  if v_mode = 'bot' then v_names[2] := 'BOT ' || upper(case when p_match->>'bot' in ('easy', 'normal', 'hard', 'expert') then p_match->>'bot' else 'normal' end); end if;$a$);
    if position('if false then' in n) = 0 or position('d1 <> 0 or d2 <> 0' in n) = 0 or position('''bot''' in n) = 0 or position('v_names[2] := ''BOT ''' in n) = 0 then
      raise exception 'dc_submit_match: no se encontró el texto';
    end if;
    execute n;
  end if;

  -- online: los minijuegos se marcan como online (desafíos) y las series terminadas cuentan como competición
  d := pg_get_functiondef('dc.online_record(uuid,jsonb)'::regprocedure);
  if position('"mode": "online"' in d) = 0 and position('''{"mode":"online"}''' in d) = 0 then
    n := replace(d, 'v_out1 := dc.apply_minigame(a1, 0, p_m, a2, d1, g);', 'v_out1 := dc.apply_minigame(a1, 0, p_m || ''{"mode":"online"}'', a2, d1, g);');
    n := replace(n, 'v_out2 := dc.apply_minigame(a2, 1, p_m, a1, d2, g);', 'v_out2 := dc.apply_minigame(a2, 1, p_m || ''{"mode":"online"}'', a1, d2, g);');
    if n = d then raise exception 'online_record: no se encontró el texto'; end if;
    execute n;
  end if;
  -- ELO solo en partidas competitivas (Buscar rival). Salas con código y desafíos a amigos: amistosas, sin ELO.
  d := pg_get_functiondef('dc.online_record(uuid,jsonb)'::regprocedure);
  if position('m.kind <> ''ranked''' in d) = 0 then
    n := replace(d, '  if v_pair >= 12 then d1 := 0; d2 := 0;', '  if m.kind <> ''ranked'' or v_pair >= 12 then d1 := 0; d2 := 0;');
    if n = d then raise exception 'online_record (ELO): no se encontró el texto'; end if;
    execute n;
  end if;
  d := pg_get_functiondef('dc.online_finish(uuid,integer,text)'::regprocedure);
  if position('challenge_bump' in d) = 0 then
    n := replace(d, '    v_ach := dc.check_achievements(acc, v_ctx);', '    v_ach := dc.check_achievements(acc, v_ctx);
    perform dc.challenge_bump(acc, ''{"comp":1}'');');
    if n = d then raise exception 'online_finish: no se encontró el texto'; end if;
    execute n;
  end if;
  d := pg_get_functiondef('public.dc_submit_comp(text,text,jsonb)'::regprocedure);
  if position('challenge_bump' in d) = 0 then
    n := regexp_replace(d, '(\n\s*)(v_ctx := jsonb_build_object\(''type'', ''comp'')', '\1perform dc.challenge_bump(acc, ''{"comp":1}'');\1\2');
    if n = d then raise exception 'dc_submit_comp: no se encontró el texto'; end if;
    execute n;
  end if;

  -- el perfil propio incluye el resumen del pase y los desafíos listos para reclamar
  d := pg_get_functiondef('dc.me(uuid)'::regprocedure);
  if position('pass_summary' in d) = 0 then
    n := replace(d, $a$'today', coalesce($a$, $a$'pass', dc.pass_summary(p_acc),
    'challenges_ready', (select count(*) from dc.active_challenges() c join challenge_progress cp on cp.ch_id = c.id
      and cp.account_id = p_acc and cp.period_key = dc.period_key(c.period) where cp.progress >= c.target and cp.claimed_at is null),
    'bot_stats', a.bot_stats,
    'today', coalesce($a$);
    if n = d then raise exception 'me: no se encontró el texto'; end if;
    execute n;
  end if;
end $$;

-- dc.me es "stable" pero dc.active_challenges también: OK. Permisos:
revoke all on all functions in schema dc from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['dc_pass(text,text)', 'dc_pass_buy(text)', 'dc_pass_claim(text,integer,text)', 'dc_challenges(text)', 'dc_challenge_claim(text,text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

-- DUEL CLUB · 010 · Usuarios en línea (presencia real) y moderación de nombres
--  · Cada navegador abierto avisa cada 30 s que sigue ahí ("latido"). El contador muestra cuántos navegadores
--    distintos dieron señales en los últimos 75 s (no es un número inventado).
--  · Nombres: se normalizan (minúsculas, sin acentos, números "leet" a letras, sin repeticiones) y se bloquean
--    insultos y palabras ofensivas. No se puede usar un nombre que ya usa otra cuenta.
--  · Cambio de nombre visible: una vez cada 7 días.

create table if not exists public.presence (
  client_id text primary key,
  account_id uuid references public.accounts(id) on delete cascade,
  place text,
  seen_at timestamptz not null default now()
);
create index if not exists presence_seen_idx on public.presence(seen_at);
alter table public.presence enable row level security;
alter table public.accounts add column if not exists name_changed_at timestamptz;

create or replace function public.dc_presence(p_client text, p_token text default null, p_place text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_acc uuid;
begin
  if p_client is null or p_client !~ '^[A-Za-z0-9_-]{8,40}$' then perform dc.err('invalid'); end if;
  if p_token is not null then
    begin v_acc := dc.auth(p_token); exception when others then v_acc := null; end;
  end if;
  insert into presence(client_id, account_id, place, seen_at) values (p_client, v_acc, left(p_place, 16), now())
    on conflict (client_id) do update set account_id = excluded.account_id, place = excluded.place, seen_at = now();
  if random() < 0.05 then delete from presence where seen_at < now() - interval '30 minutes'; end if;
  return jsonb_build_object(
    'online', (select count(*) from presence where seen_at > now() - interval '75 seconds'),
    'accounts', (select count(distinct account_id) from presence where seen_at > now() - interval '75 seconds' and account_id is not null),
    'playing', (select count(*) from presence where seen_at > now() - interval '75 seconds' and place in ('match', 'online')));
end $$;

-- ------------------------------------------------------------------ moderación de nombres
create or replace function dc.norm_name(p text) returns text language sql immutable as $$
  select regexp_replace(
    regexp_replace(
      translate(lower(coalesce(p, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç0134578@$!|', 'aaaaaeeeeiiiiooooouuuuncoieastbasii'),
      '[^a-z]', '', 'g'),
    '(.)\1+', '\1', 'g')
$$;

create or replace function dc.name_ok(p text) returns boolean language plpgsql immutable as $$
declare n text := dc.norm_name(p); w text;
begin
  -- palabras comunes que contienen una raíz bloqueada (para no bloquear nombres sanos)
  n := replace(replace(replace(replace(replace(n, 'computa', ''), 'disputa', ''), 'imputa', ''), 'reputa', ''), 'diputa', '');
  foreach w in array array[
    'puto', 'puta', 'putit', 'pelotud', 'forro', 'hdp', 'hijodeput', 'conchetumad', 'conchatumad', 'conchasumad', 'conchudo',
    'verga', 'lapija', 'pijud', 'pajer', 'mogolic', 'retrasad', 'mierda', 'cagon', 'trolo', 'maricon', 'marica', 'sorete', 'chupal', 'chupame',
    'nazi', 'hitler', 'violad', 'violar', 'pedof', 'porno', 'sexo', 'cocain', 'faloper',
    'niger', 'niga', 'fuck', 'shit', 'bitch', 'cunt', 'whore', 'faget', 'retard', 'pusy', 'slut'
  ] loop
    if position(w in n) > 0 then return false; end if;
  end loop;
  return true;
end $$;

-- ¿Otra cuenta ya usa ese nombre (como nombre visible o de usuario)?
create or replace function dc.name_taken(p_name text, p_except uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts where id is distinct from p_except
    and (lower(display_name) = lower(trim(p_name)) or username = lower(trim(p_name))))
$$;

create or replace function public.dc_rename(p_token text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_name text := dc.clean_name(p_name); a accounts;
begin
  select * into a from accounts where id = v_me for update;
  if char_length(v_name) < 3 then perform dc.err('name_invalid'); end if;
  if not dc.name_ok(v_name) then perform dc.err('name_blocked'); end if;
  if lower(v_name) = lower(a.display_name) then return jsonb_build_object('me', dc.me(v_me)); end if;
  if dc.name_taken(v_name, v_me) then perform dc.err('name_taken'); end if;
  if a.name_changed_at is not null and a.name_changed_at > now() - interval '7 days' then perform dc.err('name_cooldown'); end if;
  update accounts set display_name = v_name, name_changed_at = now() where id = v_me;
  return jsonb_build_object('me', dc.me(v_me));
end $$;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.dc_register(text,text,text)'::regprocedure);
  if position('name_ok' in d) = 0 then
    n := replace(d, $a$  if char_length(v_name) < 3 then perform dc.err('name_invalid'); end if;$a$,
      $a$  if char_length(v_name) < 3 then perform dc.err('name_invalid'); end if;
  if not dc.name_ok(v_name) or not dc.name_ok(v_user) then perform dc.err('name_blocked'); end if;
  if dc.name_taken(v_name, null) then perform dc.err('name_taken'); end if;$a$);
    if n = d then raise exception 'dc_register: no se encontró el texto'; end if;
    execute n;
  end if;
end $$;

revoke all on all functions in schema dc from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['dc_presence(text,text,text)', 'dc_rename(text,text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

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

-- GENERADO por scripts/gen-pass.mjs — no editar a mano
insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values
('title_s1_fundador', 'title', 'epic', null, 1, false),
('title_s1_temporada', 'title', 'rare', null, 1, false),
('title_s1_caotico', 'title', 'epic', null, 1, false),
('title_s1_completo', 'title', 'legendary', null, 1, false),
('card_s1_club', 'card', 'rare', null, 1, false),
('card_s1_noche', 'card', 'rare', null, 1, false),
('card_s1_aurora', 'card', 'epic', null, 1, false),
('card_s1_sintetico', 'card', 'epic', null, 1, false),
('card_s1_premium', 'card', 'legendary', null, 1, false),
('frame_s1_bronce', 'frame', 'rare', null, 1, false),
('frame_s1_plasma', 'frame', 'epic', null, 1, false),
('frame_s1_prisma', 'frame', 'legendary', null, 1, false),
('emo_s1_vamos', 'emote', 'uncommon', null, 1, false),
('emo_s1_lag', 'emote', 'rare', null, 1, false),
('emo_s1_otra', 'emote', 'rare', null, 1, false),
('emo_s1_tilt', 'emote', 'epic', null, 1, false),
('emo_s1_ez', 'emote', 'epic', null, 1, false),
('skin_s1_holo', 'skin', 'epic', null, 1, false),
('skin_s1_tigre', 'skin', 'epic', null, 1, false),
('skin_s1_carbono', 'skin', 'legendary', null, 1, false),
('skin_s1_prisma', 'skin', 'mythic', null, 1, false)
on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = null;
insert into public.seasons(id, name, starts_at, ends_at, premium_price, levels, xp_per_level) values ('s1', 'Temporada 1 · Club Caótico', '2026-11-14T00:00:00Z', '2027-02-01T00:00:00Z', 1500, 40, 500)
on conflict (id) do update set name = excluded.name, starts_at = excluded.starts_at, ends_at = excluded.ends_at, premium_price = excluded.premium_price, levels = excluded.levels, xp_per_level = excluded.xp_per_level;
insert into public.pass_rewards(season_id, level, track, item_id, pies) values
('s1', 1, 'free', null, 25),
('s1', 1, 'premium', 'title_s1_fundador', 0),
('s1', 2, 'free', null, 40),
('s1', 2, 'premium', null, 100),
('s1', 3, 'free', 'emo_s1_vamos', 0),
('s1', 3, 'premium', null, 100),
('s1', 4, 'free', null, 40),
('s1', 4, 'premium', 'card_s1_aurora', 0),
('s1', 5, 'free', 'card_s1_club', 0),
('s1', 5, 'premium', null, 100),
('s1', 6, 'free', null, 40),
('s1', 6, 'premium', 'emo_s1_lag', 0),
('s1', 7, 'free', null, 25),
('s1', 7, 'premium', null, 100),
('s1', 8, 'free', 'title_s1_temporada', 0),
('s1', 8, 'premium', 'skin_s1_holo', 0),
('s1', 9, 'free', null, 25),
('s1', 9, 'premium', null, 100),
('s1', 10, 'free', 'frame_s1_bronce', 0),
('s1', 10, 'premium', 'frame_s1_plasma', 0),
('s1', 11, 'free', null, 25),
('s1', 11, 'premium', null, 110),
('s1', 12, 'free', null, 50),
('s1', 12, 'premium', 'emo_s1_tilt', 0),
('s1', 13, 'free', null, 25),
('s1', 13, 'premium', null, 110),
('s1', 14, 'free', 'emo_s1_otra', 0),
('s1', 14, 'premium', 'card_s1_sintetico', 0),
('s1', 15, 'free', null, 25),
('s1', 15, 'premium', null, 110),
('s1', 16, 'free', null, 50),
('s1', 16, 'premium', 'skin_s1_tigre', 0),
('s1', 17, 'free', null, 25),
('s1', 17, 'premium', null, 110),
('s1', 18, 'free', null, 50),
('s1', 18, 'premium', null, 110),
('s1', 19, 'free', null, 25),
('s1', 19, 'premium', null, 110),
('s1', 20, 'free', 'card_s1_noche', 0),
('s1', 20, 'premium', 'emo_s1_ez', 0),
('s1', 21, 'free', null, 25),
('s1', 21, 'premium', null, 120),
('s1', 22, 'free', null, 60),
('s1', 22, 'premium', null, 120),
('s1', 23, 'free', null, 25),
('s1', 23, 'premium', null, 120),
('s1', 24, 'free', null, 60),
('s1', 24, 'premium', null, 120),
('s1', 25, 'free', 'title_s1_caotico', 0),
('s1', 25, 'premium', 'card_s1_premium', 0),
('s1', 26, 'free', null, 60),
('s1', 26, 'premium', null, 120),
('s1', 27, 'free', null, 25),
('s1', 27, 'premium', null, 120),
('s1', 28, 'free', null, 60),
('s1', 28, 'premium', null, 120),
('s1', 29, 'free', null, 25),
('s1', 29, 'premium', null, 120),
('s1', 30, 'free', null, 60),
('s1', 30, 'premium', 'skin_s1_carbono', 0),
('s1', 31, 'free', null, 25),
('s1', 31, 'premium', null, 130),
('s1', 32, 'free', null, 70),
('s1', 32, 'premium', null, 130),
('s1', 33, 'free', null, 25),
('s1', 33, 'premium', null, 130),
('s1', 34, 'free', null, 70),
('s1', 34, 'premium', null, 130),
('s1', 35, 'free', null, 25),
('s1', 35, 'premium', 'frame_s1_prisma', 0),
('s1', 36, 'free', null, 70),
('s1', 36, 'premium', null, 130),
('s1', 37, 'free', null, 25),
('s1', 37, 'premium', null, 130),
('s1', 38, 'free', null, 70),
('s1', 38, 'premium', null, 130),
('s1', 39, 'free', null, 25),
('s1', 39, 'premium', null, 130),
('s1', 40, 'free', 'title_s1_completo', 0),
('s1', 40, 'premium', 'skin_s1_prisma', 0)
on conflict (season_id, level, track) do update set item_id = excluded.item_id, pies = excluded.pies;
insert into public.challenge_defs(id, period, metric, game, target, xp, pies, label) values
('d_play5', 'daily', 'play', null, 5, 60, 30, 'Jugá 5 minijuegos'),
('d_play10', 'daily', 'play', null, 10, 100, 50, 'Jugá 10 minijuegos'),
('d_win3', 'daily', 'win', null, 3, 80, 40, 'Ganá 3 minijuegos'),
('d_win5', 'daily', 'win', null, 5, 120, 60, 'Ganá 5 minijuegos'),
('d_online2', 'daily', 'online', null, 2, 90, 45, 'Jugá 2 minijuegos online'),
('d_bot3', 'daily', 'bot_win', null, 3, 70, 35, 'Ganale 3 veces a un bot'),
('d_caos2', 'daily', 'caos', null, 2, 70, 35, 'Jugá 2 minijuegos con CAOS'),
('d_comp1', 'daily', 'comp', null, 1, 80, 40, 'Terminá una competición (Duelo, Torneo o serie online)'),
('d_g_reaction', 'daily', 'game', 'reaction', 2, 60, 30, 'Jugá 2 veces Reaction Rush'),
('d_g_pong', 'daily', 'game', 'pong', 2, 60, 30, 'Jugá 2 veces Pong Chaos'),
('d_g_race', 'daily', 'game', 'race', 2, 60, 30, 'Jugá 2 veces Micro Race'),
('d_g_tennis', 'daily', 'game', 'tennis', 2, 60, 30, 'Jugá 2 veces Turbo Tennis'),
('d_g_target', 'daily', 'game', 'target', 2, 60, 30, 'Jugá 2 veces Target Panic'),
('d_g_blast', 'daily', 'game', 'blast', 2, 60, 30, 'Jugá 2 veces Blast Zone'),
('w_play40', 'weekly', 'play', null, 40, 300, 150, 'Jugá 40 minijuegos'),
('w_win20', 'weekly', 'win', null, 20, 350, 180, 'Ganá 20 minijuegos'),
('w_online10', 'weekly', 'online', null, 10, 400, 200, 'Jugá 10 minijuegos online'),
('w_onwin5', 'weekly', 'online_win', null, 5, 450, 220, 'Ganá 5 minijuegos online'),
('w_bot15', 'weekly', 'bot_win', null, 15, 300, 150, 'Ganale 15 veces a un bot'),
('w_comp5', 'weekly', 'comp', null, 5, 350, 180, 'Terminá 5 competiciones'),
('w_caos10', 'weekly', 'caos', null, 10, 300, 150, 'Jugá 10 minijuegos con CAOS')
on conflict (id) do update set period = excluded.period, metric = excluded.metric, game = excluded.game, target = excluded.target, xp = excluded.xp, pies = excluded.pies, label = excluded.label;

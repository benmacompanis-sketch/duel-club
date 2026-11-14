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

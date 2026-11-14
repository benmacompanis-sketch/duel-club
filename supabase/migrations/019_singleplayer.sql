-- DUEL CLUB · 019 · SINGLEPLAYER con contenido automático (GENERADO por scripts/gen-sp.mjs desde src/data/spModes.js)
--  · DAILY CHAOS y WEEKLY CHALLENGE: los elige el servidor con la fecha y una semilla propia (sp_config.seed).
--    Todos reciben exactamente lo mismo (minijuego, modificador, dificultad, metas y semilla del minijuego).
--    No hace falta preparar nada a mano ni ningún proceso programado: se calcula al pedirlo.
--  · ENDLESS CLUB y GHOST RUN: récords personales y ranking.
--  · Rankings diarios/semanales (los períodos viejos quedan como historial; nunca se borra nada).
--  · Recompensas: XP y PIES con topes diarios. NUNCA ELO.
--  · Validación en el servidor: período y minijuego correctos, valores dentro del rango posible del minijuego,
--    duración mínima, frecuencia y revisión automática de valores que superan con holgura el récord mundial.
-- No borra nada. Requiere 009.

create table if not exists public.sp_config (key text primary key, value text not null);
insert into public.sp_config(key, value) values ('seed', (floor(random() * 2147483000) + 1)::bigint::text) on conflict (key) do nothing;

create table if not exists public.sp_scores (
  account_id uuid not null references public.accounts(id) on delete cascade,
  kind text not null check (kind in ('daily', 'weekly', 'endless', 'ghost')),
  period text not null,
  game text,
  best real not null,
  attempts integer not null default 1,
  stars integer not null default 0,
  status text not null default 'ok' check (status in ('ok', 'review')),
  meta jsonb not null default '{}'::jsonb,
  claimed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (account_id, kind, period)
);
create index if not exists sp_scores_board on public.sp_scores(kind, period, best);
create table if not exists public.sp_reward_log (
  account_id uuid not null references public.accounts(id) on delete cascade,
  kind text not null, day date not null, n integer not null default 0,
  primary key (account_id, kind, day)
);
create table if not exists public.sp_ghosts (
  account_id uuid not null references public.accounts(id) on delete cascade,
  game_id text not null,
  label text not null check (label in ('best', 'last', 'prev')),
  value real not null,
  data text not null,
  created_at timestamptz not null default now(),
  primary key (account_id, game_id, label)
);
alter table public.sp_config enable row level security;
alter table public.sp_scores enable row level security;
alter table public.sp_reward_log enable row level security;
alter table public.sp_ghosts enable row level security;

create or replace function dc.sp_cfg() returns jsonb language sql immutable as $$ select '{"games":{"reaction":["lower",[350,280,220],["speed","obstacles"]],"race":["lower",[26,22,19],["speed","invert","obstacles"]],"hoop":["higher",[15,28,40],["lowgrav","short","double","invert"]],"target":["higher",[500,1000,1600],["speed","short","double","invert"]],"beat":["higher",[40000,80000,120000],["speed","double"]],"fish":["higher",[120,220,320],["speed","short","double","invert"]],"blocks":["higher",[3000,8000,15000],["speed","short","double"]],"tower":["higher",[50,100,150],["lowgrav","short","speed","invert"]],"color":["higher",[35,55,75],["speed","short","obstacles","invert"]],"sneak":["higher",[10,18,26],["speed","short","double","invert"]],"blast":["higher",[30,50,70],["speed","obstacles","invert"]]},"eventGoal":{"speed":0.9,"short":0.65,"double":1.25,"invert":0.85,"lowgrav":1,"obstacles":0.9,"mirror":0.9},"diffs":["normal","hard","caos"],"diffGoal":{"normal":1,"hard":0.9,"caos":0.85},"ghost":{"race":"pose","tower":"pose","hoop":"score","target":"score","beat":"score","fish":"score","blocks":"score"}}'::jsonb $$;
create or replace function dc.sp_hash(p text) returns bigint language sql immutable as $$ select abs(hashtext(p)::bigint) $$;
create or replace function dc.sp_seed() returns text language sql stable security definer set search_path = public as $$ select value from sp_config where key = 'seed' $$;
create or replace function dc.sp_week(p_day date) returns date language sql immutable as $$ select date_trunc('week', p_day)::date $$;

-- metas [★, ★★, ★★★] con el modificador y la dificultad (misma cuenta que spGoals del juego)
create or replace function dc.sp_goals(p_game text, p_event text, p_diff text) returns jsonb
language sql immutable as $$
  select jsonb_agg(case when c->'games'->p_game->>0 = 'lower'
           then round((v::numeric / f) * 10) / 10 else round(v::numeric * f) end order by o)
  from (select dc.sp_cfg() c) x,
       lateral (select coalesce((x.c->'eventGoal'->>p_event)::numeric, 1) * coalesce((x.c->'diffGoal'->>p_diff)::numeric, 1) f) y,
       lateral jsonb_array_elements_text(x.c->'games'->p_game->1) with ordinality t(v, o)
$$;

create or replace function dc.sp_daily(p_day date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c jsonb := dc.sp_cfg(); s text := dc.sp_seed(); ids text[]; g text; evs jsonb; ev text;
begin
  select array_agg(k order by k) into ids from jsonb_object_keys(c->'games') k;
  g := ids[1 + (dc.sp_hash(s || ':d:' || p_day) % array_length(ids, 1))::int];
  evs := c->'games'->g->2;
  ev := evs->>((dc.sp_hash(s || ':de:' || p_day) % jsonb_array_length(evs))::int);
  return jsonb_build_object('key', 'd:' || p_day, 'game', g, 'event', ev, 'diff', 'normal', 'dir', c->'games'->g->>0,
    'seed', dc.sp_hash(s || ':dr:' || p_day) % 2147483000, 'goals', dc.sp_goals(g, ev, 'normal'),
    'ends_at', (p_day + 1)::timestamptz);
end $$;

create or replace function dc.sp_weekly(p_monday date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c jsonb := dc.sp_cfg(); s text := dc.sp_seed(); ids text[]; g text; evs jsonb; ev text; d text; k integer;
begin
  select array_agg(k2 order by k2) into ids from jsonb_object_keys(c->'games') k2;
  g := ids[1 + (dc.sp_hash(s || ':w:' || p_monday) % array_length(ids, 1))::int];
  d := c->'diffs'->>((dc.sp_hash(s || ':wd:' || p_monday) % jsonb_array_length(c->'diffs'))::int);
  evs := c->'games'->g->2;
  k := (dc.sp_hash(s || ':we:' || p_monday) % (jsonb_array_length(evs) + 1))::int;
  ev := case when k < jsonb_array_length(evs) then evs->>k end;
  return jsonb_build_object('key', 'w:' || p_monday, 'game', g, 'event', ev, 'diff', d, 'dir', c->'games'->g->>0,
    'seed', dc.sp_hash(s || ':wr:' || p_monday) % 2147483000, 'goals', dc.sp_goals(g, ev, d),
    'starts_at', p_monday::timestamptz, 'ends_at', (p_monday + 7)::timestamptz);
end $$;

-- premio de la semana anterior según el puesto (se entrega la primera vez que el jugador abre los modos)
create or replace function dc.sp_weekly_payout(p_me uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_prev date := dc.sp_week(dc.today()) - 7; sc sp_scores; spec jsonb; v_rank integer; v_tot integer; v_pies integer;
begin
  select * into sc from sp_scores where account_id = p_me and kind = 'weekly' and period = 'w:' || v_prev and not claimed for update;
  if not found then return null; end if;
  spec := dc.sp_weekly(v_prev);
  select count(*) into v_tot from sp_scores where kind = 'weekly' and period = sc.period and status = 'ok';
  select 1 + count(*) into v_rank from sp_scores where kind = 'weekly' and period = sc.period and status = 'ok' and account_id <> p_me
    and (case when spec->>'dir' = 'lower' then best < sc.best else best > sc.best end);
  v_pies := case when sc.status <> 'ok' then 0 when v_rank = 1 then 600 when v_rank <= 3 then 400 when v_rank <= 10 then 250
                 when v_rank <= greatest(1, ceil(v_tot * 0.25)) then 120 else 50 end;
  update sp_scores set claimed = true where account_id = p_me and kind = 'weekly' and period = sc.period;
  if v_pies > 0 then
    perform dc.add_pies(p_me, v_pies, 'weekly', sc.period);
    perform dc.notify(p_me, 'weekly', 'Resultado del desafío semanal', 'Terminaste en el puesto ' || v_rank || ' de ' || v_tot || '. Premio: ' || v_pies || ' PIES.', jsonb_build_object('rank', v_rank, 'pies', v_pies));
  end if;
  return jsonb_build_object('period', sc.period, 'rank', v_rank, 'total', v_tot, 'pies', v_pies);
end $$;

create or replace function public.dc_sp_specs(p_token text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid; v_day date := dc.today(); dl jsonb := dc.sp_daily(dc.today()); wk jsonb := dc.sp_weekly(dc.sp_week(dc.today())); v_pay jsonb;
begin
  if p_token is not null then begin v_me := dc.auth(p_token); exception when others then v_me := null; end; end if;
  if v_me is not null then v_pay := dc.sp_weekly_payout(v_me); end if;
  return jsonb_build_object('daily', dl, 'weekly', wk, 'weekly_payout', v_pay,
    'mine', case when v_me is null then null else jsonb_build_object(
      'daily', (select jsonb_build_object('best', best, 'stars', stars, 'attempts', attempts) from sp_scores where account_id = v_me and kind = 'daily' and period = dl->>'key'),
      'weekly', (select jsonb_build_object('best', best, 'attempts', attempts, 'status', status) from sp_scores where account_id = v_me and kind = 'weekly' and period = wk->>'key'),
      'endless', (select jsonb_build_object('best', best, 'attempts', attempts, 'meta', meta) from sp_scores where account_id = v_me and kind = 'endless' and period = 'all'),
      'ghosts', coalesce((select jsonb_object_agg(period, best) from sp_scores where account_id = v_me and kind = 'ghost'), '{}'::jsonb)) end);
end $$;

create or replace function public.dc_sp_submit(p_token text, p_kind text, p_period text, p_game text, p_value real, p_meta jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); spec jsonb; g games; sc sp_scores; v_dir text; v_better boolean; v_stars integer := 0;
  v_new_stars integer := 0; v_xp integer := 0; v_pies integer := 0; v_status text := 'ok'; wr world_records; v_secs real; v_stages integer;
  v_n integer; v_rank integer; v_exists boolean;
begin
  if p_kind not in ('daily', 'weekly', 'endless', 'ghost') or p_value is null or p_value <> p_value then perform dc.err('invalid_match'); end if;
  v_secs := coalesce((p_meta->>'secs')::real, 0);
  if p_kind = 'daily' then
    spec := dc.sp_daily(dc.today());
    if p_period <> spec->>'key' or p_game <> spec->>'game' then perform dc.err('sp_expired'); end if;
  elsif p_kind = 'weekly' then
    spec := dc.sp_weekly(dc.sp_week(dc.today()));
    if p_period <> spec->>'key' or p_game <> spec->>'game' then perform dc.err('sp_expired'); end if;
  elsif p_kind = 'ghost' then
    if not (dc.sp_cfg()->'ghost' ? p_game) or p_period <> p_game then perform dc.err('invalid_match'); end if;
  else
    if p_period <> 'all' then perform dc.err('invalid_match'); end if;
    v_stages := coalesce((p_meta->>'stages')::int, -1);
    if v_stages < 0 or v_stages > 500 or v_secs < v_stages * 10 or p_value < 0 or p_value > v_stages * 1000 + 1000 then perform dc.err('invalid_match'); end if;
  end if;
  if p_kind <> 'endless' then
    select * into g from games where id = p_game;
    if not found or p_value < g.rec_min or p_value > g.rec_max or v_secs < 8 then perform dc.err('invalid_match'); end if;
    v_dir := g.record_better;
    -- valores que superan con holgura el récord mundial quedan en revisión (no aparecen en el ranking)
    select * into wr from world_records where game_id = p_game;
    if found and ((v_dir = 'higher' and p_value > wr.value * 1.25 + 5) or (v_dir = 'lower' and p_value < wr.value * 0.8)) then v_status := 'review'; end if;
  else v_dir := 'higher';
  end if;
  select * into sc from sp_scores where account_id = v_me and kind = p_kind and period = p_period for update;
  v_exists := found;
  if v_exists and sc.updated_at > now() - interval '6 seconds' then perform dc.err('too_fast'); end if;
  if p_kind = 'daily' then
    select count(*) into v_stars from jsonb_array_elements_text(spec->'goals') t(v)
      where case when v_dir = 'lower' then p_value <= t.v::real else p_value >= t.v::real end;
  end if;
  v_better := not v_exists or (case when v_dir = 'lower' then p_value < sc.best else p_value > sc.best end);
  if not v_exists then
    insert into sp_scores(account_id, kind, period, game, best, stars, status, meta)
      values (v_me, p_kind, p_period, p_game, p_value, v_stars, v_status, coalesce(p_meta, '{}'::jsonb) - 'secs');
    v_new_stars := v_stars;
  else
    v_new_stars := greatest(0, v_stars - sc.stars);
    update sp_scores set attempts = attempts + 1, updated_at = now(), stars = greatest(stars, v_stars),
      best = case when v_better then p_value else best end,
      status = case when v_better then v_status else status end,
      meta = case when v_better then coalesce(p_meta, '{}'::jsonb) - 'secs' else meta end
      where account_id = v_me and kind = p_kind and period = p_period;
  end if;
  -- recompensas (XP y PIES, con topes diarios; nunca ELO)
  insert into sp_reward_log(account_id, kind, day) values (v_me, p_kind, dc.today()) on conflict do nothing;
  select n into v_n from sp_reward_log where account_id = v_me and kind = p_kind and day = dc.today() for update;
  if p_kind = 'daily' and v_new_stars > 0 then v_xp := 25 * v_new_stars; v_pies := 15 * v_new_stars;
  elsif p_kind = 'weekly' and not v_exists then v_xp := 60; v_pies := 30;
  elsif p_kind = 'endless' and v_n < 3 then v_xp := least(300, v_stages * 12); v_pies := least(150, v_stages * 6);
  elsif p_kind = 'ghost' and v_better and v_exists and v_n < 5 then v_xp := 30; v_pies := 15;
  end if;
  if v_xp > 0 or v_pies > 0 then
    update sp_reward_log set n = n + 1 where account_id = v_me and kind = p_kind and day = dc.today();
    if v_pies > 0 then perform dc.add_pies(v_me, v_pies, 'solo', p_kind); end if;
    if v_xp > 0 then perform dc.add_xp(v_me, v_xp, 'solo'); end if;
  end if;
  select 1 + count(*) into v_rank from sp_scores s where s.kind = p_kind and s.period = p_period and s.status = 'ok' and s.account_id <> v_me
    and (case when v_dir = 'lower' then s.best < (select best from sp_scores where account_id = v_me and kind = p_kind and period = p_period)
              else s.best > (select best from sp_scores where account_id = v_me and kind = p_kind and period = p_period) end);
  return jsonb_build_object('improved', v_better, 'best', (select best from sp_scores where account_id = v_me and kind = p_kind and period = p_period),
    'stars', v_stars, 'new_stars', v_new_stars, 'xp', v_xp, 'pies', v_pies, 'status', v_status, 'rank', v_rank, 'me', dc.me(v_me));
end $$;

create or replace function public.dc_sp_board(p_kind text, p_period text, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid; v_dir text := 'higher'; v_game text;
begin
  if p_token is not null then begin v_me := dc.auth(p_token); exception when others then v_me := null; end; end if;
  if p_kind in ('daily', 'weekly', 'ghost') then
    select game into v_game from sp_scores where kind = p_kind and period = p_period and game is not null limit 1;
    select coalesce(record_better, 'higher') into v_dir from games where id = v_game;
  end if;
  return jsonb_build_object('dir', v_dir, 'top', coalesce((select jsonb_agg(x order by x.pos) from (
      select row_number() over (order by case when v_dir = 'lower' then s.best else -s.best end, s.updated_at) pos,
        a.display_name name, a.username, a.color, s.best, s.attempts, s.account_id = v_me mine
      from sp_scores s join accounts a on a.id = s.account_id where s.kind = p_kind and s.period = p_period and s.status = 'ok'
      order by case when v_dir = 'lower' then s.best else -s.best end, s.updated_at limit 50) x), '[]'::jsonb));
end $$;

create or replace function public.dc_ghost_save(p_token text, p_game text, p_value real, p_data text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_dir text; b sp_ghosts;
begin
  if not (dc.sp_cfg()->'ghost' ? p_game) or p_data is null or length(p_data) > 150000 or p_value is null then perform dc.err('invalid_match'); end if;
  select record_better into v_dir from games where id = p_game;
  insert into sp_ghosts(account_id, game_id, label, value, data) values (v_me, p_game, 'last', p_value, p_data)
    on conflict (account_id, game_id, label) do update set value = excluded.value, data = excluded.data, created_at = now();
  select * into b from sp_ghosts where account_id = v_me and game_id = p_game and label = 'best';
  if not found or (case when v_dir = 'lower' then p_value < b.value else p_value > b.value end) then
    if found then
      insert into sp_ghosts(account_id, game_id, label, value, data, created_at) values (v_me, p_game, 'prev', b.value, b.data, b.created_at)
        on conflict (account_id, game_id, label) do update set value = excluded.value, data = excluded.data, created_at = excluded.created_at;
    end if;
    insert into sp_ghosts(account_id, game_id, label, value, data) values (v_me, p_game, 'best', p_value, p_data)
      on conflict (account_id, game_id, label) do update set value = excluded.value, data = excluded.data, created_at = now();
  end if;
  return public.dc_ghost_list(p_token, p_game);
end $$;

create or replace function public.dc_ghost_list(p_token text, p_game text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('label', label, 'value', value, 'at', created_at, 'data', data) order by label)
    from sp_ghosts where account_id = v_me and game_id = p_game), '[]'::jsonb);
end $$;

revoke all on function dc.sp_seed(), dc.sp_weekly_payout(uuid) from public, anon, authenticated;
grant execute on function public.dc_sp_specs(text), public.dc_sp_submit(text, text, text, text, real, jsonb), public.dc_sp_board(text, text, text),
  public.dc_ghost_save(text, text, real, text), public.dc_ghost_list(text, text) to anon, authenticated;

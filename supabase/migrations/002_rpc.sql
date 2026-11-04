-- DUEL CLUB · 002 · Lógica del servidor (RPC)
-- Toda modificación de KEKE, PIES, RESISTENCIA, logros, inventario y estadísticas ocurre AQUÍ.
-- El navegador solo envía resultados de partidas; el servidor valida sesiones, límites y plausibilidad
-- y calcula las recompensas con sus propias reglas.

-- ------------------------------------------------------------------ ajustes de esquema
alter table public.accounts add column if not exists loss_streak integer not null default 0;
alter table public.accounts add column if not exists last_match_at timestamptz;
alter table public.catalog_achievements add column if not exists rewards text[] not null default '{}';
alter table public.catalog_achievements add column if not exists secret boolean not null default false;
alter table public.matches add column if not exists p1_flags jsonb;
alter table public.matches add column if not exists p2_flags jsonb;
alter table public.daily_counters add column if not exists comps integer not null default 0;
alter table public.inventory drop constraint if exists inventory_item_id_fkey;
alter table public.inventory add constraint inventory_item_id_fkey foreign key (item_id) references public.catalog_items(id) on update cascade;

create table if not exists public.games (
  id text primary key,
  name text not null,
  original boolean not null default false,
  record_better text check (record_better in ('higher','lower')),
  rec_min real,
  rec_max real
);
create table if not exists public.signup_log (
  id bigserial primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index if not exists signup_log_idx on public.signup_log (ip, at desc);
alter table public.games enable row level security;
alter table public.signup_log enable row level security;
revoke all on public.games, public.signup_log from anon, authenticated;

-- ------------------------------------------------------------------ utilidades
create or replace function dc.ip() returns text language plpgsql stable as $$
declare v text;
begin
  begin
    v := current_setting('request.headers', true)::json->>'x-forwarded-for';
  exception when others then v := null;
  end;
  return coalesce(nullif(trim(split_part(coalesce(v, ''), ',', 1)), ''), 'unknown');
end $$;

create or replace function dc.today() returns date language sql stable as $$ select (now() at time zone 'utc')::date $$;

create or replace function dc.tier_keke(t text) returns integer language sql immutable as $$
  select case t when 'legendary' then 250 when 'hard' then 100 else 40 end $$;
create or replace function dc.tier_pies(t text) returns integer language sql immutable as $$
  select case t when 'legendary' then 150 when 'hard' then 60 else 25 end $$;

create or replace function dc.clean_name(p text) returns text language plpgsql immutable as $$
declare v text := regexp_replace(coalesce(p, ''), '[[:cntrl:]]', '', 'g');
begin
  v := regexp_replace(trim(v), '\s+', ' ', 'g');
  return left(v, 16);
end $$;

-- Dueño (default) o en inventario
create or replace function dc.owns(p_acc uuid, p_item text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from catalog_items where id = p_item and is_default)
      or exists (select 1 from inventory where account_id = p_acc and item_id = p_item)
$$;

-- ------------------------------------------------------------------ KEKE y niveles
-- Suma KEKE y entrega las recompensas de cada nivel alcanzado. Devuelve los niveles nuevos.
create or replace function dc.add_keke(p_acc uuid, p_amount integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_old integer; v_new integer; v_keke integer; l integer; v_rp integer; v_ri text[]; it text;
  v_levels jsonb := '[]'::jsonb;
begin
  if p_amount is null or p_amount <= 0 then return v_levels; end if;
  select keke into v_keke from accounts where id = p_acc for update;
  v_old := dc.level_of(v_keke);
  update accounts set keke = keke + p_amount where id = p_acc returning keke into v_keke;
  v_new := dc.level_of(v_keke);
  if v_new > v_old then
    for l in v_old + 1 .. v_new loop
      perform dc.add_pies(p_acc, 20, 'level', l::text);
      select pies, items into v_rp, v_ri from level_rewards where level = l;
      if not found then v_rp := 0; v_ri := '{}'; end if;
      if v_rp > 0 then perform dc.add_pies(p_acc, v_rp, 'level_bonus', l::text); end if;
      foreach it in array v_ri loop
        perform dc.grant_item(p_acc, it, 'level');
      end loop;
      v_levels := v_levels || jsonb_build_object('level', l, 'items', to_jsonb(v_ri), 'pies', 20 + v_rp);
      if l in (5, 6, 10, 15, 20, 21, 30, 42, 50, 67, 69, 75, 100, 150) or l % 10 = 0 then
        perform dc.notify(p_acc, 'level', '¡Nivel ' || l || '!',
          case l when 67 then 'EL ELEGIDO. El número sagrado te reconoce.'
                 when 69 then 'No preguntes.' when 42 then 'La respuesta a todo.'
                 when 6 then 'Sos sospechoso.' when 21 then 'Modo serio activado.'
                 when 150 then '¿Tenés vida? En serio, preguntamos con cariño.'
                 else 'Subiste de nivel y hay recompensas esperándote.' end,
          jsonb_build_object('level', l));
      end if;
    end loop;
  end if;
  return v_levels;
end $$;

-- ------------------------------------------------------------------ dominio por minijuego
create or replace function dc.mastery_rank(p_points integer) returns smallint language sql immutable as $$
  select (case when p_points >= 160 then 4 when p_points >= 80 then 3 when p_points >= 35 then 2 when p_points >= 12 then 1 else 0 end)::smallint
$$;

create or replace function dc.update_mastery(p_acc uuid, p_game text, p_res integer, p_dur real, p_record real, p_better text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m mastery; v_rank smallint; v_out jsonb := null; v_k integer; v_p integer;
begin
  insert into mastery(account_id, game_id) values (p_acc, p_game) on conflict do nothing;
  update mastery set
    played = played + 1,
    wins = wins + (p_res = 1)::int,
    losses = losses + (p_res = -1)::int,
    draws = draws + (p_res = 0)::int,
    streak = case when p_res = 1 then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when p_res = 1 then streak + 1 else 0 end),
    time_played = time_played + coalesce(p_dur, 0),
    best_record = case
      when p_record is null or p_better is null then best_record
      when best_record is null then p_record
      when p_better = 'higher' then greatest(best_record, p_record)
      else least(best_record, p_record) end
  where account_id = p_acc and game_id = p_game
  returning * into m;
  v_rank := dc.mastery_rank(m.played + 2 * m.wins);
  if v_rank > m.rank then
    update mastery set rank = v_rank where account_id = p_acc and game_id = p_game;
    for r in m.rank + 1 .. v_rank loop
      v_k := (array[50, 100, 200, 400])[r];
      v_p := (array[40, 80, 150, 300])[r];
      perform dc.add_pies(p_acc, v_p, 'mastery', p_game || ':' || r);
      perform dc.add_keke(p_acc, v_k, 'mastery');
    end loop;
    if v_rank = 4 then
      perform dc.grant_item(p_acc, 'skin_m_' || p_game, 'mastery');
      perform dc.grant_item(p_acc, 'title_m_' || p_game, 'mastery');
    end if;
    perform dc.notify(p_acc, 'mastery', 'Dominio: ' || (select name from games where id = p_game),
      'Nuevo rango: ' || (array['Aficionado','Competente','Experto','Maestro'])[v_rank], jsonb_build_object('game', p_game, 'rank', v_rank));
    v_out := jsonb_build_object('game', p_game, 'rank', v_rank, 'from', m.rank);
  end if;
  return v_out;
end $$;

-- ------------------------------------------------------------------ condiciones de logros
create or replace function dc.cond_ok(p_acc uuid, c jsonb, ctx jsonb)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  acc accounts; t text := c->>'t'; v numeric; f numeric; op text; v_opp uuid;
begin
  select * into acc from accounts where id = p_acc;
  if not found then return false; end if;
  ctx := coalesce(ctx, '{}'::jsonb);
  if t = 'stat' then
    v := case c->>'k'
      when 'wins' then acc.wins when 'played' then acc.played when 'best_streak' then acc.best_streak
      when 'comp_wins' then acc.comp_wins when 'tournaments' then acc.tournaments when 'survival_best' then acc.survival_best
      when 'best_rating' then acc.best_rating when 'pies_spent' then acc.pies_spent when 'time_played' then acc.time_played
      when 'draws' then acc.draws when 'draw_streak' then acc.draw_streak when 'loss_streak' then acc.loss_streak
      else null end;
    return v is not null and v >= (c->>'gte')::numeric;
  elsif t = 'level' then
    return dc.level_of(acc.keke) >= (c->>'gte')::int;
  elsif t = 'gwins' then
    return coalesce((select wins from mastery where account_id = p_acc and game_id = c->>'g'), 0) >= (c->>'gte')::int;
  elsif t = 'gstreak' then
    return coalesce((select best_streak from mastery where account_id = p_acc and game_id = c->>'g'), 0) >= (c->>'gte')::int;
  elsif t = 'grank' then
    return coalesce((select rank from mastery where account_id = p_acc and game_id = c->>'g'), 0) >= (c->>'gte')::int;
  elsif t = 'ranks' then
    return (select count(*) from mastery where account_id = p_acc and rank >= (c->>'gte')::int) >= (c->>'count')::int;
  elsif t = 'gameswon' then
    return (select count(*) from mastery m join games g on g.id = m.game_id
            where m.account_id = p_acc and m.wins > 0 and (c->>'set' is distinct from 'orig' or g.original)) >= (c->>'count')::int;
  elsif t = 'gamesplayed' then
    return (select count(*) from mastery where account_id = p_acc and played > 0) >= (c->>'count')::int;
  elsif t = 'flag' then
    if ctx->>'type' is distinct from 'minigame' then return false; end if;
    if c ? 'g' and c->>'g' is distinct from ctx->>'game' then return false; end if;
    if coalesce((c->>'win')::boolean, false) and not coalesce((ctx->>'win')::boolean, false) then return false; end if;
    if coalesce((c->>'lose')::boolean, false) and not coalesce((ctx->>'lose')::boolean, false) then return false; end if;
    if jsonb_typeof(ctx->'flags'->(c->>'k')) is distinct from 'number' then return false; end if;
    f := (ctx->'flags'->>(c->>'k'))::numeric;
    v := (c->>'v')::numeric; op := c->>'op';
    return case op when 'lt' then f < v when 'lte' then f <= v when 'eq' then f = v when 'gte' then f >= v when 'gt' then f > v else false end;
  elsif t = 'comp' then
    if ctx->>'type' is distinct from 'comp' then return false; end if;
    if c ? 'mode' and c->>'mode' is distinct from ctx->>'mode' then return false; end if;
    if coalesce((c->>'win')::boolean, false) and not coalesce((ctx->>'win')::boolean, false) then return false; end if;
    if coalesce((c->>'lose')::boolean, false) and not coalesce((ctx->>'lose')::boolean, false) then return false; end if;
    if c ? 'deficit_gte' and coalesce((ctx->>'deficit')::numeric, 0) < (c->>'deficit_gte')::numeric then return false; end if;
    if c ? 'margin_gte' and coalesce((ctx->>'margin')::numeric, 0) < (c->>'margin_gte')::numeric then return false; end if;
    if c ? 'margin_eq' and coalesce((ctx->>'margin')::numeric, -1) <> (c->>'margin_eq')::numeric then return false; end if;
    if c ? 'games_gte' and coalesce((ctx->>'games')::numeric, 0) < (c->>'games_gte')::numeric then return false; end if;
    if c ? 'diff' and ctx->>'diff' is distinct from c->>'diff' then return false; end if;
    return true;
  elsif t = 'diffwin' then
    return ctx->>'type' = 'minigame' and coalesce((ctx->>'win')::boolean, false) and ctx->>'diff' = c->>'d';
  elsif t = 'charwin' then
    return ctx->>'type' = 'minigame' and coalesce((ctx->>'win')::boolean, false) and 'char_' || acc.char = c->>'c';
  elsif t = 'friends' then
    return (select count(*) from friendships where status = 'accepted' and (friendships.a = p_acc or friendships.b = p_acc)) >= (c->>'gte')::int;
  elsif t = 'items' then
    return (select count(*) from inventory where account_id = p_acc) >= (c->>'gte')::int;
  elsif t = 'achs' then
    return (select count(*) from achievements_unlocked where account_id = p_acc) >= (c->>'gte')::int;
  elsif t = 'buys' then
    return (select count(*) from transactions where account_id = p_acc and reason = 'buy') >= (c->>'gte')::int;
  elsif t = 'daily' then
    return coalesce((select matches from daily_counters where account_id = p_acc and day = dc.today()), 0) >= (c->>'gte')::int;
  elsif t = 'rival' then
    v_opp := nullif(ctx->>'opp', '')::uuid;
    if v_opp is null then return false; end if;
    return (select count(*) from matches where (p1 = p_acc and p2 = v_opp) or (p1 = v_opp and p2 = p_acc)) >= (c->>'gte')::int;
  elsif t = 'friendwin' then
    v_opp := nullif(ctx->>'opp', '')::uuid;
    if v_opp is null or not coalesce((ctx->>'win')::boolean, false) then return false; end if;
    return exists (select 1 from friendships where status = 'accepted' and friendships.a = least(p_acc, v_opp) and friendships.b = greatest(p_acc, v_opp));
  end if;
  return false;
end $$;

-- Evalúa todos los logros pendientes; entrega recompensas. Repite por si un logro sube de nivel y desbloquea otro.
create or replace function dc.check_achievements(p_acc uuid, ctx jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; it text; v_out jsonb := '[]'::jsonb; v_any boolean; v_iter integer := 0; v_lv jsonb;
begin
  loop
    v_any := false;
    v_iter := v_iter + 1;
    for r in select * from catalog_achievements ca
             where not exists (select 1 from achievements_unlocked u where u.account_id = p_acc and u.ach_id = ca.id)
             order by ca.id loop
      if dc.cond_ok(p_acc, r.cond, ctx) then
        insert into achievements_unlocked(account_id, ach_id) values (p_acc, r.id) on conflict do nothing;
        if found then
          v_any := true;
          foreach it in array r.rewards loop perform dc.grant_item(p_acc, it, 'achievement'); end loop;
          perform dc.add_pies(p_acc, dc.tier_pies(r.tier), 'achievement', r.id);
          v_lv := dc.add_keke(p_acc, dc.tier_keke(r.tier), 'achievement');
          perform dc.notify(p_acc, 'achievement', 'Logro desbloqueado', r.id, jsonb_build_object('id', r.id));
          v_out := v_out || jsonb_build_object('id', r.id, 'rewards', to_jsonb(r.rewards), 'keke', dc.tier_keke(r.tier), 'pies', dc.tier_pies(r.tier), 'levels', v_lv);
        end if;
      end if;
    end loop;
    exit when not v_any or v_iter >= 3;
  end loop;
  return v_out;
end $$;

-- ------------------------------------------------------------------ datos de la cuenta propia
create or replace function dc.me(p_acc uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a accounts; v jsonb;
begin
  select * into a from accounts where id = p_acc;
  v := dc.public_card(a) || jsonb_build_object(
    'pies', a.pies, 'pies_earned', a.pies_earned, 'pies_spent', a.pies_spent,
    'stats', jsonb_build_object(
      'played', a.played, 'wins', a.wins, 'losses', a.losses, 'draws', a.draws, 'streak', a.streak,
      'best_streak', a.best_streak, 'draw_streak', a.draw_streak, 'loss_streak', a.loss_streak,
      'comp_wins', a.comp_wins, 'comp_losses', a.comp_losses, 'comp_draws', a.comp_draws, 'tournaments', a.tournaments,
      'survival_best', a.survival_best, 'time_played', a.time_played, 'best_rating', a.best_rating, 'pies_spent', a.pies_spent),
    'inventory', coalesce((select jsonb_agg(item_id order by acquired_at) from inventory where account_id = p_acc), '[]'::jsonb),
    'achievements', coalesce((select jsonb_object_agg(ach_id, unlocked_at) from achievements_unlocked where account_id = p_acc), '{}'::jsonb),
    'mastery', coalesce((select jsonb_object_agg(game_id, jsonb_build_object('played', played, 'wins', wins, 'losses', losses, 'draws', draws,
        'streak', streak, 'best_streak', best_streak, 'best_record', best_record, 'time_played', time_played, 'rank', rank))
        from mastery where account_id = p_acc), '{}'::jsonb),
    'friends', (select count(*) from friendships where status = 'accepted' and (friendships.a = p_acc or friendships.b = p_acc)),
    'requests', (select count(*) from friendships where status = 'pending' and requested_by <> p_acc and (friendships.a = p_acc or friendships.b = p_acc)),
    'items_count', (select count(*) from inventory where account_id = p_acc),
    'buys', (select count(*) from transactions where account_id = p_acc and reason = 'buy'),
    'unread', (select count(*) from notifications where account_id = p_acc and not read),
    'today', coalesce((select matches from daily_counters where account_id = p_acc and day = dc.today()), 0)
  );
  return v;
end $$;

-- ================================================================== RPC PÚBLICAS
-- ------------------------------------------------------------------ autenticación
create or replace function public.dc_check_username(p_username text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exists', exists (select 1 from accounts where username = lower(p_username)),
    'legacy', exists (select 1 from accounts where username = lower(p_username) and pass_hash is null and legacy_pin_hash is not null))
$$;

create or replace function public.dc_register(p_username text, p_name text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_user text := lower(trim(coalesce(p_username, ''))); v_name text := dc.clean_name(p_name); v_id uuid; v_ip text := dc.ip(); v_tok text;
begin
  if v_user !~ '^[a-z0-9_-]{3,16}$' then perform dc.err('username_invalid'); end if;
  if char_length(v_name) < 3 then perform dc.err('name_invalid'); end if;
  if p_password is null or char_length(p_password) < 6 or octet_length(p_password) > 72 then perform dc.err('password_invalid'); end if;
  if (select count(*) from signup_log where ip = v_ip and at > now() - interval '1 hour') >= (case when v_ip = 'unknown' then 60 else 8 end) then
    perform dc.err('too_many_signups');
  end if;
  if exists (select 1 from accounts where username = v_user) then perform dc.err('username_taken'); end if;
  insert into signup_log(ip) values (v_ip);
  insert into accounts(username, display_name, pass_hash) values (v_user, v_name, crypt(p_password, gen_salt('bf', 10)))
    returning id into v_id;
  perform dc.add_pies(v_id, 300, 'welcome');
  perform dc.notify(v_id, 'welcome', '¡Bienvenido a DUEL CLUB!', 'Te regalamos 300 PIES para estrenar la PIE STORE.');
  v_tok := dc.new_session(v_id);
  return jsonb_build_object('token', v_tok, 'me', dc.me(v_id));
end $$;

create or replace function public.dc_login(p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_user text := lower(trim(coalesce(p_username, ''))); a accounts; v_fails integer;
begin
  select count(*) into v_fails from login_attempts where username = v_user and not ok and at > now() - interval '15 minutes';
  if v_fails >= 8 then perform dc.err('too_many_attempts'); end if;
  -- Las credenciales incorrectas devuelven {error} SIN excepción para que el intento fallido quede registrado
  select * into a from accounts where username = v_user;
  if not found then
    insert into login_attempts(username, ok) values (v_user, false);
    return jsonb_build_object('error', 'bad_credentials');
  end if;
  if a.pass_hash is null then
    if a.legacy_pin_hash is not null then return jsonb_build_object('error', 'legacy_claim_required'); end if;
    return jsonb_build_object('error', 'bad_credentials');
  end if;
  if a.pass_hash <> crypt(coalesce(p_password, ''), a.pass_hash) then
    insert into login_attempts(username, ok) values (v_user, false);
    return jsonb_build_object('error', 'bad_credentials');
  end if;
  insert into login_attempts(username, ok) values (v_user, true);
  delete from login_attempts where at < now() - interval '2 days';
  return jsonb_build_object('token', dc.new_session(a.id), 'me', dc.me(a.id));
end $$;

-- Reclamar una cuenta de la versión anterior (PIN de 4 números) y ponerle contraseña
create or replace function public.dc_claim(p_username text, p_pin text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_user text := lower(trim(coalesce(p_username, ''))); a accounts; v_fails integer;
begin
  select count(*) into v_fails from login_attempts where username = v_user and not ok and at > now() - interval '15 minutes';
  if v_fails >= 8 then perform dc.err('too_many_attempts'); end if;
  select * into a from accounts where username = v_user;
  if not found or a.pass_hash is not null or a.legacy_pin_hash is null then perform dc.err('not_legacy'); end if;
  if p_password is null or char_length(p_password) < 6 or octet_length(p_password) > 72 then perform dc.err('password_invalid'); end if;
  if a.legacy_pin_hash <> 'sha256:' || encode(digest('duelclub:' || v_user || ':' || coalesce(p_pin, ''), 'sha256'), 'hex') then
    insert into login_attempts(username, ok) values (v_user, false);
    return jsonb_build_object('error', 'bad_credentials');
  end if;
  update accounts set pass_hash = crypt(p_password, gen_salt('bf', 10)), legacy_pin_hash = null where id = a.id;
  insert into login_attempts(username, ok) values (v_user, true);
  perform dc.notify(a.id, 'welcome', 'Cuenta recuperada', 'Tu progreso de la versión anterior se conservó. ¡Bienvenido a la nueva DUEL CLUB!');
  return jsonb_build_object('token', dc.new_session(a.id), 'me', dc.me(a.id));
end $$;

create or replace function public.dc_logout(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.dc_change_password(p_token text, p_old text, p_new text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid := dc.auth(p_token); v_hash text;
begin
  select pass_hash into v_hash from accounts where id = v_id;
  if v_hash <> crypt(coalesce(p_old, ''), v_hash) then perform dc.err('bad_credentials'); end if;
  if p_new is null or char_length(p_new) < 6 or octet_length(p_new) > 72 then perform dc.err('password_invalid'); end if;
  update accounts set pass_hash = crypt(p_new, gen_salt('bf', 10)) where id = v_id;
  delete from sessions where account_id = v_id and token_hash <> encode(digest(p_token, 'sha256'), 'hex');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.dc_me(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return dc.me(dc.auth(p_token));
end $$;

-- ------------------------------------------------------------------ aspecto e inventario
create or replace function public.dc_set_look(p_token text, p_char text, p_color text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid := dc.auth(p_token);
begin
  if p_char is not null then
    if not dc.owns(v_id, 'char_' || p_char) or not exists (select 1 from catalog_items where id = 'char_' || p_char and category = 'char') then
      perform dc.err('not_owned');
    end if;
    update accounts set char = p_char where id = v_id;
  end if;
  if p_color is not null then
    if p_color !~ '^#[0-9A-Fa-f]{6}$' then perform dc.err('invalid'); end if;
    update accounts set color = upper(p_color) where id = v_id;
  end if;
  return dc.me(v_id);
end $$;

create or replace function public.dc_equip(p_token text, p_slot text, p_item text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid := dc.auth(p_token); v_cat text;
begin
  if p_slot not in ('skin','hat','face','body','entrance','victory','emote','frame','card','title') then perform dc.err('invalid'); end if;
  if p_item is null then
    update accounts set equipped = equipped - p_slot where id = v_id;
  else
    select category into v_cat from catalog_items where id = p_item;
    if v_cat is distinct from p_slot then perform dc.err('invalid'); end if;
    if not dc.owns(v_id, p_item) then perform dc.err('not_owned'); end if;
    update accounts set equipped = equipped || jsonb_build_object(p_slot, p_item) where id = v_id;
  end if;
  return dc.me(v_id);
end $$;

create or replace function public.dc_buy(p_token text, p_item text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid := dc.auth(p_token); it catalog_items; v_pies integer; v_ach jsonb;
begin
  select * into it from catalog_items where id = p_item;
  if not found or it.price is null then perform dc.err('not_for_sale'); end if;
  if dc.owns(v_id, p_item) then perform dc.err('already_owned'); end if;
  select pies into v_pies from accounts where id = v_id for update;
  if dc.level_of((select keke from accounts where id = v_id)) < it.min_level then perform dc.err('level_required'); end if;
  if v_pies < it.price then perform dc.err('not_enough_pies'); end if;
  perform dc.add_pies(v_id, -it.price, 'buy', p_item);
  perform dc.grant_item(v_id, p_item, 'store');
  v_ach := dc.check_achievements(v_id, jsonb_build_object('type', 'buy'));
  return jsonb_build_object('me', dc.me(v_id), 'achievements', v_ach);
end $$;

create or replace function public.dc_transactions(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := dc.auth(p_token);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('at', at, 'amount', amount, 'balance', balance, 'reason', reason, 'ref', ref) order by id desc)
    from (select * from transactions where account_id = v_id order by id desc limit 60) t), '[]'::jsonb);
end $$;

-- ------------------------------------------------------------------ partidas
create or replace function dc.clean_flags(p jsonb) returns jsonb language plpgsql immutable as $$
declare k text; v jsonb; out jsonb := '{}'::jsonb; n integer := 0;
begin
  if jsonb_typeof(p) is distinct from 'object' then return out; end if;
  for k, v in select * from jsonb_each(p) loop
    exit when n >= 16;
    if k ~ '^[A-Za-z]{1,20}$' and jsonb_typeof(v) = 'number' and (v::text)::numeric between -1000000 and 10000000 then
      out := out || jsonb_build_object(k, v);
      n := n + 1;
    end if;
  end loop;
  return out;
end $$;

-- Aplica el resultado de un minijuego a una cuenta (estadísticas, KEKE, PIES, dominio, récords, logros)
create or replace function dc.apply_minigame(p_acc uuid, p_slot integer, p_m jsonb, p_opp uuid, p_delta integer, p_game games)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_res integer; v_winner integer := (p_m->>'winner')::int; v_dur real := least(greatest(coalesce((p_m->>'duration')::real, 0), 0), 3600);
  v_n integer; v_f numeric; v_keke integer; v_pies integer; v_levels jsonb; v_mast jsonb; v_ach jsonb;
  v_rec real; v_record boolean := false; wr world_records; v_flags jsonb; v_score numeric; v_opp_score numeric; v_ctx jsonb;
  v_rr integer; a accounts;
begin
  v_res := case when v_winner = -1 then 0 when v_winner = p_slot then 1 else -1 end;
  -- contador diario (recompensas decrecientes contra el farmeo)
  insert into daily_counters(account_id, day, matches) values (p_acc, dc.today(), 1)
    on conflict (account_id, day) do update set matches = daily_counters.matches + 1
    returning matches into v_n;
  v_f := case when v_n <= 40 then 1 when v_n <= 80 then 0.5 else 0 end;
  v_keke := round((10 + case v_res when 1 then 15 when 0 then 5 else 0 end) * v_f);
  v_pies := round((5 + case v_res when 1 then 10 when 0 then 3 else 0 end) * v_f);

  update accounts set
    played = played + 1,
    wins = wins + (v_res = 1)::int, losses = losses + (v_res = -1)::int, draws = draws + (v_res = 0)::int,
    streak = case when v_res = 1 then streak + 1 else 0 end,
    best_streak = greatest(best_streak, case when v_res = 1 then streak + 1 else 0 end),
    draw_streak = case when v_res = 0 then draw_streak + 1 else 0 end,
    loss_streak = case when v_res = -1 then loss_streak + 1 else 0 end,
    time_played = time_played + v_dur,
    rating = greatest(100, rating + coalesce(p_delta, 0)),
    best_rating = greatest(best_rating, rating + coalesce(p_delta, 0)),
    last_match_at = now()
  where id = p_acc returning * into a;

  if v_pies > 0 then perform dc.add_pies(p_acc, v_pies, 'match', p_game.id); end if;
  v_levels := dc.add_keke(p_acc, v_keke, 'match');

  -- récord (valor plausible según el minijuego)
  if jsonb_typeof(p_m->'records'->p_slot) = 'number' and p_game.record_better is not null then
    v_rec := (p_m->'records'->>p_slot)::real;
    if v_rec < p_game.rec_min or v_rec > p_game.rec_max then v_rec := null; end if;
  end if;
  v_mast := dc.update_mastery(p_acc, p_game.id, v_res, v_dur, v_rec, p_game.record_better);
  if v_rec is not null then
    select * into wr from world_records where game_id = p_game.id for update;
    if not found or (p_game.record_better = 'higher' and v_rec > wr.value) or (p_game.record_better = 'lower' and v_rec < wr.value) then
      if found and wr.account_id is not null and wr.account_id <> p_acc then
        perform dc.notify(wr.account_id, 'record_lost', 'Te robaron un récord', a.display_name || ' superó tu récord mundial en ' || p_game.name || '.',
          jsonb_build_object('game', p_game.id));
      end if;
      insert into world_records(game_id, value, display, account_id, name, at)
        values (p_game.id, v_rec, left(coalesce(p_m->'display_records'->>p_slot, v_rec::text), 40), p_acc, a.display_name, now())
        on conflict (game_id) do update set value = excluded.value, display = excluded.display, account_id = excluded.account_id, name = excluded.name, at = now();
      v_record := true;
      update daily_counters set record_rewards = record_rewards + 1 where account_id = p_acc and day = dc.today() returning record_rewards into v_rr;
      if v_rr <= 3 then perform dc.add_pies(p_acc, 50, 'record', p_game.id); end if;
      perform dc.notify(p_acc, 'record', '¡Récord mundial!', 'Nuevo récord en ' || p_game.name || '.', jsonb_build_object('game', p_game.id));
    end if;
  end if;

  -- contexto para logros
  v_flags := dc.clean_flags(p_m->'flags'->p_slot);
  if p_game.id = 'reaction' and (v_flags->>'best')::numeric < 100 then v_flags := v_flags - 'best'; end if;
  if jsonb_typeof(p_m->'scores'->p_slot) = 'number' then v_score := (p_m->'scores'->>p_slot)::numeric; end if;
  if jsonb_typeof(p_m->'scores'->(1 - p_slot)) = 'number' then v_opp_score := (p_m->'scores'->>(1 - p_slot))::numeric; end if;
  v_flags := v_flags - 'score' - 'opp' - 'margin'
    || case when v_score is not null then jsonb_build_object('score', v_score) else '{}'::jsonb end
    || case when v_opp_score is not null then jsonb_build_object('opp', v_opp_score) else '{}'::jsonb end
    || case when jsonb_typeof(p_m->'margin') = 'number' then jsonb_build_object('margin', (p_m->>'margin')::numeric) else '{}'::jsonb end;
  v_ctx := jsonb_build_object('type', 'minigame', 'game', p_game.id, 'win', v_res = 1, 'lose', v_res = -1, 'draw', v_res = 0,
    'flags', v_flags, 'diff', p_m->>'difficulty', 'opp', p_opp);
  v_ach := dc.check_achievements(p_acc, v_ctx);

  return jsonb_build_object('slot', p_slot, 'res', v_res, 'keke', v_keke, 'pies', v_pies, 'factor', v_f, 'delta', coalesce(p_delta, 0),
    'levels', v_levels, 'mastery', v_mast, 'record', v_record, 'achievements', v_ach, 'flags', v_flags);
end $$;

create or replace function public.dc_submit_match(p_tok1 text, p_tok2 text, p_match jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a1 uuid; a2 uuid; g games; v_cid text := p_match->>'client_id'; v_winner integer; v_dur real;
  r1 integer; r2 integer; pl1 integer; pl2 integer; e1 numeric; s1 numeric; k1 integer; k2 integer;
  d1 integer := 0; d2 integer := 0; v_pair integer; v_mid uuid; v_out1 jsonb; v_out2 jsonb; v_names text[]; v_mode text; v_diff text;
begin
  if p_tok1 is not null then a1 := dc.auth(p_tok1); end if;
  if p_tok2 is not null then a2 := dc.auth(p_tok2); end if;
  if a1 is null and a2 is null then perform dc.err('no_account'); end if;
  if a1 = a2 then perform dc.err('same_account'); end if;
  if v_cid is null or v_cid !~ '^[A-Za-z0-9_-]{8,64}$' then perform dc.err('invalid_match'); end if;
  if exists (select 1 from matches where client_id = v_cid) then
    return jsonb_build_object('duplicate', true);
  end if;
  select * into g from games where id = p_match->>'game';
  if not found then perform dc.err('invalid_match'); end if;
  v_winner := (p_match->>'winner')::int;
  if v_winner not in (-1, 0, 1) then perform dc.err('invalid_match'); end if;
  v_dur := (p_match->>'duration')::real;
  if v_dur is null or v_dur < 8 or v_dur > 3600 then perform dc.err('invalid_match'); end if;
  v_mode := coalesce(p_match->>'mode', 'quick');
  if v_mode not in ('quick', 'duel', 'tournament', 'survival') then perform dc.err('invalid_match'); end if;
  v_diff := coalesce(p_match->>'difficulty', 'normal');
  if v_diff not in ('easy', 'normal', 'hard', 'caos') then perform dc.err('invalid_match'); end if;
  -- no más rápido que lo que dura una partida real
  if exists (select 1 from accounts where id in (a1, a2) and last_match_at > now() - make_interval(secs => greatest(6, v_dur * 0.5))) then
    perform dc.err('too_fast');
  end if;
  v_names := array[coalesce(nullif(dc.clean_name(p_match->'names'->>0), ''), 'J1'), coalesce(nullif(dc.clean_name(p_match->'names'->>1), ''), 'J2')];
  if a1 is not null then v_names[1] := (select display_name from accounts where id = a1); end if;
  if a2 is not null then v_names[2] := (select display_name from accounts where id = a2); end if;

  -- RESISTENCIA: solo entre dos cuentas
  if a1 is not null and a2 is not null then
    select rating, played into r1, pl1 from accounts where id = a1 for update;
    select rating, played into r2, pl2 from accounts where id = a2 for update;
    e1 := 1 / (1 + power(10, (r2 - r1) / 400.0));
    s1 := case v_winner when 0 then 1 when 1 then 0 else 0.5 end;
    k1 := case when pl1 < 15 then 36 when r1 >= 2000 then 16 else 24 end;
    k2 := case when pl2 < 15 then 36 when r2 >= 2000 then 16 else 24 end;
    d1 := round(k1 * (s1 - e1));
    d2 := round(k2 * ((1 - s1) - (1 - e1)));
    select count(*) into v_pair from matches
      where created_at > now() - interval '24 hours' and ((p1 = a1 and p2 = a2) or (p1 = a2 and p2 = a1));
    if v_pair >= 12 then d1 := 0; d2 := 0;
    elsif v_pair >= 6 then d1 := d1 / 2; d2 := d2 / 2; end if;
  end if;

  insert into matches(client_id, comp_client_id, game_id, mode, difficulty, p1, p2, p1_name, p2_name, p1_color, p2_color,
                      winner, score1, score2, delta1, delta2, duration, p1_flags, p2_flags)
  values (v_cid, nullif(left(p_match->>'comp_id', 64), ''), g.id, v_mode, v_diff, a1, a2, v_names[1], v_names[2],
          case when p_match->'colors'->>0 ~ '^#[0-9A-Fa-f]{6}$' then p_match->'colors'->>0 end,
          case when p_match->'colors'->>1 ~ '^#[0-9A-Fa-f]{6}$' then p_match->'colors'->>1 end,
          v_winner, left(p_match->'display'->>0, 24), left(p_match->'display'->>1, 24), d1, d2, v_dur,
          dc.clean_flags(p_match->'flags'->0), dc.clean_flags(p_match->'flags'->1))
  returning id into v_mid;

  if a1 is not null then v_out1 := dc.apply_minigame(a1, 0, p_match, a2, case when a2 is not null then d1 end, g); end if;
  if a2 is not null then v_out2 := dc.apply_minigame(a2, 1, p_match, a1, case when a1 is not null then d2 end, g); end if;
  if a1 is not null and a2 is not null then
    insert into rating_history(account_id, rating, delta, match_id)
      select a1, rating, d1, v_mid from accounts where id = a1;
    insert into rating_history(account_id, rating, delta, match_id)
      select a2, rating, d2, v_mid from accounts where id = a2;
  end if;
  return jsonb_build_object('match_id', v_mid, 'slots', jsonb_build_array(
    case when a1 is not null then v_out1 || jsonb_build_object('me', dc.me(a1)) end,
    case when a2 is not null then v_out2 || jsonb_build_object('me', dc.me(a2)) end));
end $$;

create or replace function public.dc_submit_comp(p_tok1 text, p_tok2 text, p_comp jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a1 uuid; a2 uuid; v_cid text := p_comp->>'client_id'; v_mode text := p_comp->>'mode'; v_winner integer;
  v_games integer; v_need integer; acc uuid; slot integer; v_res integer; v_n integer; v_f numeric;
  v_keke integer; v_pies integer; v_lv jsonb; v_ach jsonb; v_ctx jsonb; v_out jsonb := '[null,null]'::jsonb; v_pts numeric[]; v_stage integer; v_def numeric;
begin
  if p_tok1 is not null then a1 := dc.auth(p_tok1); end if;
  if p_tok2 is not null then a2 := dc.auth(p_tok2); end if;
  if a1 is null and a2 is null then perform dc.err('no_account'); end if;
  if a1 = a2 then perform dc.err('same_account'); end if;
  if v_cid is null or v_cid !~ '^[A-Za-z0-9_-]{8,64}$' then perform dc.err('invalid_comp'); end if;
  if v_mode not in ('duel', 'tournament', 'survival') then perform dc.err('invalid_comp'); end if;
  if exists (select 1 from competitions where client_id = v_cid) then return jsonb_build_object('duplicate', true); end if;
  v_winner := (p_comp->>'winner')::int;
  if v_winner not in (-1, 0, 1) then perform dc.err('invalid_comp'); end if;
  -- la competición tiene que estar respaldada por minijuegos ya registrados con este id
  select count(*) into v_games from matches where comp_client_id = v_cid
    and (a1 is null or p1 = a1) and (a2 is null or p2 = a2);
  v_need := case v_mode when 'survival' then 1 else 2 end;
  if v_games < v_need then perform dc.err('invalid_comp'); end if;
  v_pts := array[coalesce((p_comp->'points'->>0)::numeric, 0), coalesce((p_comp->'points'->>1)::numeric, 0)];
  v_stage := least(greatest(coalesce((p_comp->>'stage')::int, 0), 0), 200);
  if v_mode = 'survival' then v_stage := least(v_stage, v_games + 1); end if;

  insert into competitions(client_id, mode, p1, p2, winner, summary)
    values (v_cid, v_mode, a1, a2, v_winner, jsonb_build_object('points', to_jsonb(v_pts), 'games', v_games, 'stage', v_stage,
      'difficulty', p_comp->>'difficulty', 'names', p_comp->'names'));

  foreach slot in array array[0, 1] loop
    acc := case slot when 0 then a1 else a2 end;
    continue when acc is null;
    v_res := case when v_winner = -1 then 0 when v_winner = slot then 1 else -1 end;
    insert into daily_counters(account_id, day, comps) values (acc, dc.today(), 1)
      on conflict (account_id, day) do update set comps = daily_counters.comps + 1 returning comps into v_n;
    v_f := case when v_n <= 12 then 1 when v_n <= 24 then 0.5 else 0 end;
    v_keke := round((20 + case v_res when 1 then 60 when 0 then 20 else 0 end) * v_f);
    v_pies := round((15 + case v_res when 1 then 40 when 0 then 10 else 0 end) * v_f);
    update accounts set
      comp_wins = comp_wins + (v_res = 1)::int, comp_losses = comp_losses + (v_res = -1)::int, comp_draws = comp_draws + (v_res = 0)::int,
      tournaments = tournaments + (v_res = 1 and v_mode = 'tournament')::int,
      survival_best = case when v_mode = 'survival' then greatest(survival_best, v_stage) else survival_best end
    where id = acc;
    if v_pies > 0 then perform dc.add_pies(acc, v_pies, 'competition', v_mode); end if;
    v_lv := dc.add_keke(acc, v_keke, 'competition');
    v_def := coalesce((p_comp->'deficit'->>slot)::numeric, 0);
    v_def := least(greatest(v_def, 0), 200);
    v_ctx := jsonb_build_object('type', 'comp', 'mode', v_mode, 'win', v_res = 1, 'lose', v_res = -1, 'deficit', v_def,
      'margin', abs(v_pts[1] - v_pts[2]), 'games', v_games, 'diff', p_comp->>'difficulty');
    v_ach := dc.check_achievements(acc, v_ctx);
    v_out := jsonb_set(v_out, array[slot::text], jsonb_build_object('slot', slot, 'res', v_res, 'keke', v_keke, 'pies', v_pies, 'levels', v_lv,
      'achievements', v_ach, 'me', dc.me(acc)));
  end loop;
  return jsonb_build_object('slots', v_out);
end $$;

-- ------------------------------------------------------------------ perfiles, búsqueda, rankings
create or replace function public.dc_profile(p_username text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a accounts;
begin
  select * into a from accounts where username = lower(p_username);
  if not found then perform dc.err('not_found'); end if;
  return dc.public_card(a) || jsonb_build_object(
    'mastery', coalesce((select jsonb_object_agg(game_id, jsonb_build_object('played', played, 'wins', wins, 'losses', losses, 'draws', draws,
        'best_streak', best_streak, 'best_record', best_record, 'rank', rank)) from mastery where account_id = a.id), '{}'::jsonb),
    'achievements', coalesce((select jsonb_object_agg(ach_id, unlocked_at) from achievements_unlocked where account_id = a.id), '{}'::jsonb),
    'inventory', coalesce((select jsonb_agg(item_id) from inventory where account_id = a.id), '[]'::jsonb),
    'matches', coalesce((select jsonb_agg(m order by m.created_at desc) from (
        select mm.id, mm.created_at, mm.game_id, mm.mode, mm.difficulty, mm.winner, mm.score1, mm.score2, mm.delta1, mm.delta2, mm.legacy,
          mm.p1_name, mm.p2_name, mm.p1_color, mm.p2_color,
          (select username from accounts x where x.id = mm.p1) as p1_user, (select username from accounts x where x.id = mm.p2) as p2_user,
          case when mm.p1 = a.id then 0 else 1 end as slot
        from matches mm where mm.p1 = a.id or mm.p2 = a.id order by mm.created_at desc limit 50) m), '[]'::jsonb),
    'rating_history', coalesce((select jsonb_agg(jsonb_build_object('at', at, 'rating', rating, 'delta', delta) order by at) from (
        select * from rating_history where account_id = a.id order by at desc limit 150) h), '[]'::jsonb),
    'records', coalesce((select jsonb_agg(jsonb_build_object('game', game_id, 'display', display)) from world_records where account_id = a.id), '[]'::jsonb),
    'comps', (select count(*) from competitions c where c.p1 = a.id or c.p2 = a.id)
  );
end $$;

create or replace function public.dc_search(p_query text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(dc.public_card(a) order by a.rating desc), '[]'::jsonb)
  from accounts a
  where a.id in (
    select x.id from accounts x
    where char_length(trim(coalesce(p_query, ''))) >= 1
      and (x.username ilike '%' || replace(replace(lower(trim(p_query)), '%', ''), '_', '\_') || '%'
        or x.display_name ilike '%' || replace(replace(trim(p_query), '%', ''), '_', '\_') || '%')
    order by x.rating desc limit 20)
$$;

create or replace function public.dc_ranking(p_kind text, p_scope text default 'global', p_token text default null,
  p_game text default null, p_limit integer default 50, p_offset integer default 0, p_search text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid; v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 100); v_q text;
begin
  if p_token is not null then
    begin v_me := dc.auth(p_token); exception when others then v_me := null; end;
  end if;
  if p_scope = 'friends' and v_me is null then perform dc.err('session_invalid'); end if;
  if p_kind not in ('rating', 'level', 'keke', 'wins', 'game') then perform dc.err('invalid'); end if;
  if p_kind = 'game' and not exists (select 1 from games where id = p_game) then perform dc.err('invalid'); end if;
  v_q := nullif(replace(replace(trim(coalesce(p_search, '')), '%', ''), '_', '\_'), '');
  return (
    with base as (
      select m.account_id as id, m.wins::real as value, (m.played + 2 * m.wins)::real as value2
        from mastery m where p_kind = 'game' and m.game_id = p_game and m.played > 0
      union all
      select a.id,
        (case p_kind when 'rating' then a.rating when 'wins' then a.wins else a.keke end)::real,
        (case p_kind when 'rating' then a.best_rating else a.played end)::real
        from accounts a where p_kind <> 'game' and (case when p_kind in ('level', 'keke') then a.keke > 0 else a.played > 0 end)
    ), scoped as (
      select * from base where p_scope is distinct from 'friends' or base.id = v_me or base.id in (
        select case when f.a = v_me then f.b else f.a end from friendships f where f.status = 'accepted' and (f.a = v_me or f.b = v_me))
    ), ranked as (
      select s.*, rank() over (order by s.value desc, s.value2 desc) as pos from scoped s
    ), page as (
      select r.* from ranked r join accounts a on a.id = r.id
      where v_q is null or a.username ilike '%' || lower(v_q) || '%' or a.display_name ilike '%' || v_q || '%'
      order by r.pos, a.username limit v_lim offset greatest(coalesce(p_offset, 0), 0)
    )
    select jsonb_build_object(
      'rows', coalesce((select jsonb_agg(dc.public_card(a) || jsonb_build_object('pos', p.pos, 'value', p.value, 'value2', p.value2) order by p.pos, a.username)
                        from page p join accounts a on a.id = p.id), '[]'::jsonb),
      'me', (select jsonb_build_object('pos', pos, 'value', value) from ranked where ranked.id = v_me),
      'total', (select count(*) from ranked))
  );
end $$;

create or replace function public.dc_world_records() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('game', w.game_id, 'value', w.value, 'display', w.display, 'name', w.name, 'at', w.at,
    'username', a.username, 'color', a.color, 'char', a.char) order by w.game_id), '[]'::jsonb)
  from world_records w left join accounts a on a.id = w.account_id
$$;

create or replace function public.dc_feed() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
    select m.created_at, m.game_id, m.mode, m.winner, m.score1, m.score2, m.p1_name, m.p2_name, m.p1_color, m.p2_color, m.delta1, m.delta2,
      (select username from accounts a where a.id = m.p1) as p1_user, (select username from accounts a where a.id = m.p2) as p2_user
    from matches m order by m.created_at desc limit 30) x
$$;

create or replace function public.dc_h2h(p_a text, p_b text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a accounts; b accounts;
begin
  select * into a from accounts where username = lower(p_a);
  select * into b from accounts where username = lower(p_b);
  if a.id is null or b.id is null then perform dc.err('not_found'); end if;
  return jsonb_build_object('a', dc.public_card(a), 'b', dc.public_card(b),
    'a_wins', (select count(*) from matches where (p1 = a.id and p2 = b.id and winner = 0) or (p2 = a.id and p1 = b.id and winner = 1)),
    'b_wins', (select count(*) from matches where (p1 = b.id and p2 = a.id and winner = 0) or (p2 = b.id and p1 = a.id and winner = 1)),
    'draws', (select count(*) from matches where ((p1 = a.id and p2 = b.id) or (p1 = b.id and p2 = a.id)) and winner = -1),
    'comps', (select count(*) from competitions where (p1 = a.id and p2 = b.id) or (p1 = b.id and p2 = a.id)),
    'games', coalesce((select jsonb_object_agg(game_id, n) from (select game_id, count(*) n from matches
        where (p1 = a.id and p2 = b.id) or (p1 = b.id and p2 = a.id) group by game_id) q), '{}'::jsonb),
    'matches', coalesce((select jsonb_agg(m order by m.created_at desc) from (
        select created_at, game_id, mode, winner, score1, score2, p1_name, p2_name, (p1 = a.id) as a_is_p1
        from matches where (p1 = a.id and p2 = b.id) or (p1 = b.id and p2 = a.id) order by created_at desc limit 20) m), '[]'::jsonb));
end $$;

-- ------------------------------------------------------------------ amigos
create or replace function public.dc_friends(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return jsonb_build_object(
    'friends', coalesce((select jsonb_agg(dc.public_card(x) || jsonb_build_object('since', f.responded_at) order by x.last_seen desc nulls last)
      from friendships f join accounts x on x.id = case when f.a = v_me then f.b else f.a end
      where f.status = 'accepted' and (f.a = v_me or f.b = v_me)), '[]'::jsonb),
    'incoming', coalesce((select jsonb_agg(dc.public_card(x) || jsonb_build_object('at', f.created_at) order by f.created_at desc)
      from friendships f join accounts x on x.id = f.requested_by
      where f.status = 'pending' and f.requested_by <> v_me and (f.a = v_me or f.b = v_me)), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(dc.public_card(x) || jsonb_build_object('at', f.created_at) order by f.created_at desc)
      from friendships f join accounts x on x.id = case when f.a = v_me then f.b else f.a end
      where f.status = 'pending' and f.requested_by = v_me and (f.a = v_me or f.b = v_me)), '[]'::jsonb));
end $$;

create or replace function public.dc_friend_request(p_token text, p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_o uuid; f friendships; v_name text;
begin
  select id into v_o from accounts where username = lower(p_username);
  if v_o is null then perform dc.err('not_found'); end if;
  if v_o = v_me then perform dc.err('invalid'); end if;
  if (select count(*) from friendships where requested_by = v_me and status = 'pending') >= 30 then perform dc.err('too_many_requests'); end if;
  if (select count(*) from friendships where status = 'accepted' and (a = v_me or b = v_me)) >= 200 then perform dc.err('too_many_friends'); end if;
  select display_name into v_name from accounts where id = v_me;
  select * into f from friendships where friendships.a = least(v_me, v_o) and friendships.b = greatest(v_me, v_o);
  if f.a is not null then
    if f.status = 'accepted' then return jsonb_build_object('status', 'accepted'); end if;
    if f.requested_by = v_o then
      -- el otro ya me había invitado: se acepta directamente
      update friendships set status = 'accepted', responded_at = now() where a = f.a and b = f.b;
      perform dc.notify(v_o, 'friend_accept', 'Solicitud aceptada', v_name || ' aceptó tu solicitud de amistad.', jsonb_build_object('user', (select username from accounts where id = v_me)));
      perform dc.check_achievements(v_me, '{}'::jsonb);
      perform dc.check_achievements(v_o, '{}'::jsonb);
      return jsonb_build_object('status', 'accepted');
    end if;
    return jsonb_build_object('status', 'pending');
  end if;
  insert into friendships(a, b, status, requested_by) values (least(v_me, v_o), greatest(v_me, v_o), 'pending', v_me);
  perform dc.notify(v_o, 'friend_request', 'Solicitud de amistad', v_name || ' quiere ser tu amigo en el CLUB.', jsonb_build_object('user', (select username from accounts where id = v_me)));
  return jsonb_build_object('status', 'pending');
end $$;

create or replace function public.dc_friend_respond(p_token text, p_username text, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_o uuid; v_name text;
begin
  select id into v_o from accounts where username = lower(p_username);
  if v_o is null then perform dc.err('not_found'); end if;
  if not exists (select 1 from friendships where a = least(v_me, v_o) and b = greatest(v_me, v_o) and status = 'pending' and requested_by = v_o) then
    perform dc.err('not_found');
  end if;
  if p_accept then
    update friendships set status = 'accepted', responded_at = now() where a = least(v_me, v_o) and b = greatest(v_me, v_o);
    select display_name into v_name from accounts where id = v_me;
    perform dc.notify(v_o, 'friend_accept', 'Solicitud aceptada', v_name || ' aceptó tu solicitud de amistad.', jsonb_build_object('user', (select username from accounts where id = v_me)));
    perform dc.check_achievements(v_me, '{}'::jsonb);
    perform dc.check_achievements(v_o, '{}'::jsonb);
  else
    delete from friendships where a = least(v_me, v_o) and b = greatest(v_me, v_o);
  end if;
  return public.dc_friends(p_token);
end $$;

-- quitar amigo o cancelar una solicitud enviada
create or replace function public.dc_friend_remove(p_token text, p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_o uuid;
begin
  select id into v_o from accounts where username = lower(p_username);
  if v_o is not null then
    delete from friendships where a = least(v_me, v_o) and b = greatest(v_me, v_o);
  end if;
  return public.dc_friends(p_token);
end $$;

-- ------------------------------------------------------------------ notificaciones
create or replace function public.dc_notifications(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'at', at, 'kind', kind, 'title', title, 'body', body, 'data', data, 'read', read) order by id desc)
    from (select * from notifications where account_id = v_me order by id desc limit 50) n), '[]'::jsonb);
end $$;

create or replace function public.dc_notifications_read(p_token text, p_ids bigint[] default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  update notifications set read = true where account_id = v_me and not read and (p_ids is null or id = any(p_ids));
  return jsonb_build_object('ok', true);
end $$;

-- ------------------------------------------------------------------ permisos
-- Nada es ejecutable desde el navegador salvo las RPC dc_* de arriba.
revoke all on all functions in schema dc from public, anon, authenticated;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'dc\_%' loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
end $$;

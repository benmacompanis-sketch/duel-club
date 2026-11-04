-- DUEL CLUB · 001 · Esquema base y autenticación propia
-- Todo el acceso del navegador pasa por funciones RPC (SECURITY DEFINER) que validan la sesión.
-- Las tablas tienen RLS activado y ninguna política: el navegador no puede leerlas ni escribirlas directo.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists dc;
revoke all on schema dc from public;

-- ------------------------------------------------------------------ cuentas
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9_-]{3,16}$'),
  display_name text not null check (char_length(display_name) between 3 and 16),
  pass_hash text,                    -- bcrypt (null = cuenta migrada sin reclamar)
  legacy_pin_hash text,              -- hash del PIN de la versión anterior (solo para reclamarla)
  created_at timestamptz not null default now(),
  last_seen timestamptz,
  keke integer not null default 0 check (keke >= 0),
  pies integer not null default 0 check (pies >= 0),
  pies_earned integer not null default 0,
  pies_spent integer not null default 0,
  rating integer not null default 1000,
  best_rating integer not null default 1000,
  played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  draw_streak integer not null default 0,
  comp_wins integer not null default 0,
  comp_losses integer not null default 0,
  comp_draws integer not null default 0,
  tournaments integer not null default 0,
  survival_best integer not null default 0,
  time_played real not null default 0,
  char text not null default 'volt',
  color text not null default '#3985FF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  equipped jsonb not null default '{}'::jsonb
);
create index accounts_rating_idx on public.accounts (rating desc);
create index accounts_keke_idx on public.accounts (keke desc);
create index accounts_wins_idx on public.accounts (wins desc);

create table public.sessions (
  token_hash text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '120 days',
  last_seen timestamptz not null default now()
);
create index sessions_account_idx on public.sessions (account_id);

create table public.login_attempts (
  id bigserial primary key,
  username text not null,
  at timestamptz not null default now(),
  ok boolean not null
);
create index login_attempts_idx on public.login_attempts (username, at desc);

-- ------------------------------------------------------------------ catálogo (servidor = fuente de verdad de precios y premios)
create table public.catalog_items (
  id text primary key,
  category text not null,            -- char, skin, hat, face, body, entrance, victory, emote, frame, card, title
  rarity text not null check (rarity in ('common','uncommon','rare','epic','legendary','mythic')),
  price integer,                     -- null = no se vende (se desbloquea)
  min_level integer not null default 1,
  is_default boolean not null default false
);
create table public.catalog_achievements (
  id text primary key,
  tier text not null check (tier in ('normal','hard','legendary')),
  cond jsonb not null,
  reward_item text references public.catalog_items(id)
);
create table public.level_rewards (
  level integer primary key,
  pies integer not null default 0,
  items text[] not null default '{}'
);

-- ------------------------------------------------------------------ progreso
create table public.inventory (
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_id text not null references public.catalog_items(id),
  source text not null,
  acquired_at timestamptz not null default now(),
  primary key (account_id, item_id)
);
create table public.achievements_unlocked (
  account_id uuid not null references public.accounts(id) on delete cascade,
  ach_id text not null references public.catalog_achievements(id),
  unlocked_at timestamptz not null default now(),
  primary key (account_id, ach_id)
);
create table public.mastery (
  account_id uuid not null references public.accounts(id) on delete cascade,
  game_id text not null,
  played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  best_record real,
  time_played real not null default 0,
  rank smallint not null default 0,
  primary key (account_id, game_id)
);
create table public.daily_counters (
  account_id uuid not null references public.accounts(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  matches integer not null default 0,
  record_rewards integer not null default 0,
  primary key (account_id, day)
);

-- ------------------------------------------------------------------ partidas
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  created_at timestamptz not null default now(),
  mode text not null,
  p1 uuid references public.accounts(id) on delete set null,
  p2 uuid references public.accounts(id) on delete set null,
  winner smallint,
  summary jsonb not null default '{}'::jsonb
);
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  comp_client_id text,
  created_at timestamptz not null default now(),
  game_id text not null,
  mode text not null default 'quick',
  difficulty text,
  p1 uuid references public.accounts(id) on delete set null,
  p2 uuid references public.accounts(id) on delete set null,
  p1_name text not null,
  p2_name text not null,
  p1_color text,
  p2_color text,
  winner smallint not null check (winner in (-1, 0, 1)),
  score1 text,
  score2 text,
  delta1 integer not null default 0,
  delta2 integer not null default 0,
  duration real,
  legacy boolean not null default false
);
create index matches_p1_idx on public.matches (p1, created_at desc);
create index matches_p2_idx on public.matches (p2, created_at desc);
create index matches_comp_idx on public.matches (comp_client_id);
create index matches_created_idx on public.matches (created_at desc);

create table public.rating_history (
  id bigserial primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  at timestamptz not null default now(),
  rating integer not null,
  delta integer not null,
  match_id uuid references public.matches(id) on delete set null
);
create index rating_history_idx on public.rating_history (account_id, at desc);

create table public.transactions (
  id bigserial primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  at timestamptz not null default now(),
  amount integer not null,             -- positivo = ganó, negativo = gastó
  balance integer not null,
  reason text not null,
  ref text
);
create index transactions_idx on public.transactions (account_id, at desc);

create table public.world_records (
  game_id text primary key,
  value real not null,
  display text not null,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  at timestamptz not null default now()
);

create table public.duel_tickets (
  ticket uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  used boolean not null default false
);

-- ------------------------------------------------------------------ social
create table public.friendships (
  a uuid not null references public.accounts(id) on delete cascade,
  b uuid not null references public.accounts(id) on delete cascade,
  status text not null check (status in ('pending','accepted')),
  requested_by uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (a, b),
  check (a < b)
);
create table public.notifications (
  id bigserial primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false
);
create index notifications_idx on public.notifications (account_id, at desc);

-- ------------------------------------------------------------------ RLS: activado en todo, sin políticas
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ utilidades privadas
create or replace function dc.err(code text) returns void language plpgsql as $$
begin
  raise exception '%', code using errcode = 'P0001';
end $$;

create or replace function dc.level_of(k integer) returns integer language sql immutable as $$
  select greatest(1, floor((-1 + sqrt(1 + 4 * (2 + k / 25.0))) / 2)::int)
$$;

create or replace function dc.auth(p_token text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_seen timestamptz;
begin
  if p_token is null or length(p_token) <> 64 then perform dc.err('session_invalid'); end if;
  select account_id, last_seen into v_id, v_seen from sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex') and expires_at > now();
  if v_id is null then perform dc.err('session_invalid'); end if;
  if v_seen < now() - interval '1 minute' then
    update sessions set last_seen = now() where token_hash = encode(digest(p_token, 'sha256'), 'hex');
    update accounts set last_seen = now() where id = v_id;
  end if;
  return v_id;
end $$;

create or replace function dc.new_session(p_account uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_token text := encode(gen_random_bytes(32), 'hex');
begin
  insert into sessions(token_hash, account_id) values (encode(digest(v_token, 'sha256'), 'hex'), p_account);
  update accounts set last_seen = now() where id = p_account;
  -- como mucho 20 sesiones por cuenta (borra las más viejas)
  delete from sessions where account_id = p_account and token_hash in (
    select token_hash from sessions where account_id = p_account order by created_at desc offset 20);
  return v_token;
end $$;

create or replace function dc.notify(p_account uuid, p_kind text, p_title text, p_body text, p_data jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into notifications(account_id, kind, title, body, data) values (p_account, p_kind, p_title, p_body, coalesce(p_data, '{}'));
  delete from notifications where account_id = p_account and id in (
    select id from notifications where account_id = p_account order by at desc offset 100);
$$;

create or replace function dc.add_pies(p_account uuid, p_amount integer, p_reason text, p_ref text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_bal integer;
begin
  if p_amount = 0 then select pies into v_bal from accounts where id = p_account; return v_bal; end if;
  update accounts set pies = pies + p_amount,
    pies_earned = pies_earned + greatest(p_amount, 0),
    pies_spent = pies_spent + greatest(-p_amount, 0)
    where id = p_account returning pies into v_bal;
  insert into transactions(account_id, amount, balance, reason, ref) values (p_account, p_amount, v_bal, p_reason, p_ref);
  return v_bal;
end $$;

create or replace function dc.grant_item(p_account uuid, p_item text, p_source text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  insert into inventory(account_id, item_id, source) values (p_account, p_item, p_source)
    on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- Datos públicos de una cuenta (nunca incluye hashes ni sesiones)
create or replace function dc.public_card(a public.accounts) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', a.id, 'username', a.username, 'name', a.display_name,
    'level', dc.level_of(a.keke), 'keke', a.keke, 'rating', a.rating, 'best_rating', a.best_rating,
    'played', a.played, 'wins', a.wins, 'losses', a.losses, 'draws', a.draws,
    'best_streak', a.best_streak, 'streak', a.streak, 'comp_wins', a.comp_wins, 'tournaments', a.tournaments,
    'char', a.char, 'color', a.color, 'equipped', a.equipped,
    'created_at', a.created_at,
    'online', coalesce(a.last_seen > now() - interval '5 minutes', false),
    'last_seen', a.last_seen,
    'achievements', (select count(*) from achievements_unlocked u where u.account_id = a.id),
    'claimed', a.pass_hash is not null
  )
$$;

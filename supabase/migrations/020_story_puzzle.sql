-- 020 · HISTORIA DEL CLUB y PUZZLE CLUB
-- Progreso por cuenta y recompensas entregadas UNA sola vez (nunca ELO).
--  · Historia: 5 capítulos de 4 etapas. Una etapa solo cuenta si las anteriores (y el capítulo anterior) están superadas.
--    Primera vez por etapa: +20 XP +10 PIES. Capítulo completo: +250 XP +100 PIES extra.
--  · Puzzle Club: 17 puzzles. Primera vez que se resuelve cada uno: +40 XP +20 PIES.
-- Defensa: ids conocidos por el servidor, orden obligatorio, tiempo mínimo por partida y pausa entre envíos.

create table if not exists public.story_progress (
  account_id uuid not null references public.accounts(id) on delete cascade,
  chapter text not null,
  stages integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (account_id, chapter)
);
create table if not exists public.puzzle_clears (
  account_id uuid not null references public.accounts(id) on delete cascade,
  puzzle text not null,
  secs integer not null default 0,
  cleared_at timestamptz not null default now(),
  primary key (account_id, puzzle)
);
alter table public.story_progress enable row level security;
alter table public.puzzle_clears enable row level security;

create or replace function dc.story_chapters() returns text[] language sql immutable as $$ select array['volt','mochi','pico','brik','nimbus'] $$;
create or replace function dc.puzzle_ids() returns text[] language sql immutable as $$
  select array['m1','m2','m3','a1','a2','a3','a4','b1','b2','b3','j1','j2','j3','t1','t2','t3','t4'] $$;

create or replace function public.dc_story_progress(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return jsonb_build_object(
    'story', coalesce((select jsonb_object_agg(chapter, stages) from story_progress where account_id = v_me), '{}'::jsonb),
    'puzzles', coalesce((select jsonb_agg(puzzle) from puzzle_clears where account_id = v_me), '[]'::jsonb));
end $$;

create or replace function public.dc_story_clear(p_token text, p_chapter text, p_stage integer, p_secs integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_idx integer; v_cur integer; v_prev integer; v_xp integer := 0; v_pies integer := 0; v_last timestamptz;
begin
  v_idx := array_position(dc.story_chapters(), p_chapter);
  if v_idx is null or p_stage is null or p_stage < 0 or p_stage > 3 or coalesce(p_secs, 0) < 8 then perform dc.err('invalid_match'); end if;
  -- capítulo anterior completo
  if v_idx > 1 then
    select stages into v_prev from story_progress where account_id = v_me and chapter = (dc.story_chapters())[v_idx - 1];
    if coalesce(v_prev, 0) < 4 then perform dc.err('invalid_match'); end if;
  end if;
  select max(updated_at) into v_last from story_progress where account_id = v_me;
  if v_last > now() - interval '8 seconds' then perform dc.err('too_fast'); end if;
  insert into story_progress(account_id, chapter, stages) values (v_me, p_chapter, 0) on conflict do nothing;
  select stages into v_cur from story_progress where account_id = v_me and chapter = p_chapter for update;
  if p_stage > v_cur then perform dc.err('invalid_match'); end if; -- no se puede saltear etapas
  if p_stage = v_cur then
    update story_progress set stages = v_cur + 1, updated_at = now() where account_id = v_me and chapter = p_chapter;
    v_xp := 20; v_pies := 10;
    if v_cur + 1 = 4 then
      v_xp := v_xp + 250; v_pies := v_pies + 100;
      perform dc.notify(v_me, 'story', '¡Capítulo completo!', 'Terminaste un capítulo de la Historia del Club. Premio: 250 XP y 100 PIES.', jsonb_build_object('chapter', p_chapter));
    end if;
    perform dc.add_pies(v_me, v_pies, 'story', p_chapter);
    perform dc.add_xp(v_me, v_xp, 'solo');
  end if;
  return jsonb_build_object('stages', greatest(v_cur, p_stage + 1), 'xp', v_xp, 'pies', v_pies, 'me', dc.me(v_me));
end $$;

create or replace function public.dc_puzzle_clear(p_token text, p_id text, p_secs integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token); v_xp integer := 0; v_pies integer := 0; v_last timestamptz;
begin
  if not (p_id = any(dc.puzzle_ids())) or coalesce(p_secs, 0) < 5 then perform dc.err('invalid_match'); end if;
  select max(cleared_at) into v_last from puzzle_clears where account_id = v_me;
  if v_last > now() - interval '6 seconds' then perform dc.err('too_fast'); end if;
  insert into puzzle_clears(account_id, puzzle, secs) values (v_me, p_id, p_secs) on conflict do nothing;
  if found then
    v_xp := 40; v_pies := 20;
    perform dc.add_pies(v_me, v_pies, 'puzzle', p_id);
    perform dc.add_xp(v_me, v_xp, 'solo');
  end if;
  return jsonb_build_object('first', v_xp > 0, 'xp', v_xp, 'pies', v_pies, 'me', dc.me(v_me));
end $$;

revoke all on function public.dc_story_progress(text), public.dc_story_clear(text, text, integer, integer), public.dc_puzzle_clear(text, text, integer) from public;
grant execute on function public.dc_story_progress(text), public.dc_story_clear(text, text, integer, integer), public.dc_puzzle_clear(text, text, integer) to anon, authenticated;

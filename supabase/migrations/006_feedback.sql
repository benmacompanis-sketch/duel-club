-- DUEL CLUB · 006 · Reportes de errores de los jugadores
-- Cualquiera (con cuenta o invitado) puede reportar un error. Con cuenta, ve el estado de sus reportes y recibe
-- una notificación cuando se responde o se arregla. Los administradores (accounts.is_admin) ven todos y los
-- actualizan. No se guarda la IP: solo una huella (hash) para limitar el spam.

alter table public.accounts add column if not exists is_admin boolean not null default false;

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  num bigserial unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  account_id uuid references public.accounts(id) on delete cascade,
  guest_name text,
  ip_hash text,
  kind text not null check (kind in ('bug', 'visual', 'online', 'account', 'idea')),
  place text,
  description text not null,
  diag jsonb not null default '{}'::jsonb,
  status text not null default 'nuevo' check (status in ('nuevo', 'visto', 'arreglando', 'arreglado', 'descartado')),
  reply text
);
create index if not exists bug_reports_account_idx on public.bug_reports (account_id, created_at desc);
create index if not exists bug_reports_ip_idx on public.bug_reports (ip_hash, created_at desc);
create index if not exists bug_reports_status_idx on public.bug_reports (status, created_at desc);
alter table public.bug_reports enable row level security;
revoke all on public.bug_reports from anon, authenticated;
revoke all on sequence public.bug_reports_num_seq from anon, authenticated;

create or replace function dc.bug_public(b public.bug_reports) returns jsonb
language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object('id', b.id, 'num', b.num, 'created_at', b.created_at, 'updated_at', b.updated_at,
    'kind', b.kind, 'place', b.place, 'description', left(b.description, 600), 'status', b.status, 'reply', b.reply)
$$;

-- Enviar un reporte (p_token opcional: los invitados también pueden reportar)
create or replace function public.dc_bug_report(p_token text, p_report jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_acc uuid; v_ip text := encode(digest(dc.ip() || '|duelclub-bugs', 'sha256'), 'hex');
  v_kind text := p_report->>'kind'; v_desc text := trim(coalesce(p_report->>'description', ''));
  v_place text := left(trim(coalesce(p_report->>'place', '')), 60); v_diag jsonb := p_report->'diag';
  b bug_reports;
begin
  if nullif(p_token, '') is not null then v_acc := dc.auth(p_token); end if;
  if v_kind is null or v_kind not in ('bug', 'visual', 'online', 'account', 'idea') then perform dc.err('invalid'); end if;
  if length(v_desc) < 10 or length(v_desc) > 2000 then perform dc.err('report_invalid'); end if;
  if jsonb_typeof(v_diag) is distinct from 'object' or octet_length(v_diag::text) > 6000 then v_diag := '{}'::jsonb; end if;
  -- límites contra el spam: por cuenta, por conexión y en total por día
  if v_acc is not null and (select count(*) from bug_reports where account_id = v_acc and created_at > now() - interval '1 day') >= 15 then
    perform dc.err('too_many_reports');
  end if;
  if (select count(*) from bug_reports where ip_hash = v_ip and created_at > now() - interval '1 day') >= (case when dc.ip() = 'unknown' then 200 else 20 end) then
    perform dc.err('too_many_reports');
  end if;
  if (select count(*) from bug_reports where created_at > now() - interval '1 day') >= 500 then perform dc.err('too_many_reports'); end if;
  insert into bug_reports(account_id, guest_name, ip_hash, kind, place, description, diag)
    values (v_acc, case when v_acc is null then nullif(left(dc.clean_name(p_report->>'name'), 30), '') end, v_ip, v_kind,
            nullif(v_place, ''), v_desc, v_diag)
    returning * into b;
  return dc.bug_public(b);
end $$;

-- Estado de reportes por su id (lo usan los invitados, que guardan sus ids en el navegador)
create or replace function public.dc_bug_status(p_ids uuid[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(dc.bug_public(b) order by b.created_at desc), '[]'::jsonb)
  from bug_reports b where b.id = any(p_ids[1:50])
$$;

-- Reportes de mi cuenta
create or replace function public.dc_my_bugs(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  return coalesce((select jsonb_agg(dc.bug_public(b) order by b.created_at desc)
    from (select * from bug_reports where account_id = v_me order by created_at desc limit 50) b), '[]'::jsonb);
end $$;

-- ------------------------------------------------------------------ administración
create or replace function dc.require_admin(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  if not coalesce((select is_admin from accounts where id = v_me), false) then perform dc.err('not_admin'); end if;
  return v_me;
end $$;

create or replace function public.dc_admin_bugs(p_token text, p_status text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform dc.require_admin(p_token);
  return jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from bug_reports group by status) x), '{}'::jsonb),
    'reports', coalesce((select jsonb_agg(dc.bug_public(b) || jsonb_build_object('description', b.description, 'diag', b.diag,
        'user', a.username, 'name', coalesce(a.display_name, b.guest_name)) order by b.created_at desc)
      from (select * from bug_reports where p_status is null or status = p_status order by created_at desc limit 200) b
      left join accounts a on a.id = b.account_id), '[]'::jsonb));
end $$;

create or replace function public.dc_admin_bug_update(p_token text, p_id uuid, p_status text, p_reply text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bug_reports; v_label text;
begin
  perform dc.require_admin(p_token);
  if p_status not in ('nuevo', 'visto', 'arreglando', 'arreglado', 'descartado') then perform dc.err('invalid'); end if;
  update bug_reports set status = p_status, reply = coalesce(nullif(left(trim(coalesce(p_reply, '')), 600), ''), reply), updated_at = now()
    where id = p_id returning * into b;
  if not found then perform dc.err('not_found'); end if;
  if b.account_id is not null then
    v_label := case p_status when 'arreglado' then '¡Arreglado!' when 'arreglando' then 'Lo estamos arreglando' when 'visto' then 'Lo vimos'
      when 'descartado' then 'Revisado' else 'Actualizado' end;
    perform dc.notify(b.account_id, 'bug', 'Tu reporte #' || b.num || ': ' || v_label,
      coalesce(b.reply, 'Gracias por avisar.'), jsonb_build_object('id', b.id, 'num', b.num, 'status', b.status));
  end if;
  return dc.bug_public(b);
end $$;

-- dc.me informa si la cuenta es administradora (para mostrar el panel de reportes)
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('dc.me(uuid)'::regprocedure);
  if position('''is_admin''' in d) = 0 then
    n := replace(d, $r$'pies', a.pies, 'pies_earned', a.pies_earned,$r$, $r$'pies', a.pies, 'pies_earned', a.pies_earned, 'is_admin', a.is_admin,$r$);
    if n = d then raise exception 'me: no se encontró el texto a reemplazar'; end if;
    execute n;
  end if;
end $$;

revoke all on all functions in schema dc from public, anon, authenticated;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('dc_bug_report', 'dc_bug_status', 'dc_my_bugs', 'dc_admin_bugs', 'dc_admin_bug_update') loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
end $$;

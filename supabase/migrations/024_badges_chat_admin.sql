-- 024 · INSIGNIAS (nueva categoría de cosmético) + REPORTES DEL CHAT para administradores. No borra nada.
insert into public.catalog_items(id, category, rarity, price, min_level, is_default) values
('badge_estrella', 'badge', 'common', 200, 1, false),
('badge_rayo', 'badge', 'common', 200, 1, false),
('badge_corazon', 'badge', 'uncommon', 500, 1, false),
('badge_hoja', 'badge', 'uncommon', 500, 1, false),
('badge_nota', 'badge', 'rare', 1200, 1, false),
('badge_luna', 'badge', 'rare', 1200, 1, false),
('badge_cohete', 'badge', 'epic', 3000, 1, false),
('badge_trofeo', 'badge', 'epic', 3000, 1, false),
('cx_badge_diamante', 'badge', 'rare', null, 1, false),
('cx_badge_llama', 'badge', 'rare', null, 1, false),
('cx_badge_sol', 'badge', 'epic', null, 1, false),
('cx_badge_pata', 'badge', 'epic', null, 1, false),
('cx_badge_escudo', 'badge', 'legendary', null, 1, false),
('cx_badge_corona', 'badge', 'legendary', null, 1, false),
('cx_badge_galaxia', 'badge', 'mythic', null, 1, false),
('cx_badge_holo', 'badge', 'mythic', null, 1, false)
on conflict (id) do update set category = excluded.category, rarity = excluded.rarity, price = excluded.price;

-- equipar: se suma el lugar 'badge'
create or replace function public.dc_equip(p_token text, p_slot text, p_item text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid := dc.auth(p_token); v_cat text;
begin
  if p_slot not in ('skin','hat','face','body','entrance','victory','emote','frame','card','title','badge') then perform dc.err('invalid'); end if;
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

-- reportes del chat (privado y de partida): solo administradores
create or replace function public.dc_admin_chat_reports(p_token text, p_status text default 'open') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  if not coalesce((select is_admin from accounts where id = v_me), false) then perform dc.err('not_admin'); end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'body', r.body, 'context', r.context, 'at', r.at, 'status', r.status,
      'reporter', ra.username, 'target', ta.username, 'target_name', ta.display_name,
      'target_reports', (select count(*) from chat_reports x where x.target = r.target)) order by r.id desc)
    from (select * from chat_reports where p_status is null or status = p_status order by id desc limit 100) r
    left join accounts ra on ra.id = r.reporter left join accounts ta on ta.id = r.target), '[]'::jsonb);
end $$;

create or replace function public.dc_admin_chat_report_set(p_token text, p_id bigint, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := dc.auth(p_token);
begin
  if not coalesce((select is_admin from accounts where id = v_me), false) then perform dc.err('not_admin'); end if;
  if p_status not in ('open', 'reviewed', 'dismissed') then perform dc.err('invalid_request'); end if;
  update chat_reports set status = p_status where id = p_id;
  return public.dc_admin_chat_reports(p_token, 'open');
end $$;

revoke all on function public.dc_admin_chat_reports(text, text), public.dc_admin_chat_report_set(text, bigint, text) from public;
grant execute on function public.dc_admin_chat_reports(text, text), public.dc_admin_chat_report_set(text, bigint, text) to anon, authenticated;

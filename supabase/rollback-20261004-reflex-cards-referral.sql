-- Retour arrière de 20261004_reflex_cards_referral_guest_first.sql : rétablit la règle « compte sans aucun booster ouvert ».

create or replace function public.rc_referral_new(p_referee uuid, p_referrer uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_referee = p_referrer then return 'already'; end if;
  if exists (select 1 from public.rc_referrals where referrer = p_referee) then return 'already'; end if;
  if not exists (select 1 from public.rc_players where player_id = p_referee and opened = 0 and owner is not null) then return 'not_new'; end if;
  insert into public.rc_referrals (referee, referrer) values (p_referee, p_referrer) on conflict (referee) do nothing;
  return case when found then 'ok' else 'already' end;
end;
$$;

revoke all on function public.rc_referral_new(uuid, uuid) from public, anon, authenticated;
grant execute on function public.rc_referral_new(uuid, uuid) to service_role;

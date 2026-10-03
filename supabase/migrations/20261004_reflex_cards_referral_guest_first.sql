-- Reflex Cards — parrainage quand l'ami joue d'abord en invité (plan « simple pour un ami invité », 03/10/2026).
--
-- Avant : rc_referral_new exigeait un compte qui n'a encore ouvert AUCUN booster (opened = 0). Depuis l'ouverture du jeu
-- aux invités (REFLEX_CARDS_GUESTS), l'ami invité ouvre ses premiers boosters SANS compte, puis crée son compte : la partie
-- invitée (déjà des boosters ouverts) est rattachée au compte → 'not_new' → ni lui ni son parrain ne recevaient le booster
-- promis. Compteurs du 03/10 : 0 parrainage.
--
-- Après : le filleul est un compte créé depuis moins de 7 jours (created_at de rc_players), qui n'a parrainé personne et
-- n'a jamais été filleul. La récompense (rc_referral_reward, inchangée) est versée dès l'acceptation de l'invitation par le
-- serveur du site (app/api/cartes/amis), puisqu'il a déjà ouvert au moins un booster ; sinon au premier booster du compte.
-- Garde-fous conservés : un joueur ne peut être filleul qu'une fois (clé unique referee), jamais filleul s'il est déjà
-- parrain, plafond de 3 parrainages payés par parrain et par semaine (dans rc_referral_reward).
--
-- À exécuter dans l'éditeur SQL Supabase (projet ovolnnnmsugfhsckhivh). Retour arrière : rollback-20261004-reflex-cards-referral.sql

create or replace function public.rc_referral_new(p_referee uuid, p_referrer uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_referee = p_referrer then return 'already'; end if;
  /* un filleul arrive : il n'a encore parrainé personne (sinon deux joueurs se parraineraient l'un l'autre, 4 boosters au lieu de 2) */
  if exists (select 1 from public.rc_referrals where referrer = p_referee) then return 'already'; end if;
  /* compte récent (7 jours) : l'ami a pu jouer en invité avant de créer son compte (03/10/2026) */
  if not exists (
    select 1 from public.rc_players
    where player_id = p_referee and owner is not null and created_at > now() - interval '7 days'
  ) then return 'not_new'; end if;
  insert into public.rc_referrals (referee, referrer) values (p_referee, p_referrer) on conflict (referee) do nothing;
  return case when found then 'ok' else 'already' end;
end;
$$;

revoke all on function public.rc_referral_new(uuid, uuid) from public, anon, authenticated;
grant execute on function public.rc_referral_new(uuid, uuid) to service_role;

-- Contrôle après application :
--   select pg_get_functiondef('public.rc_referral_new(uuid, uuid)'::regprocedure);   -- doit contenir « interval '7 days' »

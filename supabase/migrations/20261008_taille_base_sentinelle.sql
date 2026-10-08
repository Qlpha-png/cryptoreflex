-- 08/10/2026 (lot Z1, supervision) : taille de la base lisible par la sentinelle.
--
-- Pourquoi : sur l'offre Free de Supabase, au-delà de 500 Mo la base passe en lecture seule pour tout le site
-- (alertes, comptes, cours). La sentinelle complète (scripts/sentinelle.mjs, checkTailleBase) doit voir venir ce
-- plafond : ⚠️ à 60 %, ❌ à 80 %. Sans cette fonction, la taille n'est pas lisible (PostgREST n'expose pas
-- pg_database_size, et l'API de gestion de Supabase exige un jeton personnel, c'est-à-dire un secret nouveau).
--
-- Ce que fait la fonction : renvoie un seul nombre, la taille de la base en octets. Aucune donnée lue, aucune écriture.
-- Accès : clé service_role seulement (déjà utilisée par les robots GitHub) ; ni anon ni authenticated.
-- À lancer UNE fois par Kev (SQL Editor de Supabase, projet ovolnnnmsugfhsckhivh, bouton Run).
-- Rejouable sans effet (create or replace).

create or replace function public.cryptoreflex_taille_base()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.pg_database_size(pg_catalog.current_database());
$$;

revoke all on function public.cryptoreflex_taille_base() from public;
revoke all on function public.cryptoreflex_taille_base() from anon;
revoke all on function public.cryptoreflex_taille_base() from authenticated;
grant execute on function public.cryptoreflex_taille_base() to service_role;

comment on function public.cryptoreflex_taille_base() is
  'Taille de la base en octets, lue par la sentinelle (seuils 60 % / 80 % de 500 Mo). Clé service_role seulement.';

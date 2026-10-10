-- 10/10/2026 (lot Z3) : archive maison des cours (robot R4) + colonnes de marché complètes des fiches (robot R2).
--
-- Pourquoi :
--  1. Archive : la courbe 7 jours et les plus hauts / plus bas des fiches ne doivent plus dépendre d'une source tierce.
--     Le robot des fiches (R2, app/api/cron/refresh-prices, 3 fois par jour, toutes les fiches) et le robot des cours
--     (R1, lib/marche-robot.ts, une fois par heure pour le top 100) écrivent un point par fiche et par passage.
--     Purge : au-delà de 8 jours, seuls la clôture, le plus haut et le plus bas de chaque jour (UTC) sont gardés (3 lignes
--     par fiche et par jour au plus), sans limite de durée.
--     Supabase Free n'a pas de sauvegarde automatique : les clôtures de chaque mois sont aussi commitées dans
--     data/archive/AAAA-MM.json par le robot des détails (R3, scripts/populate-all-cryptos-kv.mjs).
--  2. Colonnes : R2 écrit désormais aussi le volume, l'offre, les variations et la source du cours.
--
-- Taille estimée : ≈ 4 700 points par jour (780 × 3 + 100 × 24) ; 8 jours glissants ≈ 38 000 lignes (≈ 6 Mo) ;
-- au-delà, 3 lignes par fiche et par jour au plus : ≈ 855 000 lignes par an au maximum (≈ 90 Mo, estimation à mesurer). La sentinelle surveille la taille de la base (⚠️ 60 %, ❌ 80 % de 500 Mo).
--
-- Tant que ce fichier n'est pas lancé : R2 écrit « archive non disponible » dans sa trace, reste vert pour les prix, et la
-- sentinelle met la famille « Archive des cours » en ⚠️ (pas ❌).
--
-- Accès : clé service_role seulement (robots) ; ni anon ni authenticated (RLS activée, aucune politique publique).
-- À lancer UNE fois par Kev (SQL Editor de Supabase, projet ovolnnnmsugfhsckhivh, bouton Run).
-- Rejouable sans effet (if not exists, create or replace).

-- 1. Colonnes de marché complètes des fiches ---------------------------------------------------------------------------
alter table public.cryptos add column if not exists volume_24h_usd numeric;
alter table public.cryptos add column if not exists circulating_supply numeric;
alter table public.cryptos add column if not exists total_supply numeric;
alter table public.cryptos add column if not exists max_supply numeric;
alter table public.cryptos add column if not exists change_1h_pct numeric;
alter table public.cryptos add column if not exists change_24h_pct numeric;
alter table public.cryptos add column if not exists change_7d_pct numeric;
alter table public.cryptos add column if not exists price_source text;

comment on column public.cryptos.price_source is
  'Source du dernier cours écrit par /api/cron/refresh-prices : coinmarketcap, dexscreener (prix DEX, sans rang) ou coingecko (repli).';

-- 2. Archive des cours -------------------------------------------------------------------------------------------------
create table if not exists public.cours_archive (
  id bigserial primary key,
  fiche text not null,
  ts timestamptz not null,
  prix_usd numeric not null check (prix_usd > 0),
  source text not null
);

create index if not exists cours_archive_fiche_ts on public.cours_archive (fiche, ts desc);
create index if not exists cours_archive_ts on public.cours_archive (ts);

alter table public.cours_archive enable row level security;
revoke all on table public.cours_archive from anon, authenticated;
grant select, insert, delete on table public.cours_archive to service_role;
grant usage, select on sequence public.cours_archive_id_seq to service_role;

comment on table public.cours_archive is
  'Archive des cours (robot R4) : un point par fiche et par passage de R2 (3 par jour) et de R1 (top 100, chaque heure). Au-delà de 8 jours, clôture, plus haut et plus bas de chaque jour.';

-- Purge : au-delà de 8 jours, on garde, par fiche et par jour UTC, le DERNIER point (clôture), le point le PLUS HAUT et
-- le point le PLUS BAS (3 lignes par jour au plus) ; le reste est supprimé. Reprise Z3 (I2) : le « plus haut depuis le … »
-- affiché ne peut ainsi jamais reculer pour une même période (un sommet relevé dans la journée reste dans l'archive).
create or replace function public.cours_archive_purger()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with gardes as (
    (select distinct on (c.fiche, (c.ts at time zone 'UTC')::date) c.id
     from public.cours_archive c
     where c.ts < now() - interval '8 days'
     order by c.fiche, (c.ts at time zone 'UTC')::date, c.ts desc)
    union
    (select distinct on (c.fiche, (c.ts at time zone 'UTC')::date) c.id
     from public.cours_archive c
     where c.ts < now() - interval '8 days'
     order by c.fiche, (c.ts at time zone 'UTC')::date, c.prix_usd desc, c.ts asc)
    union
    (select distinct on (c.fiche, (c.ts at time zone 'UTC')::date) c.id
     from public.cours_archive c
     where c.ts < now() - interval '8 days'
     order by c.fiche, (c.ts at time zone 'UTC')::date, c.prix_usd asc, c.ts asc)
  ), supprimes as (
    delete from public.cours_archive c
    where c.ts < now() - interval '8 days'
      and not exists (select 1 from gardes k where k.id = c.id)
    returning 1
  )
  select count(*)::integer from supprimes;
$$;

-- Médiane des 7 derniers jours par fiche (reprise Z3, I5) : référence du garde-fou de variation de R2 quand le cours en
-- base a plus de 48 h (une migration de jeton suivie sur l'ancien identifiant ne s'écrit plus en silence au bout de 48 h).
create or replace function public.cours_archive_medianes()
returns table (fiche text, mediane numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select c.fiche, percentile_cont(0.5) within group (order by c.prix_usd)::numeric as mediane
  from public.cours_archive c
  where c.ts >= now() - interval '7 days'
  group by c.fiche;
$$;

-- Plus haut / plus bas de chaque fiche dans l'archive, avec la date du premier point (« depuis le JJ/MM/AAAA »).
create or replace function public.cours_archive_extremes()
returns table (fiche text, premier timestamptz, plus_haut numeric, plus_haut_le timestamptz, plus_bas numeric, plus_bas_le timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with b as (
    select c.fiche, min(c.ts) as premier from public.cours_archive c group by c.fiche
  ), h as (
    select distinct on (c.fiche) c.fiche, c.prix_usd, c.ts from public.cours_archive c order by c.fiche, c.prix_usd desc, c.ts asc
  ), l as (
    select distinct on (c.fiche) c.fiche, c.prix_usd, c.ts from public.cours_archive c order by c.fiche, c.prix_usd asc, c.ts asc
  )
  select b.fiche, b.premier, h.prix_usd, h.ts, l.prix_usd, l.ts
  from b join h on h.fiche = b.fiche join l on l.fiche = b.fiche;
$$;

-- Clôtures quotidiennes (dernier point de chaque jour UTC) entre deux dates incluses : export mensuel data/archive/AAAA-MM.json.
create or replace function public.cours_archive_clotures(debut date, fin date)
returns table (fiche text, jour date, prix_usd numeric, ts timestamptz, source text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (c.fiche, (c.ts at time zone 'UTC')::date)
    c.fiche, (c.ts at time zone 'UTC')::date as jour, c.prix_usd, c.ts, c.source
  from public.cours_archive c
  where (c.ts at time zone 'UTC')::date between debut and fin
  order by c.fiche, (c.ts at time zone 'UTC')::date, c.ts desc;
$$;

revoke all on function public.cours_archive_purger() from public, anon, authenticated;
revoke all on function public.cours_archive_extremes() from public, anon, authenticated;
revoke all on function public.cours_archive_clotures(date, date) from public, anon, authenticated;
revoke all on function public.cours_archive_medianes() from public, anon, authenticated;
grant execute on function public.cours_archive_medianes() to service_role;
grant execute on function public.cours_archive_purger() to service_role;
grant execute on function public.cours_archive_extremes() to service_role;
grant execute on function public.cours_archive_clotures(date, date) to service_role;

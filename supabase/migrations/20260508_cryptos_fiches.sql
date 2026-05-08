-- Migration : cryptos (fiches techniques scalables)
-- Phase 1 plan scaling — passer de 100 fiches JSON hardcodees a 10 000+
-- fiches en DB avec analyse structuree LLM-generee (T1/T2/T3 quality tiers).
--
-- Contrat :
--   - 1 row par crypto (PK = coingeckoId)
--   - data editoriale (T1) cohabite avec data auto-generee (T3)
--   - quality_tier permet de filtrer affichage (badge "verified" T1)
--   - llm_content : JSONB structure 12 sections (cf. scripts/generate-fiche-crypto.mjs)
--   - raw_data_snapshot : JSONB CoinGecko + DefiLlama au moment de la generation
--   - chains : JSONB mapping {ethereum: "0x...", solana: "...", ...} pour Phase 3
--     (DexScreener fetch by-contract address)
--
-- RLS : public read (toutes les fiches sont publiques sur le site). Write
-- reserve service role (cron + admin scripts uniquement).
--
-- Performance : ~10K rows envisages, taille ~50 MB total. Index sur :
--   - coingeckoId (PK auto)
--   - market_cap_rank (sort liste / heatmap)
--   - quality_tier (filtres T1/T2/T3)
--   - symbol (lookup rapide pour API /vs/{symbol})

create table if not exists public.cryptos (
  -- Identite
  coingecko_id text primary key,
  slug text not null unique,
  symbol text not null,
  name text not null,
  genesis_date date,
  categories text[] not null default '{}',

  -- Liens officiels
  homepage_url text,
  whitepaper_url text,
  github_repos text[] not null default '{}',
  twitter_handle text,

  -- Multi-chain (Phase 3 hook pour DexScreener by-contract)
  chains jsonb not null default '{}'::jsonb,

  -- Snapshot raw data (CoinGecko + DefiLlama au moment de la generation LLM)
  raw_data_snapshot jsonb not null default '{}'::jsonb,

  -- Contenu structure LLM (12 sections selon schema fiche profonde)
  llm_content jsonb not null default '{}'::jsonb,

  -- Metriques live (mises a jour via cron, pas par LLM)
  -- Permet sorting/filtering DB-level sans parser raw_data_snapshot.
  market_cap_rank int,
  market_cap_usd numeric,
  price_usd numeric,

  -- Scores Cryptoreflex proprietaires (0-100)
  -- Calcules au moment de la generation LLM, refreshes selon quality_tier cadence.
  score_decentralization int check (score_decentralization between 0 and 100),
  score_compliance_fr_eu int check (score_compliance_fr_eu between 0 and 100),
  score_technical_maturity int check (score_technical_maturity between 0 and 100),
  score_community_health int check (score_community_health between 0 and 100),
  score_overall int check (score_overall between 0 and 100),

  -- Pipeline metadata
  quality_tier text not null default 'T3' check (quality_tier in ('T1', 'T2', 'T3')),
  fact_check_score int check (fact_check_score between 0 and 100),
  llm_model text,
  llm_tokens_total int,
  llm_cost_usd numeric,
  source text not null default 'llm-pipeline' check (source in ('hand-crafted', 'llm-pipeline', 'imported-json')),

  -- Lifecycle
  is_published boolean not null default true,
  published_at timestamptz,
  last_refreshed_at timestamptz not null default now(),
  needs_review boolean not null default false,

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour lookups frequents (market table sort, /vs/, search by symbol)
create index if not exists idx_cryptos_market_cap_rank
  on public.cryptos(market_cap_rank asc nulls last);

create index if not exists idx_cryptos_quality_tier
  on public.cryptos(quality_tier);

create index if not exists idx_cryptos_symbol
  on public.cryptos(upper(symbol));

create index if not exists idx_cryptos_published_rank
  on public.cryptos(is_published, market_cap_rank asc nulls last)
  where is_published = true;

create index if not exists idx_cryptos_categories
  on public.cryptos using gin (categories);

create index if not exists idx_cryptos_needs_review
  on public.cryptos(needs_review)
  where needs_review = true;

-- Search FTS sur name + symbol + slug pour recherche rapide
create index if not exists idx_cryptos_search_fts
  on public.cryptos using gin (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(symbol, '') || ' ' || coalesce(slug, ''))
  );

-- RLS : public read, write service role uniquement.
alter table public.cryptos enable row level security;

drop policy if exists "cryptos: public read published" on public.cryptos;
create policy "cryptos: public read published" on public.cryptos
  for select using (is_published = true);

-- Pas de policy insert/update/delete : seul le service role (qui bypass RLS)
-- peut ecrire. Cron jobs + admin scripts uniquement.

-- Trigger updated_at auto
create or replace function public.touch_cryptos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cryptos_updated_at on public.cryptos;
create trigger trg_cryptos_updated_at
  before update on public.cryptos
  for each row execute function public.touch_cryptos_updated_at();

-- Vue pratique pour le frontend : top cryptos par market cap, T1+T2 only
-- (T3 auto-generated peut avoir qualite variable, on garde quality first
-- sur les listes "vedettes").
create or replace view public.cryptos_featured as
select *
from public.cryptos
where is_published = true
  and quality_tier in ('T1', 'T2')
order by market_cap_rank asc nulls last;

-- Permissions sur la vue
grant select on public.cryptos_featured to anon, authenticated;

comment on table public.cryptos is
'Fiches techniques crypto (Phase 1 scaling — 100 -> 10K+). 3 tiers de qualite : T1 hand-crafted, T2 IA + supervision humaine, T3 IA auto-generated.';

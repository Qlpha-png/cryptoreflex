-- Migration : user_exchange_connections (sync API read-only des exchanges).
--
-- Étude #4 ETUDE-AMELIORATIONS-2026-05-02 — V1 minimale Binance.
--
-- SÉCURITÉ CRITIQUE :
--  - Les API keys utilisateurs sont CHIFFRÉES AES-256-GCM avant insert
--    (cf. lib/exchange-crypto.ts). On ne stocke JAMAIS de clés en clair.
--  - La clé maître est `EXCHANGE_ENCRYPTION_KEY` (env var Vercel, jamais commit).
--  - Ne stocker QUE des clés READ-ONLY (vérifié via call /account permissions
--    avant insert). Pas de write/withdraw possible.
--  - RLS strict : un user ne voit que ses propres connexions.
--  - Pas d'index sur les colonnes chiffrées (inutile, jamais query par valeur).
--
-- SCOPE V1 : Binance uniquement. La colonne `provider` permet l'extension future
-- vers Coinbase, Kraken, Bitpanda, etc. sans modifier le schéma.

create table if not exists public.user_exchange_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Identifiant du provider (whitelist côté code) : "binance", "coinbase", etc.
  provider text not null check (provider in ('binance', 'coinbase', 'kraken', 'bitpanda')),
  -- Label libre choisi par l'user (ex: "Mon Binance principal"). Optionnel.
  label text,
  -- API key + secret CHIFFRÉS (format hex : iv:authTag:ciphertext).
  -- Jamais en clair en DB. Lecture uniquement par lib/exchange-crypto.ts.
  api_key_encrypted text not null,
  api_secret_encrypted text not null,
  -- Confirmation que la clé est read-only (check côté code après pull permissions).
  is_read_only boolean not null default true,
  -- Dernière sync réussie (utile pour UI "synced 5 min ago").
  last_synced_at timestamptz,
  -- Statut dernière sync : "ok" | "error" | "pending" | null (jamais sync).
  last_sync_status text check (last_sync_status in ('ok', 'error', 'pending') or last_sync_status is null),
  -- Message d'erreur dernière sync (utile pour UI debug).
  last_sync_error text,
  -- Compteur sync échoués consécutifs (auto-disable après 5 fails).
  consecutive_failures int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un user ne peut pas créer 10 connexions Binance redondantes (1 par provider max
  -- en V1 — à relâcher si on veut supporter "compte perso + compte pro" plus tard).
  unique (user_id, provider)
);

create index if not exists idx_uec_user
  on public.user_exchange_connections(user_id);

alter table public.user_exchange_connections enable row level security;

-- Policies idempotentes
drop policy if exists "uec: select own" on public.user_exchange_connections;
create policy "uec: select own" on public.user_exchange_connections
  for select using (auth.uid() = user_id);

drop policy if exists "uec: insert own" on public.user_exchange_connections;
create policy "uec: insert own" on public.user_exchange_connections
  for insert with check (auth.uid() = user_id);

drop policy if exists "uec: update own" on public.user_exchange_connections;
create policy "uec: update own" on public.user_exchange_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "uec: delete own" on public.user_exchange_connections;
create policy "uec: delete own" on public.user_exchange_connections
  for delete using (auth.uid() = user_id);

-- Trigger updated_at auto.
create or replace function public.touch_uec_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_uec_updated_at on public.user_exchange_connections;
create trigger trg_uec_updated_at
  before update on public.user_exchange_connections
  for each row execute function public.touch_uec_updated_at();

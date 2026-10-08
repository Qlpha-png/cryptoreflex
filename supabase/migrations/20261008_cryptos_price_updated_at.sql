-- 08/10/2026 (lot fraîcheur A, reprise, défaut I1 du juré) : date du COURS séparée de updated_at.
--
-- Pourquoi : le masquage des cours figés (lib/cours-fiche.ts) lisait updated_at. Or le déclencheur
-- trg_cryptos_updated_at remet updated_at à now() à CHAQUE update, y compris le simple
-- « needs_review = true » posé chaque jour par app/api/cron/audit-cryptos-health. Le jour où ce contrôle
-- écrit, un prix figé depuis mai s'afficherait « relevé du <aujourd'hui> » : une date fabriquée.
--
-- price_updated_at n'est écrite QUE par app/api/cron/refresh-prices (en même temps que price_usd,
-- market_cap_usd et market_cap_rank). Aucun déclencheur ne la touche.
--
-- Reprise des valeurs : aujourd'hui, seul refresh-prices écrit dans la table (le contrôle de santé s'arrête
-- avant d'écrire, luxxcoin est encore au 11/05 en production), donc updated_at = date du dernier cours.
-- À lancer UNE fois par Kev (SQL Editor de Supabase, projet ovolnnnmsugfhsckhivh, bouton Run).
-- Rejouable sans effet : la colonne n'est créée et remplie que si elle n'existe pas encore.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cryptos' and column_name = 'price_updated_at'
  ) then
    alter table public.cryptos add column price_updated_at timestamptz;
    -- déclencheur coupé le temps de la reprise : sinon updated_at passerait à now() sur toutes les lignes
    alter table public.cryptos disable trigger trg_cryptos_updated_at;
    update public.cryptos set price_updated_at = updated_at where price_usd is not null;
    alter table public.cryptos enable trigger trg_cryptos_updated_at;
  end if;
end $$;

comment on column public.cryptos.price_updated_at is
  'Date du dernier relevé de price_usd / market_cap_usd / market_cap_rank. Écrite uniquement par /api/cron/refresh-prices.';

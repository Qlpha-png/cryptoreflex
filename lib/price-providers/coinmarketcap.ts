/**
 * lib/price-providers/coinmarketcap.ts — Fournisseur CoinMarketCap Basic (06/10/2026).
 *
 * Relais du prix en direct juste après les places de marché (table lib/data-sources/priorities.ts) et première
 * source des fiches longue traîne. Inactif sans CMC_API_KEY (canHandle = false → aucun appel, aucun journal).
 * Ne répond que pour les fiches de data/cmc-id-map.json (jamais de recherche par symbole).
 */

import { cmcEnabled, cmcQuoteForSite, getCmcEntry } from "@/lib/coinmarketcap";
import type { CryptoMeta, PriceProvider, ProviderPriceData } from "./types";

export const coinmarketcapProvider: PriceProvider = {
  name: "coinmarketcap",
  priority: 45,

  canHandle(meta: CryptoMeta): boolean {
    return cmcEnabled() && getCmcEntry(meta.coingeckoId) !== null;
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    // Les erreurs HTTP remontent (SourceError) : le disjoncteur les compte, la cascade passe au relais.
    const q = await cmcQuoteForSite(meta.coingeckoId);
    if (!q) return null;
    return {
      priceUsd: q.priceUsd,
      change24h: q.change24h ?? 0,
      volume24h: q.volume24h ?? 0,
      marketCap: q.marketCap ?? undefined,
      change1h: q.change1h,
      change7d: q.change7d,
      circulatingSupply: q.circulatingSupply,
      rank: q.rank,
      meta: { cmcId: q.cmcId, lastUpdated: q.lastUpdated },
    };
  },
};

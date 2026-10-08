/**
 * lib/price-providers/coinmarketcap.ts — cours CoinMarketCap LUS dans le KV (08/10/2026, lot Z2).
 *
 * Aucune requête vers CoinMarketCap ici : le robot R1 (app/api/cron/refresh-ticker-prices) relève le top 100 toutes
 * les 10 min et l'écrit dans le KV ; ce fournisseur ne fait que le lire. Il ne répond que pour une fiche du relevé, et
 * seulement si le relevé vient vraiment de CoinMarketCap et a 12 min au plus (sinon la cascade passe à Binance).
 */

import { getCmcEntry } from "@/lib/coinmarketcap";
import { readTickerCache } from "@/lib/kv-ticker";
import type { CryptoMeta, PriceProvider, ProviderPriceData } from "./types";

export const coinmarketcapProvider: PriceProvider = {
  name: "coinmarketcap",
  priority: 5,

  /** Fiche de la table data/cmc-id-map.json seulement (lecture d'un fichier, jamais d'appel réseau ni par symbole). */
  canHandle(meta: CryptoMeta): boolean {
    return getCmcEntry(meta.coingeckoId) !== null;
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    const t = await readTickerCache();
    if (t.source !== "live" || t.provider !== "coinmarketcap") return null;
    const e = t.record[meta.coingeckoId];
    if (!e || e.unlinked || !(e.price > 0)) return null;
    return {
      priceUsd: e.price,
      change24h: e.change24h,
      volume24h: e.volume24h ?? 0,
      marketCap: e.marketCap > 0 ? e.marketCap : undefined,
      change1h: e.change1h ?? null,
      change7d: e.change7d ?? null,
      circulatingSupply: e.circulatingSupply ?? null,
      rank: e.rank ?? null,
      meta: { releveLe: t.fetchedAt },
    };
  },
};

/**
 * lib/price-providers/cryptocompare.ts — Provider CryptoCompare (Source #6).
 *
 * Rate-limited en prod sans cle API (audit /api/diag-cc-stress). Garde dans
 * la cascade au cas ou une cle est ajoutee, ou si la rate-limit policy
 * change. Retourne marketCap natif (pas d'estimation cote orchestrator).
 */

import { getCryptoComparePriceByCoingeckoId } from "@/lib/cryptocompare";
import type {
  CryptoMeta,
  PriceProvider,
  ProviderPriceData,
} from "./types";

export const cryptocompareProvider: PriceProvider = {
  name: "cryptocompare",
  priority: 60,

  canHandle(_meta: CryptoMeta): boolean {
    return true;
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    const r = await getCryptoComparePriceByCoingeckoId(meta.coingeckoId);
    if (!r || r.priceUsd <= 0) return null;
    return {
      priceUsd: r.priceUsd,
      change24h: r.change24h,
      volume24h: r.volume24h,
      marketCap: r.marketCap, // CryptoCompare expose le mcap natif
    };
  },
};

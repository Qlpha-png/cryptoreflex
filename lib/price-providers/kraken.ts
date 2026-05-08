/**
 * lib/price-providers/kraken.ts — Provider Kraken (Source #2).
 *
 * Wrappe getKrakenPrice (lib/kraken.ts). Couverture audit 2026-05-08 :
 * 93/100 cryptos. Symbol overrides Kraken (XBT, XDG) gere en interne.
 *
 * canHandle : true partout — meme heuristique simple, on laisse Kraken
 * decider via son cascade XX-USD/USDT/USDC.
 */

import { getKrakenPrice } from "@/lib/kraken";
import type {
  CryptoMeta,
  PriceProvider,
  ProviderPriceData,
} from "./types";

export const krakenProvider: PriceProvider = {
  name: "kraken",
  priority: 20,

  canHandle(_meta: CryptoMeta): boolean {
    return true; // Kraken couvre 93% — pas de skip pre-fetch utile
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    const r = await getKrakenPrice(meta.coingeckoId, meta.symbol);
    if (!r || r.priceUsd <= 0) return null;
    return {
      priceUsd: r.priceUsd,
      change24h: r.change24h,
      volume24h: r.volume24h,
    };
  },
};

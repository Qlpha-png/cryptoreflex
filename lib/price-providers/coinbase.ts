/**
 * lib/price-providers/coinbase.ts — Provider Coinbase (Source #3).
 *
 * Wrappe getCoinbasePrice (lib/coinbase.ts). Couverture 79/100.
 */

import { getCoinbasePrice } from "@/lib/coinbase";
import type {
  CryptoMeta,
  PriceProvider,
  ProviderPriceData,
} from "./types";

export const coinbaseProvider: PriceProvider = {
  name: "coinbase",
  priority: 30,

  canHandle(_meta: CryptoMeta): boolean {
    return true;
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    const r = await getCoinbasePrice(meta.symbol);
    if (!r || r.priceUsd <= 0) return null;
    return {
      priceUsd: r.priceUsd,
      change24h: r.change24h,
      volume24h: r.volume24h,
    };
  },
};

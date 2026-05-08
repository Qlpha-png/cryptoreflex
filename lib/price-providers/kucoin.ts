/**
 * lib/price-providers/kucoin.ts — Provider KuCoin (Source #4).
 *
 * Wrappe getKuCoinPrice (lib/kucoin.ts). Couvre les cryptos asiatiques /
 * exotiques (THETA, KCS, POLYX, etc.) mal couvertes par Kraken/Coinbase.
 */

import { getKuCoinPrice } from "@/lib/kucoin";
import type {
  CryptoMeta,
  PriceProvider,
  ProviderPriceData,
} from "./types";

export const kucoinProvider: PriceProvider = {
  name: "kucoin",
  priority: 40,

  canHandle(_meta: CryptoMeta): boolean {
    return true;
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    const r = await getKuCoinPrice(meta.symbol);
    if (!r || r.priceUsd <= 0) return null;
    return {
      priceUsd: r.priceUsd,
      change24h: r.change24h,
      volume24h: r.volume24h,
    };
  },
};

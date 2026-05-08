/**
 * lib/coinbase.ts — Source de prix Coinbase Exchange (gratuit, no key).
 *
 * Pourquoi Coinbase comme Source #3 :
 *  - Couvre 79/100 cryptos du site (audit 2026-05-08)
 *  - Public Exchange API gratuit illimite (no key)
 *  - Geo-OK depuis Hetzner DE
 *  - Bonne couverture US/UE listings, complementaire de Kraken
 *
 * Endpoint : https://api.exchange.coinbase.com/products/BTC-USD/ticker
 * Format pair : SYMBOL-USD (ou USDT/USDC si pas de USD direct).
 *
 * Strategie identique a Kraken : 1 fetch par crypto, cached 5min, atomique.
 */

import { unstable_cache } from "next/cache";

export interface CoinbasePriceData {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  fetchedAt: string;
}

async function _fetchCoinbasePrice(symbol: string): Promise<CoinbasePriceData | null> {
  const sym = symbol.toUpperCase();
  const candidates = [`${sym}-USD`, `${sym}-USDT`, `${sym}-USDC`];

  for (const pair of candidates) {
    try {
      // /ticker donne le prix mais pas le change24h. On combine avec /stats.
      const [tickerRes, statsRes] = await Promise.all([
        fetch(`https://api.exchange.coinbase.com/products/${pair}/ticker`, {
          signal: AbortSignal.timeout(5000),
          headers: { Accept: "application/json" },
        }),
        fetch(`https://api.exchange.coinbase.com/products/${pair}/stats`, {
          signal: AbortSignal.timeout(5000),
          headers: { Accept: "application/json" },
        }),
      ]);
      if (!tickerRes.ok) continue;
      const ticker = (await tickerRes.json()) as {
        price?: string;
        volume?: string;
      };
      const price = parseFloat(ticker.price ?? "0");
      if (!Number.isFinite(price) || price <= 0) continue;

      let change24h = 0;
      if (statsRes.ok) {
        const stats = (await statsRes.json()) as {
          open?: string;
          last?: string;
          volume?: string;
        };
        const open = parseFloat(stats.open ?? "0");
        if (open > 0) {
          change24h = ((price - open) / open) * 100;
        }
      }

      const volume24h = parseFloat(ticker.volume ?? "0") * price;

      return {
        priceUsd: price,
        change24h,
        volume24h,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      // Continue to next pair
    }
  }
  return null;
}

export const getCoinbasePrice = unstable_cache(
  async (symbol: string) => _fetchCoinbasePrice(symbol),
  ["coinbase-price-v1"],
  { revalidate: 300, tags: ["price-source", "coinbase"] },
);

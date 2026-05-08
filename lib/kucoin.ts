/**
 * lib/kucoin.ts — Source de prix KuCoin (gratuit, no key).
 *
 * Pourquoi KuCoin comme Source #4 :
 *  - Couvre les cryptos asiatiques/exotiques mal couvertes par Kraken/Coinbase
 *    (THETA, KCS native, POLYX, etc.)
 *  - Public API gratuit illimite (no key requise pour /market/orderbook/level1)
 *  - Geo-OK depuis Hetzner DE (KuCoin a des serveurs UE)
 *
 * Endpoint : https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=BTC-USDT
 * Format pair : SYMBOL-USDT (la plupart des paires KuCoin sont en USDT).
 *
 * 24h change : recupere via /api/v1/market/stats?symbol=BTC-USDT
 */

import { unstable_cache } from "next/cache";

export interface KuCoinPriceData {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  fetchedAt: string;
}

async function _fetchKuCoinPrice(symbol: string): Promise<KuCoinPriceData | null> {
  const sym = symbol.toUpperCase();
  const candidates = [`${sym}-USDT`, `${sym}-USDC`];

  for (const pair of candidates) {
    try {
      const statsRes = await fetch(
        `https://api.kucoin.com/api/v1/market/stats?symbol=${pair}`,
        {
          signal: AbortSignal.timeout(5000),
          headers: { Accept: "application/json" },
        },
      );
      if (!statsRes.ok) continue;
      const stats = (await statsRes.json()) as {
        code?: string;
        data?: {
          last?: string;
          changeRate?: string; // ratio 24h, ex: "0.0234" = +2.34%
          vol?: string; // volume base
          volValue?: string; // volume quote (USDT)
        };
      };
      if (stats.code !== "200000" || !stats.data) continue;
      const price = parseFloat(stats.data.last ?? "0");
      if (!Number.isFinite(price) || price <= 0) continue;
      const changeRate = parseFloat(stats.data.changeRate ?? "0");
      const volume24h = parseFloat(stats.data.volValue ?? "0");
      return {
        priceUsd: price,
        change24h: changeRate * 100, // KuCoin renvoie ratio, on convertit en %
        volume24h,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      // Continue
    }
  }
  return null;
}

// RISK MITIGATION (audit regle des 3) — revalidate 60s pour reduire fenetre stuck.
export const getKuCoinPrice = unstable_cache(
  async (symbol: string) => _fetchKuCoinPrice(symbol),
  ["kucoin-price-v1"],
  { revalidate: 60, tags: ["price-source", "kucoin"] },
);

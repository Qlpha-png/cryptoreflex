/**
 * lib/price-providers/coingecko.ts — Provider CoinGecko (Source #7).
 *
 * Utilise /simple/price (free Demo, ~30 req/min sans cle). Source legacy
 * qui resolvait l'ambiguite OM/MANTRA via coingeckoId canonique.
 *
 * Cache : Next.js fetch revalidate 300s. Pas de unstable_cache externe
 * pour rester proche du comportement historique.
 */

import type {
  CryptoMeta,
  PriceProvider,
  ProviderPriceData,
} from "./types";

interface CoingeckoSimplePriceEntry {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
}

async function _coingeckoSimplePrice(
  coingeckoId: string,
): Promise<CoingeckoSimplePriceEntry | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
    const res = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<
      string,
      CoingeckoSimplePriceEntry | undefined
    >;
    return data[coingeckoId] ?? null;
  } catch {
    return null;
  }
}

export const coingeckoProvider: PriceProvider = {
  name: "coingecko",
  priority: 70,

  canHandle(_meta: CryptoMeta): boolean {
    return true;
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    const entry = await _coingeckoSimplePrice(meta.coingeckoId);
    if (!entry || typeof entry.usd !== "number" || entry.usd <= 0) return null;
    return {
      priceUsd: entry.usd,
      change24h: entry.usd_24h_change ?? 0,
      volume24h: entry.usd_24h_vol ?? 0,
      marketCap: entry.usd_market_cap, // CoinGecko expose le mcap natif
    };
  },
};

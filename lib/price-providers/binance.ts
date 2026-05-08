/**
 * lib/price-providers/binance.ts — Provider Binance (Source #1).
 *
 * Wrappe la logique _binanceTicker + _binanceKlines historique de
 * lib/price-source.ts. Particularite : seule source qui fournit un
 * sparkline 7d (168 klines horaires).
 *
 * canHandle : retourne true uniquement si coingeckoId est mappe dans
 * COINGECKO_TO_BINANCE. Skip-rapide evite un fetch /ticker/24hr inutile.
 *
 * Limite : Binance ne donne pas le marketCap (pas de supply). Le
 * cascade orchestrator l'estime via STATIC_FALLBACK supply.
 */

import { COINGECKO_TO_BINANCE } from "@/lib/binance-mapping";
import type {
  CryptoMeta,
  PriceProvider,
  ProviderPriceData,
} from "./types";

const BINANCE_BASE = "https://api.binance.com/api/v3";

interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  openPrice: string;
}

async function _binanceTicker(pair: string): Promise<BinanceTicker24h | null> {
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${pair}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as BinanceTicker24h;
  } catch {
    return null;
  }
}

async function _binanceKlines(pair: string): Promise<number[]> {
  try {
    const res = await fetch(
      `${BINANCE_BASE}/klines?symbol=${pair}&interval=1h&limit=168`,
      {
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as Array<
      [number, string, string, string, string, ...unknown[]]
    >;
    return json.map((k) => parseFloat(k[4]));
  } catch {
    return [];
  }
}

export const binanceProvider: PriceProvider = {
  name: "binance",
  priority: 10,

  canHandle(meta: CryptoMeta): boolean {
    return Boolean(COINGECKO_TO_BINANCE[meta.coingeckoId]);
  },

  async fetch(meta: CryptoMeta): Promise<ProviderPriceData | null> {
    const pair = COINGECKO_TO_BINANCE[meta.coingeckoId];
    if (!pair) return null;
    const ticker = await _binanceTicker(pair);
    if (!ticker) return null;
    const priceUsd = parseFloat(ticker.lastPrice);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;
    const sparkline = await _binanceKlines(pair);
    return {
      priceUsd,
      change24h: parseFloat(ticker.priceChangePercent),
      volume24h: parseFloat(ticker.quoteVolume),
      sparkline7d: sparkline,
    };
  },
};

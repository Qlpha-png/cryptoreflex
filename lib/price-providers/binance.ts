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

/* 05/10/2026 : point d'accès public des données de marché — api.binance.com répond 451 aux États-Unis et ne répond plus
   depuis la France (4 s perdues par appel en cdg1 avant de passer à Kraken). Voir lib/historical-prices.ts. */
const BINANCE_BASE = "https://data-api.binance.vision/api/v3";

interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  openPrice: string;
  /** fin de la fenêtre glissante 24 h (ms) — proche de maintenant pour une paire active */
  closeTime: number;
}

async function _binanceTicker(pair: string): Promise<BinanceTicker24h | null> {
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${pair}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const t = (await res.json()) as BinanceTicker24h;
    /* Paire retirée de Binance : le ticker répond encore avec un dernier prix figé (05/10/2026 : XMRUSDT « 118,70 $ »,
       MKRUSDT, TONUSDT… arrêtés au 09/09/2026). Plus d'une heure sans échange → on laisse la place de marché suivante. */
    if (!Number.isFinite(t.closeTime) || Date.now() - t.closeTime > 3600_000) return null;
    return t;
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

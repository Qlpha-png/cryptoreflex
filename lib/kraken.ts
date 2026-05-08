/**
 * lib/kraken.ts — Source de prix Kraken (gratuit, no key, EU-friendly).
 *
 * Pourquoi Kraken comme Source #2 :
 *  - Couvre 93/100 cryptos du site (audit 2026-05-08, .lh-audits/audit-multi-exchange.mjs)
 *  - Public API gratuit illimite (pas de key requise pour /public/Ticker)
 *  - Geo-OK depuis Hetzner DE (UE → UE, pas de geo-block)
 *  - Stable depuis 2013, fiabilite eprouvee
 *
 * Strategie :
 *  - 1 fetch par crypto (cached 5min via unstable_cache atomique)
 *  - Pas de batch ici (Kraken /public/Ticker accepte plusieurs pairs en
 *    1 query mais le cache key compose introduisait des bugs CryptoCompare,
 *    on garde le pattern atomique safe)
 *
 * Symbols speciaux Kraken :
 *  - BTC → "XBT" (heritage historique 2013)
 *  - DOGE → "XDG"
 *  - Quote pair : USD ou USDT (USD legacy "ZUSD" sur certaines paires)
 *
 * Cryptos NON couvertes (cf audit) : MKR, THETA, RNDR, KCS, OM, POLYX.
 * Tomberont sur Source #3 (Coinbase) puis #4 (static).
 */

import { unstable_cache } from "next/cache";

export interface KrakenPriceData {
  priceUsd: number;
  change24h: number;
  volume24h: number;
  fetchedAt: string;
}

// Mapping coingeckoId → symbol Kraken (XBT au lieu de BTC, etc.)
// Les overrides sont MINIMES — la majorite des symbols Kraken match le ticker.
const KRAKEN_SYMBOL_OVERRIDES: Record<string, string> = {
  bitcoin: "XBT", // BTC s'appelle XBT chez Kraken (heritage)
  dogecoin: "XDG", // DOGE s'appelle XDG
};

/**
 * Tente plusieurs paires (USD, USDT, ZUSD) car Kraken expose differentes
 * conventions selon la liquidite de la paire. La 1ere qui repond avec un
 * prix > 0 est retournee.
 */
async function _fetchKrakenPrice(
  coingeckoId: string,
  symbol: string,
): Promise<KrakenPriceData | null> {
  const ksym = KRAKEN_SYMBOL_OVERRIDES[coingeckoId] ?? symbol.toUpperCase();
  // Kraken renvoie les paires sous des cles bizarres : pour BTC c'est "XXBTZUSD",
  // pour ETH c'est "XETHZUSD", pour les nouveaux tokens c'est juste "XXXUSDT".
  // On essaie les 3 variantes les plus courantes.
  const candidates = [`${ksym}USD`, `${ksym}USDT`, `${ksym}USDC`];
  for (const pair of candidates) {
    try {
      const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        error?: string[];
        result?: Record<
          string,
          {
            c?: [string, string]; // [last_price, last_lot_volume]
            v?: [string, string]; // [today_volume, last24h_volume]
            o?: string; // open today (pour calcul change24h)
            p?: [string, string]; // [today_volume_weighted_avg, last24h_vwap]
          }
        >;
      };
      if (data.error && data.error.length > 0) continue;
      if (!data.result) continue;
      const ticker = Object.values(data.result)[0];
      if (!ticker?.c) continue;
      const price = parseFloat(ticker.c[0]);
      if (!Number.isFinite(price) || price <= 0) continue;
      const open = parseFloat(ticker.o ?? "0");
      const change24h = open > 0 ? ((price - open) / open) * 100 : 0;
      const volume24h = parseFloat(ticker.v?.[1] ?? "0") * price;
      return {
        priceUsd: price,
        change24h,
        volume24h,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      // Continue to next pair candidate
    }
  }
  return null;
}

/**
 * Cached per-crypto. Cache key atomique = pas de race condition
 * possible entre callers avec different sets d'ids.
 *
 * RISK MITIGATION (audit regle des 3 2026-05-08) :
 *  - revalidate: 60 (et non 300) pour reduire la fenetre stuck si le 1er
 *    hit cold-start retourne null. unstable_cache cache les `null` returns,
 *    donc 5 min etait trop long. 60s = bon trade-off entre re-fetch load et
 *    fenetre d'erreur.
 *  - Le caller (price-source cascade) tente Coinbase si Kraken null, donc
 *    une crypto stuck cote Kraken peut quand meme etre live via Coinbase.
 */
export const getKrakenPrice = unstable_cache(
  async (coingeckoId: string, symbol: string) => _fetchKrakenPrice(coingeckoId, symbol),
  ["kraken-price-v1"],
  { revalidate: 60, tags: ["price-source", "kraken"] },
);

/**
 * lib/cryptocompare.ts — Source de prix BATCH via CryptoCompare.
 *
 * Pourquoi CryptoCompare :
 *  - Couvre 99/100 cryptos du site (audit 2026-05-08, .lh-audits/audit-batch.mjs)
 *  - Free tier : 100K calls/mois SANS clé (suffisant avec cache 5min batch)
 *  - Endpoint /pricemultifull supporte jusqu'a 60 symbols par request
 *  - Geo-OK depuis Hetzner DE (pas de rate-limit observe en prod)
 *
 * Strategie BATCH :
 *  - 1 SEUL fetch toutes les 5 min couvre les 100 cryptos
 *  - Soit ~290 calls/mois (100 × 24h × 30 / 5min/12batches), bien sous quota
 *  - Toutes les invocations individuelles `getCryptoComparePrice(symbol)`
 *    tirent depuis le cache batch unique → 0 surcharge.
 *
 * Mapping symbols (special cases qui ne match pas symbol direct) :
 *  - frax-share / FXS : CryptoCompare ne l'a pas. Fallback static.
 *
 * Usage :
 *   import { getCryptoComparePrice } from "@/lib/cryptocompare";
 *   const price = await getCryptoComparePrice("BTC");  // { priceUsd, change24h, marketCap, volume24h }
 *
 * Co-existence avec lib/price-source.ts : ce fichier est une SOURCE
 * (utilise par la cascade), pas un consumer direct.
 */

import { unstable_cache } from "next/cache";

export interface CryptoComparePriceData {
  priceUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  fetchedAt: string;
}

// SUPPORTED_SYMBOLS est genere DYNAMIQUEMENT depuis les data JSON (top-cryptos +
// hidden-gems) — voir bloc d'init plus bas. Pas de hardcode pour eviter les
// drifts entre la liste editorale et la liste des symbols a fetcher.
let SUPPORTED_SYMBOLS: string[] = [];

interface CryptoCompareRawResponse {
  RAW?: Record<string, { USD?: { PRICE: number; CHANGEPCT24HOUR: number; MKTCAP: number; TOTALVOLUME24HTO: number } }>;
  Response?: string;
  Message?: string;
}

/**
 * Fetch batch raw — toutes les cryptos en 1-2 calls (max 60 symbols / call).
 * Cached 5min via unstable_cache.
 */
async function _fetchBatch(): Promise<Record<string, CryptoComparePriceData>> {
  const fetchedAt = new Date().toISOString();
  const result: Record<string, CryptoComparePriceData> = {};

  // Split en chunks de 60 (max CryptoCompare per request)
  const chunks: string[][] = [];
  for (let i = 0; i < SUPPORTED_SYMBOLS.length; i += 60) {
    chunks.push(SUPPORTED_SYMBOLS.slice(i, i + 60));
  }

  for (const chunk of chunks) {
    try {
      const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${chunk.join(",")}&tsyms=USD`;
      const res = await fetch(url, {
        // Pas de revalidate ici — c'est unstable_cache qui gere (5min)
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.warn(`[cryptocompare] batch HTTP ${res.status} for ${chunk.length} symbols`);
        continue;
      }
      const data = (await res.json()) as CryptoCompareRawResponse;
      if (data.Response === "Error") {
        // eslint-disable-next-line no-console
        console.warn(`[cryptocompare] batch error: ${data.Message}`);
        continue;
      }
      if (!data.RAW) continue;
      for (const sym of chunk) {
        const usd = data.RAW[sym]?.USD;
        if (usd && typeof usd.PRICE === "number" && usd.PRICE > 0) {
          result[sym] = {
            priceUsd: usd.PRICE,
            change24h: usd.CHANGEPCT24HOUR ?? 0,
            marketCap: usd.MKTCAP ?? 0,
            volume24h: usd.TOTALVOLUME24HTO ?? 0,
            fetchedAt,
          };
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[cryptocompare] batch fetch failed:`,
        err instanceof Error ? err.message : "unknown",
      );
    }
  }
  return result;
}

/**
 * Cached batch — 1 fetch toutes les 5 min couvre 100 cryptos.
 */
const getBatch = unstable_cache(
  _fetchBatch,
  ["cryptocompare-batch-v1"],
  { revalidate: 300, tags: ["price-source", "cryptocompare-batch"] },
);

/**
 * Get price for one symbol from the batch cache. Symbol must be uppercase
 * (BTC, ETH, etc.). Returns null if symbol not in SUPPORTED_SYMBOLS or
 * if CryptoCompare didn't return data for it.
 */
export async function getCryptoComparePrice(
  symbol: string,
): Promise<CryptoComparePriceData | null> {
  const sym = symbol.toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(sym)) return null;
  try {
    const batch = await getBatch();
    return batch[sym] ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the full batch (debug/admin).
 */
export async function getCryptoCompareAll(): Promise<Record<string, CryptoComparePriceData>> {
  return await getBatch();
}

/* -------------------------------------------------------------------------- */
/*  Lookup coingeckoId -> symbol (genere depuis data/*.json)                  */
/* -------------------------------------------------------------------------- */

import topData from "@/data/top-cryptos.json";
import gemsData from "@/data/hidden-gems.json";

interface CryptoEntry {
  id: string;
  coingeckoId: string;
  symbol: string;
}

const ALL_ENTRIES: CryptoEntry[] = [
  ...((topData as { topCryptos: CryptoEntry[] }).topCryptos ?? []),
  ...((gemsData as { hiddenGems: CryptoEntry[] }).hiddenGems ?? []),
];

const COINGECKO_TO_SYMBOL: Record<string, string> = {};
for (const e of ALL_ENTRIES) {
  if (e.coingeckoId && e.symbol) {
    COINGECKO_TO_SYMBOL[e.coingeckoId] = e.symbol.toUpperCase();
  }
}

// Auto-populate SUPPORTED_SYMBOLS depuis le mapping data — assure 1:1
// avec les cryptos editoriales du site. Si on ajoute une crypto au catalogue,
// elle est automatiquement fetched par le batch CryptoCompare.
SUPPORTED_SYMBOLS = Array.from(new Set(Object.values(COINGECKO_TO_SYMBOL))).sort();

/**
 * Get price by coingeckoId (translates to symbol via data JSON lookup,
 * then queries the batch cache).
 */
export async function getCryptoComparePriceByCoingeckoId(
  coingeckoId: string,
): Promise<CryptoComparePriceData | null> {
  const symbol = COINGECKO_TO_SYMBOL[coingeckoId];
  if (!symbol) return null;
  return getCryptoComparePrice(symbol);
}

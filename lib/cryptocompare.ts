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
 *
 * FIX 2026-05-08 — bug observe via /api/diag-cc : un chunk timeout/fail
 * → `continue` silencieux → cache contient partial result (59/100 sur 2
 * chunks). Pour 5 min on servait du static fallback aux 41 autres.
 *
 * Strategie revue :
 *  - Retry 1x par chunk (500ms backoff) avant d'abandonner
 *  - Si un chunk echoue malgre retry : THROW pour eviter que
 *    unstable_cache memoize un resultat partiel. La prochaine invocation
 *    re-tentera. Mieux qu'un cache stale qui dure 5 min.
 *  - Timeout par fetch passe de 8s a 12s (CryptoCompare peut etre lent
 *    sur des batchs de 60 symbols avec replay/sparkline)
 */
async function _fetchOneChunk(chunk: string[], fetchedAt: string): Promise<Record<string, CryptoComparePriceData>> {
  const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${chunk.join(",")}&tsyms=USD`;
  // 2026-06-13 — CryptoCompare exige désormais une clé (HTTP 401 sans, vu
  // en prod Vercel via `vercel logs`). La clé est OPTIONNELLE : si absente
  // le batch est court-circuité en amont (cf. _fetchBatch), on n'arrive
  // donc ici qu'avec une clé valide.
  const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers.authorization = `Apikey ${apiKey}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${chunk.length} symbols`);
  }
  const data = (await res.json()) as CryptoCompareRawResponse;
  if (data.Response === "Error") {
    throw new Error(`API error: ${data.Message}`);
  }
  if (!data.RAW) {
    throw new Error("Missing RAW in response");
  }
  const out: Record<string, CryptoComparePriceData> = {};
  for (const sym of chunk) {
    const usd = data.RAW[sym]?.USD;
    if (usd && typeof usd.PRICE === "number" && usd.PRICE > 0) {
      out[sym] = {
        priceUsd: usd.PRICE,
        change24h: usd.CHANGEPCT24HOUR ?? 0,
        marketCap: usd.MKTCAP ?? 0,
        volume24h: usd.TOTALVOLUME24HTO ?? 0,
        fetchedAt,
      };
    }
  }
  return out;
}

async function _fetchBatch(): Promise<Record<string, CryptoComparePriceData>> {
  // SKIP PROPRE — sans clé API, CryptoCompare renvoie 401 sur chaque chunk
  // (constaté en prod). On ne tente même pas le réseau : retour vide → la
  // cascade tombe instantanément sur CoinGecko (chaîne gratuite déjà en
  // place), sans 401 ni spam de logs. Pour réactiver CC : poser
  // CRYPTOCOMPARE_API_KEY (offre gratuite cryptocompare.com).
  if (!process.env.CRYPTOCOMPARE_API_KEY) {
    return {};
  }

  const fetchedAt = new Date().toISOString();
  const result: Record<string, CryptoComparePriceData> = {};

  const chunks: string[][] = [];
  for (let i = 0; i < SUPPORTED_SYMBOLS.length; i += 60) {
    chunks.push(SUPPORTED_SYMBOLS.slice(i, i + 60));
  }

  let failedChunks = 0;
  for (const chunk of chunks) {
    let chunkResult: Record<string, CryptoComparePriceData> | null = null;
    try {
      chunkResult = await _fetchOneChunk(chunk, fetchedAt);
    } catch (err1) {
      // Retry 1x apres 500ms.
      // eslint-disable-next-line no-console
      console.warn(
        `[cryptocompare] chunk fetch attempt 1 failed (${chunk.length} symbols):`,
        err1 instanceof Error ? err1.message : "unknown",
      );
      await new Promise((r) => setTimeout(r, 500));
      try {
        chunkResult = await _fetchOneChunk(chunk, fetchedAt);
      } catch (err2) {
        // eslint-disable-next-line no-console
        console.warn(
          `[cryptocompare] chunk fetch attempt 2 failed:`,
          err2 instanceof Error ? err2.message : "unknown",
        );
        failedChunks++;
      }
    }
    if (chunkResult) {
      Object.assign(result, chunkResult);
    }
  }

  // Si TOUS les chunks ont echoue → throw pour invalider unstable_cache et
  // re-tenter la prochaine fois. Si la moitie a marche, on garde le partial
  // (mieux que rien, et next revalidate (5min) re-tentera tout).
  if (failedChunks === chunks.length && chunks.length > 0) {
    throw new Error("All CryptoCompare chunks failed — bypassing cache");
  }
  return result;
}

/**
 * Cached batch — 1 fetch toutes les 5 min couvre 100 cryptos.
 */
const getBatch = unstable_cache(
  _fetchBatch,
  // FIX 2026-05-08 — v1 -> v2 : invalide le cache contenant le partial
  // 59-symbols batch (avant le retry fix 2b92b35). Le cache key v1
  // restait stale 5 min meme apres le code update.
  ["cryptocompare-batch-v2"],
  // OPTIM 2026-05-10 — TTL 5min → 15min. Marche pour cap (bouge peu)
  // et price (10s d'écart vs Binance acceptable, on a le live cascade
  // pour les requêtes critiques). Économie : 288 → 96 fetches CC/jour.
  // OPTIM 2026-05-11 — 15min → 1h. CryptoCompare dépassait 172% du quota
  // free 250K/mois (96 × 5 chunks/jour = 14.4K/jour = 432K/mois).
  // Avec 1h cache : 24 × 5 chunks = 120 fetches/jour = 3.6K/mois ✓ (1.4%).
  // CC sert le marketCap fallback (non critique car KV le couvre déjà).
  { revalidate: 3600, tags: ["price-source", "cryptocompare-batch"] },
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

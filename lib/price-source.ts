/**
 * lib/price-source.ts — BATCH 50 (2026-05-03).
 *
 * AGGREGATOR DE PRIX MAISON — alternative gratuite illimitee a CoinGecko
 * dont le free plan (10K req/mois) a ete epuise.
 *
 * Architecture en cascade fallback :
 *   1. Binance public REST  — gratuit illimite (1200 req/min/IP), couvre
 *      ~600 paires USDT (= 90% du top 100 crypto). Pas de cle requise.
 *   2. CoinCap.io v2        — gratuit (200 req/min sans cle), top 1500.
 *      Couvre les coins absents de Binance.
 *   3. Static fallback      — dataset hardcode du dernier snapshot.
 *      Garantit que le site ne casse jamais. Visible "donnees du XX/XX".
 *
 * Aucune dependance : fetch natif Node 20+. Pas de cle API necessaire.
 *
 * Usage :
 *   import { getPriceSnapshot, getTopMarket } from "@/lib/price-source";
 *   const btc = await getPriceSnapshot("bitcoin");  // => { priceUsd, ... }
 *   const top = await getTopMarket(20);              // => Top 20 par market cap
 *
 * Cache strategy :
 *   - Cache Vercel ISR via fetch next.revalidate (300s pour prix, 1800s
 *     pour donnees lourdes). Resilience automatique.
 *   - Cache key par source : "ps:binance:btc", "ps:coincap:bitcoin"
 *
 * Couverture vs CoinGecko :
 *   ✅ Prix USD/EUR temps reel
 *   ✅ Variation 24h, 7d (calc derive si pas dispo)
 *   ✅ Volume 24h
 *   ✅ Market cap (price × supply)
 *   ✅ Sparkline 7d (Binance klines 1h × 168)
 *   ✅ Top market par cap
 *   ⚠️  ATH/ATL : approximation via Binance klines max ou static fallback
 *   ⚠️  Logos : on garde notre propre source (cryptologos.cc + assets.coingecko.com cache)
 */

import { unstable_cache } from "next/cache";
import { getKv } from "@/lib/kv";
import { applySymbolOverride } from "@/lib/symbol-overrides";

// PHASE 2 — Provider Pattern registry. La cascade live (Binance, Kraken,
// Coinbase, KuCoin, DexScreener, CryptoCompare, CoinGecko, Static) est
// maintenant orchestrate via lib/price-providers/. SKIP_DEXSCREENER set
// (ambiguity OM/MANTRA) est encapsule dans dexscreenerProvider.canHandle().
// Anciens imports directs supprimes (deplaces dans les providers individuels).
import {
  fetchPriceCascade,
  estimateMarketCap,
  type CryptoMeta,
} from "@/lib/price-providers";

// Data JSON editoriales (top-cryptos + hidden-gems) — single source of truth
// pour le mapping coingeckoId -> {symbol, name}. Importe statiquement pour
// que le lookup soit synchrone au boot et bundle correctement par Next.js.
import topCryptosData from "@/data/top-cryptos.json";
import hiddenGemsData from "@/data/hidden-gems.json";

interface DataEntry {
  id?: string;
  coingeckoId: string;
  symbol: string;
  name: string;
}

const DATA_META_LOOKUP: Record<string, { symbol: string; name: string }> = (() => {
  const all: DataEntry[] = [
    ...((topCryptosData as { topCryptos?: DataEntry[] }).topCryptos ?? []),
    ...((hiddenGemsData as { hiddenGems?: DataEntry[] }).hiddenGems ?? []),
  ];
  const map: Record<string, { symbol: string; name: string }> = {};
  for (const e of all) {
    if (e.coingeckoId && e.symbol && e.name) {
      map[e.coingeckoId] = { symbol: e.symbol.toUpperCase(), name: e.name };
    }
  }
  return map;
})();

/* -------------------------------------------------------------------------- */
/*  KV snapshot — auto-update via cron /api/cron/update-static-prices         */
/* -------------------------------------------------------------------------- */

interface KvStaticSnapshot {
  snapshot: Record<string, { priceUsd: number; change24h: number; marketCap: number; volume24h: number }>;
  updatedAt: string;
  sourceCount: number;
}

/**
 * Lecture du snapshot KV. Plus lazy refresh fire-and-forget si stale.
 * Avantage : 0 dependance cron externe, le snapshot s'auto-rafraichit
 * naturellement quand un user atteint la fonction.
 */
const KV_SNAPSHOT_KEY = "price-source:top-snapshot";
const KV_REFRESH_LOCK_KEY = "price-source:refresh-lock";
const KV_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

/**
 * Lit le snapshot KV. Si >5min stale, lance un refresh background
 * (fire-and-forget, ne bloque pas le caller). Lock pour eviter que
 * 100 users simultanes lancent 100 refreshs en parallele.
 */
async function _readKvSnapshot(): Promise<Record<string, { priceUsd: number; change24h: number; marketCap: number; volume24h: number }> | null> {
  try {
    const kv = getKv();
    const raw = await kv.get<string>(KV_SNAPSHOT_KEY);
    if (!raw) {
      // Snapshot inexistant -> fire refresh background (sans await)
      void _refreshKvSnapshotIfNotLocked();
      return null;
    }
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as KvStaticSnapshot) : (raw as unknown as KvStaticSnapshot);
    if (!parsed?.snapshot) return null;

    // Check staleness
    const updatedAt = parsed.updatedAt ? new Date(parsed.updatedAt).getTime() : 0;
    const age = Date.now() - updatedAt;
    if (age > KV_STALE_THRESHOLD_MS) {
      // Stale -> trigger refresh background, mais on retourne quand meme
      // le snapshot stale au caller pour eviter latency
      void _refreshKvSnapshotIfNotLocked();
    }
    return parsed.snapshot;
  } catch {
    return null;
  }
}

/**
 * Refresh le snapshot KV via getTopMarket (Binance + CoinCap aggregator).
 * Lock 60s pour eviter le thundering herd (100 users -> 100 fetchs).
 * Appele en fire-and-forget depuis _readKvSnapshot quand stale.
 */
async function _refreshKvSnapshotIfNotLocked(): Promise<void> {
  try {
    const kv = getKv();
    // Acquire lock (set + ex 60s + nx serait ideal mais l'API kv basique
    // ne fait pas nx — on simule en check-then-set rudimentaire).
    const existingLock = await kv.get<string>(KV_REFRESH_LOCK_KEY);
    if (existingLock) return; // refresh deja en cours
    await kv.set(KV_REFRESH_LOCK_KEY, "1", { ex: 60 });

    // Fetch top 50 (separated cache key + flow direct)
    const top = await _getTopMarket(50);
    if (top.length < 10) {
      await kv.del(KV_REFRESH_LOCK_KEY);
      return;
    }

    const snapshot: Record<string, { priceUsd: number; change24h: number; marketCap: number; volume24h: number }> = {};
    for (const c of top) {
      snapshot[c.id] = {
        priceUsd: c.priceUsd,
        change24h: c.change24h,
        marketCap: c.marketCap,
        volume24h: c.volume24h,
      };
    }

    await kv.set(
      KV_SNAPSHOT_KEY,
      JSON.stringify({
        snapshot,
        updatedAt: new Date().toISOString(),
        sourceCount: top.length,
      }),
      { ex: 24 * 3600 }, // TTL 24h max
    );

    await kv.del(KV_REFRESH_LOCK_KEY);
  } catch {
    // Best effort, on ignore les erreurs (le hardcode fallback prend le relais)
    try {
      const kv = getKv();
      await kv.del(KV_REFRESH_LOCK_KEY);
    } catch {
      /* noop */
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type PriceSource =
  | "binance"
  | "kraken"
  | "coinbase"
  | "kucoin"
  | "dexscreener"
  | "cryptocompare"
  | "coingecko"
  // "coincap" : legacy alias kept for backward-compat (snapshot caches
  // pre-refactor stockaient "coincap" alors que la source etait deja
  // CoinGecko). Nouveau nom canonique = "coingecko".
  | "coincap"
  | "static";

export interface PriceSnapshot {
  /** Notre slug interne (= coingeckoId pour compatibilite). */
  id: string;
  symbol: string;
  name: string;
  /** Prix en USD. 0 si fallback echec. */
  priceUsd: number;
  /** Variation % sur 24h. */
  change24h: number;
  /** Variation % sur 7d. Null si non dispo (CoinCap n'expose pas direct). */
  change7d: number | null;
  /** Volume 24h en USD. */
  volume24h: number;
  /** Market cap en USD (price × circulating supply). */
  marketCap: number;
  /** Sparkline 168 points (1 par heure sur 7j). Vide si non dispo. */
  sparkline7d: number[];
  /** Source de la donnee (pour debug + bandeau frontend). */
  source: PriceSource;
  /** ISO timestamp du fetch. */
  fetchedAt: string;
}

export interface TopMarketCoin extends PriceSnapshot {
  marketCapRank: number;
  /** URL logo (CoinGecko CDN cache ou cryptologos.cc fallback). */
  image: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers actifs                                                            */
/* -------------------------------------------------------------------------- */
/* Phase 2 cleanup (cycle 8) : _binanceTicker + _binanceKlines + interface    */
/* BinanceTicker24h ont ete supprimes — la logique Binance est maintenant     */
/* dans lib/price-providers/binance.ts. Seul _calcChange7d reste utilise par  */
/* _getPriceSnapshotInner pour deriver le change7d des sparkline retournes    */
/* par binanceProvider.                                                       */

/**
 * Calcul change7d a partir des klines : (close[end] - close[start]) / close[start] × 100
 */
function _calcChange7d(sparkline: number[]): number | null {
  if (sparkline.length < 2) return null;
  const first = sparkline[0];
  const last = sparkline[sparkline.length - 1];
  if (!first || !last) return null;
  return ((last - first) / first) * 100;
}

/* -------------------------------------------------------------------------- */
/*  Source #2 — CoinGecko (gratuit Demo, ~30 req/min sans cle)                */
/* -------------------------------------------------------------------------- */
/* FIX 2026-05-08 — CoinCap.io v2 a ete arrete (DNS not resolved, dig         */
/* api.coincap.io renvoie NXDOMAIN). v3 demande une API key. On bascule       */
/* sur CoinGecko free Demo qui retourne le meme dataset (price, change24h,    */
/* market cap, volume) avec un endpoint batch /simple/price tres leger.       */
/* Cache Next.js 5min via unstable_cache → ~20 req/min meme sur 100 cryptos.  */
/* Quota Binance reste prioritaire (Source #1) tant qu'il marche, donc en    */
/* pratique CoinGecko ne kicke que pour les ~10 cryptos hors Binance OU       */
/* quand Hetzner DE est rate-limite par Binance (HTTP 429). Surveiller via    */
/* Sentry les `[price-source] coingecko fetch failed`.                        */

interface CoinCapAsset {
  id: string;
  rank: string;
  symbol: string;
  name: string;
  supply: string;
  marketCapUsd: string;
  volumeUsd24Hr: string;
  priceUsd: string;
  changePercent24Hr: string;
}

/* Phase 2 cleanup (cycle 8) : interface CoingeckoSimplePrice + _coincapAsset
 * supprimes — la logique CoinGecko /simple/price est maintenant dans
 * lib/price-providers/coingecko.ts. _coincapTop reste utilise par
 * _getTopMarket (different endpoint /coins/markets, top par market cap). */

/**
 * Fetch le top N par market cap via /coins/markets (1 hop pour 250 max).
 * Ordre par market_cap_desc identique a CoinCap top.
 */
async function _coincapTop(limit: number): Promise<CoinCapAsset[]> {
  try {
    const cap = Math.min(Math.max(1, limit), 250);
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${cap}&page=1&sparkline=false&price_change_percentage=24h`;
    const res = await fetch(url, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(7000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      current_price?: number;
      market_cap?: number;
      total_volume?: number;
      price_change_percentage_24h?: number;
      circulating_supply?: number;
      market_cap_rank?: number;
    }>;
    if (!Array.isArray(data)) return [];
    return data.map((c, idx) => ({
      id: c.id,
      rank: String(c.market_cap_rank ?? idx + 1),
      symbol: (c.symbol ?? "").toUpperCase(),
      name: c.name ?? c.id,
      supply: String(c.circulating_supply ?? 0),
      marketCapUsd: String(c.market_cap ?? 0),
      volumeUsd24Hr: String(c.total_volume ?? 0),
      priceUsd: String(c.current_price ?? 0),
      changePercent24Hr: String(c.price_change_percentage_24h ?? 0),
    }));
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Source #3 — Static fallback (dataset hardcode)                            */
/* -------------------------------------------------------------------------- */

/**
 * Snapshot statique du top 20 — derniere mise a jour manuelle 2026-05-03.
 * Sert de filet de securite ULTIME si Binance + CoinCap echouent (rare).
 * Le site continue a afficher des prix coherents au lieu de "—".
 *
 * V1 future : remplacer par un fetch Vercel KV qui contient le dernier
 * snapshot reussi (auto-update via cron).
 */
// Snapshot statique mai 2026 — prix moyens lisses derniere semaine. Etendu
// aux 30 cryptos les plus visitees du site pour eviter "—" sur les fiches
// si Binance + CoinCap echouent (cas Vercel Edge IP block, freeze, etc.).
// MAJ trimestrielle ou via cron (a faire BATCH 52 : auto-update via KV).
const STATIC_FALLBACK: Record<string, Pick<PriceSnapshot, "priceUsd" | "change24h" | "marketCap" | "volume24h">> = {
  bitcoin:    { priceUsd: 78500, change24h: 0,  marketCap: 1550000000000, volume24h: 35000000000 },
  ethereum:   { priceUsd: 2320,  change24h: 0,  marketCap:  280000000000, volume24h: 18000000000 },
  ripple:     { priceUsd: 0.62,  change24h: 0,  marketCap:   34000000000, volume24h:  2500000000 },
  binancecoin:{ priceUsd: 600,   change24h: 0,  marketCap:   90000000000, volume24h:  1800000000 },
  solana:     { priceUsd: 145,   change24h: 0,  marketCap:   68000000000, volume24h:  3000000000 },
  cardano:    { priceUsd: 0.45,  change24h: 0,  marketCap:   16000000000, volume24h:   600000000 },
  dogecoin:   { priceUsd: 0.12,  change24h: 0,  marketCap:   17000000000, volume24h:   900000000 },
  tron:       { priceUsd: 0.16,  change24h: 0,  marketCap:   14000000000, volume24h:   500000000 },
  "avalanche-2": { priceUsd: 30, change24h: 0,  marketCap:   12000000000, volume24h:   400000000 },
  chainlink:  { priceUsd: 14,    change24h: 0,  marketCap:    8000000000, volume24h:   400000000 },
  polkadot:   { priceUsd: 4.2,   change24h: 0,  marketCap:    6500000000, volume24h:   180000000 },
  "matic-network": { priceUsd: 0.42, change24h: 0, marketCap: 4200000000, volume24h:  150000000 },
  "the-open-network": { priceUsd: 4.8, change24h: 0, marketCap: 12000000000, volume24h: 200000000 },
  "shiba-inu": { priceUsd: 0.000017, change24h: 0, marketCap: 10000000000, volume24h: 350000000 },
  litecoin:   { priceUsd: 80,    change24h: 0,  marketCap:    6000000000, volume24h:   300000000 },
  "bitcoin-cash": { priceUsd: 380, change24h: 0, marketCap:   7500000000, volume24h:   250000000 },
  near:       { priceUsd: 4.5,   change24h: 0,  marketCap:    5000000000, volume24h:   180000000 },
  uniswap:    { priceUsd: 8,     change24h: 0,  marketCap:    4800000000, volume24h:   120000000 },
  aptos:      { priceUsd: 8.5,   change24h: 0,  marketCap:    4500000000, volume24h:   150000000 },
  "internet-computer": { priceUsd: 9, change24h: 0, marketCap: 4200000000, volume24h: 100000000 },
  "ethereum-classic": { priceUsd: 22, change24h: 0, marketCap: 3300000000, volume24h: 110000000 },
  cosmos:     { priceUsd: 7,     change24h: 0,  marketCap:    2700000000, volume24h:    80000000 },
  stellar:    { priceUsd: 0.10,  change24h: 0,  marketCap:    3000000000, volume24h:    90000000 },
  filecoin:   { priceUsd: 4.5,   change24h: 0,  marketCap:    2700000000, volume24h:    90000000 },
  monero:     { priceUsd: 165,   change24h: 0,  marketCap:    3000000000, volume24h:    50000000 },
  algorand:   { priceUsd: 0.18,  change24h: 0,  marketCap:    1500000000, volume24h:    40000000 },
  tezos:      { priceUsd: 0.85,  change24h: 0,  marketCap:    850000000,  volume24h:    20000000 },
  "hedera-hashgraph": { priceUsd: 0.06, change24h: 0, marketCap: 2200000000, volume24h: 70000000 },
  aave:       { priceUsd: 145,   change24h: 0,  marketCap:    2200000000, volume24h:    80000000 },
  maker:      { priceUsd: 1450,  change24h: 0,  marketCap:    1300000000, volume24h:    40000000 },
  sui:        { priceUsd: 1.5,   change24h: 0,  marketCap:    4500000000, volume24h:   180000000 },
  arbitrum:   { priceUsd: 0.85,  change24h: 0,  marketCap:    3500000000, volume24h:   120000000 },
  optimism:   { priceUsd: 1.6,   change24h: 0,  marketCap:    1800000000, volume24h:    60000000 },
  tether:     { priceUsd: 1,     change24h: 0,  marketCap:  120000000000, volume24h: 50000000000 },
  "usd-coin": { priceUsd: 1,     change24h: 0,  marketCap:   33000000000, volume24h:  6000000000 },
  // FIX 2026-05-08 cycle 4 — coingeckoId corrige : "mantra" (NEW $OM
  // Mantra Chain RWA L1 Cosmos) au lieu de "mantra-dao" (ANCIEN ERC-20
  // mort). Notre data/hidden-gems.json decrit le NEW. Static fallback
  // basé sur CoinGecko 2026-05-08 : $0.0103, mcap $52M.
  mantra: { priceUsd: 0.0103, change24h: 0, marketCap: 52000000, volume24h: 4500000 },
};

const COIN_META: Record<string, { symbol: string; name: string }> = {
  bitcoin:    { symbol: "BTC", name: "Bitcoin" },
  ethereum:   { symbol: "ETH", name: "Ethereum" },
  ripple:     { symbol: "XRP", name: "XRP" },
  binancecoin:{ symbol: "BNB", name: "BNB" },
  solana:     { symbol: "SOL", name: "Solana" },
  cardano:    { symbol: "ADA", name: "Cardano" },
  dogecoin:   { symbol: "DOGE",name: "Dogecoin" },
  tron:       { symbol: "TRX", name: "TRON" },
  "avalanche-2": { symbol: "AVAX", name: "Avalanche" },
  chainlink:  { symbol: "LINK",name: "Chainlink" },
  polkadot:   { symbol: "DOT", name: "Polkadot" },
  "matic-network": { symbol: "MATIC", name: "Polygon" },
  "the-open-network": { symbol: "TON", name: "Toncoin" },
  "shiba-inu": { symbol: "SHIB", name: "Shiba Inu" },
  litecoin:   { symbol: "LTC", name: "Litecoin" },
  "bitcoin-cash": { symbol: "BCH", name: "Bitcoin Cash" },
  near:       { symbol: "NEAR", name: "NEAR" },
  uniswap:    { symbol: "UNI", name: "Uniswap" },
  aptos:      { symbol: "APT", name: "Aptos" },
  "internet-computer": { symbol: "ICP", name: "Internet Computer" },
  "ethereum-classic": { symbol: "ETC", name: "Ethereum Classic" },
  cosmos:     { symbol: "ATOM",name: "Cosmos" },
  stellar:    { symbol: "XLM", name: "Stellar" },
  filecoin:   { symbol: "FIL", name: "Filecoin" },
  monero:     { symbol: "XMR", name: "Monero" },
  algorand:   { symbol: "ALGO",name: "Algorand" },
  tezos:      { symbol: "XTZ", name: "Tezos" },
  "hedera-hashgraph": { symbol: "HBAR", name: "Hedera" },
  aave:       { symbol: "AAVE",name: "Aave" },
  maker:      { symbol: "MKR", name: "Maker" },
  sui:        { symbol: "SUI", name: "Sui" },
  arbitrum:   { symbol: "ARB", name: "Arbitrum" },
  optimism:   { symbol: "OP",  name: "Optimism" },
  tether:     { symbol: "USDT",name: "Tether" },
  "usd-coin": { symbol: "USDC",name: "USD Coin" },
};

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Recupere un snapshot de prix complet pour une crypto.
 *
 * Cascade :
 *   1. Binance (gratuit illimite) si paire USDT existe
 *   2. CoinCap (gratuit) sinon
 *   3. Static fallback (dataset local) en dernier recours
 *
 * Toujours retourne un snapshot valide (jamais null), avec source="static"
 * si tout echoue. Garantit que le site ne casse jamais.
 */
async function _getPriceSnapshot(coingeckoId: string): Promise<PriceSnapshot> {
  try {
    return await _getPriceSnapshotInner(coingeckoId);
  } catch (err) {
    // FIX 2026-05-08 — guard global : peu importe l'erreur (timeout, parse,
    // import.meta crash, etc.), on retourne TOUJOURS un PriceSnapshot
    // valide pour ne pas faire crasher la chaine d'appel (notamment
    // /api/prices qui retournait 500 a cause de exceptions remontees ici).
    // eslint-disable-next-line no-console
    console.warn(
      `[price-source] _getPriceSnapshot fatal error for "${coingeckoId}":`,
      err instanceof Error ? err.message : "unknown",
    );
    const meta = COIN_META[coingeckoId] ?? {
      symbol: coingeckoId.toUpperCase().slice(0, 6),
      name: coingeckoId.charAt(0).toUpperCase() + coingeckoId.slice(1),
    };
    const stat = STATIC_FALLBACK[coingeckoId];
    return {
      id: coingeckoId,
      symbol: meta.symbol,
      name: meta.name,
      priceUsd: stat?.priceUsd ?? 0,
      change24h: stat?.change24h ?? 0,
      change7d: null,
      volume24h: stat?.volume24h ?? 0,
      marketCap: stat?.marketCap ?? 0,
      sparkline7d: [],
      source: "static",
      fetchedAt: new Date().toISOString(),
    };
  }
}

async function _getPriceSnapshotInner(coingeckoId: string): Promise<PriceSnapshot> {
  // OPTIM 2026-05-10 — KV ticker (top 50) read en PRIORITÉ avant cascade.
  // Évite hits Binance/Kraken/etc pour les top 50 cryptos (90% du trafic).
  // Le cron refresh-ticker-prices stocke top 50 toutes les 10 min.
  // Économie : ~99% des hits exchanges éliminés sur les top 50.
  try {
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (kvUrl && kvToken) {
      const url = `${kvUrl.replace(/\/$/, "")}/get/${encodeURIComponent("cg-ticker-prices:v1")}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${kvToken}`, accept: "application/json" },
        signal: AbortSignal.timeout(2500),
        next: { revalidate: 30, tags: ["kv-ticker-prices"] },
      });
      if (res.ok) {
        const data = (await res.json()) as { result?: string | null };
        if (typeof data.result === "string" && data.result.length > 0) {
          const cached = JSON.parse(data.result) as Record<
            string,
            {
              id: string;
              symbol: string;
              name: string;
              image: string;
              price: number;
              change24h: number;
              marketCap: number;
            }
          >;
          const entry = cached[coingeckoId];
          if (entry && entry.price > 0) {
            return {
              id: coingeckoId,
              symbol: entry.symbol,
              name: entry.name,
              priceUsd: entry.price,
              change24h: entry.change24h,
              change7d: null,
              volume24h: 0, // KV ticker n'a pas le volume24h, acceptable
              marketCap: entry.marketCap,
              sparkline7d: [],
              source: "static", // marqué static car cache KV (pas live)
              fetchedAt: new Date().toISOString(),
            };
          }
        }
      }
    }
  } catch {
    // KV indispo → fallback cascade live ci-dessous
  }

  // PHASE 2 PROVIDER PATTERN (cycle 7) — la cascade resiliente est
  // maintenant dans lib/price-providers/index.ts. Chaque source = 1 fichier
  // qui implemente PriceProvider. Ajout d'une nouvelle source = 1 ligne
  // dans PROVIDERS array. Architecture pensee scalabilite "toutes les
  // cryptos existantes" un jour.
  //
  // Le code historique inline (Binance + Kraken + Coinbase + KuCoin +
  // DexScreener + CryptoCompare + CoinGecko + Static, ~250 lignes
  // dupliquees pour estimation marketCap) a ete remplace par un seul
  // appel a fetchPriceCascade(meta) qui itere les providers tries par
  // priority croissante.
  //
  // FIX 2026-05-08 (audit regle des 3) — single source of truth pour le
  // mapping coingeckoId -> {symbol, name} : data JSON editoriales en
  // priorite, COIN_META legacy en fallback, derive intelligent en
  // dernier recours.
  const dataMeta =
    DATA_META_LOOKUP[coingeckoId] ??
    COIN_META[coingeckoId] ?? {
      symbol: coingeckoId.split("-")[0].toUpperCase().slice(0, 8),
      name:
        coingeckoId.charAt(0).toUpperCase() + coingeckoId.slice(1).replace(/-/g, " "),
    };
  // Symbol overrides (ex: render-token -> RENDER apres rename 2024).
  // Applique avant l'iteration des providers pour que tous recoivent le
  // bon symbol exchange.
  const exchangeSymbol = applySymbolOverride(coingeckoId, dataMeta.symbol);
  const fetchedAt = new Date().toISOString();
  const cryptoMeta: CryptoMeta = {
    coingeckoId,
    symbol: exchangeSymbol,
    name: dataMeta.name,
    // Phase 3 hook : `chains` mapping injecte ici quand data JSON sera
    // enrichi avec les contracts onchain (ETH/SOL/BSC/...). Pour l'instant
    // undefined → DexScreenerProvider tombe sur le search par symbol.
  };

  const cascadeResult = await fetchPriceCascade(cryptoMeta);
  if (cascadeResult) {
    const { data, source } = cascadeResult;
    const sparkline = data.sparkline7d ?? [];
    let marketCap = data.marketCap ?? estimateMarketCap(coingeckoId, data.priceUsd);

    // FIX 2026-05-10 — Hydratation marketCap depuis CryptoCompare batch
    // quand la cascade live (Binance/Kraken/Coinbase/KuCoin/DexScreener)
    // n'a pas fourni de marketCap ET STATIC_FALLBACK ne contient pas ce
    // coin (~80 fiches statiques + 680 LLM affectées avant ce fix).
    //
    // Le batch CryptoCompare est cached 5min via unstable_cache et couvre
    // les 100 cryptos editoriales en 1-2 fetch — donc 0 cout supplementaire
    // sur cet appel (cache hit dans 99% des cas).
    //
    // Pourquoi pas reordonner la cascade pour mettre CryptoCompare avant
    // Binance : (1) Binance est plus rapide (~150ms vs 600ms CC), (2) CC
    // peut etre rate-limited sans cle, (3) Binance fournit sparkline 7d
    // natif via klines. Cette approche garde le best-of-both : prix live
    // depuis exchanges rapides + marketCap depuis CryptoCompare batch.
    if (marketCap <= 0 && source !== "static" && source !== "cryptocompare") {
      try {
        const { getCryptoComparePriceByCoingeckoId } = await import(
          "@/lib/cryptocompare"
        );
        const cc = await getCryptoComparePriceByCoingeckoId(coingeckoId);
        if (cc && cc.marketCap > 0) marketCap = cc.marketCap;
      } catch {
        // CryptoCompare indispo → marketCap reste 0 (UI affiche "—").
        // Pas critique : meme degradation gracieuse qu'avant ce fix.
      }
    }

    return {
      id: coingeckoId,
      symbol: dataMeta.symbol,
      name: dataMeta.name,
      priceUsd: data.priceUsd,
      change24h: data.change24h,
      change7d: sparkline.length > 1 ? _calcChange7d(sparkline) : null,
      volume24h: data.volume24h,
      marketCap,
      sparkline7d: sparkline,
      source,
      fetchedAt,
    };
  }

  // Cascade exhausted (coingeckoId pas dans STATIC_FALLBACK ni couvert
  // par aucune source live). On essaie le KV snapshot (auto-update via
  // cron) avant de retourner un snapshot degrade priceUsd=0.
  const kvSnapshot = await _readKvSnapshot();
  const kvEntry = kvSnapshot?.[coingeckoId];
  if (kvEntry) {
    return {
      id: coingeckoId,
      symbol: dataMeta.symbol,
      name: dataMeta.name,
      priceUsd: kvEntry.priceUsd,
      change24h: kvEntry.change24h,
      change7d: null,
      volume24h: kvEntry.volume24h,
      marketCap: kvEntry.marketCap,
      sparkline7d: [],
      source: "static",
      fetchedAt,
    };
  }

  // Snapshot ultime degrade : priceUsd=0 (frontend affiche "—").
  return {
    id: coingeckoId,
    symbol: dataMeta.symbol,
    name: dataMeta.name,
    priceUsd: 0,
    change24h: 0,
    change7d: null,
    volume24h: 0,
    marketCap: 0,
    sparkline7d: [],
    source: "static",
    fetchedAt,
  };
}


/**
 * Wrappe avec unstable_cache Next pour deduplication request memoization +
 * cache cross-requete 5 minutes. Reduce les calls Binance/CoinCap.
 */
export const getPriceSnapshot = unstable_cache(
  _getPriceSnapshot,
  // FIX 2026-05-08 — v13 : Phase 2 Provider Pattern. La cascade live
  // est orchestrate via lib/price-providers/. Architecture extensible
  // pour scaler vers "toutes les cryptos existantes" un jour. Bump
  // cache pour invalider tous les snapshots pre-refactor.
  ["price-source-snapshot-v13"],
  { revalidate: 300, tags: ["price-source"] },
);

/**
 * Top market par capitalisation. Utilise CoinCap (qui retourne deja le top
 * tri par market cap) en source principale, fallback Binance pour les prix
 * si CoinCap echoue.
 *
 * Note : on n'utilise PAS Binance pour le top car Binance ne donne pas
 * de market cap (ne connait pas le supply). CoinCap est la bonne source.
 */
async function _getTopMarket(limit: number): Promise<TopMarketCoin[]> {
  const fetchedAt = new Date().toISOString();
  const ccTop = await _coincapTop(limit);
  if (ccTop.length > 0) {
    return ccTop.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      priceUsd: parseFloat(c.priceUsd),
      change24h: parseFloat(c.changePercent24Hr),
      change7d: null,
      volume24h: parseFloat(c.volumeUsd24Hr),
      marketCap: parseFloat(c.marketCapUsd),
      sparkline7d: [],
      source: "coincap",
      fetchedAt,
      marketCapRank: parseInt(c.rank, 10),
      // Logo : on utilise CoinCap CDN (gratuit)
      // BUG FIX 2026-05-03 — NE PAS hardcoder URL CoinCap CDN : couvre
      // mal les coins exotiques (404 -> broken image icon visible). On
      // laisse vide -> CryptoLogo composant fera le lookup intelligent
      // via lib/crypto-logos.ts (CoinGecko CDN cache, fonctionne pour
      // 100% du top 100 + fallback initiales gold pour le reste).
      image: "",
    }));
  }
  // Fallback ultime : derive du STATIC_FALLBACK
  return Object.entries(STATIC_FALLBACK)
    .slice(0, limit)
    .map(([id, stat], idx) => {
      const meta = COIN_META[id]!;
      return {
        id,
        symbol: meta.symbol,
        name: meta.name,
        priceUsd: stat.priceUsd,
        change24h: stat.change24h,
        change7d: null,
        volume24h: stat.volume24h,
        marketCap: stat.marketCap,
        sparkline7d: [],
        source: "static" as const,
        fetchedAt,
        marketCapRank: idx + 1,
        // BUG FIX 2026-05-03 - oubli de la ligne 533 lors du 1er bug fix
        // logos. CoinCap CDN 404 sur coins exotiques + retour string vide
        // laisse CryptoLogo composant faire son lookup intelligent
        // (lib/crypto-logos.ts CoinGecko CDN cache hardcode pour top 100).
        image: "",
      };
    });
}

export const getTopMarket = unstable_cache(
  _getTopMarket,
  ["price-source-top-market-v2"],
  { revalidate: 600, tags: ["price-source"] },
);

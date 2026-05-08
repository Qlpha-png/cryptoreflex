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
import { COINGECKO_TO_BINANCE } from "@/lib/binance-mapping";
import { getKv } from "@/lib/kv";
import { getCryptoComparePriceByCoingeckoId } from "@/lib/cryptocompare";
import { getKrakenPrice } from "@/lib/kraken";
import { getCoinbasePrice } from "@/lib/coinbase";

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
  | "cryptocompare"
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
/*  Source #1 — Binance public REST (gratuit illimite)                        */
/* -------------------------------------------------------------------------- */

const BINANCE_BASE = "https://api.binance.com/api/v3";

interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  openPrice: string;
}

/**
 * Fetch ticker 24h pour une paire Binance (ex: BTCUSDT).
 * Retourne null si pair pas listee ou erreur.
 */
async function _binanceTicker(binanceSymbol: string): Promise<BinanceTicker24h | null> {
  try {
    // FIX P0 2026-05-06 — timeout 4s (Binance API très rapide normalement).
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${binanceSymbol}`, {
      next: { revalidate: 300 }, // 5 min
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as BinanceTicker24h;
  } catch {
    return null;
  }
}

/**
 * Fetch klines (OHLC) Binance pour construire un sparkline 7d.
 * 168 points horaires = 7 jours.
 */
async function _binanceKlines(binanceSymbol: string): Promise<number[]> {
  try {
    // 1h interval × 168 candles = 7 jours
    // FIX P0 2026-05-06 — timeout 5s (klines = 168 points = ~10KB, devrait être rapide).
    const res = await fetch(
      `${BINANCE_BASE}/klines?symbol=${binanceSymbol}&interval=1h&limit=168`,
      {
        next: { revalidate: 1800 }, // 30 min (sparkline change peu en 30min)
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as Array<[number, string, string, string, string, ...unknown[]]>;
    // Index 4 = close price
    return json.map((k) => parseFloat(k[4]));
  } catch {
    return [];
  }
}

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

interface CoingeckoSimplePrice {
  usd?: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
}

/**
 * Fetch un seul coin via /simple/price (1 hop, ~50 KB par batch). On garde
 * la signature `_coincapAsset → CoinCapAsset | null` pour minimiser le diff
 * dans la cascade en aval.
 */
async function _coincapAsset(coingeckoId: string): Promise<CoinCapAsset | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
    const res = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, CoingeckoSimplePrice | undefined>;
    const entry = data[coingeckoId];
    if (!entry || typeof entry.usd !== "number" || entry.usd <= 0) return null;
    const meta = COIN_META[coingeckoId] ?? {
      symbol: coingeckoId.toUpperCase().slice(0, 6),
      name: coingeckoId.charAt(0).toUpperCase() + coingeckoId.slice(1),
    };
    // Adaptation au shape CoinCapAsset pour ne rien casser en aval. Les
    // champs absents (rank, supply) sont reutilises du fallback statique
    // ou laisses vides — non critiques pour l'affichage prix/change/cap.
    return {
      id: coingeckoId,
      rank: "0",
      symbol: meta.symbol,
      name: meta.name,
      supply: "0",
      marketCapUsd: String(entry.usd_market_cap ?? 0),
      volumeUsd24Hr: String(entry.usd_24h_vol ?? 0),
      priceUsd: String(entry.usd),
      changePercent24Hr: String(entry.usd_24h_change ?? 0),
    };
  } catch {
    return null;
  }
}

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
  const meta = COIN_META[coingeckoId] ?? {
    symbol: coingeckoId.toUpperCase().slice(0, 6),
    name: coingeckoId.charAt(0).toUpperCase() + coingeckoId.slice(1),
  };
  const fetchedAt = new Date().toISOString();

  // Source #1 : Binance (couvre 90% du top 100)
  // FIX 2026-05-08 — BUG LATENT : COINGECKO_TO_BINANCE retourne deja la paire
  // complete (ex: "BTCUSDT"), pas le symbole nu. L'ancien code faisait
  // `${binanceSymbol}USDT` => "BTCUSDTUSDT" qui n'existe pas → ticker null
  // → fallback CoinCap (mort) → CoinGecko (rate-limit) → static fallback
  // (BTC=78500 fige). Confirme via /api/diag-prices : Binance 200 OK depuis
  // Hetzner, mais notre lib ne tombait jamais sur les valeurs reelles.
  const binanceSymbol = COINGECKO_TO_BINANCE[coingeckoId];
  if (binanceSymbol) {
    const pair = binanceSymbol; // deja format complet "BTCUSDT"
    const ticker = await _binanceTicker(pair);
    if (ticker && parseFloat(ticker.lastPrice) > 0) {
      const sparkline = await _binanceKlines(pair);
      const priceUsd = parseFloat(ticker.lastPrice);
      // Binance ne donne pas le market cap. On estime via static fallback
      // supply (les supplies sont quasi-stables). Mieux que 0.
      const fallbackMarketCap = STATIC_FALLBACK[coingeckoId]?.marketCap ?? 0;
      const supply = fallbackMarketCap > 0 ? fallbackMarketCap / (STATIC_FALLBACK[coingeckoId]?.priceUsd ?? priceUsd) : 0;
      const marketCap = supply > 0 ? supply * priceUsd : 0;
      return {
        id: coingeckoId,
        symbol: meta.symbol,
        name: meta.name,
        priceUsd,
        change24h: parseFloat(ticker.priceChangePercent),
        change7d: _calcChange7d(sparkline),
        volume24h: parseFloat(ticker.quoteVolume),
        marketCap,
        sparkline7d: sparkline,
        source: "binance",
        fetchedAt,
      };
    }
  }

  // ========================================================================
  // FIX 2026-05-08 (Niveau C Multi-Source) — cascade resiliente sans
  // dependance unique. Audit complet via .lh-audits :
  //   Binance       38/100 (Hetzner DE peut etre rate-limited 429)
  //   Kraken        93/100 (gratuit, no key, EU-friendly, fiable)
  //   Coinbase      79/100 (gratuit, no key, US/UE)
  //   CryptoCompare 99/100 mais REQUIRES API KEY desormais — degrade
  // Strategie : 1ere source qui repond avec prix > 0 = wins.
  // ========================================================================

  // Source #2 : Kraken (couvre 93/100, gratuit illimite)
  const krakenPrice = await getKrakenPrice(coingeckoId, meta.symbol);
  if (krakenPrice && krakenPrice.priceUsd > 0) {
    const fallbackMarketCap = STATIC_FALLBACK[coingeckoId]?.marketCap ?? 0;
    const supply =
      fallbackMarketCap > 0
        ? fallbackMarketCap / (STATIC_FALLBACK[coingeckoId]?.priceUsd ?? krakenPrice.priceUsd)
        : 0;
    const marketCap = supply > 0 ? supply * krakenPrice.priceUsd : 0;
    return {
      id: coingeckoId,
      symbol: meta.symbol,
      name: meta.name,
      priceUsd: krakenPrice.priceUsd,
      change24h: krakenPrice.change24h,
      change7d: null,
      volume24h: krakenPrice.volume24h,
      marketCap,
      sparkline7d: [],
      source: "kraken",
      fetchedAt,
    };
  }

  // Source #3 : Coinbase (couvre 79/100, gratuit illimite)
  const coinbasePrice = await getCoinbasePrice(meta.symbol);
  if (coinbasePrice && coinbasePrice.priceUsd > 0) {
    const fallbackMarketCap = STATIC_FALLBACK[coingeckoId]?.marketCap ?? 0;
    const supply =
      fallbackMarketCap > 0
        ? fallbackMarketCap /
          (STATIC_FALLBACK[coingeckoId]?.priceUsd ?? coinbasePrice.priceUsd)
        : 0;
    const marketCap = supply > 0 ? supply * coinbasePrice.priceUsd : 0;
    return {
      id: coingeckoId,
      symbol: meta.symbol,
      name: meta.name,
      priceUsd: coinbasePrice.priceUsd,
      change24h: coinbasePrice.change24h,
      change7d: null,
      volume24h: coinbasePrice.volume24h,
      marketCap,
      sparkline7d: [],
      source: "coinbase",
      fetchedAt,
    };
  }

  // Source #4 : CryptoCompare (rate-limited en prod sans cle, garde si cle ajoutee)
  const ccPrice = await getCryptoComparePriceByCoingeckoId(coingeckoId);
  if (ccPrice && ccPrice.priceUsd > 0) {
    return {
      id: coingeckoId,
      symbol: meta.symbol,
      name: meta.name,
      priceUsd: ccPrice.priceUsd,
      change24h: ccPrice.change24h,
      change7d: null, // CryptoCompare /pricemultifull n'expose pas 7d direct
      volume24h: ccPrice.volume24h,
      marketCap: ccPrice.marketCap,
      sparkline7d: [],
      source: "cryptocompare",
      fetchedAt,
    };
  }

  // Source #2.5 (legacy fallback) : CoinGecko via _coincapAsset (rate-limit
  // observe en prod 2026-05-08). Reste comme filet entre CryptoCompare et
  // static — utile si CryptoCompare a un downtime exceptionnel.
  const cc = await _coincapAsset(coingeckoId);
  if (cc && parseFloat(cc.priceUsd) > 0) {
    return {
      id: coingeckoId,
      symbol: cc.symbol.toUpperCase(),
      name: cc.name,
      priceUsd: parseFloat(cc.priceUsd),
      change24h: parseFloat(cc.changePercent24Hr),
      change7d: null,
      volume24h: parseFloat(cc.volumeUsd24Hr),
      marketCap: parseFloat(cc.marketCapUsd),
      sparkline7d: [],
      source: "coincap",
      fetchedAt,
    };
  }

  // Source #3 : Static fallback — KV snapshot frais (cron 5min) prioritaire
  // sur le hardcode. Si le cron n'a pas tourne / KV mocked, fallback hardcode.
  // BATCH 53 #5 — auto-update via /api/cron/update-static-prices.
  const kvSnapshot = await _readKvSnapshot();
  const kvEntry = kvSnapshot?.[coingeckoId];
  const stat = kvEntry ?? STATIC_FALLBACK[coingeckoId];
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
    fetchedAt,
  };
}

/**
 * Wrappe avec unstable_cache Next pour deduplication request memoization +
 * cache cross-requete 5 minutes. Reduce les calls Binance/CoinCap.
 */
export const getPriceSnapshot = unstable_cache(
  _getPriceSnapshot,
  // FIX 2026-05-08 — v5 : nouveau Niveau C Multi-Source (Kraken + Coinbase
  // ajoutees comme sources #2 + #3 dominantes, CryptoCompare relegue #4).
  // Bump v4 -> v5 force regeneration immediate de tous les snapshots.
  ["price-source-snapshot-v5"],
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

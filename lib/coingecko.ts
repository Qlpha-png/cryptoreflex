import { unstable_cache } from "next/cache";

export type CoinId = "bitcoin" | "ethereum" | "solana" | "binancecoin" | "ripple" | "cardano";

/**
 * Type permissif pour les coingeckoId au-delà du top 6 (utilisé pour TA_CRYPTOS,
 * analyses techniques, market table top 50, etc.). Audit 26/04/2026 : extension
 * du catalogue à 50 cryptos sans toucher au typage strict de fetchPrices().
 *
 * Format : kebab-case lowercase, identique à `id` dans CoinGecko API
 * (ex: "shiba-inu", "the-open-network", "matic-network").
 */
export type CoinGeckoId = string;

/**
 * Cache tags pour revalidation ciblée via revalidateTag().
 * - "coingecko:prices"  → fetchPrices (top 6 ticker)
 * - "coingecko:market"  → fetchTopMarket (top 20 table)
 * - "coingecko:global"  → fetchGlobalMetrics (KPIs)
 *
 * Tag granulaire (proposition #12 ETUDE-2026-05-02) :
 * - `coingecko:crypto:<id>` (ex: "coingecko:crypto:bitcoin") via cgCryptoTag()
 *   → permet d'invalider UNE fiche détail sans busser tout `coingecko:market`.
 *   Émis par fetchCoinDetail() + utilisé par /api/revalidate?tag=coingecko:crypto:<id>.
 */
export const CG_TAGS = {
  prices: "coingecko:prices",
  market: "coingecko:market",
  global: "coingecko:global",
} as const;

/**
 * Construit le tag granulaire d'une fiche crypto unique pour revalidation
 * ciblée via `revalidateTag()` ou `/api/revalidate?tag=...`.
 *
 * Format : `coingecko:crypto:<coingeckoId>` (kebab-case, lowercase).
 * Exemple : `cgCryptoTag("bitcoin")` → `"coingecko:crypto:bitcoin"`.
 */
export function cgCryptoTag(coingeckoId: string): string {
  return `coingecko:crypto:${coingeckoId}`;
}

export interface CoinPrice {
  id: CoinId;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  image: string;
  /** Sparkline 7j (168 points horaires CoinGecko) — UNIQUEMENT renseigné si
      la fonction `fetchPricesWithSparkline()` est utilisée. Sinon vide. */
  sparkline7d?: number[];
}

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

/**
 * Headers à envoyer à CoinGecko :
 *  - Si COINGECKO_API_KEY est défini → on utilise le tier Demo (gratuit, 30 req/min,
 *    bien plus stable que le free tier qui rate-limit à ~5-15 req/min sans clé).
 *  - Sinon → free tier (instable avec 100 cryptos en parallèle).
 *
 * Documentation : https://docs.coingecko.com/reference/setting-up-your-api-key
 */
export function cgHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  const key = process.env.COINGECKO_API_KEY;
  if (key) headers["x-cg-demo-api-key"] = key;
  return headers;
}

/**
 * Wrapper fetch avec retry exponentiel sur 429 (rate-limit).
 * Évite de cacher des null après un seul échec rate-limit.
 *
 * Stratégie : 1 retry après 1.5s, puis 1 retry après 4s, puis abandon.
 * Total max 5.5s — acceptable pour un Server Component qui SSR la page.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit & { next?: { revalidate?: number; tags?: string[] } },
  maxRetries = 2,
): Promise<Response> {
  const delays = [1500, 4000];
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    if (res.status !== 429 && res.status !== 503) return res; // non-recoverable
    lastResponse = res;
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, delays[attempt] ?? 4000));
    }
  }
  return lastResponse ?? new Response(null, { status: 599 });
}

const COIN_META: Record<CoinId, { symbol: string; name: string }> = {
  bitcoin: { symbol: "BTC", name: "Bitcoin" },
  ethereum: { symbol: "ETH", name: "Ethereum" },
  solana: { symbol: "SOL", name: "Solana" },
  binancecoin: { symbol: "BNB", name: "BNB" },
  ripple: { symbol: "XRP", name: "XRP" },
  cardano: { symbol: "ADA", name: "Cardano" },
};

export const DEFAULT_COINS: CoinId[] = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "cardano",
];

/**
 * Implementation interne de fetchPrices — wrappée par unstable_cache plus bas.
 */
async function _fetchPrices(ids: CoinId[]): Promise<CoinPrice[]> {
  // BATCH 51 (2026-05-03) URGENT — Migration CoinGecko -> aggregator
  // maison (Binance + CoinCap + static). User feedback : "fais ce que
  // fais coingecko pour nous meme tout simplement". On essaie d'abord
  // notre price-source.ts (gratuit illimite). Fallback CoinGecko apres.
  try {
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const snapshots = await Promise.all(ids.map((id) => getPriceSnapshot(id)));
    // BUG FIX 2026-05-03 — accept ALL snapshots avec priceUsd>0 (y compris
    // static fallback). Avant on tombait sur CoinGecko (epuise) si un seul
    // snapshot etait static -> tout revient en null/vide. Maintenant on
    // se contente du dataset static plutot qu'un null.
    const allWithPrice = snapshots.every((s) => s.priceUsd > 0);
    if (allWithPrice) {
      return snapshots.map((s) => ({
        id: s.id as CoinId,
        symbol: s.symbol,
        name: s.name,
        price: s.priceUsd,
        change24h: s.change24h,
        marketCap: s.marketCap,
        // BUG FIX 2026-05-03 — image vide car CryptoLogo composant fait
        // un lookup intelligent via lib/crypto-logos.ts (CoinGecko CDN
        // cache hardcode + fallback initiales). URL CoinCap CDN 404 sur
        // les coins exotiques = broken image icon visible.
        image: "",
      }));
    }
    // Sinon, on tente CoinGecko en fallback (peut succeeder pour les coins
    // que Binance n'a pas et que CoinCap a mal).
  } catch {
    // price-source unavailable → fallback CoinGecko ci-dessous
  }

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(
    ","
  )}&order=market_cap_desc&per_page=${ids.length}&page=1&sparkline=false&price_change_percentage=24h`;

  try {
    const res = await fetch(url, {
      // Cache long (free plan epuise) — n'est plus la source primaire
      next: { revalidate: 300, tags: [CG_TAGS.prices] },
      headers: cgHeaders(),
    });

    if (!res.ok) {
      throw new Error(`CoinGecko responded ${res.status}`);
    }

    const json = (await res.json()) as Array<{
      id: CoinId;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
      market_cap: number;
      image: string;
    }>;

    return json.map((c) => ({
      id: c.id,
      symbol: (COIN_META[c.id]?.symbol ?? c.symbol).toUpperCase(),
      name: COIN_META[c.id]?.name ?? c.name,
      price: c.current_price,
      change24h: c.price_change_percentage_24h ?? 0,
      marketCap: c.market_cap,
      image: c.image,
    }));
  } catch {
    // Graceful fallback so the site still renders if the API is rate-limited.
    return ids.map((id) => ({
      id,
      symbol: COIN_META[id].symbol,
      name: COIN_META[id].name,
      price: 0,
      change24h: 0,
      marketCap: 0,
      image: "",
    }));
  }
}

/**
 * Fetch live prices from CoinGecko, dédupliquées via unstable_cache
 * (Data Cache + Request Memoization). Sur Vercel, plusieurs composants
 * de la même requête partagent un seul appel ; entre requêtes, le cache
 * dure 60 s. Revalidation ciblée : `revalidateTag("coingecko:prices")`.
 */
export const fetchPrices = unstable_cache(
  async (ids: CoinId[] = DEFAULT_COINS) => _fetchPrices(ids),
  ["coingecko-prices-v1"],
  // BATCH 50 — 60s -> 300s (5 min). Cohence avec le revalidate fetch interne.
  { revalidate: 300, tags: [CG_TAGS.prices] }
);

/**
 * Variante de `_fetchPrices` qui inclut sparkline7d (168 points horaires).
 * Cache key séparée pour ne pas polluer le cache "light" — surcoût payload
 * ~1 KB/coin, mais permet d'afficher des sparklines live dans les vues
 * Portfolio / Watchlist sans charger un endpoint séparé.
 *
 * Acceptee aussi des coingeckoId hors top 6 (string permissive) pour
 * couvrir le cas Portfolio / Watchlist multi-cryptos.
 */
async function _fetchPricesWithSparkline(
  ids: string[]
): Promise<CoinPrice[]> {
  // BATCH 53 #3 — Migration vers price-source aggregator. Le sparkline 7d
  // est genere par Binance klines 1h × 168 (deja code dans _binanceKlines).
  // Avantage : 0 cout CoinGecko sur Portfolio/Watchlist, sparklines fresh
  // sans rate limit.
  try {
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const snapshots = await Promise.all(ids.map((id) => getPriceSnapshot(id)));
    const allWithPrice = snapshots.every((s) => s.priceUsd > 0);
    if (allWithPrice) {
      return snapshots.map((s) => ({
        id: s.id as CoinId,
        symbol: s.symbol,
        name: s.name,
        price: s.priceUsd,
        change24h: s.change24h,
        marketCap: s.marketCap,
        image: "",
        sparkline7d: s.sparkline7d, // 168 pts via Binance klines (vide si static)
      }));
    }
  } catch {
    // Aggregator KO -> fallback CoinGecko ci-dessous
  }

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(
    ","
  )}&order=market_cap_desc&per_page=${ids.length}&page=1&sparkline=true&price_change_percentage=24h`;
  try {
    const res = await fetchWithRetry(url, {
      // Cache long (free plan epuise) — fallback ultime
      next: { revalidate: 600, tags: [CG_TAGS.prices] },
      headers: cgHeaders(),
    });
    if (!res.ok) throw new Error(`CoinGecko prices+spk ${res.status}`);
    const json = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
      market_cap: number;
      image: string;
      sparkline_in_7d: { price: number[] };
    }>;
    return json.map((c) => ({
      id: c.id as CoinId,
      symbol: (COIN_META[c.id as CoinId]?.symbol ?? c.symbol).toUpperCase(),
      name: COIN_META[c.id as CoinId]?.name ?? c.name,
      price: c.current_price,
      change24h: c.price_change_percentage_24h ?? 0,
      marketCap: c.market_cap,
      image: c.image,
      sparkline7d: c.sparkline_in_7d?.price ?? [],
    }));
  } catch {
    // Graceful : retourne des entries vides plutôt que crasher
    return ids.map((id) => ({
      id: id as CoinId,
      symbol: COIN_META[id as CoinId]?.symbol ?? id.toUpperCase(),
      name: COIN_META[id as CoinId]?.name ?? id,
      price: 0,
      change24h: 0,
      marketCap: 0,
      image: "",
      sparkline7d: [],
    }));
  }
}

export const fetchPricesWithSparkline = unstable_cache(
  async (ids: string[]) => _fetchPricesWithSparkline(ids),
  ["coingecko-prices-sparkline-v1"],
  // BATCH 50 — 60s -> 600s (10 min)
  { revalidate: 600, tags: [CG_TAGS.prices] }
);

export function formatUsd(value: number): string {
  if (!value) return "—";
  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/* ============================================================
 * Métriques globales du marché crypto (style CoinMarketCap)
 * ============================================================ */

export interface GlobalMetrics {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptos: number;
}

async function _fetchGlobalMetrics(): Promise<GlobalMetrics | null> {
  // BATCH 51 — Migration : on derive les metriques globales depuis le top
  // 200 CoinCap (gratuit illimite) au lieu de CoinGecko /global. Total
  // market cap = somme des market caps. BTC dominance = btc.marketCap /
  // total. Approximation : le top 200 represente >97% de la capitalisation
  // totale (longue queue negligeable). Fallback CoinGecko ci-dessous.
  try {
    const { getTopMarket } = await import("@/lib/price-source");
    const top200 = await getTopMarket(200);
    if (top200.length >= 50) {
      const totalMarketCap = top200.reduce((sum, c) => sum + (c.marketCap || 0), 0);
      const totalVolume = top200.reduce((sum, c) => sum + (c.volume24h || 0), 0);
      const btc = top200.find((c) => c.symbol === "BTC");
      const eth = top200.find((c) => c.symbol === "ETH");
      // change24h pondere = somme(change × marketCap) / totalMarketCap
      const weightedChange =
        totalMarketCap > 0
          ? top200.reduce((sum, c) => sum + (c.change24h || 0) * (c.marketCap || 0), 0) / totalMarketCap
          : 0;
      return {
        totalMarketCapUsd: totalMarketCap,
        totalVolume24hUsd: totalVolume,
        btcDominance: btc && totalMarketCap > 0 ? (btc.marketCap / totalMarketCap) * 100 : 0,
        ethDominance: eth && totalMarketCap > 0 ? (eth.marketCap / totalMarketCap) * 100 : 0,
        marketCapChange24h: weightedChange,
        activeCryptos: top200.length, // approximation — on a 1500+ via CoinCap mais on tronque
      };
    }
  } catch {
    // Fallback CoinGecko
  }

  try {
    const res = await fetch(`${COINGECKO_BASE}/global`, {
      next: { revalidate: 1800, tags: [CG_TAGS.global] },
      headers: cgHeaders(),
    });
    if (!res.ok) throw new Error(`CoinGecko global ${res.status}`);
    const json = await res.json();
    const d = json.data;
    return {
      totalMarketCapUsd: d.total_market_cap.usd,
      totalVolume24hUsd: d.total_volume.usd,
      btcDominance: d.market_cap_percentage.btc,
      ethDominance: d.market_cap_percentage.eth,
      marketCapChange24h: d.market_cap_change_percentage_24h_usd,
      activeCryptos: d.active_cryptocurrencies,
    };
  } catch {
    return null;
  }
}

export const fetchGlobalMetrics = unstable_cache(
  _fetchGlobalMetrics,
  ["coingecko-global-v1"],
  // BATCH 50 — 300s -> 1800s (30 min)
  { revalidate: 1800, tags: [CG_TAGS.global] }
);

export interface FearGreedData {
  value: number; // 0-100
  classification: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: string;
  /**
   * BATCH 29C — delta vs hier. Permet d'afficher "+3 vs hier" comme signal
   * de momentum. Null si la valeur d'hier est indisponible.
   */
  deltaVsYesterday?: number | null;
}

const FEAR_GREED_FR: Record<string, string> = {
  "Extreme Fear": "Peur extrême",
  Fear: "Peur",
  Neutral: "Neutre",
  Greed: "Cupidité",
  "Extreme Greed": "Cupidité extrême",
};

export async function fetchFearGreed(): Promise<FearGreedData | null> {
  try {
    // BATCH 29C — fetch limit=2 pour récupérer aujourd'hui + hier en 1 call.
    // Permet d'afficher le delta sentiment sans coût supplémentaire.
    const res = await fetch("https://api.alternative.me/fng/?limit=2", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const today = json?.data?.[0];
    const yesterday = json?.data?.[1];
    if (!today) return null;
    const todayValue = parseInt(today.value, 10);
    const yesterdayValue = yesterday ? parseInt(yesterday.value, 10) : null;
    return {
      value: todayValue,
      classification: FEAR_GREED_FR[today.value_classification] || today.value_classification,
      timestamp: new Date(parseInt(today.timestamp, 10) * 1000).toISOString(),
      deltaVsYesterday:
        yesterdayValue !== null && Number.isFinite(yesterdayValue)
          ? todayValue - yesterdayValue
          : null,
    };
  } catch {
    return null;
  }
}

/* ============================================================
 * Top N cryptos par market cap (pour MarketTable)
 * ============================================================ */

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  priceChange1h: number | null;
  priceChange24h: number;
  priceChange7d: number | null;
  sparkline7d: number[];
  circulatingSupply: number;
  ath: number;
}

async function _fetchTopMarket(limit: number): Promise<MarketCoin[]> {
  // BATCH 51 — Migration aggregator maison. CoinCap retourne deja le top
  // par market cap, on l'utilise en priorite. Fallback CoinGecko si vide.
  try {
    const { getTopMarket } = await import("@/lib/price-source");
    const top = await getTopMarket(limit);
    if (top.length >= Math.min(limit, 10)) {
      // CoinCap n'expose pas sparkline 7d ni change 1h. On enrichit
      // optionnellement avec Binance klines (en parallele, best-effort).
      const { getPriceSnapshot } = await import("@/lib/price-source");
      const enriched = await Promise.all(
        top.map(async (c) => {
          const snap = await getPriceSnapshot(c.id).catch(() => null);
          return {
            id: c.id,
            symbol: c.symbol,
            name: c.name,
            image: c.image,
            currentPrice: c.priceUsd,
            marketCap: c.marketCap,
            marketCapRank: c.marketCapRank,
            totalVolume: c.volume24h,
            priceChange1h: null, // pas dispo via price-source pour l'instant
            priceChange24h: c.change24h,
            priceChange7d: snap?.change7d ?? null,
            sparkline7d: snap?.sparkline7d ?? [],
            circulatingSupply: c.marketCap > 0 && c.priceUsd > 0 ? c.marketCap / c.priceUsd : 0,
            ath: 0, // approximation : nous n'avons pas l'ATH historique
          };
        }),
      );
      return enriched;
    }
  } catch {
    // price-source unavailable, fallback CoinGecko
  }

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
  try {
    const res = await fetch(url, {
      // Fallback ultime CoinGecko — cache long (free plan epuise)
      next: { revalidate: 600, tags: [CG_TAGS.market] },
      headers: cgHeaders(),
    });
    if (!res.ok) throw new Error(`CoinGecko markets ${res.status}`);
    const json = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      current_price: number;
      market_cap: number;
      market_cap_rank: number;
      total_volume: number;
      price_change_percentage_1h_in_currency: number | null;
      price_change_percentage_24h_in_currency: number;
      price_change_percentage_7d_in_currency: number | null;
      sparkline_in_7d: { price: number[] };
      circulating_supply: number;
      ath: number;
    }>;
    return json.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      currentPrice: c.current_price,
      marketCap: c.market_cap,
      marketCapRank: c.market_cap_rank,
      totalVolume: c.total_volume,
      priceChange1h: c.price_change_percentage_1h_in_currency,
      priceChange24h: c.price_change_percentage_24h_in_currency,
      priceChange7d: c.price_change_percentage_7d_in_currency,
      sparkline7d: c.sparkline_in_7d?.price ?? [],
      circulatingSupply: c.circulating_supply,
      ath: c.ath,
    }));
  } catch {
    return [];
  }
}

/**
 * BATCH 29 — fix bug "widget LIVE vide" (user feedback "rien de dynamique").
 * Avant : `_fetchTopMarket` retournait `[]` en cas d'échec → mis en cache 120s
 * → 2 min de hero LIVE vide pour tous les visiteurs. Désastre UX.
 *
 * Après : si la fonction retourne un array vide (échec ou rate-limit), on
 * NE CACHE PAS et on retente au prochain hit. Le hero affiche un fallback
 * statique en attendant (cf. STATIC_TOP_MARKET_FALLBACK).
 */
const _cachedFetchTopMarket = unstable_cache(
  async (limit = 20) => _fetchTopMarket(limit),
  ["coingecko-top-market-v2"],
  // BATCH 50 — 120s -> 600s (10 min). Reduction x5 consumption.
  { revalidate: 600, tags: [CG_TAGS.market] }
);

export async function fetchTopMarket(limit = 20): Promise<MarketCoin[]> {
  const cached = await _cachedFetchTopMarket(limit);
  if (cached.length > 0) return cached;
  // Cache miss + API failure → bypass the cache by returning the static
  // fallback. Le wrapper SSR Hero détectera `length === 0` (technique :
  // notre fallback a length > 0 donc on couvre).
  return STATIC_TOP_MARKET_FALLBACK.slice(0, limit);
}

/**
 * Snapshot statique des top 6 cryptos (BTC/ETH/USDT/BNB/SOL/XRP) — utilisé
 * uniquement quand CoinGecko est down ou rate-limited. Les prix sont des
 * estimations marché 2026 ; c'est un FILET DE SÉCURITÉ pour ne JAMAIS
 * afficher de hero vide. Le client SSE écrase tout de suite avec du live.
 *
 * Mis à jour manuellement chaque trimestre. Si on doit retoucher en urgence :
 * c'est juste un fallback visuel, l'erreur sous-jacente (rate-limit, API down)
 * doit être tracée par les logs.
 */
const STATIC_TOP_MARKET_FALLBACK: MarketCoin[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    currentPrice: 95000,
    marketCap: 1900000000000,
    marketCapRank: 1,
    totalVolume: 50000000000,
    priceChange1h: 0.1,
    priceChange24h: 0.5,
    priceChange7d: 2.3,
    sparkline7d: [],
    circulatingSupply: 19800000,
    ath: 108786,
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    currentPrice: 2300,
    marketCap: 280000000000,
    marketCapRank: 2,
    totalVolume: 25000000000,
    priceChange1h: 0.2,
    priceChange24h: 0.8,
    priceChange7d: 3.1,
    sparkline7d: [],
    circulatingSupply: 121000000,
    ath: 4878,
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    image: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    currentPrice: 1.0,
    marketCap: 140000000000,
    marketCapRank: 3,
    totalVolume: 60000000000,
    priceChange1h: 0,
    priceChange24h: 0.01,
    priceChange7d: -0.02,
    sparkline7d: [],
    circulatingSupply: 140000000000,
    ath: 1.32,
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    currentPrice: 620,
    marketCap: 90000000000,
    marketCapRank: 4,
    totalVolume: 1500000000,
    priceChange1h: 0.05,
    priceChange24h: 0.4,
    priceChange7d: 1.8,
    sparkline7d: [],
    circulatingSupply: 145000000,
    ath: 788,
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    currentPrice: 200,
    marketCap: 95000000000,
    marketCapRank: 5,
    totalVolume: 3000000000,
    priceChange1h: 0.3,
    priceChange24h: 1.2,
    priceChange7d: 4.5,
    sparkline7d: [],
    circulatingSupply: 470000000,
    ath: 295,
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    currentPrice: 1.4,
    marketCap: 80000000000,
    marketCapRank: 6,
    totalVolume: 2000000000,
    priceChange1h: 0.1,
    priceChange24h: 0.6,
    priceChange7d: 2.9,
    sparkline7d: [],
    circulatingSupply: 57000000000,
    ath: 3.84,
  },
];

export function formatCompactUsd(value: number): string {
  if (!value) return "—";
  // Audit Block 1 26/04/2026 (Agent copy + GlobalMetricsBar) : audience FR,
  // donc formatage FR ("3,2 Bn $" au lieu de "$3.2T") + virgule décimale.
  // Le suffixe Bn (milliards) est plus parlant que T (trillion en US).
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/* ============================================================
 * Détail d'une coin (pour pages /cryptos/[slug])
 * ============================================================ */

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number | null;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number;
  athDate: string | null;
  atl: number;
  atlDate: string | null;
  sparkline7d: number[];
}

async function _fetchCoinDetail(coingeckoId: string): Promise<CoinDetail | null> {
  // BATCH 51 — Migration price-source pour les 100 fiches /cryptos/[slug].
  // Avant : appel CoinGecko coins/markets pour CHAQUE fiche = 100+ calls
  // par jour minimum. Maintenant : Binance ticker + klines (gratuit
  // illimite). Fallback CoinGecko uniquement pour les coins absents
  // de Binance (rare pour le top 100 traite par notre site).
  try {
    const { getPriceSnapshot } = await import("@/lib/price-source");
    const snap = await getPriceSnapshot(coingeckoId);
    // BUG FIX 2026-05-03 audit live — accept TOUTE source avec priceUsd>0,
    // y compris static fallback. Avant : on skippait static et tombait sur
    // CoinGecko (epuise) -> "—" affiche sur la fiche. Le static fallback
    // contient des prix recents (snapshot manuel top 10), bien meilleur
    // qu'un null. Si CoinGecko aussi vide -> seulement la on retourne null.
    if (snap.priceUsd > 0) {
      return {
        id: snap.id,
        symbol: snap.symbol,
        name: snap.name,
        // BUG FIX 2026-05-03 — image vide (CryptoLogo lookup local)
        image: "",
        currentPrice: snap.priceUsd,
        priceChange24h: snap.change24h,
        priceChange7d: snap.change7d,
        marketCap: snap.marketCap,
        marketCapRank: 0, // approximation — non critique sur fiche detail
        totalVolume: snap.volume24h,
        circulatingSupply: snap.marketCap > 0 && snap.priceUsd > 0 ? snap.marketCap / snap.priceUsd : 0,
        totalSupply: null,
        maxSupply: null,
        ath: 0,
        athDate: null,
        atl: 0,
        atlDate: null,
        sparkline7d: snap.sparkline7d,
      };
    }
    // Sinon (source=static = Binance + CoinCap ont fail), on tente
    // CoinGecko en fallback ultime.
  } catch {
    // Aggregator indisponible, fallback CoinGecko
  }

  // Endpoint /coins/markets en single-id : permet d'obtenir sparkline 7d + variations
  // sans payer le coût d'/coins/{id}/market_chart (10 000 datapoints).
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${coingeckoId}&order=market_cap_desc&per_page=1&page=1&sparkline=true&price_change_percentage=24h,7d`;
  try {
    // Fix bug 2026-05-01 user feedback : "toutes les cryptos affichent —"
    // Cause : free tier CoinGecko (5-15 req/min) hit rate-limit avec 100 cryptos
    // → fetch retournait null, mis en cache 5 min, page cassée 5 min.
    // Solution : retry exponentiel sur 429 + headers x-cg-demo-api-key si défini
    // + bypass cache du `null` (cf. wrapper fetchCoinDetail plus bas).
    const res = await fetchWithRetry(url, {
      // BATCH 50 — 300s -> 1800s (30 min). Avec 100 fiches /cryptos/[slug]
      // sur free plan = consumption insoutenable. 30min reste acceptable
      // pour des donnees enrichies (ATH, supply) qui bougent rarement.
      next: { revalidate: 1800, tags: [cgCryptoTag(coingeckoId), CG_TAGS.market] },
      headers: cgHeaders(),
    });
    if (!res.ok) {
      console.warn(`[coingecko] fetchCoinDetail ${coingeckoId} → ${res.status} (after retry)`);
      throw new Error(`CoinGecko detail ${res.status}`);
    }
    const json = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      current_price: number;
      price_change_percentage_24h: number;
      price_change_percentage_7d_in_currency: number | null;
      market_cap: number;
      market_cap_rank: number;
      total_volume: number;
      circulating_supply: number;
      total_supply: number | null;
      max_supply: number | null;
      ath: number;
      ath_date: string | null;
      atl: number;
      atl_date: string | null;
      sparkline_in_7d: { price: number[] };
    }>;
    const c = json?.[0];
    if (!c) return null;
    return {
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      currentPrice: c.current_price,
      priceChange24h: c.price_change_percentage_24h ?? 0,
      priceChange7d: c.price_change_percentage_7d_in_currency,
      marketCap: c.market_cap,
      marketCapRank: c.market_cap_rank,
      totalVolume: c.total_volume,
      circulatingSupply: c.circulating_supply,
      totalSupply: c.total_supply,
      maxSupply: c.max_supply,
      ath: c.ath,
      athDate: c.ath_date,
      atl: c.atl,
      atlDate: c.atl_date,
      sparkline7d: c.sparkline_in_7d?.price ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Détail enrichi d'une crypto (prix, sparkline 7j, supply, ATH/ATL).
 *
 * Cache stratégie 2-tiers (fix bug "toutes cryptos affichent —" 2026-05-01) :
 *  - Si data valide → cache 5 min (revalidate via tags si on touche au contenu)
 *  - Si null (rate-limit ou erreur API) → on NE CACHE PAS et on re-tente à
 *    chaque requête. Le retry exponentiel dans `_fetchCoinDetail` aura déjà
 *    fait 2 tentatives ; si toujours null, on accepte le coût d'un re-fetch
 *    plutôt que de bloquer 100 fiches pendant 5 min.
 *
 * Implémentation : on enveloppe le résultat caché dans un signal de version.
 * Si version=null on bypass le cache au prochain appel.
 *
 * Tag granulaire (#12 ETUDE-2026-05-02) : on attache un tag par-id
 * `coingecko:crypto:<id>` au wrapper `unstable_cache` ET au `fetch()` interne
 * pour que `revalidateTag("coingecko:crypto:bitcoin")` invalide les deux
 * couches d'un coup. La key cache reste partagée (clé `coingeckoId` en arg)
 * mais on fabrique un wrapper-par-id à la volée pour pouvoir injecter le tag
 * granulaire dans `unstable_cache.tags` (qui est statique par déclaration).
 */
const _coinDetailCacheRegistry = new Map<
  string,
  (id: string) => Promise<CoinDetail>
>();

function getCachedCoinDetailFn(
  coingeckoId: string,
): (id: string) => Promise<CoinDetail> {
  const existing = _coinDetailCacheRegistry.get(coingeckoId);
  if (existing) return existing;
  const fn = unstable_cache(
    async (id: string) => {
      const result = await _fetchCoinDetail(id);
      // Si null, on lève pour forcer Next à NE PAS cacher (un throw dans
      // unstable_cache propage l'erreur et invalide le cache pour cet appel).
      if (!result) {
        throw new Error("CG_FETCH_RETURNED_NULL");
      }
      return result;
    },
    ["coingecko-coin-detail-v2", coingeckoId],
    // BATCH 50 — 300s -> 1800s (30 min)
    { revalidate: 1800, tags: [cgCryptoTag(coingeckoId), CG_TAGS.market] },
  );
  _coinDetailCacheRegistry.set(coingeckoId, fn);
  return fn;
}

export async function fetchCoinDetail(coingeckoId: string): Promise<CoinDetail | null> {
  try {
    const cachedFn = getCachedCoinDetailFn(coingeckoId);
    return await cachedFn(coingeckoId);
  } catch (err) {
    // Fallback : un dernier appel direct sans cache, pour qu'au moins la page
    // suivante puisse essayer de re-fetch fresh. Si ça échoue aussi → null.
    if (err instanceof Error && err.message === "CG_FETCH_RETURNED_NULL") {
      return null;
    }
    return _fetchCoinDetail(coingeckoId);
  }
}

/** Format compact pour les supplies (ex: 19.7M, 120B). */
export function formatCompactNumber(value: number | null | undefined): string {
  if (!value && value !== 0) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

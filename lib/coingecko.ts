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
 */
export const CG_TAGS = {
  prices: "coingecko:prices",
  market: "coingecko:market",
  global: "coingecko:global",
} as const;

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
function cgHeaders(): Record<string, string> {
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
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(
    ","
  )}&order=market_cap_desc&per_page=${ids.length}&page=1&sparkline=false&price_change_percentage=24h`;

  try {
    const res = await fetch(url, {
      // ISR-style caching: refresh every 60s on the server.
      next: { revalidate: 60, tags: [CG_TAGS.prices] },
      headers: { accept: "application/json" },
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
  { revalidate: 60, tags: [CG_TAGS.prices] }
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
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(
    ","
  )}&order=market_cap_desc&per_page=${ids.length}&page=1&sparkline=true&price_change_percentage=24h`;
  try {
    const res = await fetchWithRetry(url, {
      next: { revalidate: 60, tags: [CG_TAGS.prices] },
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
  { revalidate: 60, tags: [CG_TAGS.prices] }
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
  try {
    const res = await fetch(`${COINGECKO_BASE}/global`, {
      next: { revalidate: 300, tags: [CG_TAGS.global] }, // 5 min
      headers: { accept: "application/json" },
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
  { revalidate: 300, tags: [CG_TAGS.global] }
);

export interface FearGreedData {
  value: number; // 0-100
  classification: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: string;
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
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const point = json?.data?.[0];
    if (!point) return null;
    return {
      value: parseInt(point.value, 10),
      classification: FEAR_GREED_FR[point.value_classification] || point.value_classification,
      timestamp: new Date(parseInt(point.timestamp, 10) * 1000).toISOString(),
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
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 120, tags: [CG_TAGS.market] },
      headers: { accept: "application/json" },
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

export const fetchTopMarket = unstable_cache(
  async (limit = 20) => _fetchTopMarket(limit),
  ["coingecko-top-market-v1"],
  { revalidate: 120, tags: [CG_TAGS.market] }
);

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
      next: { revalidate: 300, tags: [CG_TAGS.market] },
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
 */
const _cachedFetchCoinDetailNonNull = unstable_cache(
  async (coingeckoId: string) => {
    const result = await _fetchCoinDetail(coingeckoId);
    // Si null, on lève pour forcer Next à NE PAS cacher (un throw dans
    // unstable_cache propage l'erreur et invalide le cache pour cet appel).
    if (!result) {
      throw new Error("CG_FETCH_RETURNED_NULL");
    }
    return result;
  },
  ["coingecko-coin-detail-v2"],
  { revalidate: 300, tags: [CG_TAGS.market] }
);

export async function fetchCoinDetail(coingeckoId: string): Promise<CoinDetail | null> {
  try {
    return await _cachedFetchCoinDetailNonNull(coingeckoId);
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

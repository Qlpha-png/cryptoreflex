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
}

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

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
    const res = await fetch(url, {
      next: { revalidate: 300, tags: [CG_TAGS.market] },
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`CoinGecko detail ${res.status}`);
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
 * Cache 5 min côté serveur, partagé entre composants via unstable_cache.
 */
export const fetchCoinDetail = unstable_cache(
  async (coingeckoId: string) => _fetchCoinDetail(coingeckoId),
  ["coingecko-coin-detail-v1"],
  { revalidate: 300, tags: [CG_TAGS.market] }
);

/** Format compact pour les supplies (ex: 19.7M, 120B). */
export function formatCompactNumber(value: number | null | undefined): string {
  if (!value && value !== 0) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

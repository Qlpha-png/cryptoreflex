export type CoinId = "bitcoin" | "ethereum" | "solana" | "binancecoin" | "ripple" | "cardano";

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
 * Fetch live prices from CoinGecko.
 * We use the /coins/markets endpoint which returns price + 24h change + image in one call.
 */
export async function fetchPrices(ids: CoinId[] = DEFAULT_COINS): Promise<CoinPrice[]> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(
    ","
  )}&order=market_cap_desc&per_page=${ids.length}&page=1&sparkline=false&price_change_percentage=24h`;

  try {
    const res = await fetch(url, {
      // ISR-style caching: refresh every 60s on the server.
      next: { revalidate: 60 },
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
  } catch (err) {
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

export async function fetchGlobalMetrics(): Promise<GlobalMetrics | null> {
  try {
    const res = await fetch(`${COINGECKO_BASE}/global`, {
      next: { revalidate: 300 }, // 5 min — données globales bougent peu
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

export async function fetchTopMarket(limit = 20): Promise<MarketCoin[]> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 120 },
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

export function formatCompactUsd(value: number): string {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

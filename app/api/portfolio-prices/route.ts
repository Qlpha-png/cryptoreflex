/**
 * GET /api/portfolio-prices?ids=bitcoin,ethereum,...
 *
 * Renvoie les prix EUR + variation 24h pour des identifiants CoinGecko
 * arbitraires (utilisé par le tracker portefeuille).
 *
 * Différence avec /api/prices :
 *   - /api/prices : USD, ids restreints à DEFAULT_COINS, utilisé par le ticker
 *   - /api/portfolio-prices : EUR, ids libres (jusqu'à 50 par requête),
 *     utilisé par le portfolio user qui peut tracker n'importe quelle crypto
 *
 * Cache : 60 s côté Edge (CoinGecko free tier limite à 30 req/min — raisonnable).
 */

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const MAX_IDS = 50;

interface PortfolioPrice {
  id: string;
  priceEur: number;
  change24hPct: number;
  symbol?: string;
  name?: string;
  image?: string;
}

interface CoinGeckoSimple {
  [id: string]: {
    eur?: number;
    eur_24h_change?: number;
    last_updated_at?: number;
  };
}

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
}

/**
 * Fetch interne — utilise /coins/markets pour avoir image + symbol + name +
 * prix EUR + variation 24h en un seul appel. Plus lourd que /simple/price
 * mais évite un round-trip pour récupérer les meta de la coin.
 */
async function _fetchPortfolioPrices(ids: string[]): Promise<PortfolioPrice[]> {
  if (ids.length === 0) return [];

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=eur&ids=${ids.join(
    ","
  )}&order=market_cap_desc&per_page=${ids.length}&page=1&sparkline=false&price_change_percentage=24h`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 60, tags: ["coingecko:portfolio"] },
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`CoinGecko portfolio prices ${res.status}`);
    const json = (await res.json()) as CoinGeckoMarket[];
    return json.map((c) => ({
      id: c.id,
      priceEur: c.current_price ?? 0,
      change24hPct: c.price_change_percentage_24h ?? 0,
      symbol: c.symbol?.toUpperCase(),
      name: c.name,
      image: c.image,
    }));
  } catch {
    // Graceful : le portfolio reste lisible (PRU + quantité) même sans live.
    return [];
  }
}

/**
 * P0 BUG FIX (audit backend 30/04/2026) — cache pollution cross-users.
 *
 * Avant : `cachedFetch = unstable_cache(_fetchPortfolioPrices, ["portfolio-prices-eur-v1"])`
 * La cache key ÉTAIT FIXE — donc `cachedFetch(['bitcoin'])` puis
 * `cachedFetch(['ethereum'])` retournaient la MÊME entrée cachée. User A voyait
 * potentiellement les prix du portfolio de User B selon l'ordre des appels.
 *
 * Maintenant : on dérive une key déterministe à partir de l'array d'ids triés.
 * Chaque combo unique a sa propre cache entry, isolée des autres users.
 *
 * Trade-off : si chaque user a un portfolio unique, la cardinalité de la cache
 * explose et on tape CoinGecko à chaque combo nouveau. À 50+ users actifs
 * simultanés, on peut dépasser le quota free tier 30 req/min — il faudra alors
 * passer à un cache Redis/KV centralisé. Documenté pour suivi.
 */
function makeIdsKey(ids: string[]): string {
  return [...ids].sort().join(",");
}

async function fetchPortfolioPricesCached(ids: string[]): Promise<PortfolioPrice[]> {
  const key = makeIdsKey(ids);
  const cached = unstable_cache(
    () => _fetchPortfolioPrices(ids),
    ["portfolio-prices-eur-v2", key],
    { revalidate: 60, tags: ["coingecko:portfolio"] }
  );
  return cached();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") ?? "";

  // Sanitize : split, trim, dedupe, kebab-only, plafonne à MAX_IDS.
  const ids = Array.from(
    new Set(
      idsParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[a-z0-9-]+$/.test(s) && s.length > 0 && s.length < 60)
    )
  ).slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json(
      { prices: [], updatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  }

  const prices = await fetchPortfolioPricesCached(ids);

  return NextResponse.json(
    { prices, updatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}

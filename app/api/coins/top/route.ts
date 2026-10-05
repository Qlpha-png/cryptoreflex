/**
 * GET /api/coins/top?limit=100&vs=eur
 *
 * BATCH 51e (2026-05-03) — endpoint serveur qui retourne le top N
 * cryptos par market cap, base sur notre aggregator price-source
 * (Binance + CoinCap gratuit illimite).
 *
 * Avant : composants client (CryptoAutocomplete) appelaient CoinGecko
 * directement depuis le browser. Maintenant : un seul point de sortie
 * serveur, cache partage entre tous les users, fallback automatique.
 *
 * Utilise par :
 *   - components/portfolio/CryptoAutocomplete.tsx (autocomplete portefeuille)
 *   - autres composants client qui veulent une liste de cryptos rankees
 *
 * Cache : 10 min (CDN s-maxage) — top market change peu en 10min.
 */

import { NextResponse } from "next/server";
import { getTopMarket } from "@/lib/price-source";
import { fiatPerUsd } from "@/lib/fx";

/* rendue à chaque appel : la liste pleine est mise en cache par le CDN (s-maxage=600) et par getTopMarket ; une liste vide
   (source en panne) répond 503 sans cache, au lieu d'être servie 10 minutes à tout le monde (audit du 05/10/2026) */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = parseInt(searchParams.get("limit") ?? "100", 10);
  const vs = (searchParams.get("vs") ?? "eur").toLowerCase();
  const limit = Math.min(Math.max(limitRaw || 100, 10), 200);

  // Conversion fiat au taux du jour (BCE, lib/fx.ts ; avant le 05/10/2026 : taux figé de mai, euros surévalués de 3,3 %).
  const fx = await fiatPerUsd();
  const FIAT_FROM_USD: Record<string, number> = { usd: 1, eur: fx.eur, gbp: fx.gbp, chf: fx.chf };
  const rate = FIAT_FROM_USD[vs] ?? fx.eur;

  try {
    const top = await getTopMarket(limit);
    if (top.length === 0) throw new Error("top vide");
    const coins = top.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.image,
      current_price: c.priceUsd * rate,
      market_cap: c.marketCap * rate,
      market_cap_rank: c.marketCapRank,
      price_change_percentage_24h: c.change24h,
    }));
    return NextResponse.json(
      { coins, updatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { coins: [], updatedAt: new Date().toISOString(), error: "fetch failed" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
}

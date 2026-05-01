/**
 * GET /api/news/[coingeckoId]
 *
 * Expose les 5 dernières news pertinentes pour une crypto donnée au composant
 * client `CryptoNewsAggregator`. Lazy-loadé côté page → appelé après le premier
 * paint, pas de pénalité TTFB.
 *
 * Sécurité / robustesse :
 *  - Whitelist stricte sur les coingeckoId (~100 cryptos de `lib/cryptos.ts`).
 *    Tout autre id → 404. Évite que la route devienne un proxy générique vers
 *    CryptoPanic ou les flux RSS externes.
 *  - Rate limit 30 req/min/IP namespace "news" (isolé d'`onchain` et autres).
 *  - `fetchCryptoNews` ne throw jamais → si toutes les sources sont KO on
 *    relaie un 200 avec `{ items: [] }` pour que le client rende `null` proprement.
 *  - Cache CDN 15 min + SWR 30 min (s-maxage=900, stale-while-revalidate=1800)
 *    cohérent avec le cache `unstable_cache` 30 min côté lib.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchCryptoNews, type CryptoNewsItem } from "@/lib/news-aggregator";
import { getAllCryptos } from "@/lib/cryptos";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Index coingeckoId → { symbol, name } construit UNE fois au boot du module.
 * On évite ainsi un getAllCryptos().find() à chaque requête.
 */
const CRYPTO_INDEX: ReadonlyMap<string, { symbol: string; name: string }> =
  new Map(
    getAllCryptos().map((c) => [
      c.coingeckoId,
      { symbol: c.symbol, name: c.name },
    ]),
  );

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000, key: "news" });

interface RouteContext {
  params: { coingeckoId: string };
}

interface ApiResponse {
  items: CryptoNewsItem[];
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const rl = await limiter(getClientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes — réessaie dans une minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Window": "60s",
        },
      },
    );
  }

  const id = ctx.params.coingeckoId;
  const meta = id ? CRYPTO_INDEX.get(id) : undefined;
  if (!meta) {
    return NextResponse.json({ error: "coin not supported" }, { status: 404 });
  }

  const items = await fetchCryptoNews(meta.symbol, meta.name);

  const body: ApiResponse = { items };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}

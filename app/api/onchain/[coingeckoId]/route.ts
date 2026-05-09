/**
 * GET /api/onchain/[coingeckoId]
 *
 * Expose les métriques on-chain agrégées (DeFiLlama + CoinGecko) au composant
 * client `OnChainMetricsLive`. Le panneau est lazy-loadé côté page, donc cette
 * route est appelée APRÈS le premier paint — pas de pénalité TTFB pour le SSR.
 *
 * Sécurité / robustesse :
 *  - Whitelist stricte sur les coingeckoId : on ne sert que les ~100 cryptos
 *    listées dans `lib/cryptos.ts`. Tout autre id → 404. Évite qu'un attaquant
 *    transforme la route en proxy CoinGecko/DeFiLlama générique.
 *  - Rate limit 30 req/min/IP (namespace dédié pour ne pas pénaliser
 *    /api/historical qui partage le même seuil).
 *  - `fetchOnChainMetrics` ne throw jamais → on relaie une réponse 200 avec
 *    `{ metrics: null }` quand aucune source ne répond, pour que le composant
 *    client puisse rendre `null` proprement.
 *  - Cache CDN 1h + SWR 6h (s-maxage=3600, stale-while-revalidate=21600).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchOnChainMetrics } from "@/lib/onchain-metrics";
import { getAllCryptosUnified } from "@/lib/cryptos-extended";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whitelist 780 cryptos (100 statiques + ~680 LLM) — bug fix critique 2026-05-09.
// Lazy memoization, le helper unified cache 1h via unstable_cache.
let allowedIdsCache: ReadonlySet<string> | null = null;
async function getAllowedIds(): Promise<ReadonlySet<string>> {
  if (allowedIdsCache) return allowedIdsCache;
  const all = await getAllCryptosUnified();
  allowedIdsCache = new Set(all.map((c) => c.coingeckoId));
  return allowedIdsCache;
}

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000, key: "onchain" });

interface RouteContext {
  params: { coingeckoId: string };
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
  const allowedIds = await getAllowedIds();
  if (!id || !allowedIds.has(id)) {
    return NextResponse.json({ error: "coin not supported" }, { status: 404 });
  }

  const metrics = await fetchOnChainMetrics(id);

  return NextResponse.json(
    { metrics },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
      },
    },
  );
}

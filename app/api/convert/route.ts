/**
 * GET /api/convert?from=btc&to=eur
 *
 * Renvoie { rate, lastUpdated } pour un couple from/to.
 * Wrapper autour de fetchConversionRate (cache 60 s).
 *
 * Hardening Sprint 4 :
 *  - Rate limit 30 req/min/IP (helper unifié `lib/rate-limit.ts`).
 *  - Validation déjà OK (whitelist `from`/`to` via FIAT_CODES + COIN_IDS).
 *  - `force-dynamic` + `runtime = "nodejs"` explicites pour éviter une bascule
 *    silencieuse de Next vers du SSG (la query string varie par requête, donc
 *    le cache statique n'a pas de sens ici — le cache CDN est géré via
 *    `Cache-Control` + le cache `unstable_cache` côté lib).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchConversionRate, COIN_IDS, FIAT_CODES } from "@/lib/historical-prices";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set<string>([
  ...Object.keys(COIN_IDS),
  ...FIAT_CODES,
]);

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export async function GET(req: NextRequest) {
  const rl = limiter(getClientIp(req));
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
      }
    );
  }

  const { searchParams } = new URL(req.url);
  const from = (searchParams.get("from") ?? "").toLowerCase();
  const to = (searchParams.get("to") ?? "").toLowerCase();

  if (!ALLOWED.has(from) || !ALLOWED.has(to)) {
    return NextResponse.json(
      { error: "from/to not supported" },
      { status: 400 }
    );
  }

  const result = await fetchConversionRate(from, to);
  if (!result) {
    return NextResponse.json({ error: "rate unavailable" }, { status: 503 });
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

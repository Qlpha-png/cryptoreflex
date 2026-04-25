/**
 * GET /api/historical?coin=bitcoin&days=1825
 *
 * Wrapper minimaliste autour de fetchHistoricalPrices() — exposé pour les
 * composants client (DcaSimulator). Cache 1 h via unstable_cache côté lib.
 *
 * Hardening Sprint 4 :
 *  - Rate limit 30 req/min/IP (helper unifié `lib/rate-limit.ts`).
 *  - Validation déjà OK : whitelist sur `coin` (COIN_IDS values), clamp
 *    `days ∈ [30, 1825]`.
 *  - `force-dynamic` + `runtime = "nodejs"` pour forcer Next à traiter la
 *    route en SSR (la query string varie). Le cache long (`s-maxage=3600`)
 *    est piloté côté CDN via le header `Cache-Control` de la réponse.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchHistoricalPrices, COIN_IDS } from "@/lib/historical-prices";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_IDS = new Set<string>([
  ...Object.values(COIN_IDS),
  "bitcoin",
  "ethereum",
  "solana",
]);

// FIX P0 audit-fonctionnel-live-final #4 : namespace KV pour isoler les compteurs.
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000, key: "historical" });

export async function GET(req: NextRequest) {
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
      }
    );
  }

  const { searchParams } = new URL(req.url);
  const coin = searchParams.get("coin") ?? "bitcoin";
  const daysParam = parseInt(searchParams.get("days") ?? "1825", 10);
  const days = Math.min(Math.max(daysParam, 30), 1825);

  if (!ALLOWED_IDS.has(coin)) {
    return NextResponse.json({ error: "coin not supported" }, { status: 400 });
  }

  const points = await fetchHistoricalPrices(coin, days);

  // FIX P0 audit-fonctionnel-live-final #2 : détecte un dataset "amputé" par
  // CoinGecko (ex: free tier qui renvoie [] pour days > 365 quand le multi-fetch
  // chunked a échoué partiellement). On expose un header pour que le client
  // puisse afficher un disclaimer plutôt que de silently undercount le ROI.
  //
  // Heuristique : on attend ~1 point par jour. Si on a < 75 % du nombre attendu,
  // on considère le dataset clamped/dégradé.
  const expected = days;
  const clamped = points.length > 0 && points.length < Math.floor(expected * 0.75);

  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
    "X-Days-Requested": String(days),
    "X-Days-Returned": String(points.length),
  };
  if (clamped) {
    headers["X-Days-Clamped"] = "true";
  }

  return NextResponse.json(
    { points, coin, days, clamped },
    { headers },
  );
}

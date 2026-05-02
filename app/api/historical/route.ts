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
import {
  fetchHistoricalPrices,
  COIN_IDS,
  HISTORICAL_SUPPORTED_IDS,
} from "@/lib/historical-prices";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whitelist des coingeckoIds autorisés sur cet endpoint.
 *
 * FIX 2026-05-02 #3 — auparavant cette liste était hardcodée (~40 coins) et
 * on l'enrichissait manuellement à chaque ajout au catalogue éditorial.
 * Résultat : 60 fiches /cryptos/<slug> renvoyaient HTTP 400 "coin not
 * supported" sur leur ROI simulator alors que la fiche était bel et bien
 * éditée. On dérive maintenant directement du mapping CG_TO_CC dans
 * `lib/historical-prices.ts` (source unique : si une crypto est mappée vers
 * CryptoCompare, elle est servable, point). Plus de désynchro possible.
 *
 * Le mapping legacy COIN_IDS reste accepté en safety (anciens callers).
 */
const ALLOWED_IDS = new Set<string>([
  ...HISTORICAL_SUPPORTED_IDS,
  ...Object.values(COIN_IDS),
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

  // FIX P0 audit-fonctionnel-live-final #2 : détecte un dataset "amputé".
  // Heuristique : on attend ~1 point par jour. Si on a < 75 % du nombre
  // attendu, on considère le dataset clamped/dégradé. NB : avec la migration
  // CryptoCompare (2026-05-02 #2), `clamped` est désormais quasi-toujours
  // false sauf pour les coins listés depuis < `days` (ex: STRK demandé en
  // 1825j mais listé en sept 2023 → ~970 pts → clamped=true). Le client
  // utilisera `firstAvailableTimestamp` pour limiter le slider de date.
  const expected = days;
  const clamped = points.length > 0 && points.length < Math.floor(expected * 0.75);

  // FIX 2026-05-02 #2 — bug "ROI faux pour dates antérieures au listing" :
  // expose le timestamp du PREMIER point disponible, pour que le client
  // ROISimulator puisse borner le slider de date (au lieu de laisser
  // l'utilisateur sélectionner mai 2021 sur un coin listé en 2024 — qui
  // donnait silencieusement le prix 2024 comme "prix 2021" → ROI faux).
  const firstAvailableTimestamp = points.length > 0 ? points[0]!.t : null;
  const lastAvailableTimestamp =
    points.length > 0 ? points[points.length - 1]!.t : null;

  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
    "X-Days-Requested": String(days),
    "X-Days-Returned": String(points.length),
  };
  if (clamped) {
    headers["X-Days-Clamped"] = "true";
  }

  return NextResponse.json(
    {
      points,
      coin,
      days,
      clamped,
      firstAvailableTimestamp,
      lastAvailableTimestamp,
    },
    { headers },
  );
}

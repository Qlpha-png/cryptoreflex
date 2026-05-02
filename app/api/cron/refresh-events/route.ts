/**
 * GET /api/cron/refresh-events
 *
 * Endpoint cron pour rafraîchir le cache du calendrier événements (pilier 4).
 *
 * Stratégie :
 *  1. Auth via Bearer CRON_SECRET (404 si invalide, comme evaluate-alerts).
 *  2. Si NEXT_PUBLIC_COINMARKETCAL_KEY définie : fetch fresh + merge avec seed
 *     (via _fetchEventsRaw qui bypass le cache).
 *  3. revalidateTag("events") pour purger le unstable_cache + ISR de /calendrier.
 *  4. Logs structurés (session UUID, durée, counts) pour diagnostic Vercel.
 *
 * À programmer dans `vercel.json` (1×/jour suffit, on consomme < 5 calls/jour).
 *   {
 *     "crons": [
 *       { "path": "/api/cron/refresh-events", "schedule": "0 5 * * *" }
 *     ]
 *   }
 *
 * Réponse :
 *  { fetched, merged, errors, durationMs, session, ts }
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { _fetchEventsRaw, EVENTS_CACHE_TAG } from "@/lib/events-fetcher";
import { EVENTS_SEED } from "@/lib/events-seed";
import { verifyBearer } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RefreshReport {
  /** Nombre total d'events après merge (seed + API). */
  fetched: number;
  /** Nombre d'events depuis l'API CoinMarketCal (= fetched - seed.length). */
  merged: number;
  /** Erreurs non-fatales rencontrées (API down, parse, etc.). */
  errors: string[];
  /** Durée de la procédure en ms. */
  durationMs: number;
  /** Session UUID pour corréler avec les logs Vercel. */
  session: string;
  /** Timestamp ISO de la fin du run. */
  ts: string;
  /** Mode d'exécution (api ou seed-only). */
  mode: "api" | "seed-only";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = crypto.randomUUID();
  const startedAt = Date.now();
  const errors: string[] = [];

  // -- Auth --
  const secret = process.env.CRON_SECRET;
  if (!verifyBearer(req, secret)) {
    // 404 délibéré (cf. doc evaluate-alerts) — security through obscurity.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!secret) {
    console.warn(
      `[cron/refresh-events] session=${sessionId} CRON_SECRET absent — endpoint ouvert (dev mode).`
    );
  }

  // FIX SEC 2026-05-02 #15 — env var renommée pour ne plus exposer au client.
  const apiKey =
    process.env.COINMARKETCAL_KEY ?? process.env.NEXT_PUBLIC_COINMARKETCAL_KEY;
  const mode: "api" | "seed-only" = apiKey ? "api" : "seed-only";

  console.info(
    `[cron-refresh-events:start] session=${sessionId} mode=${mode} ts=${new Date().toISOString()}`
  );

  // -- Fetch fresh --
  let fetched = 0;
  let merged = 0;
  try {
    const events = await _fetchEventsRaw();
    fetched = events.length;
    merged = Math.max(0, events.length - EVENTS_SEED.length);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`fetch failed: ${msg}`);
    console.error(`[cron-refresh-events:fetch-error] session=${sessionId} ${msg}`);
  }

  // -- Revalidate cache --
  try {
    revalidateTag(EVENTS_CACHE_TAG);
    console.info(
      `[cron-refresh-events:revalidate] session=${sessionId} tag=${EVENTS_CACHE_TAG} OK`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`revalidate failed: ${msg}`);
    console.error(`[cron-refresh-events:revalidate-error] session=${sessionId} ${msg}`);
  }

  const durationMs = Date.now() - startedAt;
  const report: RefreshReport = {
    fetched,
    merged,
    errors,
    durationMs,
    session: sessionId,
    ts: new Date().toISOString(),
    mode,
  };

  console.info(
    `[cron-refresh-events:done] session=${sessionId} fetched=${fetched} merged=${merged} errors=${errors.length} durationMs=${durationMs}`
  );

  return NextResponse.json(report, {
    status: errors.length === 0 ? 200 : 207,
    headers: { "Cache-Control": "no-store" },
  });
}

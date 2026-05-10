/**
 * GET /api/cron/refresh-static-details
 *
 * Pré-charge en KV les détails CoinGecko complets (ATH, ATL, supply, image,
 * sparkline 7d) pour les 100 fiches statiques (top10 + hidden-gems).
 *
 * Pourquoi ce cron :
 *   Le serveur Coolify est régulièrement IP-banni par CoinGecko free (50/min
 *   limit, autres workloads — refresh-prices, LLM-pipeline — spam CG en
 *   permanence). Résultat : `_fetchCoinDetail` live échouait 14-40/100 sur
 *   ATH/ATL/sparkline lors des audits manuels.
 *
 *   Solution : 1 fetch CG /coins/markets pour les 100 IDs statiques d'un
 *   coup, stocké en KV (TTL 6h). Frequency cron 4×/jour suffit (ATH/ATL
 *   bougent peu, sparkline 7d a une résolution horaire). 4 fetches CG/jour
 *   total = trivialement sous le rate limit.
 *
 *   Lecture côté `_fetchCoinDetail` : KV en priorité (instant, pas de fetch
 *   CG), fallback CG live seulement si KV miss (rare : nouveau coin ajouté
 *   au catalogue ou KV expiré sans cron passé).
 *
 * Schedule recommandé :
 *   Toutes les 6h via /api/cron/daily-orchestrator ou GH Actions cron.
 *
 * Réponse : { ok, fetched, stored, durationMs, errors? }
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { verifyBearer } from "@/lib/auth";
import { getKv } from "@/lib/kv";
import topCryptosData from "@/data/top-cryptos.json";
import hiddenGemsData from "@/data/hidden-gems.json";
import { KV_STATIC_DETAILS_KEY } from "@/lib/coingecko";
import { getFeaturedCryptos } from "@/lib/cryptos-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
/** TTL KV : 8h. Cron tourne toutes les 6h, +2h de marge si cron skip. */
const KV_TTL_SECONDS = 8 * 3600;

interface CGMarketsRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap: number | null;
  market_cap_rank: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_date: string | null;
  sparkline_in_7d?: { price: number[] };
}

interface CryptoEntry {
  coingeckoId: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET;

  if (!verifyBearer(req, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  Sentry.addBreadcrumb({
    category: "cron",
    message: "refresh-static-details started",
    level: "info",
  });

  // Collect 100 static coingecko_ids from JSON datasets (single source of truth).
  const staticIds = [
    ...((topCryptosData as { topCryptos?: CryptoEntry[] }).topCryptos ?? []),
    ...((hiddenGemsData as { hiddenGems?: CryptoEntry[] }).hiddenGems ?? []),
  ]
    .map((c) => c.coingeckoId)
    .filter(Boolean);

  // OPTIM 2026-05-10 — top 50 LLM (par market_cap_rank) → ajoutés au batch.
  // Total ~150 ids dans 1 fetch CG /coins/markets (max 250 ids/fetch).
  // Couvre les fiches LLM les plus visitées (T1+T2 par mcap).
  let llmIds: string[] = [];
  try {
    const llmFiches = await getFeaturedCryptos(50, ["T1", "T2"]);
    llmIds = llmFiches
      .map((f) => f.coingecko_id)
      .filter((id) => id && !staticIds.includes(id));
  } catch {
    // DB indispo — on continue avec les statiques seulement
  }

  const ids = Array.from(new Set([...staticIds, ...llmIds]));

  if (ids.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No coingecko IDs found in static datasets" },
      { status: 500 },
    );
  }

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(
    ",",
  )}&order=market_cap_desc&per_page=${Math.min(ids.length, 250)}&page=1&sparkline=true&price_change_percentage=24h,7d`;

  let json: CGMarketsRow[] = [];
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const errMsg = `CG /coins/markets returned ${res.status}`;
      Sentry.captureMessage(errMsg, "warning");
      return NextResponse.json(
        {
          ok: false,
          error: errMsg,
          durationMs: Date.now() - startedAt,
          hint: "CG free rate-limited from this IP. Will retry next cron cycle.",
        },
        { status: 502 },
      );
    }
    json = (await res.json()) as CGMarketsRow[];
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "unknown";
    Sentry.captureException(err);
    return NextResponse.json(
      { ok: false, error: `CG fetch failed: ${errMsg}`, durationMs: Date.now() - startedAt },
      { status: 502 },
    );
  }

  // Build Record<string, CGMarketsRow> for KV storage (JSON-serializable).
  const record: Record<string, CGMarketsRow> = {};
  for (const c of json) {
    if (c?.id) record[c.id] = c;
  }
  const fetched = Object.keys(record).length;

  if (fetched === 0) {
    return NextResponse.json(
      { ok: false, error: "CG returned 200 but empty array", durationMs: Date.now() - startedAt },
      { status: 502 },
    );
  }

  // Store in KV with TTL.
  let stored = 0;
  try {
    const kv = getKv();
    if (kv.mocked) {
      // In-memory KV — values lost at next cold start, but cron still useful
      // for sanity check + Sentry breadcrumb.
      Sentry.addBreadcrumb({
        category: "cron",
        message: "KV mocked — values not persisted",
        level: "warning",
      });
    }
    await kv.set(KV_STATIC_DETAILS_KEY, record, { ex: KV_TTL_SECONDS });
    stored = fetched;
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      {
        ok: false,
        fetched,
        stored: 0,
        error: `KV set failed: ${err instanceof Error ? err.message : "unknown"}`,
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }

  const durationMs = Date.now() - startedAt;
  Sentry.addBreadcrumb({
    category: "cron",
    message: `refresh-static-details OK: fetched=${fetched} stored=${stored} duration=${durationMs}ms`,
    level: "info",
  });

  return NextResponse.json({
    ok: true,
    fetched,
    stored,
    requestedIds: ids.length,
    staticIds: staticIds.length,
    llmIds: llmIds.length,
    coverage: `${fetched}/${ids.length}`,
    durationMs,
    ttlSeconds: KV_TTL_SECONDS,
  });
}

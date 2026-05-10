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

  // OPTIM 2026-05-10 v2 — TOUTES les fiches LLM (T1+T2+T3 published) ajoutées
  // au batch. Total ~780 ids splittés en chunks de 250 (max CG /coins/markets).
  // ~4 fetches CG par run = couvre 100% des fiches du site avec ATH/ATL/sparkline.
  // Économie majeure : plus aucun fallback CG live nécessaire pour les LLM.
  let llmIds: string[] = [];
  try {
    // 1000 = limite haute safe (le site a ~680 LLM en mai 2026, marge si croissance)
    const llmFiches = await getFeaturedCryptos(1000, ["T1", "T2", "T3"]);
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

  // Split en chunks de 250 (max CG /coins/markets per_page).
  // 780 ids → 4 chunks (250+250+250+30). Sleep 1.5s entre chunks pour
  // rester sous CG free 50/min (40/min effectif = très safe).
  const CHUNK_SIZE = 250;
  const SLEEP_BETWEEN_CHUNKS_MS = 1500;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }

  const record: Record<string, CGMarketsRow> = {};
  let chunkErrors = 0;

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${chunk.join(
      ",",
    )}&order=market_cap_desc&per_page=${chunk.length}&page=1&sparkline=true&price_change_percentage=24h,7d`;

    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        chunkErrors++;
        Sentry.addBreadcrumb({
          category: "cron",
          message: `refresh-static-details chunk ${chunkIdx + 1}/${chunks.length} returned ${res.status}`,
          level: "warning",
        });
        continue; // on passe au chunk suivant, on garde ce qu'on a déjà
      }
      const json = (await res.json()) as CGMarketsRow[];
      for (const c of json) {
        if (c?.id) record[c.id] = c;
      }
    } catch (err) {
      chunkErrors++;
      Sentry.addBreadcrumb({
        category: "cron",
        message: `refresh-static-details chunk ${chunkIdx + 1} failed: ${err instanceof Error ? err.message : "unknown"}`,
        level: "warning",
      });
    }

    // Sleep entre chunks pour ne pas saturer CG free (40/min effectif)
    if (chunkIdx < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, SLEEP_BETWEEN_CHUNKS_MS));
    }
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
    chunks: chunks.length,
    chunkErrors,
    coverage: `${fetched}/${ids.length}`,
    durationMs,
    ttlSeconds: KV_TTL_SECONDS,
  });
}

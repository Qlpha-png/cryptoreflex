/**
 * GET /api/cron/refresh-prices
 *
 * Cron de rafraîchissement des prix des 780 cryptos en DB (table public.cryptos).
 * Objectif : maintenir price_usd, market_cap_usd, market_cap_rank "live"
 * pour le rendu SSR/ISR des pages /cryptos/[slug] (sortie LLM bootstrap
 * 100 statiques + 680 LLM => 780 fiches au total mai 2026).
 *
 * Workflow :
 *   1. Auth Bearer CRON_SECRET via `verifyBearer` (401 sinon).
 *   2. Sentry breadcrumb (corrélation Sentry).
 *   3. SELECT coingecko_id depuis public.cryptos (pas de filtre is_published :
 *      on rafraîchit aussi les fiches T3 unpublished pour qu'elles soient
 *      prêtes au moment où on les flip is_published=true).
 *   4. Fetch top markets via CoinGecko /coins/markets (4 pages × 250 = top 1000)
 *      — un seul provider ici, pas la cascade aggregator. Raison : CoinGecko
 *      est la SEULE source qui retourne le `market_cap_rank` et le `market_cap`
 *      pour les coins long-tail (Binance ne connaît pas le supply, CoinCap v2
 *      est mort cf. price-source.ts FIX 2026-05-08).
 *   5. Build une map { coingecko_id -> {price_usd, market_cap_usd, rank} }
 *      puis bulk UPDATE Supabase via service role (1 row per coin, batched
 *      par chunks de 100 via upsert sur PK coingecko_id).
 *   6. Le trigger SQL `trg_cryptos_updated_at` met à jour updated_at auto.
 *      On NE TOUCHE PAS `last_refreshed_at` qui est dédié au regen LLM
 *      (cf. lib/cryptos-db.ts).
 *
 * Réponse : { ok, sessionId, processed, updated, errors, durationMs }
 *
 * Schedule : invoqué par /api/cron/daily-orchestrator (positionné EN PREMIER
 * pour que aggregate-news + daily-brief lisent ensuite des prix frais).
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { verifyBearer } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { cgHeaders } from "@/lib/coingecko";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

/** Marge avant le hard timeout maxDuration. */
const REFRESH_DEADLINE_MS = 55_000;

/** Page size CoinGecko /coins/markets (max 250 par appel). */
const COINGECKO_PAGE_SIZE = 250;

/** Nombre max de pages à fetch (4 × 250 = 1000 cryptos). 780 < 1000 ⇒ couverture totale. */
// OPTIM 2026-05-10 — 4 → 2 pages. 2 × 250 = 500 cryptos par run = couvre top
// 100 statiques + ~400 LLM les plus populaires (les long-tail LLM ont leur
// propre raw_data_snapshot DB qui se rafraîchit via cron LLM-pipeline).
// Économie : 4 → 2 fetches CG par run × 2 runs/jour = 4 fetches/jour vs 8.
const COINGECKO_MAX_PAGES = 2;

/** Taille des chunks pour les UPDATE Supabase (évite payload trop gros + transaction longue). */
const SUPABASE_UPSERT_CHUNK = 100;

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface MarketRow {
  id: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
}

interface PriceUpdate {
  coingecko_id: string;
  price_usd: number;
  market_cap_usd: number;
  market_cap_rank: number | null;
}

interface RefreshReport {
  ok: boolean;
  sessionId: string;
  processed: number;
  updated: number;
  errors: number;
  errorDetails?: Array<{ stage: string; message: string }>;
  durationMs: number;
  startedAt: string;
  pagesFetched: number;
  dbCryptosCount: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fetch une page du top market CoinGecko. Retourne [] en cas d'erreur
 * (rate-limit 429, 503, timeout). On ne re-tente PAS ici : la marge de 4 pages
 * × 250 = 1000 vs 780 cryptos absorbe les erreurs partielles.
 */
async function fetchMarketPage(page: number, signal: AbortSignal): Promise<MarketRow[]> {
  const url =
    `${COINGECKO_BASE}/coins/markets` +
    `?vs_currency=usd&order=market_cap_desc` +
    `&per_page=${COINGECKO_PAGE_SIZE}&page=${page}` +
    `&sparkline=false`;
  try {
    const res = await fetch(url, {
      headers: cgHeaders(),
      signal,
      // No cache : le cron veut toujours les derniers prix.
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(
        `[refresh-prices] CoinGecko page=${page} status=${res.status} — skipping page`,
      );
      return [];
    }
    const json = (await res.json()) as Array<{
      id: string;
      current_price: number | null;
      market_cap: number | null;
      market_cap_rank: number | null;
    }>;
    return json.map((c) => ({
      id: c.id,
      current_price: c.current_price ?? null,
      market_cap: c.market_cap ?? null,
      market_cap_rank: c.market_cap_rank ?? null,
    }));
  } catch (err) {
    console.warn(
      `[refresh-prices] CoinGecko page=${page} fetch threw:`,
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

/**
 * Bulk UPDATE des cryptos. On utilise upsert sur la PK `coingecko_id` plutôt
 * que des UPDATE individuels (1 round-trip vs N) — onConflict ignore les
 * colonnes non fournies (pas d'écrasement de slug, name, etc.).
 *
 * NB : upsert ici fonctionne en mode UPDATE car les rows existent déjà
 * (toutes les 780 cryptos ont déjà été insérées par le pipeline LLM).
 */
async function bulkUpdatePrices(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  updates: PriceUpdate[],
): Promise<{ updated: number; errors: Array<{ stage: string; message: string }> }> {
  const errors: Array<{ stage: string; message: string }> = [];
  let updated = 0;

  for (let i = 0; i < updates.length; i += SUPABASE_UPSERT_CHUNK) {
    const chunk = updates.slice(i, i + SUPABASE_UPSERT_CHUNK);
    try {
      const { error } = await sb
        .from("cryptos")
        .upsert(chunk, { onConflict: "coingecko_id", ignoreDuplicates: false });
      if (error) {
        errors.push({
          stage: `upsert-chunk-${i / SUPABASE_UPSERT_CHUNK}`,
          message: error.message,
        });
      } else {
        updated += chunk.length;
      }
    } catch (err) {
      errors.push({
        stage: `upsert-chunk-${i / SUPABASE_UPSERT_CHUNK}`,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return { updated, errors };
}

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const secret = process.env.CRON_SECRET;
  if (!verifyBearer(req, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!secret) {
    console.warn(
      "[refresh-prices-start] CRON_SECRET absent — endpoint ouvert (mode dev).",
    );
  }

  Sentry.addBreadcrumb({
    category: "cron",
    message: "starting refresh-prices",
    level: "info",
    data: { sessionId },
  });

  console.info(
    `[refresh-prices-start] session=${sessionId} ts=${startedAt} deadlineMs=${REFRESH_DEADLINE_MS}`,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REFRESH_DEADLINE_MS);

  const errorDetails: Array<{ stage: string; message: string }> = [];
  let processed = 0;
  let updated = 0;
  let pagesFetched = 0;
  let dbCryptosCount = 0;

  try {
    // 1) Lecture des coingecko_id en DB (filtre par cryptos déjà présentes).
    const sb = createSupabaseServiceRoleClient();
    if (!sb) {
      throw new Error("supabase service role not configured");
    }

    const { data: dbRows, error: selectErr } = await sb
      .from("cryptos")
      .select("coingecko_id");
    if (selectErr) {
      throw new Error(`supabase select failed: ${selectErr.message}`);
    }

    const dbIds = new Set<string>(
      (dbRows ?? []).map((r: { coingecko_id: string }) => r.coingecko_id),
    );
    dbCryptosCount = dbIds.size;

    if (dbCryptosCount === 0) {
      console.warn(
        `[refresh-prices-end] session=${sessionId} no rows in cryptos table — nothing to refresh`,
      );
      const durationMs = Date.now() - t0;
      return NextResponse.json(
        {
          ok: true,
          sessionId,
          processed: 0,
          updated: 0,
          errors: 0,
          durationMs,
          startedAt,
          pagesFetched: 0,
          dbCryptosCount: 0,
        } satisfies RefreshReport,
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 2) Fetch top market CoinGecko (4 pages × 250 = 1000 coins).
    //    Séquentiel pour éviter rate-limit 429 sur le free tier (~30 req/min
    //    avec API key Demo). 4 calls espacés ~200ms entre chaque suffit.
    const allMarkets: MarketRow[] = [];
    for (let page = 1; page <= COINGECKO_MAX_PAGES; page++) {
      if (controller.signal.aborted) {
        errorDetails.push({ stage: "fetch-markets", message: "aborted (deadline)" });
        break;
      }
      const rows = await fetchMarketPage(page, controller.signal);
      if (rows.length === 0) {
        // Page vide ou erreur — log mais on continue les pages suivantes.
        errorDetails.push({
          stage: `fetch-page-${page}`,
          message: "no rows returned (rate-limit or empty)",
        });
      } else {
        allMarkets.push(...rows);
        pagesFetched++;
      }
      // Micro-pause pour ménager le rate-limit CoinGecko (Demo tier ~30 req/min).
      if (page < COINGECKO_MAX_PAGES) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    // 3) Filtre : ne garder que les coins présents en DB + au prix > 0.
    const updates: PriceUpdate[] = [];
    for (const m of allMarkets) {
      if (!dbIds.has(m.id)) continue;
      if (m.current_price == null || m.current_price <= 0) continue;
      updates.push({
        coingecko_id: m.id,
        price_usd: m.current_price,
        market_cap_usd: m.market_cap ?? 0,
        market_cap_rank: m.market_cap_rank,
      });
    }
    processed = updates.length;

    // 4) Bulk upsert Supabase par chunks de 100.
    if (updates.length > 0 && !controller.signal.aborted) {
      const { updated: u, errors: upsertErrors } = await bulkUpdatePrices(sb, updates);
      updated = u;
      errorDetails.push(...upsertErrors);
    }

    const errors = errorDetails.length;
    const durationMs = Date.now() - t0;

    console.info(
      `[refresh-prices-end] session=${sessionId} dbCount=${dbCryptosCount} ` +
        `pages=${pagesFetched} processed=${processed} updated=${updated} ` +
        `errors=${errors} durationMs=${durationMs}`,
    );

    const report: RefreshReport = {
      ok: errors === 0,
      sessionId,
      processed,
      updated,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      durationMs,
      startedAt,
      pagesFetched,
      dbCryptosCount,
    };

    return NextResponse.json(report, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted = controller.signal.aborted;
    const durationMs = Date.now() - t0;
    Sentry.captureException(err, {
      tags: { route: "cron/refresh-prices", stage: "topLevel" },
      extra: { sessionId, aborted, durationMs, processed, updated },
      level: "error",
    });
    console.error(
      `[refresh-prices-error] session=${sessionId} aborted=${aborted} message=${message} durationMs=${durationMs}`,
    );
    return NextResponse.json(
      {
        ok: false,
        sessionId,
        aborted,
        error: message,
        processed,
        updated,
        errors: errorDetails.length + 1,
        durationMs,
        startedAt,
        pagesFetched,
        dbCryptosCount,
      },
      {
        status: aborted ? 408 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

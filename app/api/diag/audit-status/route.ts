/**
 * GET /api/diag/audit-status
 *
 * Endpoint public léger pour voir l'état du système de monitoring crypto.
 * Tu peux le hit à tout moment via :
 *   curl https://www.cryptoreflex.fr/api/diag/audit-status
 *
 * Renvoie :
 *   - Nombre de fiches needs_review (à reviewer manuellement)
 *   - Liste tracking missing-CG (par stade)
 *   - Date dernier run cron audit
 *   - Health KV + Supabase + CG
 */

import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const out: Record<string, unknown> = {};

  // 1. Fiches needs_review
  const sb = createSupabaseServiceRoleClient();
  if (sb) {
    const { data: needsReview, count } = await sb
      .from("cryptos")
      .select("coingecko_id, name, symbol, market_cap_rank", { count: "exact" })
      .eq("needs_review", true)
      .eq("is_published", true)
      .order("market_cap_rank", { ascending: true, nullsFirst: false })
      .limit(20);
    out.needsReviewCount = count ?? 0;
    out.needsReviewSample = needsReview ?? [];

    const { count: unpubCount } = await sb
      .from("cryptos")
      .select("coingecko_id", { count: "exact", head: true })
      .eq("is_published", false);
    out.unpublishedCount = unpubCount ?? 0;

    const { count: publishedCount } = await sb
      .from("cryptos")
      .select("coingecko_id", { count: "exact", head: true })
      .eq("is_published", true);
    out.publishedCount = publishedCount ?? 0;
  }

  // 2. KV tracking (stade 3+ fiches en cours d'observation)
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    try {
      const r = await fetch(
        `${kvUrl.replace(/\/$/, "")}/keys/audit:missing:*`,
        {
          headers: { Authorization: `Bearer ${kvToken}` },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (r.ok) {
        const data = (await r.json()) as { result?: string[] };
        const keys = data.result ?? [];
        out.missingTrackingKeysCount = keys.length;
        out.missingTrackingSample = keys.slice(0, 10).map((k) =>
          k.replace("audit:missing:", ""),
        );
      }
    } catch {
      out.missingTracking = "kv unreachable";
    }
  }

  // 3. CG health
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&per_page=1&page=1",
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    out.coingeckoHealthy = r.ok;
    out.coingeckoStatus = r.status;
  } catch {
    out.coingeckoHealthy = false;
  }

  out.documentation = {
    cron: "/api/cron/audit-cryptos-health (Bearer CRON_SECRET, 1×/jour via daily-orchestrator)",
    multiStageStages: {
      stage1: "1 run absent CG → KV tracking (no DB write)",
      stage2: "2-6 runs absent → KV tracking (no DB write)",
      stage3: "7-13 runs absent → needs_review=true (still published)",
      stage4: "14+ runs absent → Sentry CRITICAL + email admin (still published)",
    },
    manualActions: {
      reviewQuery: "SELECT coingecko_id, name FROM cryptos WHERE needs_review=true;",
      unpublishQuery: "UPDATE cryptos SET is_published=false WHERE coingecko_id IN (...);",
      republishAll: "UPDATE cryptos SET is_published=true WHERE is_published=false;",
    },
  };
  out.timestamp = new Date().toISOString();

  return NextResponse.json(out);
}

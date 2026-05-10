/**
 * GET /api/diag-detail?id=gmx
 *
 * Debug endpoint temporaire : appelle directement _fetchStaticDetailsBatch
 * + getCryptoFiche pour voir ce que le batch hydrate retourne.
 *
 * NOTE : à supprimer après validation v13/v14.
 */

import { NextRequest, NextResponse } from "next/server";
import { getKv } from "@/lib/kv";
import { KV_STATIC_DETAILS_KEY, fetchCoinDetail } from "@/lib/coingecko";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id") || "gmx";
  const out: Record<string, unknown> = { id, steps: [] };
  const steps = out.steps as unknown[];

  // Step 1 : env
  steps.push({
    step: "env",
    KV_REST_API_URL: !!process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
  });

  // Step 2 : getKv()
  const kv = getKv();
  steps.push({ step: "getKv", mocked: kv.mocked });

  // Step 3 : kv.get
  try {
    const cached = await kv.get<Record<string, unknown>>(KV_STATIC_DETAILS_KEY);
    if (!cached) {
      steps.push({ step: "kv.get", result: "null" });
    } else {
      const keys = Object.keys(cached);
      const target = (cached as Record<string, { ath?: number; market_cap?: number }>)[id];
      steps.push({
        step: "kv.get",
        keysCount: keys.length,
        sampleKeys: keys.slice(0, 5),
        targetExists: !!target,
        targetAth: target?.ath,
        targetMcap: target?.market_cap,
      });
    }
  } catch (err) {
    steps.push({
      step: "kv.get",
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  // Step 4 : full fetchCoinDetail
  try {
    const detail = await fetchCoinDetail(id);
    if (!detail) {
      steps.push({ step: "fetchCoinDetail", result: "null" });
    } else {
      steps.push({
        step: "fetchCoinDetail",
        ath: detail.ath,
        atl: detail.atl,
        marketCap: detail.marketCap,
        currentPrice: detail.currentPrice,
        sparkline7dLength: detail.sparkline7d?.length ?? 0,
        symbol: detail.symbol,
      });
    }
  } catch (err) {
    steps.push({
      step: "fetchCoinDetail",
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  return NextResponse.json(out);
}

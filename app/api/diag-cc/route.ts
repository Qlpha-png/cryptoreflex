/**
 * GET /api/diag-cc — diagnostic temporaire CryptoCompare batch.
 * Retourne tout ce qui est dans le batch cache (couverture / symbols absents).
 * A SUPPRIMER apres investigation.
 */

import { getCryptoCompareAll } from "@/lib/cryptocompare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const t0 = Date.now();
  const batch = await getCryptoCompareAll();
  const elapsed = Date.now() - t0;
  const symbols = Object.keys(batch).sort();
  return new Response(
    JSON.stringify(
      {
        elapsedMs: elapsed,
        count: symbols.length,
        symbols,
        sample: symbols.slice(0, 5).reduce((acc, k) => {
          acc[k] = batch[k];
          return acc;
        }, {} as Record<string, unknown>),
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
}

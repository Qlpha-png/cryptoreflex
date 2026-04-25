/**
 * GET /api/cron/evaluate-alerts
 *
 * Endpoint appelé par Vercel Cron (vercel.json — schedule "* /15 * * * *").
 * Sécurité :
 *  - Header `Authorization: Bearer <CRON_SECRET>` obligatoire en prod.
 *  - Sinon 404 (pas 401/403, pour ne pas révéler l'existence de la route à un scanner).
 *
 * En mode développement (CRON_SECRET absent), on autorise sans header pour
 * faciliter les tests manuels (curl localhost:3000/api/cron/evaluate-alerts).
 *
 * Réponse :
 *  - 200 + EvaluationReport JSON (utile pour Vercel logs)
 */

import { NextRequest, NextResponse } from "next/server";
import { evaluateAndFire } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${secret}`;
    if (auth !== expected) {
      // 404 délibérément (security through obscurity, faible mais utile contre les scrapers).
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    // Mode dev / preview : on log clairement.
    console.warn("[cron/evaluate-alerts] CRON_SECRET absent — endpoint ouvert (mode dev).");
  }

  const report = await evaluateAndFire();
  return NextResponse.json(
    { ok: true, ...report },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

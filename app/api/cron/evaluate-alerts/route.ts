/**
 * GET /api/cron/evaluate-alerts
 *
 * Endpoint appelé par Vercel Cron (vercel.json — schedule "0 8 * * *", 1×/jour).
 * Sécurité :
 *  - Header `Authorization: Bearer <CRON_SECRET>` obligatoire en prod.
 *  - Sinon 404 (pas 401/403, pour ne pas révéler l'existence de la route à un scanner).
 *
 * En mode développement (CRON_SECRET absent), on autorise sans header pour
 * faciliter les tests manuels (curl localhost:3000/api/cron/evaluate-alerts).
 *
 * Hardening (audit cron 26-04, agent #3) :
 *  - Timeout global 55s via AbortSignal (Vercel Hobby limite à 60s, marge 5s
 *    pour la réponse). Au-delà, evaluateAndFire abandonne proprement.
 *  - Session ID UUID injecté dans les logs (corrélation cron run ↔ logs Vercel).
 *  - Réponse JSON inclut session + cron metadata pour audit a posteriori.
 *
 * Réponse :
 *  - 200 + EvaluationReport JSON (utile pour Vercel logs)
 *  - 408 si timeout AbortSignal (cron a dépassé 55s avant complétion)
 */

import { NextRequest, NextResponse } from "next/server";
import { evaluateAndFire } from "@/lib/alerts";
import { verifyBearer } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deadline 55s — sous Vercel Hobby (60s hard limit) pour laisser 5s de marge
 * à NextResponse.json() + headers + flush. Au-delà, l'evaluation est tronquée
 * et on retourne un report partiel plutôt qu'un crash silencieux 504.
 */
const CRON_DEADLINE_MS = 55_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const sessionId = crypto.randomUUID();

  if (!verifyBearer(req, secret)) {
    // 404 délibérément (security through obscurity, faible mais utile contre les scrapers).
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!secret) {
    // Mode dev / preview : on log clairement.
    console.warn("[cron/evaluate-alerts] CRON_SECRET absent — endpoint ouvert (mode dev).");
  }

  // Timeout global pour ne pas dépasser la limite Vercel Hobby (60s).
  // Le signal est passé à evaluateAndFire qui le check à chaque itération
  // de boucle pour break gracieusement (vs SIGTERM brutal côté Vercel).
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CRON_DEADLINE_MS);

  console.info(
    `[cron-eval-start] session=${sessionId} ts=${new Date().toISOString()} deadlineMs=${CRON_DEADLINE_MS}`,
  );

  try {
    const report = await evaluateAndFire(controller.signal);
    console.info(
      `[cron-eval-end] session=${sessionId} checked=${report.checked} fired=${report.fired} skipped=${report.skipped} errors=${report.errors.length} durationMs=${report.durationMs}`,
    );
    return NextResponse.json(
      { ok: true, sessionId, ...report },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const aborted = controller.signal.aborted;
    console.error(
      `[cron-eval-error] session=${sessionId} aborted=${aborted} message=${message}`,
    );
    return NextResponse.json(
      { ok: false, sessionId, aborted, error: message },
      { status: aborted ? 408 : 500, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

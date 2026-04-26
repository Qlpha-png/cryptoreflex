/**
 * GET /api/cron/daily-orchestrator
 *
 * Cron unique de Cryptoreflex (Vercel Hobby = 1 cron/jour max).
 * Orchestre en série tous les jobs quotidiens du site :
 *
 *   1. /api/cron/evaluate-alerts      — déclenche les alertes prix
 *   2. /api/cron/aggregate-news       — réécrit 5-10 news/jour en MDX
 *   3. /api/cron/generate-ta          — génère 5 analyses techniques (BTC/ETH/SOL/XRP/ADA)
 *   4. /api/cron/refresh-events       — refresh la cache des événements crypto
 *
 * Chaque sous-cron est appelé via fetch interne (HTTP) avec son Bearer CRON_SECRET.
 * Failure d'un sous-cron n'arrête PAS la chaîne (best effort) : on collecte tous
 * les résultats et on retourne un report agrégé.
 *
 * Sécurité : Bearer CRON_SECRET obligatoire en prod (404 sinon, security through
 * obscurity). En dev (CRON_SECRET absent), endpoint ouvert.
 *
 * Hardening :
 *  - Deadline globale 55s (Vercel Hobby 60s hard limit)
 *  - Per-job timeout 12s (4 jobs × 12s = 48s + 7s marge)
 *  - Session ID UUID pour corréler les logs Vercel
 *  - Logs structurés [orchestrator-*] pour parsing/monitoring
 *
 * Configuration vercel.json :
 *   { "crons": [{ "path": "/api/cron/daily-orchestrator", "schedule": "0 7 * * *" }] }
 *   → 7h UTC = 9h Paris en heure d'été, 8h Paris en heure d'hiver.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

/** Deadline globale : 55s pour laisser 5s de marge au flush HTTP. */
const ORCHESTRATOR_DEADLINE_MS = 55_000;

/** Timeout par sous-cron : 12s (4 jobs × 12 = 48s, marge 7s). */
const PER_JOB_TIMEOUT_MS = 12_000;

/**
 * Liste des sous-crons à orchestrer.
 * Ordre = priorité d'exécution (alerts en premier car critique pour les abonnés).
 */
const SUB_CRONS = [
  { name: "evaluate-alerts", path: "/api/cron/evaluate-alerts", critical: true },
  { name: "aggregate-news", path: "/api/cron/aggregate-news", critical: false },
  { name: "generate-ta", path: "/api/cron/generate-ta", critical: false },
  { name: "refresh-events", path: "/api/cron/refresh-events", critical: false },
] as const;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface SubCronResult {
  name: string;
  path: string;
  ok: boolean;
  status: number;
  durationMs: number;
  body?: unknown;
  error?: string;
}

interface OrchestratorReport {
  ok: boolean;
  sessionId: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  jobs: SubCronResult[];
  successes: number;
  failures: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Construit l'URL absolue d'un sous-cron à partir de la requête entrante.
 * Vercel ne peut pas appeler ses propres routes en relative depuis un Server
 * handler — il faut absolu. On reconstruit depuis l'origin de la requête (host
 * + protocole) pour rester portable (preview deployments inclus).
 */
function absoluteUrl(req: NextRequest, path: string): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "www.cryptoreflex.fr";
  return `${proto}://${host}${path}`;
}

/**
 * Appelle un sous-cron en interne avec timeout via AbortSignal.
 * Capture toute exception (timeout, network, JSON parse) et la retourne dans
 * le résultat plutôt que de crasher l'orchestrateur.
 */
async function invokeSubCron(
  req: NextRequest,
  cron: (typeof SUB_CRONS)[number],
  bearer: string,
  sessionId: string,
): Promise<SubCronResult> {
  const start = Date.now();
  const url = absoluteUrl(req, cron.path);
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), PER_JOB_TIMEOUT_MS);

  try {
    console.log(
      `[orchestrator-job-start] session=${sessionId} job=${cron.name} url=${url}`,
    );
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: bearer },
      signal: ctrl.signal,
      // Pas de cache — chaque call doit re-déclencher le handler.
      cache: "no-store",
    });
    const durationMs = Date.now() - start;

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // Endpoint qui renvoie du texte non-JSON : on ignore silencieusement.
      body = { raw: await res.text().catch(() => "") };
    }

    const ok = res.ok;
    console.log(
      `[orchestrator-job-end] session=${sessionId} job=${cron.name} status=${res.status} ok=${ok} ms=${durationMs}`,
    );

    return {
      name: cron.name,
      path: cron.path,
      ok,
      status: res.status,
      durationMs,
      body,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `timeout after ${PER_JOB_TIMEOUT_MS}ms`
          : err.message
        : "unknown error";
    console.error(
      `[orchestrator-job-error] session=${sessionId} job=${cron.name} ms=${durationMs} error=${message}`,
    );
    return {
      name: cron.name,
      path: cron.path,
      ok: false,
      status: 0,
      durationMs,
      error: message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const sessionId = crypto.randomUUID();
  const start = Date.now();

  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    console.warn(
      "[orchestrator] CRON_SECRET absent — endpoint ouvert (mode dev).",
    );
  }

  console.log(
    `[orchestrator-start] session=${sessionId} jobs=${SUB_CRONS.length} ts=${new Date().toISOString()}`,
  );

  // Bearer à propager aux sous-crons (chacun le re-vérifie côté handler).
  const bearer = `Bearer ${secret ?? "dev-no-secret"}`;

  const jobs: SubCronResult[] = [];
  const globalDeadline = start + ORCHESTRATOR_DEADLINE_MS;

  for (const cron of SUB_CRONS) {
    if (Date.now() > globalDeadline - PER_JOB_TIMEOUT_MS) {
      console.warn(
        `[orchestrator-skip] session=${sessionId} job=${cron.name} reason=global-deadline-exceeded`,
      );
      jobs.push({
        name: cron.name,
        path: cron.path,
        ok: false,
        status: 0,
        durationMs: 0,
        error: "skipped: global deadline exceeded",
      });
      continue;
    }
    const result = await invokeSubCron(req, cron, bearer, sessionId);
    jobs.push(result);
  }

  const successes = jobs.filter((j) => j.ok).length;
  const failures = jobs.length - successes;
  const totalDurationMs = Date.now() - start;
  const ok = failures === 0;

  const report: OrchestratorReport = {
    ok,
    sessionId,
    startedAt: new Date(start).toISOString(),
    completedAt: new Date().toISOString(),
    totalDurationMs,
    jobs,
    successes,
    failures,
  };

  console.log(
    `[orchestrator-end] session=${sessionId} ok=${ok} successes=${successes} failures=${failures} ms=${totalDurationMs}`,
  );

  return NextResponse.json(report, { status: ok ? 200 : 207 });
}

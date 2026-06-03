/**
 * GET /api/cron/daily-orchestrator
 *
 * Cron unique de Cryptoreflex (Vercel Hobby = 1 cron/jour max).
 * Orchestre en série tous les jobs quotidiens du site :
 *
 *   0. /api/cron/refresh-prices       — refresh price_usd / market_cap des 780 cryptos DB
 *                                        (FIRST : aggregate-news + daily-brief lisent
 *                                         ensuite des prix frais).
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
import * as Sentry from "@sentry/nextjs";
import { verifyBearer } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

/** Deadline globale : 290s (laisse 10s de marge au flush HTTP, total 5min). */
const ORCHESTRATOR_DEADLINE_MS = 290_000;

/** Timeout par sous-cron : 90s. generate-ta peut prendre 30-60s pour 50
 *  cryptos via Binance, et aggregate-news peut traduire 10-15 articles
 *  via OpenRouter (~5s × 13 = ~65s). Bump 60→90s pour couvrir les 2. */
const PER_JOB_TIMEOUT_MS = 90_000;

/**
 * Liste des sous-crons à orchestrer.
 * Ordre = priorité d'exécution.
 *
 * refresh-prices EN PREMIER : il met à jour price_usd / market_cap des 780
 * cryptos en DB. Tous les jobs suivants (aggregate-news, daily-brief, generate-ta)
 * lisent ces prix pour leur génération de contenu — il faut donc les avoir
 * frais avant. Critical:false car si CoinGecko down, les autres jobs continuent
 * de tourner avec les prix de la veille (graceful degradation).
 */
const SUB_CRONS = [
  { name: "refresh-prices", path: "/api/cron/refresh-prices", critical: false },
  // FIX 2026-05-10 v11+ — pré-charge ATH/ATL/sparkline/supply en KV pour
  // les 100 fiches éditoriales statiques. 1 fetch CG /coins/markets en
  // batch couvre les 100 IDs d'un coup (TTL 8h, refresh 1×/jour suffit).
  // Découple les pages user du rate-limit CG live (serveur Coolify
  // régulièrement IP-banni par CG free).
  { name: "refresh-static-details", path: "/api/cron/refresh-static-details", critical: false },
  // OPTIM 2026-05-10 — pré-charge top 50 ticker prices en KV (TTL 6min).
  // Ticker home + autocomplete + portfolio lisent KV → 0 cascade live.
  // 2 fetches CG/jour ici (vs ~100/jour avant via cascade live miss).
  { name: "refresh-ticker-prices", path: "/api/cron/refresh-ticker-prices", critical: false },
  // NEW 2026-05-11 — Health-check automatique des 780 fiches crypto :
  // détecte delisting (CG ne retourne plus l'ID), rebrand (rank shift >50%),
  // nouvelles tops (top 100 CG absents DB), stale (raw_data_snapshot >30j).
  // Auto-actions : unpublish delisted, flag needs_review pour rest.
  // Critical:false car job long (~30s) mais non bloquant.
  { name: "audit-cryptos-health", path: "/api/cron/audit-cryptos-health", critical: false },
  { name: "evaluate-alerts", path: "/api/cron/evaluate-alerts", critical: true },
  // Fix audit backend 30/04/2026 — cron email-series-fiscalite n'était JAMAIS
  // déclenché en prod (manquait dans vercel.json ET ici). Conséquence : les
  // leads PDF recevaient l'email J0 mais jamais les J2/J5/J9/J14. Ajout en
  // critical:false (échec ne bloque pas le reste) + timeout 12s par défaut.
  { name: "email-series-fiscalite", path: "/api/cron/email-series-fiscalite", critical: false },
  // DÉMONÉTISATION (juin 2026) : génération de CONTENU AUTO désactivée tant que
  // Kevin n'a pas validé un budget IA + un process éditorial. On retire de
  // l'orchestrateur : aggregate-news (réécriture news via OpenRouter = coût IA),
  // generate-ta (analyses techniques auto) et daily-brief (brief auto). Les jobs
  // DATA/ops (prix, alertes, événements, indexnow, emails) restent actifs.
  // { name: "aggregate-news", path: "/api/cron/aggregate-news", critical: false },
  // { name: "generate-ta", path: "/api/cron/generate-ta", critical: false },
  // { name: "daily-brief", path: "/api/cron/daily-brief", critical: false },
  { name: "refresh-events", path: "/api/cron/refresh-events", critical: false },
  // BATCH 19 — IndexNow daily push (Bing/Yandex/Seznam) sur ~28 URLs
  // critiques (hubs + landings). Très rapide (~1s, 1 fetch interne).
  // Critical:false : si Bing API down, on continue les autres jobs.
  { name: "indexnow-push", path: "/api/cron/indexnow-push", critical: false },
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
    Sentry.captureException(err, {
      tags: {
        route: "cron/daily-orchestrator",
        job: cron.name,
        critical: cron.critical ? "true" : "false",
      },
      extra: { sessionId, durationMs, url },
      level: cron.critical ? "error" : "warning",
    });
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

  if (!verifyBearer(req, secret)) {
    // 401 explicite (cohérence cron, voir evaluate-alerts).
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!secret) {
    console.warn(
      "[orchestrator] CRON_SECRET absent — endpoint ouvert (mode dev).",
    );
  }

  Sentry.addBreadcrumb({
    category: "cron",
    message: "starting daily orchestrator",
    level: "info",
    data: { sessionId, jobs: SUB_CRONS.length },
  });

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

  // Si au moins un job critique a échoué, on remonte un message agrégé pour
  // que le monitoring soit alerté même si les errors per-job ont déjà été
  // capturées (utile pour grouper côté Sentry).
  if (failures > 0) {
    const criticalFailures = jobs.filter(
      (j) => !j.ok && SUB_CRONS.find((c) => c.name === j.name)?.critical,
    );
    if (criticalFailures.length > 0) {
      Sentry.captureMessage(
        `[orchestrator] ${criticalFailures.length} critical job(s) failed`,
        {
          tags: { route: "cron/daily-orchestrator" },
          extra: {
            sessionId,
            failedJobs: criticalFailures.map((j) => j.name),
            totalDurationMs,
          },
          level: "error",
        },
      );
    }
  }

  return NextResponse.json(report, { status: ok ? 200 : 207 });
}

/**
 * GET /api/cron/email-series-fiscalite
 * ------------------------------------------------------------------
 * Cron quotidien d'envoi de la séquence email "Fiscalité crypto en 5 emails".
 *
 * Pour chaque abonné Beehiiv ayant `utm_source` (ou `utm_campaign`) =
 * `calculateur-fiscalite-pdf` :
 *   1. Calcule le nombre de jours écoulés depuis l'inscription.
 *   2. Si ce delta correspond à un dayOffset prévu (0, 2, 5, 9, 14) ET que
 *      l'email correspondant n'a pas déjà été envoyé : envoie via Resend.
 *   3. Marque l'email comme envoyé en mettant à jour le custom field Beehiiv
 *      `fiscalite_jN_sent = true` (idempotence cross-run).
 *
 * Sécurité :
 *  - Auth Bearer CRON_SECRET (404 si absent en prod).
 *  - En dev (CRON_SECRET vide), l'endpoint reste accessible pour debug.
 *
 * Idempotence :
 *  - Backed par les custom fields Beehiiv (source de vérité distribuée).
 *  - Fallback KV si Beehiiv unavailable (best effort) : key
 *    `fiscalite-series:sent:{email}:{offset}` TTL 60 jours.
 *
 * Performance :
 *  - Limite hard : MAX_EMAILS_PER_RUN = 100 (évite de cramer la limite Resend).
 *  - Si la queue est plus grande, on traite en FIFO (les abonnés non
 *    traités attendent le prochain run = J+1 max).
 *  - Traitement séquentiel (pas de Promise.all) pour rester gentil avec les
 *    rate limits Resend (max 10 req/s par défaut).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  FISCALITE_EMAIL_SERIES,
  FISCALITE_SERIES_SOURCE,
  FISCALITE_VALID_OFFSETS,
  buildUnsubscribeUrl,
  getFiscaliteEmailByOffset,
  type EmailInSequence,
} from "@/lib/email-series/fiscalite-crypto-series";
import {
  getSubscribersBySource,
  updateSubscriberCustomField,
  type BeehiivSubscriber,
} from "@/lib/beehiiv";
import { sendEmail } from "@/lib/email/client";
import { renderEmailHtml, renderEmailText } from "@/lib/email-renderer";
import { getKv } from "@/lib/kv";
import { verifyBearer } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

/** Plafond d'envois par exécution — protège la quota Resend (3000/mois free tier). */
const MAX_EMAILS_PER_RUN = 100;

/** TTL fallback KV pour l'idempotence (60 jours = au-delà de la séquence). */
const KV_IDEMPOTENCY_TTL_SEC = 60 * 24 * 60 * 60;

/** Tolérance en heures pour matcher un dayOffset (24h = strict, ~12h évite les drifts cron). */
const DAY_MATCH_TOLERANCE_HOURS = 12;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface SendDecision {
  subscriber: BeehiivSubscriber;
  email: EmailInSequence;
  /** Nombre de jours depuis l'inscription (arrondi inférieur). */
  daysSinceSubscribe: number;
}

interface RunReport {
  ok: boolean;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  source: string;
  totalSubscribers: number;
  candidates: number;
  sent: number;
  skippedAlreadySent: number;
  skippedNoMatch: number;
  failed: number;
  errors: Array<{ email: string; reason: string }>;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Renvoie le nombre de jours pleins entre `fromEpochSec` et maintenant.
 * Tolérance ± DAY_MATCH_TOLERANCE_HOURS pour matcher le dayOffset attendu.
 */
function diffDays(fromEpochSec: number): number {
  if (!fromEpochSec || fromEpochSec <= 0) return -1;
  const nowSec = Date.now() / 1000;
  const diffSec = nowSec - fromEpochSec;
  const diffDaysFloat = diffSec / 86400;
  // Tolérance : si on est entre J-tol et J+tol d'un offset, on considère que c'est le jour.
  const tol = DAY_MATCH_TOLERANCE_HOURS / 24;
  // Round à l'entier le plus proche, mais seulement dans la fenêtre de tolérance.
  const rounded = Math.round(diffDaysFloat);
  return Math.abs(diffDaysFloat - rounded) <= tol ? rounded : -1;
}

/**
 * Vérifie si un email donné (offset N) a déjà été envoyé pour cet abonné.
 * 1) Source de vérité : custom field Beehiiv `fiscalite_jN_sent`.
 * 2) Fallback : KV `fiscalite-series:sent:{email}:{offset}`.
 */
async function alreadySent(
  subscriber: BeehiivSubscriber,
  offset: number,
): Promise<boolean> {
  const fieldName = "fiscalite_j" + String(offset) + "_sent";
  const cf = subscriber.customFields.find((f) => f.name === fieldName);
  if (cf && (cf.value === true || cf.value === "true" || cf.value === 1 || cf.value === "1")) {
    return true;
  }
  // Fallback KV
  try {
    const kv = getKv();
    const key = "fiscalite-series:sent:" + subscriber.email + ":" + String(offset);
    const v = await kv.get<string>(key);
    return v != null;
  } catch {
    return false;
  }
}

/**
 * Marque un envoi comme effectué (Beehiiv custom field + KV fallback).
 * Best-effort : si Beehiiv échoue, on enregistre en KV pour ne pas re-spammer
 * au prochain run.
 */
async function markSent(email: string, offset: number): Promise<void> {
  const fieldName = "fiscalite_j" + String(offset) + "_sent";
  // Beehiiv (source de vérité)
  await updateSubscriberCustomField(email, fieldName, true).catch((err) => {
    console.error("[fiscalite-cron] mark beehiiv failed", { email, offset, err });
  });
  // KV fallback
  try {
    const kv = getKv();
    const key = "fiscalite-series:sent:" + email + ":" + String(offset);
    await kv.set(key, new Date().toISOString(), { ex: KV_IDEMPOTENCY_TTL_SEC });
  } catch (err) {
    console.error("[fiscalite-cron] mark kv failed", { email, offset, err });
  }
}

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const startedAt = new Date(start).toISOString();
  const secret = process.env.CRON_SECRET;

  // Auth Bearer (404 plutôt que 401 : security through obscurity)
  if (!verifyBearer(req, secret)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!secret) {
    console.warn("[fiscalite-cron] CRON_SECRET absent — endpoint ouvert (mode dev).");
  }

  console.log("[fiscalite-cron-start]", { startedAt, source: FISCALITE_SERIES_SOURCE });

  // 1) Récupère les abonnés filtrés par source
  let subscribers: BeehiivSubscriber[] = [];
  try {
    subscribers = await getSubscribersBySource(FISCALITE_SERIES_SOURCE);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[fiscalite-cron] list subscribers failed", { msg });
    return NextResponse.json(
      { ok: false, error: "list subscribers failed", reason: msg },
      { status: 502 },
    );
  }

  // 2) Identifie les candidats (matching dayOffset + non envoyés)
  const decisions: SendDecision[] = [];
  let skippedAlreadySent = 0;
  let skippedNoMatch = 0;

  for (const sub of subscribers) {
    if (sub.status !== "active" && sub.status !== "validating") continue;
    const days = diffDays(sub.createdAt);
    if (days < 0 || !FISCALITE_VALID_OFFSETS.has(days as 0 | 2 | 5 | 9 | 14)) {
      skippedNoMatch++;
      continue;
    }
    const email = getFiscaliteEmailByOffset(days);
    if (!email) {
      skippedNoMatch++;
      continue;
    }
    if (await alreadySent(sub, days)) {
      skippedAlreadySent++;
      continue;
    }
    decisions.push({ subscriber: sub, email, daysSinceSubscribe: days });
    if (decisions.length >= MAX_EMAILS_PER_RUN) break;
  }

  // 3) Envoie les emails (séquentiel pour respecter rate limit Resend)
  let sent = 0;
  let failed = 0;
  const errors: Array<{ email: string; reason: string }> = [];

  for (const decision of decisions) {
    const { subscriber, email } = decision;
    const unsubscribeUrl = buildUnsubscribeUrl(subscriber.email);
    const html = renderEmailHtml(email, { unsubscribeUrl });
    const text = renderEmailText(email, { unsubscribeUrl });

    // Migration 27/04 → lib/email/client : sendEmail() ne supporte plus `tag`
    // ni `from` (FROM_EMAIL est centralisé via RESEND_FROM_EMAIL / BRAND_EMAIL).
    // Le HTML est déjà wrappé via wrapEmail() dans fiscalite-crypto-series.ts
    // → pas de double wrap, signature compatible avec opts.html brut.
    const result = await sendEmail({
      to: subscriber.email,
      subject: email.subject,
      html,
      text,
    });

    if (!result.ok) {
      failed++;
      errors.push({ email: subscriber.email, reason: result.error ?? "unknown" });
      console.error("[fiscalite-cron] send failed", {
        email: subscriber.email,
        offset: decision.daysSinceSubscribe,
        error: result.error,
      });
      continue;
    }

    sent++;
    await markSent(subscriber.email, decision.daysSinceSubscribe);
    console.log("[fiscalite-cron] sent", {
      email: subscriber.email,
      offset: decision.daysSinceSubscribe,
      resendId: result.id,
    });
  }

  const completedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - start;
  const ok = failed === 0;

  const report: RunReport = {
    ok,
    startedAt,
    completedAt,
    totalDurationMs,
    source: FISCALITE_SERIES_SOURCE,
    totalSubscribers: subscribers.length,
    candidates: decisions.length,
    sent,
    skippedAlreadySent,
    skippedNoMatch,
    failed,
    errors,
  };

  console.log("[fiscalite-cron-end]", report);
  return NextResponse.json(report, { status: ok ? 200 : 207 });
}

/**
 * Échantillon utile pour tester localement (POST ne dispatch pas le cron).
 * Garde-fou : si l'env n'est pas dev, retourne 405 pour éviter une exécution
 * non voulue depuis le navigateur.
 */
export async function POST(): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  return NextResponse.json(
    { ok: true, message: "Use GET with Authorization header in production." },
    { status: 200 },
  );
}

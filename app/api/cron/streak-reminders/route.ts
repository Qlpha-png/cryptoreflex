/**
 * GET /api/cron/streak-reminders
 * ------------------------------
 * Cron quotidien — envoie une push notification aux users qui :
 *  - Ont un streak ≥ 3 jours
 *  - N'ont PAS encore loggé aujourd'hui (last_seen_date < today)
 *
 * Objectif : éviter de perdre un streak établi (rétention par engagement).
 *
 * Schedule (vercel.json) : "0 21 * * *" UTC = 22h Paris en heure d'hiver
 * (CET) / 23h Paris en heure d'été (CEST). Compromis acceptable — l'idéal
 * serait un cron par fuseau, mais Vercel Hobby limite à un schedule unique
 * par cron.
 *
 * Sécurité : Bearer CRON_SECRET (verifyBearer).
 *
 * Anti-spam :
 *  - Une seule push par user par jour (le streak ne peut être perdu qu'une
 *    fois par 24h donc pas besoin de plus).
 *  - Skip silencieux si VAPID non configuré (sendPushToUser no-op).
 *
 * Étude #16 ETUDE-2026-05-02 — gamification rétention (V2 du chantier).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { CRON_TRACE_KEYS, writeCronTrace } from "@/lib/cron-trace";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  sendPushToUser,
  mapWithConcurrency,
  withTimeout,
  PUSH_CONCURRENCY,
  PUSH_SEND_TIMEOUT_MS,
} from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Budget par utilisateur (fetch des subs + envois bornés à PUSH_SEND_TIMEOUT_MS). */
const PUSH_JOB_TIMEOUT_MS = PUSH_SEND_TIMEOUT_MS + 3000;

interface AtRiskRow {
  user_id: string;
  streak_days: number;
  last_seen_date: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    // 401 explicite (cohérence cron, voir evaluate-alerts).
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    // 08/10/2026 (lot fraîcheur A) : ce 503 passait inaperçu ; la trace le rend visible à la sentinelle (seuil 30 h)
    await writeCronTrace(CRON_TRACE_KEYS.streakReminders, { ok: false, raison: "Supabase non configuré" });
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase not configured",
        skipped: true,
      },
      { status: 503 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  // SELECT users avec streak ≥ 3 ET last_seen != today
  const { data, error } = await supabase
    .from("user_progress")
    .select("user_id, streak_days, last_seen_date")
    .gte("streak_days", 3)
    .neq("last_seen_date", today);

  if (error) {
    console.error("[streak-reminders] select error:", error.message);
    await writeCronTrace(CRON_TRACE_KEYS.streakReminders, { ok: false, raison: "lecture de la base impossible" });
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const atRisk = (data ?? []) as AtRiskRow[];

  // AUDIT 2026-10-02 : avant, boucle séquentielle sans timeout → un seul push
  // service lent bloquait tout le cron. Désormais : concurrence bornée +
  // timeout par utilisateur (envois déjà bornés dans lib/web-push).
  const settled = await mapWithConcurrency(atRisk, PUSH_CONCURRENCY, (row) =>
    withTimeout(
      sendPushToUser(row.user_id, {
        title: `🔥 ${row.streak_days} jours de streak — ne casse pas la chaîne !`,
        body: `Connectez-vous avant minuit pour conserver votre record. Votre record perso est en jeu.`,
        url: "/mon-compte#progression",
        tag: `streak-reminder-${row.user_id}`,
      }),
      PUSH_JOB_TIMEOUT_MS,
      `streak push ${row.user_id}`,
    ),
  );

  const results: Array<{ userId: string; streak: number; pushed: boolean }> =
    atRisk.map((row, i) => {
      const r = settled[i];
      if (r.status === "rejected") {
        console.warn(
          `[streak-reminders] push failed for ${row.user_id}:`,
          r.reason instanceof Error ? r.reason.message : String(r.reason),
        );
      }
      return {
        userId: row.user_id,
        streak: row.streak_days,
        pushed: r.status === "fulfilled" && Boolean(r.value?.sent && r.value.sent > 0),
      };
    });

  const pushed = results.filter((r) => r.pushed).length;
  // trace : nombres seulement (aucun identifiant d'utilisateur)
  await writeCronTrace(CRON_TRACE_KEYS.streakReminders, { ok: true, candidates: atRisk.length, pushed, failed: settled.filter((r) => r.status === "rejected").length });

  return NextResponse.json({
    ok: true,
    runAt: new Date().toISOString(),
    candidates: atRisk.length,
    pushed,
    results: results.slice(0, 50), // tronqué pour ne pas blow up le payload
  });
}

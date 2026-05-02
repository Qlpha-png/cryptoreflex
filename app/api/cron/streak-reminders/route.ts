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
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AtRiskRow {
  user_id: string;
  streak_days: number;
  last_seen_date: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
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
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const atRisk = (data ?? []) as AtRiskRow[];
  const results: Array<{ userId: string; streak: number; pushed: boolean }> = [];

  for (const row of atRisk) {
    let pushed = false;
    try {
      const r = await sendPushToUser(row.user_id, {
        title: `🔥 ${row.streak_days} jours de streak — ne casse pas la chaîne !`,
        body: `Connecte-toi avant minuit pour conserver ton record. Ton record perso est en jeu.`,
        url: "/mon-compte#progression",
        tag: `streak-reminder-${row.user_id}`,
      });
      pushed = Boolean(r?.sent && r.sent > 0);
    } catch (err) {
      console.warn(
        `[streak-reminders] push failed for ${row.user_id}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
    results.push({
      userId: row.user_id,
      streak: row.streak_days,
      pushed,
    });
  }

  return NextResponse.json({
    ok: true,
    runAt: new Date().toISOString(),
    candidates: atRisk.length,
    pushed: results.filter((r) => r.pushed).length,
    results: results.slice(0, 50), // tronqué pour ne pas blow up le payload
  });
}

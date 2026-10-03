/**
 * GET /api/cron/reflex-cards-push — notifications Reflex Cards (PWA du jeu, option A, Kev 03/10/2026).
 * Toutes les 15 minutes (vercel.json). Abonnés : sujet « cartes » de user_push_subscriptions, choisi dans le jeu.
 * Règles pures et testées dans lib/reflex-cards/push.ts :
 *  1. « réserve pleine » — stock_at + (10 − stock) × 15 min dépassé ; marqueur KV rc:push:full:<partie> (jamais deux fois
 *     pour la même réserve, ni en moins de 2 h 30) ;
 *  2. « quiz du jour » — une fois par jour (fenêtre 18 h-19 h Paris, marqueur KV rc:push:quiz:<date>), aux joueurs actifs
 *     qui ne l'ont pas encore joué (jalon z|date dans rc_claims) ;
 *  3. « nouvelle sortie » — le calendrier effectif (lib/reflex-cards/releases.ts) a une partie de plus que le dernier
 *     passage (KV rc:push:releases:v1) → tous les abonnés. Premier passage : le calendrier est seulement mémorisé
 *     (aucune annonce pour les sorties déjà anciennes).
 * Jamais entre 22 h et 8 h (Paris). Sécurité : Bearer CRON_SECRET (verifyBearer). Sans VAPID ou jeu coupé : no-op.
 * Modèle : app/api/cron/streak-reminders/route.ts (concurrence bornée + délai par envoi).
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getKv } from "@/lib/kv";
import { isReflexCardsEnabled, reflexAccountsMode } from "@/lib/reflex-cards/flag";
import { parisToday } from "@/lib/reflex-cards/season";
import { releases } from "@/lib/reflex-cards/releases";
import {
  getVapidConfig, listUserIdsForTopic, mapWithConcurrency, sendPushToTopic, withTimeout, PUSH_CONCURRENCY, PUSH_SEND_TIMEOUT_MS,
} from "@/lib/web-push";
import {
  KV_FULL, KV_QUIZ, KV_RELEASES, MSG, TOPIC, isActive, isQuietHour, newReleases, planFull, quizWindow, type FullCandidate, type FullMark,
} from "@/lib/reflex-cards/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** budget par joueur (envois déjà bornés à PUSH_SEND_TIMEOUT_MS dans lib/web-push) */
const JOB_TIMEOUT_MS = PUSH_SEND_TIMEOUT_MS + 3000;
/** identifiants par requête PostgREST (longueur d'URL) */
const CHUNK = 100;
const chunks = <T>(a: readonly T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));
const sentCount = (settled: PromiseSettledResult<{ sent: number }>[]) => settled.reduce((n, r) => n + (r.status === "fulfilled" && r.value.sent > 0 ? 1 : 0), 0);

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verifyBearer(req, process.env.CRON_SECRET)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isReflexCardsEnabled() || reflexAccountsMode() === "off") return NextResponse.json({ ok: true, skipped: "reflex-cards-off" });
  if (!getVapidConfig()) return NextResponse.json({ ok: true, skipped: "vapid" });
  const now = new Date();
  const runAt = now.toISOString();
  if (isQuietHour(now)) return NextResponse.json({ ok: true, runAt, skipped: "quiet-hours" });
  const sb = createSupabaseServiceRoleClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  const kv = getKv();
  const today = parisToday(now);

  const users = await listUserIdsForTopic(TOPIC);
  if (!users.length) return NextResponse.json({ ok: true, runAt, subscribers: 0 });

  /* les parties des abonnés (comptes seulement : un invité n'a pas de compte, donc pas de souscription) */
  const players: FullCandidate[] = [];
  for (const ids of chunks(users, CHUNK)) {
    const { data, error } = await sb.from("rc_players").select("player_id, owner, stock, stock_at, updated_at, days").in("owner", ids);
    if (error) {
      console.error("[reflex-cards-push] rc_players:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    for (const r of data ?? []) {
      players.push({
        player_id: String(r.player_id), owner: String(r.owner), stock: Number(r.stock), stock_at: String(r.stock_at),
        updated_at: String(r.updated_at), days: Array.isArray(r.days) ? (r.days as string[]) : [],
      });
    }
  }

  /* 1. réserve pleine */
  const fullTargets: FullCandidate[] = [];
  for (const p of players) {
    const mark = await kv.get<FullMark>(KV_FULL + p.player_id).catch(() => null);
    if (planFull(p, mark, now.getTime(), today)) fullTargets.push(p);
  }
  const fullSettled = await mapWithConcurrency(fullTargets, PUSH_CONCURRENCY, async (p) => {
    const r = await withTimeout(sendPushToTopic(TOPIC, [p.owner], MSG.full), JOB_TIMEOUT_MS, `réserve pleine ${p.player_id}`);
    /* marqueur posé même sans envoi réussi (souscription expirée, purgée) : pas de nouvel essai toutes les 15 minutes */
    const mark: FullMark = { at: now.getTime(), stockAt: p.stock_at };
    await kv.set(KV_FULL + p.player_id, mark, { ex: 30 * 86_400 }).catch(() => {});
    return r;
  });

  /* 2. quiz du jour */
  const quiz = { window: quizWindow(now), candidates: 0, sent: 0 };
  if (quiz.window && !(await kv.get(KV_QUIZ + today).catch(() => null))) {
    await kv.set(KV_QUIZ + today, runAt, { ex: 2 * 86_400 }).catch(() => {}); // avant l'envoi : une seule fois par jour
    const active = players.filter((p) => isActive(p.days, today));
    const done = new Set<string>();
    for (const ids of chunks(active.map((p) => p.player_id), CHUNK)) {
      const { data, error } = await sb.from("rc_claims").select("player_id").eq("key", "z|" + today).in("player_id", ids);
      if (error) { console.warn("[reflex-cards-push] rc_claims:", error.message); continue; }
      for (const r of data ?? []) done.add(String(r.player_id));
    }
    const targets = active.filter((p) => !done.has(p.player_id));
    quiz.candidates = targets.length;
    const settled = await mapWithConcurrency(targets, PUSH_CONCURRENCY, (p) =>
      withTimeout(sendPushToTopic(TOPIC, [p.owner], MSG.quiz), JOB_TIMEOUT_MS, `quiz ${p.player_id}`),
    );
    quiz.sent = sentCount(settled);
  }

  /* 3. nouvelle sortie */
  const rel = await releases();
  const stored = await kv.get<{ dates?: (string | null)[] }>(KV_RELEASES).catch(() => null);
  const release = { init: !stored, parts: [] as number[], sent: 0 };
  if (!stored) await kv.set(KV_RELEASES, { dates: rel.dates }).catch(() => {});
  else {
    release.parts = newReleases(rel.dates, stored.dates ?? [], today);
    if (release.parts.length) {
      await kv.set(KV_RELEASES, { dates: rel.dates }).catch(() => {}); // avant l'envoi : jamais deux annonces
      for (const i of release.parts) {
        const settled = await mapWithConcurrency(chunks(users, 200), 2, (ids) =>
          withTimeout(sendPushToTopic(TOPIC, ids, MSG.release(i)), 20_000, `sortie ${i}`),
        );
        release.sent += settled.reduce((n, r) => n + (r.status === "fulfilled" ? r.value.sent : 0), 0);
      }
    }
  }

  return NextResponse.json({
    ok: true, runAt, today, subscribers: users.length, players: players.length,
    full: { candidates: fullTargets.length, sent: sentCount(fullSettled) },
    quiz, release,
  });
}

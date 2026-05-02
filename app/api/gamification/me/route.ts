/**
 * GET /api/gamification/me — état progression du user courant.
 *
 * Comportement :
 *  - Auth obligatoire (sinon 401)
 *  - Ping daily visit (incrémente streak + 5 XP si first hit du jour)
 *  - Retourne progress complet (xp, level, streak, badges, derived metrics)
 *
 * Cache : aucun (private user-specific). Le client peut re-fetch au visibilitychange.
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import {
  pingDailyVisit,
  levelFromXp,
  xpToNextLevel,
  percentToNextLevel,
  BADGES,
} from "@/lib/gamification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connexion requise.", needsAuth: true },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const progress = await pingDailyVisit(user.id);
  if (!progress) {
    // Service indisponible (Supabase off ou row inserrable). On renvoie un
    // état "neutre" plutôt que 500 pour ne pas casser l'UI.
    return NextResponse.json(
      {
        ok: true,
        progress: {
          xp: 0,
          level: 1,
          streakDays: 0,
          bestStreak: 0,
          badges: [],
          xpToNext: 100,
          percentToNext: 0,
          allBadges: BADGES.map((b) => ({
            id: b.id,
            name: b.name,
            description: b.description,
            icon: b.icon,
            unlocked: false,
          })),
        },
        degraded: true,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const unlockedSet = new Set(progress.badges);
  return NextResponse.json(
    {
      ok: true,
      progress: {
        xp: progress.xp,
        level: progress.level,
        streakDays: progress.streakDays,
        bestStreak: progress.bestStreak,
        badges: progress.badges,
        xpToNext: xpToNextLevel(progress.xp),
        percentToNext: percentToNextLevel(progress.xp),
        allBadges: BADGES.map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          icon: b.icon,
          unlocked: unlockedSet.has(b.id),
        })),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

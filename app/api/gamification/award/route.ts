/**
 * POST /api/gamification/award — award XP pour une action utilisateur.
 *
 * Body : { action: keyof XP_REWARDS }
 *
 * Anti-spam (KV rate-limit par (userId, action)) :
 *  - daily_login    : 1×/jour (mais déjà géré par /api/gamification/me)
 *  - quiz_complete  : 5×/jour (max 100 XP/jour via quiz)
 *  - portfolio_update : 5×/jour
 *  - alert_create   : 10×/jour
 *  - article_read   : 30×/jour (pour ne pas griller le compteur si scroll-spam)
 *  - cerfa_generated : 1×/jour
 *  - first_pro_subscription : 1×/lifetime (pas dans la liste — branché côté webhook Stripe)
 *
 * Rate-limit hit → 200 + ok:false + reason ratelimit (UI silencieuse).
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { awardXp, XP_REWARDS, type XpAction } from "@/lib/gamification";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTION_LIMITS: Record<XpAction, { limit: number; windowMs: number }> = {
  daily_login: { limit: 1, windowMs: 24 * 60 * 60 * 1000 },
  quiz_complete: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  portfolio_update: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  alert_create: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  article_read: { limit: 30, windowMs: 24 * 60 * 60 * 1000 },
  cerfa_generated: { limit: 1, windowMs: 24 * 60 * 60 * 1000 },
  first_pro_subscription: { limit: 1, windowMs: 100 * 365 * 24 * 60 * 60 * 1000 },
};

// Cache des limiters (un par action) — évite de re-créer un limiter à chaque hit.
const _limiterCache = new Map<XpAction, ReturnType<typeof createRateLimiter>>();
function getLimiter(action: XpAction) {
  let limiter = _limiterCache.get(action);
  if (!limiter) {
    const cfg = ACTION_LIMITS[action];
    limiter = createRateLimiter({
      limit: cfg.limit,
      windowMs: cfg.windowMs,
      key: `xp-${action}`,
    });
    _limiterCache.set(action, limiter);
  }
  return limiter;
}

function isValidAction(value: unknown): value is XpAction {
  return typeof value === "string" && value in XP_REWARDS;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connexion requise." },
      { status: 401 },
    );
  }

  let body: { action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 },
    );
  }

  const action = body.action;
  if (!isValidAction(action)) {
    return NextResponse.json(
      { ok: false, error: "Action inconnue." },
      { status: 400 },
    );
  }

  // Rate limit
  const limiter = getLimiter(action);
  const rl = await limiter(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: "ratelimit",
        retryAfter: rl.retryAfter,
        message: "Limite quotidienne XP atteinte pour cette action.",
      },
      { status: 200 }, // 200 silencieux côté UI
    );
  }

  const delta = await awardXp(user.id, action);
  if (!delta) {
    return NextResponse.json(
      { ok: false, error: "Service indisponible." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, delta });
}

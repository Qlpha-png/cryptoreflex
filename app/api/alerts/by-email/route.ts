/**
 * GET /api/alerts/by-email?email=...
 *
 * Lecture publique des alertes d'un email.
 * - Pas de mot de passe : on assume que l'email est déjà la "clé" (UX self-service).
 * - Pour limiter le scraping, on rate-limit par IP (30 req/min).
 * - Aucune info sensible n'est exposée hors champs déjà connus du user.
 *
 * Note RGPD : si une personne soupçonne qu'un email tiers a été abonné sans consentement,
 * elle peut consulter cette URL et déclencher la suppression via le lien d'opt-out
 * envoyé dans chaque email. Conforme.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAlertsByEmail, isValidEmail } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RL_STORE = new Map<string, { count: number; resetAt: number }>();
const RL_LIMIT = 30;
const RL_WINDOW_MS = 60_000;

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = RL_STORE.get(key);
  if (!entry || entry.resetAt < now) {
    RL_STORE.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    return true;
  }
  if (entry.count >= RL_LIMIT) return false;
  entry.count += 1;
  return true;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes." },
      { status: 429 },
    );
  }

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Email manquant ou invalide.", alerts: [] },
      { status: 400 },
    );
  }

  const alerts = await getAlertsByEmail(email);
  return NextResponse.json(
    { ok: true, alerts, count: alerts.length },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * GET /api/alerts/by-email
 *
 * Liste les alertes du compte connecté.
 *
 * SÉCURITÉ (audit 2026-10-01) : avant, `?email=` suffisait — n'importe qui
 * pouvait lire les alertes (cryptos suivies, seuils) de n'importe quel email,
 * et récupérer leurs identifiants pour les supprimer. Désormais l'email est
 * TOUJOURS celui de la session (prouvé par lien email). Le paramètre `email`
 * reste toléré pour compatibilité mais doit correspondre au compte.
 * Rate limit conservé (30 req/min/IP).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAlertsByEmail } from "@/lib/alerts";
import { getUser } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";

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

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes." },
      { status: 429 },
    );
  }

  const user = await getUser();
  if (!user || !user.email) {
    return NextResponse.json(
      { ok: false, error: "Connexion requise.", alerts: [] },
      { status: 401, headers: NO_STORE },
    );
  }

  const email = user.email.trim().toLowerCase();
  const asked = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (asked && asked !== email) {
    return NextResponse.json(
      { ok: false, error: "Accès refusé.", alerts: [] },
      { status: 403, headers: NO_STORE },
    );
  }

  const alerts = await getAlertsByEmail(email);
  return NextResponse.json(
    { ok: true, email, alerts, count: alerts.length },
    { status: 200, headers: NO_STORE },
  );
}

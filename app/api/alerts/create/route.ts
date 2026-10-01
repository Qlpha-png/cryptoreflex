/**
 * POST /api/alerts/create
 *
 * Body : { cryptoId, condition: "above"|"below", threshold, currency: "eur"|"usd" }
 *
 * Sécurité :
 *  - Session obligatoire (audit 2026-10-01) : l'email destinataire est TOUJOURS
 *    celui du compte connecté (prouvé par lien email). Avant, n'importe qui
 *    pouvait abonner l'email d'un tiers à 100 alertes (harcèlement / spam).
 *  - Rate limit 10 req/min/IP
 *  - CSRF léger : vérification du header `Origin` same-origin (skip si mocked)
 *  - Validation full côté serveur (jamais faire confiance au client)
 *
 * Réponse :
 *  - 200 + { ok: true, alert: PriceAlert } si OK
 *  - 400 + { ok: false, error, field? } si validation
 *  - 429 si rate limit
 */

import { NextRequest, NextResponse } from "next/server";
import { createAlert } from "@/lib/alerts";
import { getKv } from "@/lib/kv";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { getLimits } from "@/lib/limits";
import { getUser } from "@/lib/auth";
import { awardXp } from "@/lib/gamification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// FIX P0 audit-fonctionnel-live-final #4 : namespace KV pour isoler les compteurs.
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, key: "alerts-create" });
// XP : même quota que /api/gamification/award (10 / jour / user) — sinon une
// boucle créer/supprimer donnait de l'XP illimitée.
const xpLimiter = createRateLimiter({ limit: 10, windowMs: 24 * 60 * 60 * 1000, key: "xp-alert_create" });

/**
 * CSRF léger : on accepte uniquement les Origins same-host.
 * - Skip si `Origin` header absent (curl, server-to-server)
 * - Skip en mode mocked (KV non configuré → on dev / preview).
 */
function isOriginAllowed(req: NextRequest): boolean {
  if (getKv().mocked) return true; // dev / preview
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const host = req.headers.get("host");
    return Boolean(host) && o.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives — réessaie dans une minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // CSRF léger
  if (!isOriginAllowed(req)) {
    return NextResponse.json(
      { ok: false, error: "Origine non autorisée." },
      { status: 403 },
    );
  }

  const user = await getUser();
  if (!user || !user.email) {
    return NextResponse.json(
      {
        ok: false,
        error: "Connectez-vous pour créer une alerte (un lien par email suffit, sans mot de passe).",
      },
      { status: 401 },
    );
  }

  // Parse body
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const body = payload as {
    cryptoId?: unknown;
    condition?: unknown;
    threshold?: unknown;
    currency?: unknown;
  };

  const email = user.email;
  const cryptoId = typeof body.cryptoId === "string" ? body.cryptoId : "";
  const condition = body.condition === "below" ? "below" : "above";
  const currency = body.currency === "usd" ? "usd" : "eur";

  // Threshold accepte string | number côté front (input HTML renvoie string)
  let threshold: number;
  if (typeof body.threshold === "number") {
    threshold = body.threshold;
  } else if (typeof body.threshold === "string") {
    // Accepte "50000", "50 000", "50000.5", "50,5"
    const cleaned = body.threshold.replace(/\s/g, "").replace(",", ".");
    threshold = Number(cleaned);
  } else {
    threshold = NaN;
  }

  // DÉMONÉTISATION (juin 2026) — Cryptoreflex est 100 % gratuit : il n'y a plus
  // de plan payant qui débloque « plus d'alertes ». Tout le monde reçoit la
  // limite la plus haute accordée par le site (anciennement le palier Pro).
  // On garde un plafond technique anti-abus (spam d'emails d'alerte) mais sans
  // aucune distinction de plan ni message commercial.
  const alertsLimit = getLimits("pro_annual").alerts;

  const result = await createAlert(
    { email, cryptoId, condition, threshold, currency },
    alertsLimit
  );
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  // Étude #16 ETUDE-2026-05-02 — gamification : award XP. Best-effort, non bloquant.
  try {
    if ((await xpLimiter(user.id)).ok) await awardXp(user.id, "alert_create");
  } catch (err) {
    console.warn(
      "[alerts/create] awardXp failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  return NextResponse.json(
    { ok: true, alert: result.alert, mocked: getKv().mocked },
    { status: 200 },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      service: "Alertes prix Cryptoreflex",
      method: "POST",
      contract: {
        auth: "session Supabase requise (email = celui du compte)",
        body: {
          cryptoId: "string (CoinGecko id ou symbol ou slug Cryptoreflex)",
          condition: "above | below",
          threshold: "number > 0",
          currency: "eur | usd",
        },
      },
    },
    { status: 200 },
  );
}

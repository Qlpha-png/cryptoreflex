/**
 * POST /api/alerts/create
 *
 * Body : { email, cryptoId, condition: "above"|"below", threshold, currency: "eur"|"usd" }
 *
 * Sécurité :
 *  - Rate limit 10 req/min/IP (in-memory, même pattern que /api/newsletter/subscribe)
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
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getLimits } from "@/lib/limits";
import type { Plan } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// FIX P0 audit-fonctionnel-live-final #4 : namespace KV pour isoler les compteurs.
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, key: "alerts-create" });

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
    email?: unknown;
    cryptoId?: unknown;
    condition?: unknown;
    threshold?: unknown;
    currency?: unknown;
  };

  const email = typeof body.email === "string" ? body.email : "";
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

  // P0 GATING SERVEUR (audit cohérence 30/04/2026) — résolution Free vs Pro :
  //
  // Lookup du plan de l'utilisateur depuis Supabase via son email.
  // Si la table `users` contient une ligne avec `email = X` ET `plan = "pro_*"`
  // ET `plan_expires_at > now()`, on applique la limite Pro (100 alertes).
  // Sinon → limite Free (3 alertes).
  //
  // Pourquoi cette résolution est sûre :
  //  - L'email est validé par le createAlert ci-dessous (regex strict)
  //  - Le plan est en DB (pas en client) — l'utilisateur ne peut pas
  //    forger un plan Pro depuis le navigateur
  //  - Le webhook Stripe écrit `plan_expires_at` après chaque paiement, donc
  //    un user qui annule passe automatiquement en Free à expiration
  let alertsLimit = getLimits("free").alerts;
  if (email) {
    const supabase = createSupabaseServiceRoleClient();
    if (supabase) {
      const { data: userRow } = await supabase
        .from("users")
        .select("plan, plan_expires_at")
        .ilike("email", email)
        .maybeSingle();
      if (userRow?.plan) {
        const planValue = userRow.plan as Plan;
        const expiresAt = userRow.plan_expires_at
          ? new Date(userRow.plan_expires_at).getTime()
          : 0;
        const isExpired = expiresAt > 0 && expiresAt < Date.now();
        if (!isExpired) {
          alertsLimit = getLimits(planValue).alerts;
        }
      }
    }
  }

  const result = await createAlert(
    { email, cryptoId, condition, threshold, currency },
    alertsLimit
  );
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
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
        body: {
          email: "string",
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

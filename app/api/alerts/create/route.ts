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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---- Rate limiter in-memory (helper unifié `lib/rate-limit.ts`) ----
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

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
  const rl = limiter(ip);
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

  const result = await createAlert({ email, cryptoId, condition, threshold, currency });
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

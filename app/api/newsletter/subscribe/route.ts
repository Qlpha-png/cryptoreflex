import { NextRequest, NextResponse } from "next/server";
import { subscribe, isValidEmail, type SubscribeSource } from "@/lib/newsletter";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

/**
 * POST /api/newsletter/subscribe
 *
 * Body : { email: string, source?: string, utm?: { source, medium, campaign } }
 *
 * Sécurité :
 *  - Validation email serveur (jamais faire confiance au client).
 *  - Rate limit 10 req/min/IP via mémo cache (suffisant pour V1, à upgrader
 *    avec Upstash Redis quand le trafic dépasse ~100 req/s, voir TODO).
 *  - Pas de CORS — on attend uniquement des appels same-origin depuis le site.
 *
 * Pourquoi runtime nodejs et pas edge ?
 *  - On veut `console.error` lisible dans Vercel logs + `AbortSignal.timeout`
 *    qui marche pareil partout. Edge OK aussi mais aucun gain ici (Beehiiv
 *    est l'étape lente, pas notre handler).
 */

export const runtime = "nodejs";
// Cette route est dynamique par essence (input client variable, IP) — désactiver
// le cache statique évite les surprises type "200 vide" en prod.
export const dynamic = "force-dynamic";

// ---------- Rate limiter en mémoire (V1) ----------
// Limite : 10 inscriptions/minute par IP. Largement assez pour usage humain
// honnête, bloque les bots basiques. Helper unifié `lib/rate-limit.ts`.
// Pas distribué -> ne survit pas aux redémarrages / multi-instances.
// Pour scale -> Upstash Redis + sliding window.
// FIX P0 audit-fonctionnel-live-final #4 : namespace KV pour isoler les compteurs.
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000, key: "newsletter-subscribe" });

const ALLOWED_SOURCES: ReadonlySet<SubscribeSource> = new Set<SubscribeSource>([
  "inline",
  "popup",
  "newsletter-page",
  "footer",
  "blog-cta",
  "pro-waitlist",
  "unknown",
]);

export async function POST(req: NextRequest) {
  // ---- Rate limit ----
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives. Réessaie dans une minute." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      }
    );
  }

  // ---- Parse body (defensif : peut être vide ou non-JSON) ----
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requête invalide." },
      { status: 400 }
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { ok: false, error: "Requête invalide." },
      { status: 400 }
    );
  }

  const body = payload as {
    email?: unknown;
    source?: unknown;
    utm?: { source?: unknown; medium?: unknown; campaign?: unknown };
  };

  // ---- Validation email ----
  if (typeof body.email !== "string" || !isValidEmail(body.email)) {
    return NextResponse.json(
      { ok: false, error: "Adresse email invalide." },
      { status: 400 }
    );
  }

  // ---- Source whitelist (évite l'injection libre dans les UTM Beehiiv) ----
  const sourceCandidate =
    typeof body.source === "string" ? (body.source as SubscribeSource) : "unknown";
  const source: SubscribeSource = ALLOWED_SOURCES.has(sourceCandidate)
    ? sourceCandidate
    : "unknown";

  const utm = body.utm ?? {};
  const result = await subscribe({
    email: body.email.trim().toLowerCase(),
    source,
    utmSource: typeof utm.source === "string" ? utm.source : undefined,
    utmMedium: typeof utm.medium === "string" ? utm.medium : undefined,
    utmCampaign: typeof utm.campaign === "string" ? utm.campaign : undefined,
    ip,
  });

  if (!result.ok) {
    // 502 = problème côté provider (Beehiiv) -> distingue d'un 400 (input user)
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status && result.status >= 400 && result.status < 500 ? 400 : 502 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      mocked: "mocked" in result ? result.mocked : false,
    },
    { status: 200 }
  );
}

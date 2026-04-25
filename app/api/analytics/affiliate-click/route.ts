/**
 * POST /api/analytics/affiliate-click
 *
 * Body : { platformId: string, placement?: string, cta?: string | null }
 *
 * Persist KV :
 *   `analytics:aff-click:{platformId}:{placement}:{YYYYMMDD}` → INCR
 *   `analytics:aff-click:total:{platformId}`                  → INCR cumulé
 *
 * Indépendant de Plausible : permet d'avoir un dashboard /admin/stats
 * fonctionnel même si l'utilisateur a refusé le consent analytics
 * (les compteurs KV sont anonymes — aucune PII, aucun cookie).
 *
 * Sécurité :
 *  - Rate limit 60 req/min/IP (humains réels < 10/min, mais on tolère
 *    les bots/curieux honnêtes qui scrollent rapidement).
 *  - Validation `platformId` : alphanum + tirets, 2-40 chars.
 *  - Validation `placement` : alphanum + tirets, 1-40 chars (sinon "unknown").
 *  - `cta` clampé à 80 chars (assez pour le wording d'un bouton).
 *  - Réponse no-block (204) — fire-and-forget côté client.
 *
 * Volumétrie : 2 INCR par clic. Free tier Upstash (10k cmd/jour) supporte
 * ~5000 clics affiliés/jour avant facturation. Largement OK pour Cryptoreflex V1.
 */

import { NextRequest, NextResponse } from "next/server";
import { getKv } from "@/lib/kv";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000, key: "analytics-aff-click" });

/** TTL des compteurs jour (60 jours = ~2 mois de données). */
const DAILY_TTL_SEC = 60 * 24 * 60 * 60;
/** TTL des compteurs cumulés (1 an). */
const TOTAL_TTL_SEC = 365 * 24 * 60 * 60;

/** ID alphanum + tirets, 2-40 chars. */
const ID_REGEX = /^[a-z0-9][a-z0-9-]{1,39}$/;

function sanitizeId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  return ID_REGEX.test(s) ? s : null;
}

/** YYYYMMDD UTC pour le bucket jour. */
function todayUtcKey(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const body = payload as { platformId?: unknown; placement?: unknown; cta?: unknown };

  const platformId = sanitizeId(body.platformId);
  if (!platformId) {
    return NextResponse.json({ ok: false, error: "invalid_platformId" }, { status: 400 });
  }
  const placement = sanitizeId(body.placement) ?? "unknown";

  // cta : on stocke le wording réel pour analyse côté admin, mais pas dans
  // la clé KV (sinon explosion de cardinalité). Pour V1, on n'en fait rien
  // côté serveur — on le laisse uniquement dans Plausible. Si on veut
  // persister par CTA, ajouter une clé `analytics:aff-click:cta:{platformId}:{ctaHash}`
  // (V2). Pour l'instant on l'accepte juste pour valider le schéma client.
  const cta = typeof body.cta === "string" ? body.cta.slice(0, 80) : null;
  void cta; // Réservé pour V2 (cf. ci-dessus).

  const kv = getKv();
  const day = todayUtcKey();
  const dayKey = `analytics:aff-click:${platformId}:${placement}:${day}`;
  const totalKey = `analytics:aff-click:total:${platformId}`;

  try {
    const [curDay, curTotal] = await Promise.all([
      kv.get<number>(dayKey),
      kv.get<number>(totalKey),
    ]);
    await Promise.all([
      kv.set(dayKey, (curDay ?? 0) + 1, { ex: DAILY_TTL_SEC }),
      kv.set(totalKey, (curTotal ?? 0) + 1, { ex: TOTAL_TTL_SEC }),
    ]);
  } catch (err) {
    console.warn("[analytics/affiliate-click] KV error:", err);
  }

  return new NextResponse(null, { status: 204 });
}

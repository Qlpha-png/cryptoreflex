/**
 * POST /api/abtest/exposure
 *
 * Body : { experimentId: string, variant: string, sessionId?: string }
 *
 * Persist KV : `abtest:exposure:{experimentId}:{variant}` → counter INCR.
 *
 * Sécurité :
 *  - Rate limit léger 30 req/min/IP (analytics légitime ≪ ce volume).
 *  - Validation stricte : experimentId / variant doivent matcher EXPERIMENTS.
 *    Empêche un attaquant de polluer le KV avec des clés arbitraires.
 *  - Réponse rapide (no-block) : on incrémente puis on retourne 204.
 *
 * Volumétrie : 1 INCR + ttl par exposure. Free tier Upstash (10k cmd/jour)
 * supporte ~5000 exposures/jour. Au-delà, batcher côté client (debounce 5s)
 * ou migrer vers Plausible Goals (qui agrègent côté provider).
 */

import { NextRequest, NextResponse } from "next/server";
import { getKv } from "@/lib/kv";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { EXPERIMENTS } from "@/lib/abtest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000, key: "abtest-exposure" });

/**
 * TTL des compteurs (secondes). 90 jours = on garde 3 mois de données pour
 * pouvoir comparer les semaines successives sur une expé qui dure.
 */
const COUNTER_TTL_SEC = 90 * 24 * 60 * 60;

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

  const body = payload as { experimentId?: unknown; variant?: unknown };
  const experimentId =
    typeof body.experimentId === "string" ? body.experimentId.trim() : "";
  const variant = typeof body.variant === "string" ? body.variant.trim() : "";

  // Whitelist serveur : refuse les expé/variant inconnus (anti-pollution KV).
  const exp = EXPERIMENTS[experimentId];
  if (!exp || !exp.variants.includes(variant)) {
    return NextResponse.json({ ok: false, error: "unknown_experiment_or_variant" }, { status: 400 });
  }

  const kv = getKv();
  const key = `abtest:exposure:${experimentId}:${variant}`;

  // INCR-like via get/set : on n'expose pas `incr` dans le wrapper KV V1.
  // Tolérant aux races (analytics, pas de billing) — cf. lib/rate-limit.ts.
  try {
    const current = (await kv.get<number>(key)) ?? 0;
    await kv.set(key, current + 1, { ex: COUNTER_TTL_SEC });
  } catch (err) {
    // Fail-open : on n'échoue jamais une analytics call.
    console.warn("[abtest/exposure] KV error:", err);
  }

  // 204 = no content, réponse minimale (pas de body parsé côté client).
  return new NextResponse(null, { status: 204 });
}

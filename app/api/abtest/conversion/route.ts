/**
 * POST /api/abtest/conversion
 *
 * Body : { experimentId: string, variant: string, conversionType: string }
 *   conversionType ∈ { "newsletter-signup", "affiliate-click", "alert-create",
 *                      "tool-usage", "outbound", "custom" }  (whitelist soft)
 *
 * Persist KV :
 *   `abtest:conversion:{experimentId}:{variant}`              → total conversions
 *   `abtest:conversion:{experimentId}:{variant}:{type}`       → conversions par type
 *
 * Sécurité :
 *  - Rate limit 30 req/min/IP (idem exposure).
 *  - Validation stricte experimentId/variant via EXPERIMENTS.
 *  - `conversionType` clampé à 32 chars + alphanumérique simple.
 *
 * Volumétrie : 2 INCR par conversion (total + par type). Analyse globale via
 * /admin/stats (cf. app/admin/stats/page.tsx).
 */

import { NextRequest, NextResponse } from "next/server";
import { getKv } from "@/lib/kv";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { EXPERIMENTS } from "@/lib/abtest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000, key: "abtest-conversion" });
const COUNTER_TTL_SEC = 90 * 24 * 60 * 60; // 90 j (idem exposure)

/** Conversions reconnues — soft whitelist pour éviter la prolifération de types. */
const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "newsletter-signup",
  "affiliate-click",
  "alert-create",
  "tool-usage",
  "outbound",
  "custom",
]);

/** Clamp + sanitize conversionType (alphanum + tirets / underscores, max 32 chars). */
function sanitizeType(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  if (!cleaned) return "custom";
  if (!ALLOWED_TYPES.has(cleaned)) return "custom";
  return cleaned;
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

  const body = payload as {
    experimentId?: unknown;
    variant?: unknown;
    conversionType?: unknown;
  };
  const experimentId =
    typeof body.experimentId === "string" ? body.experimentId.trim() : "";
  const variant = typeof body.variant === "string" ? body.variant.trim() : "";
  const rawType = typeof body.conversionType === "string" ? body.conversionType : "custom";

  const exp = EXPERIMENTS[experimentId];
  if (!exp || !exp.variants.includes(variant)) {
    return NextResponse.json({ ok: false, error: "unknown_experiment_or_variant" }, { status: 400 });
  }
  const type = sanitizeType(rawType);

  const kv = getKv();
  const totalKey = `abtest:conversion:${experimentId}:${variant}`;
  const typeKey = `abtest:conversion:${experimentId}:${variant}:${type}`;

  try {
    const [curTotal, curType] = await Promise.all([
      kv.get<number>(totalKey),
      kv.get<number>(typeKey),
    ]);
    await Promise.all([
      kv.set(totalKey, (curTotal ?? 0) + 1, { ex: COUNTER_TTL_SEC }),
      kv.set(typeKey, (curType ?? 0) + 1, { ex: COUNTER_TTL_SEC }),
    ]);
  } catch (err) {
    console.warn("[abtest/conversion] KV error:", err);
  }

  return new NextResponse(null, { status: 204 });
}

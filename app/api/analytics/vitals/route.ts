/**
 * /api/analytics/vitals — POST endpoint pour collecter les Core Web Vitals
 * envoyés par <WebVitalsReporter /> côté browser.
 *
 * Storage : Upstash KV via `lib/kv.ts`. Deux clés par métrique :
 *  - `vitals:samples:${name}` : liste rolling (LPUSH + LREM/LTRIM-like). On
 *    garde les ~1000 derniers samples pour calculer p75 / p95 ad-hoc dans
 *    le dashboard /admin/vitals.
 *  - `vitals:p75:${name}` : valeur agrégée (recalculée toutes les ~50 nouvelles
 *    valeurs pour limiter le coût compute du tri).
 *
 * Runtime "edge" — minimal latency + global region. La route est
 * idempotente, pas de side-effect lourd, parfait pour Edge.
 *
 * Sécurité :
 *  - Pas d'auth nécessaire : data publique (aucun PII).
 *  - Validation stricte du body avant write KV (pas de garbage).
 *  - Limite douce : si name pas dans la whitelist, on drop silencieusement
 *    pour éviter qu'un attaquant ne crée 10k clés `vitals:samples:LOLZ`.
 */

import { NextResponse } from "next/server";
import { getKv } from "@/lib/kv";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { VITALS_BOT_UA } from "@/lib/web-vitals-sampling";

export const runtime = "edge";

// Pas de cache CDN — chaque POST doit aller jusqu'à la fonction.
export const dynamic = "force-dynamic";

const VITAL_NAMES = ["LCP", "CLS", "INP", "FCP", "TTFB"] as const;
type VitalName = (typeof VITAL_NAMES)[number];

const RATINGS = ["good", "needs-improvement", "poor"] as const;
type Rating = (typeof RATINGS)[number];

interface VitalSample {
  name: VitalName;
  value: number;
  id: string;
  rating: Rating;
  url: string;
  /** Timestamp d'arrivée serveur (ms epoch). */
  ts: number;
}

const MAX_SAMPLES = 1000;
/** Recalcule p75 toutes les N nouvelles valeurs pour amortir le tri. */
const RECOMPUTE_EVERY = 50;

function isVitalName(s: unknown): s is VitalName {
  return typeof s === "string" && (VITAL_NAMES as readonly string[]).includes(s);
}

function isRating(s: unknown): s is Rating {
  return typeof s === "string" && (RATINGS as readonly string[]).includes(s);
}

/**
 * Calcul p75 standard : on trie ascendant, on prend l'index floor(0.75 * (n-1)).
 * On reste sur du JS pur (pas de lib) — le n est borné à 1000.
 */
function p75(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(0.75 * (sorted.length - 1));
  return sorted[idx] ?? 0;
}

/**
 * AUDIT SÉCURITÉ 2026-10-02 — rate limit par IP : chaque POST = 1 à ~50
 * commandes KV (LPUSH, trim, p75). Sans limite, un script pouvait vider le
 * quota Upstash et noyer les vraies mesures. 60/min couvre largement un
 * visiteur réel (≤ 5 métriques par page vue). In-memory (best-effort Edge).
 */
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000, key: "vitals" });

export async function POST(req: Request): Promise<Response> {
  // 06/10/2026 (quota Upstash) : un robot ou un navigateur piloté qui contourne le filtre client n'écrit rien.
  if (VITALS_BOT_UA.test(req.headers.get("user-agent") ?? "")) {
    return new Response(null, { status: 204 });
  }
  const rl = await limiter(getClientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (
    !isVitalName(b.name) ||
    typeof b.value !== "number" ||
    !Number.isFinite(b.value) ||
    typeof b.id !== "string" ||
    !isRating(b.rating) ||
    typeof b.url !== "string"
  ) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const sample: VitalSample = {
    name: b.name,
    value: b.value,
    id: b.id.slice(0, 64),
    rating: b.rating,
    // Tronque pour éviter qu'un payload énorme remplisse la KV.
    url: b.url.slice(0, 256),
    ts: Date.now(),
  };

  const kv = getKv();
  const samplesKey = `vitals:samples:${sample.name}`;

  try {
    const len = await kv.lpush(samplesKey, sample);

    // Trim soft : au-delà de MAX_SAMPLES + 50, UNE commande LTRIM garde les MAX_SAMPLES plus récents.
    // 06/10/2026 : remplace LRANGE complet + un LREM par élément (≈ 52 commandes et ~150 Ko toutes les 50 mesures).
    if (len > MAX_SAMPLES + 50) {
      await kv.ltrim(samplesKey, 0, MAX_SAMPLES - 1);
    }

    // Recalcul p75 toutes les RECOMPUTE_EVERY valeurs (amorti).
    if (len % RECOMPUTE_EVERY === 0) {
      const all = await kv.lrange<VitalSample>(samplesKey, 0, MAX_SAMPLES - 1);
      const values = all
        .map((s) => (typeof s?.value === "number" ? s.value : null))
        .filter((v): v is number => v != null);
      const p = p75(values);
      await kv.set(`vitals:p75:${sample.name}`, {
        value: p,
        n: values.length,
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    // KV down → on échoue silencieusement côté API mais on log pour debug.
    // Le client n'a aucune action de récup à faire (sendBeacon = fire-and-forget).
    console.error("[vitals] kv error", err);
    return NextResponse.json({ ok: false, error: "kv_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

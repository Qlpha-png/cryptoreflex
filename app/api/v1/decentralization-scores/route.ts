/**
 * GET /api/v1/decentralization-scores
 * -----------------------------------
 * Version B2B de `/api/public/decentralization-scores`.
 * Extra param `?breakdown=true` : retourne les sous-scores par dimension
 * (consensus, validators, governance, etc.) — réservé au scope `historical:read`.
 *
 * Auth : scope `public:read`.
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse } from "@/lib/api-keys/response";
import { hasScope } from "@/lib/api-keys/scopes";
import scoresData from "@/data/decentralization-scores.json";
import { decentralizationLastUpdated } from "@/lib/public-data-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ScoresRaw {
  lastUpdated?: string;
  methodology?: unknown;
  scores?: Record<
    string,
    {
      score?: number;
      breakdown?: Record<string, unknown>;
      notes?: string;
      lastVerified?: string;
    }
  >;
}

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { key, request_id, headers } = auth;

  const url = new URL(req.url);
  const wantBreakdown = url.searchParams.get("breakdown") === "true";
  const canBreakdown = hasScope(key.scopes, "historical:read");
  const showBreakdown = wantBreakdown && canBreakdown;

  const raw = scoresData as unknown as ScoresRaw;
  const entries = Object.entries(raw.scores ?? {});
  const scores = entries.map(([id, s]) => {
    const out: Record<string, unknown> = {
      id,
      score: s.score ?? null,
      notes: s.notes ?? null,
      lastVerified: s.lastVerified ?? null,
    };
    if (showBreakdown && s.breakdown) {
      out.breakdown = s.breakdown;
    }
    return out;
  });

  return successResponse(
    {
      // 08/10/2026 : date la plus récente (fichier + vérification de chaque score), même règle que l'API publique
      last_updated: decentralizationLastUpdated(raw.lastUpdated, raw.scores),
      methodology: raw.methodology ?? null,
      scores,
      _capabilities: {
        breakdown_available: canBreakdown,
        breakdown_requested: wantBreakdown,
        breakdown_served: showBreakdown,
      },
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
      cacheControl: "private, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  );
}

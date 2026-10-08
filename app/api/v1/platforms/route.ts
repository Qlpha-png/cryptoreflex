/**
 * GET /api/v1/platforms
 * ---------------------
 * Version B2B élargie de `/api/public/platforms` :
 *   - même dataset de base
 *   - rate limit étendu (selon tier de la clé)
 *   - paramètre `?include_history=true` pour les séries mensuelles 24 mois
 *     (réservé au scope `historical:read` — Pro / Enterprise)
 *
 * Auth : Bearer cr_sk_xxx, scope `public:read` minimum.
 *
 * Préserve la compat avec `/api/public/platforms` : la spec brief précise que
 * le projet quant Kevin doit pouvoir migrer juste en changeant de base URL,
 * sans changer le schéma de réponse côté `data.platforms`.
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse } from "@/lib/api-keys/response";
import { hasScope } from "@/lib/api-keys/scopes";
import platformsData from "@/data/platforms.json";
import { withOfficialLink } from "@/lib/platforms";
import { platformsLastUpdated } from "@/lib/public-data-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PlatformsRaw {
  _meta?: { lastUpdated?: string };
  platforms?: unknown;
  history?: unknown;
}

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;

  const { key, request_id, headers } = auth;
  const url = new URL(req.url);
  const includeHistory =
    url.searchParams.get("include_history") === "true" &&
    hasScope(key.scopes, "historical:read");

  const raw = platformsData as unknown as PlatformsRaw;

  // Exclut les plateformes fermées au marché FR (ex : Gemini) — cohérent avec le
  // le statut MiCA exposé (micaCompliant) indique en plus si la plateforme peut servir la France.
  // 06/10/2026 : affiliateUrl = site officiel sans relation rémunérée réelle (lib/partnerships.ts).
  const published = (
    (raw.platforms as Array<{ id: string; websiteUrl: string; affiliateUrl: string; fees?: { verified?: { verdict?: string } } }>) ?? []
  ).filter((p) => p?.fees?.verified?.verdict !== "indisponible");
  const data = {
    // 08/10/2026 : date la plus récente des vérifications des lignes publiées (même règle que /api/public/platforms)
    last_updated: platformsLastUpdated(raw._meta, published),
    platforms: published.map(withOfficialLink),
    history: includeHistory ? (raw.history ?? null) : undefined,
    _capabilities: {
      include_history_available: hasScope(key.scopes, "historical:read"),
      include_history_requested: url.searchParams.get("include_history") === "true",
      include_history_served: includeHistory,
    },
  };

  return successResponse(data, {
    request_id,
    license: "b2b",
    headers,
    tier: key.tier,
    cacheControl:
      "private, max-age=60, s-maxage=300, stale-while-revalidate=600",
  });
}

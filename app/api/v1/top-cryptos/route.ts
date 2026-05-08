/**
 * GET /api/v1/top-cryptos
 * -----------------------
 * Version B2B de `/api/public/top-cryptos`.
 *   - `?limit=N` : 10 par défaut, max 200 (vs 10 fixe en public)
 *   - `?include_alts_season=true` : flag composite alt-season
 *
 * Auth : scope `public:read`.
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";
import topCryptos from "@/data/top-cryptos.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 10;

interface TopRaw {
  _meta?: { lastUpdated?: string };
  topCryptos?: unknown[];
  alts_season?: { score: number; label: string } | null;
}

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { request_id, headers } = auth;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (!Number.isFinite(n) || n < 1 || n > MAX_LIMIT) {
      return applicationError(
        400,
        "INVALID_PARAMETER",
        `Le paramètre \`limit\` doit être un entier entre 1 et ${MAX_LIMIT}.`,
        request_id,
      );
    }
    limit = Math.floor(n);
  }
  const includeAltsSeason = url.searchParams.get("include_alts_season") === "true";

  const raw = topCryptos as unknown as TopRaw;
  const all = raw.topCryptos ?? [];
  const list = all.slice(0, limit);

  return successResponse(
    {
      last_updated: raw._meta?.lastUpdated ?? null,
      cryptos: list,
      alts_season: includeAltsSeason ? raw.alts_season ?? null : undefined,
    },
    {
      request_id,
      license: "b2b",
      headers,
      pagination: {
        page: 1,
        per_page: list.length,
        total: all.length,
        has_next: list.length < all.length,
      },
      cacheControl: "private, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  );
}

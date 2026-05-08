/**
 * GET /api/v1/psan-registry
 * -------------------------
 * Version B2B de `/api/public/psan-registry`.
 * Extra param `?since=YYYY-MM-DD` filtre les changements à partir d'une date
 * (réservé au scope `historical:read`).
 *
 * Auth : scope `public:read`.
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";
import { hasScope } from "@/lib/api-keys/scopes";
import psanData from "@/data/psan-registry.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PsanRaw {
  _meta?: { lastUpdated?: string };
  platforms?: Array<{
    id?: string;
    name?: string;
    status_history?: Array<{ date: string }>;
    [k: string]: unknown;
  }>;
}

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { key, request_id, headers } = auth;

  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");

  let since: Date | null = null;
  if (sinceRaw) {
    if (!hasScope(key.scopes, "historical:read")) {
      return applicationError(
        403,
        "INSUFFICIENT_SCOPE",
        "Le filtre `since` nécessite le scope `historical:read`.",
        request_id,
        "Passe à un tier B2B Pro ou plus.",
      );
    }
    const parsed = new Date(sinceRaw);
    if (Number.isNaN(parsed.getTime())) {
      return applicationError(
        400,
        "INVALID_PARAMETER",
        "Le paramètre `since` doit être au format ISO 8601 (YYYY-MM-DD).",
        request_id,
      );
    }
    since = parsed;
  }

  const raw = psanData as unknown as PsanRaw;
  const platforms = raw.platforms ?? [];

  // Si `since` est passé, on filtre l'historique des changements de statut par
  // plateforme. Une plateforme sans changement après `since` est exclue. Les
  // plateformes sans `status_history` du tout passent telles quelles si pas
  // de filtre, et sont exclues si filtre actif (le caller veut l'historique).
  const filtered = since
    ? platforms
        .map((entry) => {
          const history = entry.status_history ?? [];
          const cutoff = since!.getTime();
          const recent = history.filter(
            (h) => new Date(h.date).getTime() >= cutoff,
          );
          if (recent.length === 0) return null;
          return { ...entry, status_history: recent };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : platforms;

  return successResponse(
    {
      last_updated: raw._meta?.lastUpdated ?? null,
      platforms: filtered,
      filter: { since: sinceRaw },
    },
    {
      request_id,
      license: "b2b",
      headers,
      cacheControl: "private, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  );
}

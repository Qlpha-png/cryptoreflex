/**
 * GET /api/v1/news?coingeckoId=bitcoin
 *
 * News crypto pour usage IA / dashboard B2B.
 *   - Source : agrégation RSS multi-sources (CoinTelegraph, etc.)
 *   - Cache 15min côté Next.js
 *
 * Auth : scope `public:read`
 *
 * Query :
 *   - `coingeckoId` (requis) : identifiant CG (bitcoin, ethereum, near-protocol, ...)
 *   - `limit` (optionnel, défaut 10, max 50)
 *
 * Réponse :
 *   {
 *     ok: true,
 *     data: {
 *       coingecko_id, symbol, name,
 *       items: [
 *         { title, url, source, published_at, summary? },
 *         ...
 *       ]
 *     }
 *   }
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { key, request_id, headers } = auth;

  const url = new URL(req.url);
  const id = url.searchParams.get("coingeckoId")?.toLowerCase().trim();
  if (!id || !/^[a-z0-9-]{1,80}$/.test(id)) {
    return applicationError(
      400,
      "MISSING_PARAMETER",
      "Le paramètre `coingeckoId` est requis. Format kebab-case lowercase.",
      request_id,
    );
  }

  const limitRaw = url.searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (!Number.isFinite(n) || n < 1 || n > MAX_LIMIT) {
      return applicationError(
        400,
        "INVALID_PARAMETER",
        `\`limit\` doit être un entier entre 1 et ${MAX_LIMIT}.`,
        request_id,
      );
    }
    limit = Math.floor(n);
  }

  // Lookup symbol/name via cg-static-details KV (fastest)
  let symbol = id.toUpperCase().slice(0, 8);
  let name = id;

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    try {
      const r = await fetch(
        `${kvUrl.replace(/\/$/, "")}/get/${encodeURIComponent("cg-static-details:v1")}`,
        {
          headers: { Authorization: `Bearer ${kvToken}` },
          signal: AbortSignal.timeout(3000),
          next: { revalidate: 60 },
        },
      );
      if (r.ok) {
        const data = (await r.json()) as { result?: string | null };
        if (typeof data.result === "string") {
          const cached = JSON.parse(data.result) as Record<
            string,
            { symbol?: string; name?: string }
          >;
          const row = cached[id];
          if (row) {
            symbol = row.symbol?.toUpperCase() ?? symbol;
            name = row.name ?? name;
          }
        }
      }
    } catch {
      // KV indispo, on continue avec l'id
    }
  }

  // Délègue à fetchCryptoNews (lib existante)
  let items: Array<{
    title: string;
    url: string;
    source?: string;
    publishedAt?: string;
    summary?: string;
  }> = [];

  try {
    const { fetchCryptoNews } = await import("@/lib/news-aggregator");
    const raw = await fetchCryptoNews(symbol, name);
    items = raw.slice(0, limit).map((n) => ({
      title: n.title,
      url: n.url,
      source: (n as unknown as { source?: string }).source,
      publishedAt: (n as unknown as { publishedAt?: string }).publishedAt,
      summary: (n as unknown as { summary?: string }).summary,
    }));
  } catch {
    // Si lib news indispo, retourne array vide plutôt que 500
    items = [];
  }

  return successResponse(
    {
      coingecko_id: id,
      symbol,
      name,
      items,
      count: items.length,
      updated_at: new Date().toISOString(),
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
      cacheControl: "private, max-age=300, s-maxage=900, stale-while-revalidate=1800",
    },
  );
}

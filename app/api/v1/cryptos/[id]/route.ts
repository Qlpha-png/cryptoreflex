/**
 * GET /api/v1/cryptos/{id}
 *
 * Fiche détail complète d'une crypto pour usage IA / B2B.
 *   - Données live : price, marketCap, volume24h, change 24h/7d, sparkline 7d
 *   - Données historiques : ATH, ATL avec dates
 *   - Supply : circulating, total, max
 *   - Source : KV-backed (cg-static-details:v1) → ~50ms latence
 *
 * Auth : scope `public:read`
 *
 * Path param : `{id}` = coingecko_id (ex: bitcoin, ethereum, havven, near-protocol)
 *
 * Réponse :
 *   {
 *     ok: true,
 *     data: {
 *       id, symbol, name, image,
 *       price_usd, market_cap, market_cap_rank,
 *       volume_24h, change_24h, change_7d,
 *       supply: { circulating, total, max },
 *       ath: { price, date },
 *       atl: { price, date },
 *       sparkline_7d: [...],
 *       last_updated
 *     }
 *   }
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CGMarketsRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_date: string | null;
  sparkline_in_7d?: { price: number[] };
  last_updated?: string;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { key, request_id, headers } = auth;

  const id = params.id?.toLowerCase().trim();
  if (!id || !/^[a-z0-9-]{1,80}$/.test(id)) {
    return applicationError(
      400,
      "INVALID_PARAMETER",
      "Le paramètre `id` doit être un coingecko_id valide (kebab-case lowercase).",
      request_id,
    );
  }

  // Lecture KV en priorité (couvre 777/777 fiches publiées).
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  let row: CGMarketsRow | null = null;

  if (kvUrl && kvToken) {
    try {
      const r = await fetch(
        `${kvUrl.replace(/\/$/, "")}/get/${encodeURIComponent("cg-static-details:v1")}`,
        {
          headers: { Authorization: `Bearer ${kvToken}`, accept: "application/json" },
          signal: AbortSignal.timeout(3000),
          next: { revalidate: 60 },
        },
      );
      if (r.ok) {
        const data = (await r.json()) as { result?: string | null };
        if (typeof data.result === "string") {
          const cached = JSON.parse(data.result) as Record<string, CGMarketsRow>;
          row = cached[id] ?? null;
        }
      }
    } catch {
      // KV indispo — fallback CG live ci-dessous
    }
  }

  // Fallback CG live (1 seul id, cached 4h)
  if (!row) {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}&per_page=1&page=1&sparkline=true&price_change_percentage=24h,7d`;
      const r = await fetch(url, {
        next: { revalidate: 14400, tags: [`coingecko:crypto:${id}`] },
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const json = (await r.json()) as CGMarketsRow[];
        row = json[0] ?? null;
      }
    } catch {
      // CG indispo — return 404
    }
  }

  if (!row) {
    return applicationError(
      404,
      "CRYPTO_NOT_FOUND",
      `Aucune crypto trouvée avec l'id \`${id}\`. Vérifie le coingecko_id.`,
      request_id,
    );
  }

  return successResponse(
    {
      id: row.id,
      symbol: row.symbol?.toUpperCase(),
      name: row.name,
      image: row.image,
      price_usd: row.current_price ?? 0,
      market_cap: row.market_cap ?? 0,
      market_cap_rank: row.market_cap_rank ?? null,
      volume_24h: row.total_volume ?? 0,
      change_24h: row.price_change_percentage_24h ?? null,
      change_7d: row.price_change_percentage_7d_in_currency ?? null,
      supply: {
        circulating: row.circulating_supply ?? null,
        total: row.total_supply ?? null,
        max: row.max_supply ?? null,
      },
      ath: {
        price: row.ath ?? null,
        date: row.ath_date ?? null,
      },
      atl: {
        price: row.atl ?? null,
        date: row.atl_date ?? null,
      },
      sparkline_7d: row.sparkline_in_7d?.price ?? [],
      last_updated: row.last_updated ?? null,
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

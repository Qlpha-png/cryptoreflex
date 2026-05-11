/**
 * GET /api/v1/market/movers
 *
 * Top gainers, losers, volume spikes 24h depuis KV cg-static-details:v1.
 *
 * Query : limit (défaut 10, max 50)
 * Auth : scope `public:read`
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CGRow {
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
}

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { key, request_id, headers } = auth;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  let limit = 10;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      return applicationError(400, "INVALID_PARAMETER", "limit doit être 1-50.", request_id);
    }
    limit = Math.floor(n);
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) {
    return applicationError(503, "KV_UNAVAILABLE", "KV non configuré.", request_id);
  }

  let cached: Record<string, CGRow> = {};
  try {
    const r = await fetch(
      `${kvUrl.replace(/\/$/, "")}/get/${encodeURIComponent("cg-static-details:v1")}`,
      { headers: { Authorization: `Bearer ${kvToken}` }, signal: AbortSignal.timeout(3000), next: { revalidate: 60 } },
    );
    if (r.ok) {
      const data = (await r.json()) as { result?: string };
      if (typeof data.result === "string") cached = JSON.parse(data.result);
    }
  } catch {
    // fall through
  }

  const all = Object.values(cached).filter((c) => c?.id && c.total_volume > 0);

  // Filter spam (mcap < 1M USD pour éviter les rugs)
  const filtered = all.filter((c) => (c.market_cap ?? 0) > 1_000_000);

  // GAINERS 24h
  const gainers = [...filtered]
    .sort(
      (a, b) =>
        (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0),
    )
    .slice(0, limit)
    .map(formatRow);

  // LOSERS 24h
  const losers = [...filtered]
    .sort(
      (a, b) =>
        (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0),
    )
    .slice(0, limit)
    .map(formatRow);

  // VOLUME SPIKES (volume/mcap ratio)
  const volumeSpikes = [...filtered]
    .filter((c) => (c.market_cap ?? 0) > 0)
    .sort(
      (a, b) =>
        b.total_volume / (b.market_cap ?? 1) - a.total_volume / (a.market_cap ?? 1),
    )
    .slice(0, limit)
    .map((c) => ({
      ...formatRow(c),
      volume_to_mcap_ratio: c.total_volume / (c.market_cap ?? 1),
    }));

  // GAINERS 7d (si data dispo)
  const gainers7d = [...filtered]
    .filter((c) => c.price_change_percentage_7d_in_currency != null)
    .sort(
      (a, b) =>
        (b.price_change_percentage_7d_in_currency ?? 0) -
        (a.price_change_percentage_7d_in_currency ?? 0),
    )
    .slice(0, limit)
    .map(formatRow);

  return successResponse(
    {
      gainers_24h: gainers,
      losers_24h: losers,
      volume_spikes: volumeSpikes,
      gainers_7d: gainers7d,
      total_coins_analyzed: filtered.length,
      filters_applied: "market_cap > 1M USD (anti-rug)",
      updated_at: new Date().toISOString(),
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
      cacheControl: "private, max-age=60, s-maxage=120, stale-while-revalidate=600",
    },
  );
}

function formatRow(c: CGRow) {
  return {
    id: c.id,
    symbol: c.symbol?.toUpperCase(),
    name: c.name,
    image: c.image,
    price_usd: c.current_price,
    market_cap: c.market_cap,
    market_cap_rank: c.market_cap_rank,
    volume_24h: c.total_volume,
    change_24h: c.price_change_percentage_24h,
    change_7d: c.price_change_percentage_7d_in_currency ?? null,
  };
}

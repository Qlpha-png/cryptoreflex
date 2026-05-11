/**
 * GET /api/v1/prices?ids=bitcoin,ethereum,...
 *
 * Prix temps réel multi-cryptos pour usage IA / dashboard.
 *   - Source : KV-backed cg-ticker-prices:v1 (top 50, refresh 10min)
 *   - Fallback : KV cg-static-details:v1 (777 fiches, refresh 1×/jour)
 *   - Latence : ~50ms (KV chaud)
 *
 * Auth : scope `public:read`
 *
 * Query :
 *   - `ids` : liste comma-separated de coingecko_id (max 50)
 *
 * Réponse :
 *   {
 *     ok: true,
 *     data: {
 *       prices: [
 *         { id, symbol, name, price_usd, market_cap, change_24h, image },
 *         ...
 *       ],
 *       updated_at: ISO timestamp
 *     }
 *   }
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IDS = 50;

interface TickerEntry {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
}

interface CGMarketsRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number | null;
  price_change_percentage_24h: number;
}

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { key, request_id, headers } = auth;

  const url = new URL(req.url);
  const idsRaw = url.searchParams.get("ids");
  if (!idsRaw) {
    return applicationError(
      400,
      "MISSING_PARAMETER",
      "Le paramètre `ids` est requis. Format : ?ids=bitcoin,ethereum",
      request_id,
    );
  }

  const ids = Array.from(
    new Set(
      idsRaw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[a-z0-9-]{1,80}$/.test(s)),
    ),
  );

  if (ids.length === 0) {
    return applicationError(
      400,
      "INVALID_PARAMETER",
      "Aucun id valide. Format : kebab-case lowercase (bitcoin, near-protocol, etc.)",
      request_id,
    );
  }

  if (ids.length > MAX_IDS) {
    return applicationError(
      400,
      "TOO_MANY_IDS",
      `Maximum ${MAX_IDS} ids par requête. Reçu : ${ids.length}.`,
      request_id,
    );
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const result: Record<string, unknown> = {};

  // 1. Tente KV ticker (top 50, frais 10min)
  let tickerRecord: Record<string, TickerEntry> = {};
  if (kvUrl && kvToken) {
    try {
      const r = await fetch(
        `${kvUrl.replace(/\/$/, "")}/get/${encodeURIComponent("cg-ticker-prices:v1")}`,
        {
          headers: { Authorization: `Bearer ${kvToken}` },
          signal: AbortSignal.timeout(3000),
          next: { revalidate: 60 },
        },
      );
      if (r.ok) {
        const data = (await r.json()) as { result?: string | null };
        if (typeof data.result === "string") {
          tickerRecord = JSON.parse(data.result);
        }
      }
    } catch {
      // KV indispo
    }
  }

  // 2. Fallback KV static-details (777 fiches, frais 6h)
  let staticRecord: Record<string, CGMarketsRow> = {};
  const missing = ids.filter((id) => !tickerRecord[id]);
  if (missing.length > 0 && kvUrl && kvToken) {
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
          staticRecord = JSON.parse(data.result);
        }
      }
    } catch {
      // KV indispo
    }
  }

  const prices: Array<{
    id: string;
    symbol: string;
    name: string;
    price_usd: number;
    market_cap: number;
    change_24h: number;
    image: string;
    source: "ticker" | "static" | "missing";
  }> = [];

  for (const id of ids) {
    const ticker = tickerRecord[id];
    if (ticker) {
      prices.push({
        id: ticker.id,
        symbol: ticker.symbol,
        name: ticker.name,
        price_usd: ticker.price,
        market_cap: ticker.marketCap,
        change_24h: ticker.change24h,
        image: ticker.image,
        source: "ticker",
      });
      continue;
    }
    const stat = staticRecord[id];
    if (stat) {
      prices.push({
        id: stat.id,
        symbol: stat.symbol?.toUpperCase() ?? "",
        name: stat.name,
        price_usd: stat.current_price ?? 0,
        market_cap: stat.market_cap ?? 0,
        change_24h: stat.price_change_percentage_24h ?? 0,
        image: stat.image,
        source: "static",
      });
      continue;
    }
    prices.push({
      id,
      symbol: "",
      name: id,
      price_usd: 0,
      market_cap: 0,
      change_24h: 0,
      image: "",
      source: "missing",
    });
  }

  return successResponse(
    {
      prices,
      requested: ids.length,
      found: prices.filter((p) => p.source !== "missing").length,
      updated_at: new Date().toISOString(),
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
      cacheControl: "private, max-age=30, s-maxage=60, stale-while-revalidate=300",
    },
  );
}

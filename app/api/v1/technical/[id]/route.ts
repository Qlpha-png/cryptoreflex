/**
 * GET /api/v1/technical/{id}
 *
 * Indicateurs techniques pour une crypto (RSI, MA, MACD, Bollinger, S/R).
 * Source : sparkline 7d depuis KV cg-static-details:v1 (168 points horaires).
 *
 * Auth : scope `public:read`
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse, applicationError } from "@/lib/api-keys/response";
import {
  calcAllIndicators,
  calcVolatility,
  detectTrend,
  findSupportResistance,
} from "@/lib/technical-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CGRow {
  id: string;
  symbol: string;
  current_price: number;
  market_cap: number | null;
  sparkline_in_7d?: { price: number[] };
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
    return applicationError(400, "INVALID_PARAMETER", "id invalide.", request_id);
  }

  // Lecture KV (sparkline 7d disponible)
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  let row: CGRow | null = null;
  if (kvUrl && kvToken) {
    try {
      const r = await fetch(
        `${kvUrl.replace(/\/$/, "")}/get/${encodeURIComponent("cg-static-details:v1")}`,
        { headers: { Authorization: `Bearer ${kvToken}` }, signal: AbortSignal.timeout(3000), next: { revalidate: 60 } },
      );
      if (r.ok) {
        const data = (await r.json()) as { result?: string };
        if (typeof data.result === "string") {
          const cached = JSON.parse(data.result) as Record<string, CGRow>;
          row = cached[id] ?? null;
        }
      }
    } catch {
      // fallback CG below
    }
  }

  if (!row?.sparkline_in_7d?.price?.length) {
    return applicationError(
      404,
      "NO_SPARKLINE",
      `Aucune sparkline disponible pour \`${id}\`. Cette crypto n'a pas assez d'historique pour des indicateurs techniques.`,
      request_id,
    );
  }

  const prices = row.sparkline_in_7d.price;
  const indicators = calcAllIndicators(prices);
  const volatility = calcVolatility(prices);
  const trend = detectTrend(prices);
  const levels = findSupportResistance(prices);
  const support = levels.supports[0] ?? null;
  const resistance = levels.resistances[0] ?? null;
  const current = prices[prices.length - 1] ?? row.current_price ?? 0;

  // Indicateurs interprétés (lisible pour IA)
  const rsiZone =
    indicators.rsi < 30 ? "oversold" : indicators.rsi > 70 ? "overbought" : "neutral";
  const macdBias =
    indicators.macd && indicators.macd.histogram > 0 ? "bullish" : "bearish";
  const trendBias = trend; // "bullish" | "bearish" | "neutral"
  const bollingerPosition = indicators.bollinger
    ? current >= indicators.bollinger.upper
      ? "above_upper"
      : current <= indicators.bollinger.lower
        ? "below_lower"
        : "in_band"
    : null;

  return successResponse(
    {
      id,
      symbol: row.symbol?.toUpperCase(),
      current_price: current,
      timeframe: "7d_hourly_168pts",
      indicators: {
        rsi: indicators.rsi,
        ma50: indicators.ma50,
        ma200: indicators.ma200,
        ema12: indicators.ema12,
        ema26: indicators.ema26,
        macd: indicators.macd
          ? {
              line: indicators.macd.line,
              trigger: indicators.macd.signal,
              histogram: indicators.macd.histogram,
            }
          : null,
        bollinger: indicators.bollinger,
        volatility_pct: volatility,
        support,
        resistance,
        all_supports: levels.supports,
        all_resistances: levels.resistances,
      },
      analytics: {
        trend: trendBias,
        rsi_zone: rsiZone,
        macd_bias: macdBias,
        bollinger_position: bollingerPosition,
        price_vs_ma50: indicators.ma50 && current > indicators.ma50 ? "above" : "below",
        price_vs_ma200:
          indicators.ma200 && current > indicators.ma200 ? "above" : "below",
      },
      computed_at: new Date().toISOString(),
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
      cacheControl: "private, max-age=300, s-maxage=600, stale-while-revalidate=1800",
    },
  );
}

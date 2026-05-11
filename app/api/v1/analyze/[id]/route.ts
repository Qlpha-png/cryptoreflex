/**
 * GET /api/v1/analyze/{id}?profile=daytrader|swing|hodl
 *
 * Endpoint COMPOSITE tout-en-un pour décisions IA. Retourne :
 *   - Données marché (price, mcap, supply, ATH, transactions estimées)
 *   - Indicateurs techniques (RSI, MA, MACD, Bollinger, S/R)
 *   - Sentiment global (Fear & Greed)
 *   - Events upcoming (5 prochains)
 *   - Verdict signaux ADAPTÉ AU PROFIL D'INVESTISSEMENT
 *
 * PROFILS :
 *   - daytrader : signaux court terme (RSI 7j, MACD, S/R proches, volatility)
 *   - swing     : signaux moyen terme (MA50, EMA, momentum 7j)
 *   - hodl      : signaux long terme (MA200, FDV, ATH ratio, events macro)
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

type Profile = "daytrader" | "swing" | "hodl";

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
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_date: string | null;
  atl: number | null;
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

  const url = new URL(req.url);
  const profileRaw = (url.searchParams.get("profile") ?? "swing").toLowerCase();
  if (!["daytrader", "swing", "hodl"].includes(profileRaw)) {
    return applicationError(
      400,
      "INVALID_PROFILE",
      "profile doit être : daytrader, swing, ou hodl.",
      request_id,
    );
  }
  const profile = profileRaw as Profile;

  // 1. Crypto data (KV)
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
      /* fall through */
    }
  }

  if (!row) {
    return applicationError(404, "CRYPTO_NOT_FOUND", `Crypto \`${id}\` non trouvée.`, request_id);
  }

  // 2. Indicateurs techniques (si sparkline dispo)
  const prices = row.sparkline_in_7d?.price ?? [];
  const hasTech = prices.length >= 50;
  const indicators = hasTech ? calcAllIndicators(prices) : null;
  const volatility = hasTech ? calcVolatility(prices) : null;
  const trend = hasTech ? detectTrend(prices) : "neutral";
  const levels = hasTech ? findSupportResistance(prices) : { supports: [], resistances: [] };
  const support = levels.supports[0] ?? null;
  const resistance = levels.resistances[0] ?? null;

  // 3. Fear & Greed (sentiment global)
  let fearGreed: { value: number; label: string } | null = null;
  try {
    const r = await fetch("https://api.alternative.me/fng/?limit=1", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const json = (await r.json()) as { data?: Array<{ value: string; value_classification: string }> };
      const first = json.data?.[0];
      if (first) {
        fearGreed = { value: Number(first.value), label: first.value_classification };
      }
    }
  } catch {
    /* fall through */
  }

  // 4. Events upcoming
  let events: Array<{ title: string; date: string; impact?: string; category: string }> = [];
  try {
    const cryptoEventsLib = await import("@/lib/crypto-events");
    const list = cryptoEventsLib.getUpcomingEventsFor(id, 5);
    events = list.map((e) => ({
      title: e.title,
      date: e.date,
      impact: e.importance,
      category: e.type,
    }));
  } catch {
    /* fall through */
  }

  // 5. Métriques dérivées
  const current = row.current_price;
  const distanceFromAthPct =
    row.ath && row.ath > 0 ? ((current - row.ath) / row.ath) * 100 : null;
  const distanceFromAtlMultiplier =
    row.atl && row.atl > 0 ? current / row.atl : null;
  // Transactions estimées = volume24h / prix moyen transaction (approximation,
  // moyenne 5K USD par tx onchain crypto, source: messari heuristic)
  const txCount24hEstimated =
    row.total_volume > 0 ? Math.round(row.total_volume / 5000) : null;
  const volumeMcapRatio = row.market_cap ? row.total_volume / row.market_cap : null;

  // 6. SYNTHÈSE TECHNIQUE ADAPTÉE AU PROFIL (champ "synthesis" pour
  // PSAN-compliance : pas de "recommendation/signal/advice" — l'IA en aval
  // doit interpréter les indicateurs techniques bruts).
  const synthesis = buildProfileSynthesis(profile, {
    indicators,
    volatility,
    trend,
    support,
    resistance,
    current,
    row,
    fearGreed,
    events,
    distanceFromAthPct,
    volumeMcapRatio,
  });

  return successResponse(
    {
      id: row.id,
      symbol: row.symbol?.toUpperCase(),
      name: row.name,
      image: row.image,
      profile_analyzed: profile,
      market: {
        price_usd: current,
        market_cap: row.market_cap,
        market_cap_rank: row.market_cap_rank,
        volume_24h: row.total_volume,
        change_24h_pct: row.price_change_percentage_24h,
        change_7d_pct: row.price_change_percentage_7d_in_currency ?? null,
        supply: {
          circulating: row.circulating_supply,
          total: row.total_supply,
          max: row.max_supply,
        },
        ath: { price: row.ath, date: row.ath_date, distance_pct: distanceFromAthPct },
        atl: { price: row.atl, multiplier_from_atl: distanceFromAtlMultiplier },
        transactions_24h_estimated: txCount24hEstimated,
        volume_to_mcap_ratio: volumeMcapRatio,
      },
      technical: indicators
        ? {
            rsi: indicators.rsi,
            ma50: indicators.ma50,
            ma200: indicators.ma200,
            // Rename MACD.signal → trigger pour PSAN compliance
            macd: indicators.macd
              ? {
                  line: indicators.macd.macd,
                  trigger: indicators.macd.signal,
                  histogram: indicators.macd.histogram,
                }
              : null,
            bollinger: indicators.bollinger,
            volatility_pct: volatility,
            support,
            resistance,
            trend,
          }
        : { unavailable: "sparkline insuffisante (<50 points)" },
      sentiment: fearGreed
        ? {
            fear_greed_value: fearGreed.value,
            fear_greed_label: fearGreed.label,
          }
        : null,
      events_upcoming: events,
      synthesis,
      computed_at: new Date().toISOString(),
      disclaimer:
        "Ces données sont des indicateurs techniques bruts. Aucune recommandation d'investissement. Le site n'est pas CIF (Conseil en Investissements Financiers).",
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
      cacheControl: "private, max-age=120, s-maxage=300, stale-while-revalidate=600",
    },
  );
}

function buildProfileSynthesis(
  profile: Profile,
  ctx: {
    indicators: ReturnType<typeof calcAllIndicators> | null;
    volatility: number | null;
    trend: string;
    support: number | null;
    resistance: number | null;
    current: number;
    row: CGRow;
    fearGreed: { value: number; label: string } | null;
    events: Array<{ title: string; date: string; impact?: string }>;
    distanceFromAthPct: number | null;
    volumeMcapRatio: number | null;
  },
): {
  bias: "bullish" | "neutral_bullish" | "neutral" | "neutral_bearish" | "bearish" | "undetermined";
  confidence: "low" | "medium" | "high";
  observations: string[];
  technical_score_bullish: number;
  technical_score_bearish: number;
  risk_profile: "low" | "medium" | "high" | "very_high";
  time_horizon_days: number;
} {
  const { indicators, volatility, trend, current, row, fearGreed, distanceFromAthPct, volumeMcapRatio } = ctx;
  const observations: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  // DAYTRADER : focus volatility + RSI + S/R proches + volume
  if (profile === "daytrader") {
    if (indicators?.rsi != null) {
      if (indicators.rsi < 30) {
        bullishScore += 3;
        observations.push(`RSI ${indicators.rsi.toFixed(1)} → survente extrême (achat short-term)`);
      } else if (indicators.rsi > 70) {
        bearishScore += 3;
        observations.push(`RSI ${indicators.rsi.toFixed(1)} → surachat (vente short-term)`);
      }
    }
    if (volumeMcapRatio != null && volumeMcapRatio > 0.3) {
      bullishScore += 1;
      observations.push(`Volume/Mcap ${(volumeMcapRatio * 100).toFixed(1)}% → forte activité`);
    }
    if (indicators?.macd?.histogram) {
      if (indicators.macd.histogram > 0) {
        bullishScore += 1;
        observations.push("MACD bullish (momentum positif court terme)");
      } else {
        bearishScore += 1;
        observations.push("MACD bearish (momentum négatif court terme)");
      }
    }
  }

  // SWING : focus MA50, momentum 7d, trend
  if (profile === "swing") {
    if (indicators?.ma50 && current > indicators.ma50) {
      bullishScore += 2;
      observations.push(`Prix > MA50 → trend haussier swing`);
    } else if (indicators?.ma50) {
      bearishScore += 2;
      observations.push(`Prix < MA50 → trend baissier swing`);
    }
    if (row.price_change_percentage_7d_in_currency != null) {
      const c7d = row.price_change_percentage_7d_in_currency;
      if (c7d > 15) {
        bearishScore += 1;
        observations.push(`+${c7d.toFixed(1)}% sur 7j → pump probable, prudence reverse`);
      } else if (c7d < -15) {
        bullishScore += 1;
        observations.push(`${c7d.toFixed(1)}% sur 7j → opportunité contrarian si fondamentaux ok`);
      }
    }
    if (trend === "bullish") {
      bullishScore += 1;
      observations.push("Trend macro 7j haussier");
    } else if (trend === "bearish") {
      bearishScore += 1;
      observations.push("Trend macro 7j baissier");
    }
  }

  // HODL : focus MA200, distance ATH, Mcap rank, fondamentaux long terme
  if (profile === "hodl") {
    if (distanceFromAthPct != null) {
      if (distanceFromAthPct < -70) {
        bullishScore += 3;
        observations.push(
          `${distanceFromAthPct.toFixed(0)}% sous ATH → zone d'accumulation long terme`,
        );
      } else if (distanceFromAthPct > -20) {
        bearishScore += 2;
        observations.push(
          `Seulement ${distanceFromAthPct.toFixed(0)}% sous ATH → risque de top`,
        );
      }
    }
    if (indicators?.ma200 && current > indicators.ma200) {
      bullishScore += 2;
      observations.push("Prix > MA200 → bull market long terme");
    } else if (indicators?.ma200) {
      bearishScore += 1;
      observations.push("Prix < MA200 → bear market long terme");
    }
    if (row.market_cap_rank && row.market_cap_rank <= 20) {
      bullishScore += 1;
      observations.push(`Top 20 Mcap (#${row.market_cap_rank}) → projet établi`);
    }
  }

  // Signaux communs (Fear & Greed = contrarian universel)
  if (fearGreed) {
    if (fearGreed.value <= 25) {
      bullishScore += 1;
      observations.push(`Fear & Greed ${fearGreed.value} (${fearGreed.label}) → opportunité contrarian`);
    } else if (fearGreed.value >= 75) {
      bearishScore += 1;
      observations.push(`Fear & Greed ${fearGreed.value} (${fearGreed.label}) → euphorie, prudence`);
    }
  }

  // Events à risque (token unlock high impact dans 7 jours)
  const nextEvent = ctx.events[0];
  if (nextEvent) {
    const eventDate = new Date(nextEvent.date).getTime();
    const daysUntil = (eventDate - Date.now()) / (1000 * 3600 * 24);
    if (daysUntil < 7 && nextEvent.impact === "high") {
      bearishScore += 1;
      observations.push(
        `Event high-impact dans ${Math.ceil(daysUntil)}j : ${nextEvent.title}`,
      );
    }
  }

  // Bias technique neutre (champ "bias" PSAN-compliant : description
  // factuelle des indicateurs, l'IA en aval interprète pour décision).
  const delta = bullishScore - bearishScore;
  let bias:
    | "bullish"
    | "neutral_bullish"
    | "neutral"
    | "neutral_bearish"
    | "bearish"
    | "undetermined" = "neutral";
  if (delta >= 4) bias = "bullish";
  else if (delta >= 2) bias = "neutral_bullish";
  else if (delta <= -4) bias = "bearish";
  else if (delta <= -2) bias = "neutral_bearish";
  else if (bullishScore === 0 && bearishScore === 0) bias = "undetermined";

  const totalIndicators = bullishScore + bearishScore;
  const confidence: "low" | "medium" | "high" =
    totalIndicators >= 5 ? "high" : totalIndicators >= 3 ? "medium" : "low";

  // Risk profile basé sur volatilité + mcap rank
  let riskProfile: "low" | "medium" | "high" | "very_high" = "medium";
  if (row.market_cap_rank && row.market_cap_rank <= 10) riskProfile = "low";
  else if (row.market_cap_rank && row.market_cap_rank > 100) riskProfile = "high";
  if (volatility != null && volatility > 8) {
    riskProfile = riskProfile === "low" ? "medium" : riskProfile === "medium" ? "high" : "very_high";
  }

  const timeHorizon = profile === "daytrader" ? 1 : profile === "swing" ? 14 : 365;

  return {
    bias,
    confidence,
    observations,
    technical_score_bullish: bullishScore,
    technical_score_bearish: bearishScore,
    risk_profile: riskProfile,
    time_horizon_days: timeHorizon,
  };
}

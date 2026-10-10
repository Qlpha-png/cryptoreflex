/**
 * GET /api/v1/analyze/{id}?profile=daytrader|swing|hodl
 *
 * Endpoint COMPOSITE tout-en-un pour décisions IA. Retourne :
 *   - Données marché (price, mcap, supply, ATH, transactions estimées)
 *   - Indicateurs techniques (RSI, MA, MACD, Bollinger, S/R)
 *   - Sentiment global (Fear & Greed)
 *   - Events upcoming (5 prochains)
 *   - (synthèse par profil retirée le 08/10/2026, lot légal 2 : indicateurs bruts seulement)
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
import { readStaticDetailFor } from "@/lib/static-details-store";
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
  // 06/10/2026 : un seau de ~100 Ko en cache (lib/static-details-store) au lieu du lot de 3,1 Mo.
  const row: CGRow | null = await readStaticDetailFor<CGRow>(id).catch(() => null);

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
  let fearGreed: { value: number; label: string; date: string | null } | null = null;
  try {
    const r = await fetch("https://api.alternative.me/fng/?limit=1", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const json = (await r.json()) as { data?: Array<{ value: string; value_classification: string; timestamp?: string }> };
      const first = json.data?.[0];
      if (first) {
        const t = Number(first.timestamp);
        fearGreed = { value: Number(first.value), label: first.value_classification, date: Number.isFinite(t) && t > 0 ? new Date(t * 1000).toISOString() : null };
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

  // 6. Lot légal 2 (08/10/2026) : la « synthèse adaptée au profil » (bias haussier/baissier, confiance, « zone d'accumulation
  //    long terme », « opportunité contrarian », « achat short-term »…) est RETIRÉE : un verdict directionnel adapté au profil
  //    de l'investisseur ressemble à une recommandation personnalisée (doctrine AMF du 04/08/2026 sur le conseil en
  //    crypto-actifs). Le paramètre profile reste accepté pour ne casser aucun appel ; il n'a plus d'effet.

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
            // lot Z4 : attribution exigée par alternative.me, à côté de la donnée, avec la date de la valeur
            date: fearGreed.date,
            source: "alternative.me",
            source_url: "https://alternative.me/crypto/fear-and-greed-index/",
          }
        : null,
      events_upcoming: events,
      synthesis: null,
      synthesis_retiree:
        "Synthèse par profil retirée le 08/10/2026 : seuls les indicateurs bruts sont fournis, sans orientation d'achat ou de vente.",
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


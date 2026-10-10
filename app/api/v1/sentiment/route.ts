/**
 * GET /api/v1/sentiment
 *
 * Sentiment marché : Fear & Greed Index (alternative.me, gratuit).
 *
 * Auth : scope `public:read`
 *
 * Réponse :
 *   {
 *     fear_greed: {value, label, date}   (label = classe publiée par alternative.me, telle quelle)
 *     history_7d: [{value, label, date}],
 *     ...
 *   }
 */

import { requireApiKey } from "@/lib/api-keys/auth";
import { successResponse } from "@/lib/api-keys/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FGEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

export async function GET(req: Request): Promise<Response> {
  const auth = await requireApiKey(req, ["public:read"]);
  if (!auth.ok) return auth.response;
  const { key, request_id, headers } = auth;

  // Fetch Fear & Greed (gratuit, pas de clé, alternative.me)
  let fgData: FGEntry[] = [];
  try {
    const r = await fetch("https://api.alternative.me/fng/?limit=8", {
      next: { revalidate: 3600, tags: ["fear-greed"] },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const json = (await r.json()) as { data?: FGEntry[] };
      fgData = json.data ?? [];
    }
  } catch {
    // fall through with empty
  }

  // reprise Z4 : plus de champ d'interprétation (signaux d'achat ou de vente sur des seuils inventés : conseil
  // en investissement servi à des clients) ; seule la classe publiée par alternative.me est renvoyée.
  const current = fgData[0];

  return successResponse(
    {
      fear_greed: current
        ? {
            value: Number(current.value),
            label: current.value_classification,
            date: new Date(Number(current.timestamp) * 1000).toISOString(),
          }
        : null,
      history_7d: fgData.slice(1, 8).map((e) => ({
        value: Number(e.value),
        label: e.value_classification,
        date: new Date(Number(e.timestamp) * 1000).toISOString().slice(0, 10),
      })),
      trend_7d:
        fgData.length >= 7
          ? Number(fgData[0].value) > Number(fgData[6].value)
            ? "improving"
            : "deteriorating"
          : null,
      source: "alternative.me",
      // lot Z4 : attribution exigée par alternative.me (« right next to the display of the data »)
      source_url: "https://alternative.me/crypto/fear-and-greed-index/",
      attribution: "Source : alternative.me (https://alternative.me/crypto/fear-and-greed-index/)",
      updated_at: new Date().toISOString(),
    },
    {
      request_id,
      license: "b2b",
      headers,
      tier: key.tier,
      cacheControl: "private, max-age=1800, s-maxage=3600, stale-while-revalidate=7200",
    },
  );
}

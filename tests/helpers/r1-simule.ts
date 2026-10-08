/**
 * Robot R1 simulé pour les tests (08/10/2026, lot Z2).
 *
 * Depuis le lot Z2, aucune page n'appelle CoinMarketCap : elles lisent le KV écrit par le robot R1. Les tests de relais
 * gardent leurs réponses CMC simulées, mais ces réponses deviennent l'ENTRÉE de R1 : quand une page lit la clé du bandeau
 * (cg-ticker-prices:v1) ou celle du global (marche:global:v1), ce module demande au simulateur la réponse CMC
 * correspondante et la convertit exactement comme R1 (normalizeCmcCoin → cmcRowsWithSiteIds → tickerFromCmc).
 * Ces requêtes internes ne sont PAS comptées comme des appels de la page.
 */
import { KV_MARCHE_GLOBAL_KEY, KV_TICKER_LIVE_KEY } from "@/lib/kv-ticker";

export const KV_TEST_URL = "https://kv.test";
const CMC_LISTING_URL = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=100&convert=USD";
const CMC_GLOBAL_URL = "https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest?convert=USD";

export function activerKvTest(): void {
  process.env.KV_REST_API_URL = KV_TEST_URL;
  process.env.KV_REST_API_TOKEN = "jeton-de-test";
  process.env.VERCEL_ENV = "production";
}

export function desactiverKvTest(): void {
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.VERCEL_ENV;
}

const kvJson = (result: unknown) => new Response(JSON.stringify({ result }), { status: 200, headers: { "content-type": "application/json" } });

async function lireCmc(handler: (url: string) => Response | Promise<Response>, url: string): Promise<unknown> {
  try {
    const res = await handler(url);
    if (!res.ok) return null;
    const j = (await res.json()) as { status?: { error_code?: unknown }; data?: unknown };
    if (typeof j?.status?.error_code === "number" && j.status.error_code !== 0) return null;
    return j?.data ?? null;
  } catch {
    return null;
  }
}

/** Réponse KV simulée pour toute requête vers KV_TEST_URL, sinon null (la requête suit son cours). */
export async function kvR1Simule(
  u: string,
  handler: (url: string) => Response | Promise<Response>,
  fetchedAt: string = new Date().toISOString(),
): Promise<Response | null> {
  if (!u.startsWith(KV_TEST_URL)) return null;
  const segments = new URL(u).pathname.split("/").map(decodeURIComponent);
  if (segments[1] !== "get") return kvJson("OK");
  const key = segments[2] ?? "";
  if (key === KV_TICKER_LIVE_KEY) {
    const data = await lireCmc(handler, CMC_LISTING_URL);
    if (!Array.isArray(data)) return kvJson(null);
    const { normalizeCmcCoin, cmcRowsWithSiteIds } = await import("@/lib/coinmarketcap");
    const { tickerFromCmc } = await import("@/lib/marche-robot");
    const quotes = data.map(normalizeCmcCoin).filter((q): q is NonNullable<typeof q> => q !== null);
    const prices = tickerFromCmc(cmcRowsWithSiteIds(quotes).slice(0, 100));
    if (Object.keys(prices).length === 0) return kvJson(null);
    return kvJson(JSON.stringify({ prices, fetchedAt, source: "coinmarketcap" }));
  }
  if (key === KV_MARCHE_GLOBAL_KEY) {
    const d = (await lireCmc(handler, CMC_GLOBAL_URL)) as Record<string, unknown> | null;
    const q = (d?.quote as { USD?: Record<string, unknown> } | undefined)?.USD;
    if (!d || !q || !(Number(q.total_market_cap) > 0)) return kvJson(null);
    return kvJson(
      JSON.stringify({
        totalMarketCapUsd: q.total_market_cap,
        totalVolume24hUsd: q.total_volume_24h ?? 0,
        btcDominance: d.btc_dominance ?? 0,
        ethDominance: d.eth_dominance ?? 0,
        marketCapChange24h: q.total_market_cap_yesterday_percentage_change ?? 0,
        activeCryptos: d.active_cryptocurrencies ?? 0,
        asOf: fetchedAt,
        source: "coinmarketcap",
      }),
    );
  }
  return kvJson(null);
}

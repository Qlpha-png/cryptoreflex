/**
 * GET /api/_debug-prices — diagnostic temporaire price source.
 * A SUPPRIMER apres investigation. Renvoie le resultat brut de chaque
 * source (Binance, CoinGecko) depuis le serveur prod, sans cache.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SourceResult {
  source: string;
  status: number | string;
  error?: string;
  ok: boolean;
  body?: unknown;
}

async function probe(label: string, url: string): Promise<SourceResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
      headers: {
        Accept: "application/json",
        "User-Agent": "cryptoreflex-debug/1.0",
      },
    });
    const elapsed = Date.now() - t0;
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => "");
    }
    return {
      source: label,
      status: res.status,
      ok: res.ok,
      body: typeof body === "string" ? body.slice(0, 200) : body,
      error: res.ok ? undefined : `${elapsed}ms`,
    };
  } catch (err) {
    const elapsed = Date.now() - t0;
    return {
      source: label,
      status: "fetch-error",
      ok: false,
      error: `${elapsed}ms ${(err as Error).message ?? "unknown"}`,
    };
  }
}

export async function GET(): Promise<Response> {
  const results = await Promise.all([
    probe(
      "binance",
      "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
    ),
    probe(
      "coingecko-simple",
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
    ),
    probe(
      "coingecko-markets",
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&order=market_cap_desc&per_page=1&page=1",
    ),
  ]);
  return new Response(
    JSON.stringify({ results, ts: new Date().toISOString() }, null, 2),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
}

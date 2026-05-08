/**
 * GET /api/diag-dex — diagnostic DexScreener depuis prod Hetzner.
 * Test si l'API DexScreener repond et avec quel prix.
 * A SUPPRIMER apres validation.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProbeResult {
  source: string;
  ok: boolean;
  status?: number | string;
  price?: number;
  error?: string;
  elapsed: number;
}

async function probe(label: string, url: string): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "application/json",
        "User-Agent": "cryptoreflex-diag/1.0",
      },
    });
    const elapsed = Date.now() - t0;
    if (!res.ok) {
      return { source: label, ok: false, status: res.status, elapsed };
    }
    const data = (await res.json()) as {
      pairs?: Array<{ priceUsd?: string }>;
    };
    if (data.pairs && data.pairs.length > 0) {
      // Prendre le pair avec le plus de liquidite (1er est generalement bon)
      const validPairs = data.pairs.filter(
        (p) => p.priceUsd && parseFloat(p.priceUsd) > 0,
      );
      if (validPairs.length > 0) {
        const price = parseFloat(validPairs[0].priceUsd ?? "0");
        return { source: label, ok: true, status: 200, price, elapsed };
      }
    }
    return { source: label, ok: false, status: "no-pairs", elapsed };
  } catch (e) {
    return {
      source: label,
      ok: false,
      error: (e as Error).message,
      elapsed: Date.now() - t0,
    };
  }
}

export async function GET(): Promise<Response> {
  // Test : MANTRA DAO ERC-20 token (delisted CEX, encore trade DEX)
  const OM_TOKEN_ETH = "0x3593D125a4f7849a1B059E64F4517A86Dd60c95d";
  const results = await Promise.all([
    probe(
      "dexscreener-tokens-eth",
      `https://api.dexscreener.com/latest/dex/tokens/${OM_TOKEN_ETH}`,
    ),
    probe(
      "dexscreener-search-mantra",
      "https://api.dexscreener.com/latest/dex/search?q=MANTRA",
    ),
    probe(
      "coingecko-single-mantra-dao",
      "https://api.coingecko.com/api/v3/simple/price?ids=mantra-dao&vs_currencies=usd&include_24hr_change=true",
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

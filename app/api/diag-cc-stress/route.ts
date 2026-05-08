/**
 * GET /api/diag-cc-stress — execute le batch CryptoCompare directement
 * (sans unstable_cache) avec metrics par chunk pour diagnostiquer
 * pourquoi le 2e chunk fail intermittently. A SUPPRIMER apres fix.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYMBOLS = [
  "1INCH","AAVE","ADA","AERO","AKT","ALGO","API3","APT","AR","ARB","ATH","ATOM","AVAX","AXS","BAND","BCH","BEAM","BNB","BONK","BTC",
  "COMP","CRO","CRV","CVX","DAI","DASH","DOGE","DOT","DYDX","EIGEN","ENA","ETH","EWT","FET","FIL","FLOKI","FXS","GALA","GMX","GRASS",
  "GRT","HBAR","HNT","HONEY","HYPE","ICP","IMX","INJ","IO","IP","JUP","KAS","KCS","LDO","LINK","LPT","LTC","MANA","MINA","MKR",
  "NEAR","OCEAN","OKB","OM","ONDO","OP","PENDLE","PEPE","POL","POLYX","POWR","PYTH","RAY","RNDR","RPL","SAND","SCRT","SEI","SHIB","SNX",
  "SOL","STORJ","STRK","SUI","TAO","THETA","TIA","TON","TRX","UNI","USDC","USDT","VIRTUAL","WIF","WLD","XLM","XMR","XRP","XTZ","ZEC",
];

interface ProbeResult {
  idx: number;
  ok: boolean;
  status?: number | string;
  message?: string;
  requested?: number;
  returned?: number;
  elapsed: number;
  error?: string;
}

async function probeChunk(chunk: string[], idx: number): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${chunk.join(",")}&tsyms=USD`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json", "User-Agent": "cryptoreflex-diag" },
    });
    const elapsed = Date.now() - t0;
    if (!res.ok) return { idx, ok: false, status: res.status, elapsed };
    const data = (await res.json()) as {
      RAW?: Record<string, unknown>;
      Response?: string;
      Message?: string;
    };
    if (data.Response === "Error") {
      return { idx, ok: false, status: "Error", message: data.Message, elapsed };
    }
    const got = data.RAW ? Object.keys(data.RAW).length : 0;
    return { idx, ok: true, requested: chunk.length, returned: got, elapsed };
  } catch (e) {
    return {
      idx,
      ok: false,
      error: (e as Error).message,
      elapsed: Date.now() - t0,
    };
  }
}

export async function GET(): Promise<Response> {
  const chunks = [SYMBOLS.slice(0, 60), SYMBOLS.slice(60)];
  const sequential: ProbeResult[] = [];
  for (let i = 0; i < chunks.length; i++) {
    sequential.push(await probeChunk(chunks[i], i));
  }
  // Test parallel pour voir si CryptoCompare rate-limit
  const parallel = await Promise.all(chunks.map((c, i) => probeChunk(c, i)));

  return new Response(
    JSON.stringify({ sequential, parallel, ts: new Date().toISOString() }, null, 2),
    {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    },
  );
}

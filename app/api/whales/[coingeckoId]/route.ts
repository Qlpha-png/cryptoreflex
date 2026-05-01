/**
 * GET /api/whales/[coingeckoId]
 *
 * Expose les 5 dernières grosses transactions on-chain ("whale alerts") pour
 * une crypto majeure. Consommé par le composant client `WhaleWatcher` lazy-loadé
 * sur les fiches /cryptos/[slug].
 *
 * Sécurité / robustesse :
 *  - Whitelist STRICTE sur 8 cryptos (BTC, ETH, USDT, USDC, SOL, BNB, XRP, TRX).
 *    Tout autre coingeckoId → 404 (le composant rendra null silencieusement).
 *  - Rate limit 20 req/min/IP (namespace "whales") — Whale Alert free tier
 *    plafonne à 10 req/min, on cache 5 min côté serveur donc 20/IP suffit
 *    largement.
 *  - `fetchRecentWhales` ne throw jamais → 200 avec `{ whales: [] }` quand
 *    rien n'est dispo (clé manquante, panne API…). Le client masque alors le bloc.
 *  - Cache CDN 5 min + SWR 15 min.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchRecentWhales, isSupportedWhaleSymbol } from "@/lib/whale-watcher";
import { getAllCryptos } from "@/lib/cryptos";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Construit au boot du module la map coingeckoId → symbol pour les seules
 * cryptos supportées par Whale Alert. Évite un scan O(n) à chaque requête.
 */
const SUPPORTED_BY_COINGECKO_ID: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const c of getAllCryptos()) {
    if (isSupportedWhaleSymbol(c.symbol)) {
      map.set(c.coingeckoId, c.symbol.toUpperCase());
    }
  }
  return map;
})();

const limiter = createRateLimiter({
  limit: 20,
  windowMs: 60_000,
  key: "whales",
});

interface RouteContext {
  params: { coingeckoId: string };
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const rl = await limiter(getClientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes — réessaie dans une minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Window": "60s",
        },
      },
    );
  }

  const id = ctx.params.coingeckoId;
  const symbol = id ? SUPPORTED_BY_COINGECKO_ID.get(id) : undefined;
  if (!symbol) {
    return NextResponse.json({ error: "coin not supported" }, { status: 404 });
  }

  const whales = await fetchRecentWhales(symbol);

  return NextResponse.json(
    { whales },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    },
  );
}

/**
 * GET /api/binance/depth?symbol=BTC&limit=5
 *
 * Proxy serveur vers Binance `/api/v3/depth` avec cache edge agressif.
 *
 * Pourquoi un proxy plutôt que fetch direct côté client (BATCH 15 initial) ?
 *  - Évite des appels cross-origin client → CSP doit whitelister api.binance.com
 *    (déjà fait BATCH 15 mais pollue notre CSP).
 *  - Permet un cache CDN edge (s-maxage=3 + SWR=15) → 90% des hits servent
 *    une réponse cachée par Vercel sans toucher Binance.
 *  - Centralise le rate-limit Binance côté nous (10k req/min/IP source) :
 *    1 IP source Vercel partagée par tous les visiteurs = bénéfique.
 *  - Élimine les CSP warnings sur les anciens navigateurs.
 *
 * Cache : 3s edge + 15s SWR. MiniOrderBook refresh côté client toutes les 5s
 * → ~90% des appels servent du cache (pas de hit Binance).
 *
 * Sécurité :
 *  - Validation stricte du `symbol` (regex ^[A-Z0-9]{2,10}$).
 *  - Validation `limit` ∈ [5, 100].
 *  - Rate-limit IP : 60 req/min (defense-in-depth au-delà du Binance).
 */

import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const runtime = "edge";

const SYMBOL_REGEX = /^[A-Z0-9]{2,10}$/;
const ALLOWED_LIMITS = new Set([5, 10, 20, 50, 100]);

const limiter = createRateLimiter({
  limit: 60,
  windowMs: 60 * 1000,
  key: "binance-depth-proxy",
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Rate-limit IP (defense-in-depth)
  const ip = getClientIp(req);
  const rl = await limiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase() ?? "";
  const limitStr = req.nextUrl.searchParams.get("limit") ?? "5";
  const limit = Number(limitStr);

  if (!SYMBOL_REGEX.test(symbol)) {
    return NextResponse.json(
      { error: "Invalid symbol (must be A-Z0-9, 2-10 chars)" },
      { status: 400 },
    );
  }
  if (!ALLOWED_LIMITS.has(limit)) {
    return NextResponse.json(
      { error: "Invalid limit (must be 5/10/20/50/100)" },
      { status: 400 },
    );
  }

  const pair = `${symbol}USDT`;

  try {
    const upstream = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${pair}&limit=${limit}`,
      {
        // Cache Vercel edge 3s + SWR 15s. Combiné avec MiniOrderBook
        // refresh client 5s → 90% des hits servent du cache.
        next: { revalidate: 3 },
        headers: { Accept: "application/json" },
      },
    );

    if (!upstream.ok) {
      // 400 Binance = paire non listée (token exotique) → 404 propre côté
      // client (MiniOrderBook se cache silencieusement).
      if (upstream.status === 400) {
        return NextResponse.json(
          { error: "Pair not listed on Binance" },
          {
            status: 404,
            headers: { "Cache-Control": "public, s-maxage=3600" },
          },
        );
      }
      return NextResponse.json(
        { error: `Upstream error ${upstream.status}` },
        { status: 502 },
      );
    }

    const data = await upstream.json();

    // On retransmet uniquement bids+asks (pas de lastUpdateId qui leak
    // l'état interne Binance).
    return NextResponse.json(
      { bids: data.bids ?? [], asks: data.asks ?? [] },
      {
        headers: {
          // BATCH 24 — Cache-Control explicit max-age=0 + s-maxage=3 +
          // SWR=15 (avant : juste public, ambigu pour navigateurs vs CDN).
          // max-age=0 = navigateur ne cache pas (chaque tab fait sa req →
          // CDN edge cache 90% des hits via s-maxage=3, SWR=15).
          "Cache-Control": "public, max-age=0, s-maxage=3, stale-while-revalidate=15",
          "X-Source": "binance-depth-proxy",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: `Proxy fetch failed: ${message}` },
      { status: 502 },
    );
  }
}

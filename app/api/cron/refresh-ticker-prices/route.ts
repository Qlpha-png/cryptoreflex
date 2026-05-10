/**
 * GET /api/cron/refresh-ticker-prices
 *
 * Pré-charge en KV les prix live pour le ticker home (top 6) + autocomplete
 * (top 50). Évite que /api/prices appelle la cascade live à chaque hit user.
 *
 * Pourquoi :
 *   Le ticker home poll /api/prices?ids=bitcoin,ethereum,... toutes les 30s
 *   côté browser. Cache 60s seulement → cache miss déclenche cascade live
 *   (Binance + CryptoCompare batch + CG fallback). Sur ~100 visiteurs
 *   simultanés, on génère beaucoup de hits API même avec cache.
 *
 *   Solution : cron toutes les 5 min stocke les prix top 6 + top 50 en KV.
 *   /api/prices lit KV en priorité → 0 cascade live tant que KV chaud.
 *
 * Schedule : toutes les 5 min via GH Actions cron OU daily-orchestrator.
 *
 * Coût API : 1 fetch CG /coins/markets pour top 50 (1 call) toutes les
 * 5 min = 288 fetches/jour CG (vs Binance 1200/min limit, OK).
 *
 * Réponse : { ok, fetched, stored, durationMs }
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { verifyBearer } from "@/lib/auth";
import { getKv } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const KV_TICKER_PRICES_KEY = "cg-ticker-prices:v1";
const KV_TTL_SECONDS = 360; // 6 min (1 min de marge si cron skip)

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

interface CGRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET;

  if (!verifyBearer(req, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  Sentry.addBreadcrumb({
    category: "cron",
    message: "refresh-ticker-prices started",
    level: "info",
  });

  // Top 50 par mcap : couvre ticker home (top 6) + autocomplete + portfolio.
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`;

  let json: CGRow[] = [];
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      Sentry.captureMessage(`refresh-ticker-prices CG ${res.status}`, "warning");
      return NextResponse.json(
        { ok: false, error: `CG ${res.status}`, durationMs: Date.now() - startedAt },
        { status: 502 },
      );
    }
    json = (await res.json()) as CGRow[];
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown", durationMs: Date.now() - startedAt },
      { status: 502 },
    );
  }

  // Build Record<id, priceData> for KV.
  const record: Record<
    string,
    {
      id: string;
      symbol: string;
      name: string;
      image: string;
      price: number;
      change24h: number;
      marketCap: number;
    }
  > = {};
  for (const c of json) {
    if (!c?.id) continue;
    record[c.id] = {
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      price: c.current_price ?? 0,
      change24h: c.price_change_percentage_24h ?? 0,
      marketCap: c.market_cap ?? 0,
    };
  }

  const fetched = Object.keys(record).length;
  if (fetched === 0) {
    return NextResponse.json(
      { ok: false, error: "CG returned empty", durationMs: Date.now() - startedAt },
      { status: 502 },
    );
  }

  let stored = 0;
  try {
    const kv = getKv();
    await kv.set(KV_TICKER_PRICES_KEY, record, { ex: KV_TTL_SECONDS });
    stored = fetched;
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      {
        ok: false,
        fetched,
        stored: 0,
        error: `KV set failed: ${err instanceof Error ? err.message : "unknown"}`,
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }

  const durationMs = Date.now() - startedAt;
  return NextResponse.json({
    ok: true,
    fetched,
    stored,
    durationMs,
    ttlSeconds: KV_TTL_SECONDS,
  });
}

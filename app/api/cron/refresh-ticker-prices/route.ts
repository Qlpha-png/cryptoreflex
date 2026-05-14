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
import {
  KV_TICKER_LIVE_TTL_SECONDS,
  KV_TICKER_STALE_TTL_SECONDS,
  type TickerEntry,
  writeTickerCacheBoth,
} from "@/lib/kv-ticker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// FIX 2026-05-14 (Phase 2) — Pattern live + stale via lib/kv-ticker.
// Audit `gh run list` confirme que GH Actions cron `*/10 * * * *` ne tourne
// PAS toutes les 10 min : gaps observés 65-246 min entre runs réelles.
// Avec une seule clé TTL court (12 min), KV vide >90 % du temps.
// Solution : écrire 2 clés simultanément (live TTL 12 min + stale TTL 6 h).
// Les readers tentent live → stale → cascade. UX garanti même cron skipped.

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

  // Build Record<id, TickerEntry> for KV.
  const record: Record<string, TickerEntry> = {};
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

  // Écrit live (TTL 12 min) + stale (TTL 6 h) en parallèle. Si l'une échoue
  // mais l'autre passe, le fallback partiel reste fonctionnel.
  const writeResult = await writeTickerCacheBoth(record);
  if (!writeResult.live && !writeResult.stale) {
    Sentry.captureMessage("refresh-ticker-prices KV write failed (both keys)", "error");
    return NextResponse.json(
      {
        ok: false,
        fetched,
        stored: 0,
        error: "KV set failed for both live and stale keys",
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
  if (!writeResult.live || !writeResult.stale) {
    Sentry.captureMessage(
      `refresh-ticker-prices partial KV write: live=${writeResult.live} stale=${writeResult.stale}`,
      "warning",
    );
  }

  const durationMs = Date.now() - startedAt;
  return NextResponse.json({
    ok: true,
    fetched,
    storedLive: writeResult.live ? fetched : 0,
    storedStale: writeResult.stale ? fetched : 0,
    durationMs,
    liveTtlSeconds: KV_TICKER_LIVE_TTL_SECONDS,
    staleTtlSeconds: KV_TICKER_STALE_TTL_SECONDS,
  });
}

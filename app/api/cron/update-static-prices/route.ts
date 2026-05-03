/**
 * GET /api/cron/update-static-prices
 *
 * BATCH 53 #5 (2026-05-03) — Cron Vercel KV qui pre-fetch les top 35
 * cryptos via notre aggregator (Binance + CoinCap) toutes les 5min et
 * stocke le snapshot dans Upstash KV. Le static fallback de
 * lib/price-source.ts l'utilise comme dataset frais en cas d'echec
 * Binance + CoinCap (rare).
 *
 * Avant : static fallback hardcode dans le code = obsolete au bout de
 * jours/semaines. Maintenant : auto-update toutes 5min, prix toujours
 * representatifs.
 *
 * Schedule cron : pas dans vercel.json (Hobby plan limite a 2 crons,
 * deja utilises). Solution alternative : invocation a la volee via le
 * unstable_cache de getPriceSnapshot (revalidate 300s) qui regenere
 * naturellement. Ce endpoint reste invocable manuellement pour debug
 * ou via webhook externe.
 *
 * Securite : token requis via header X-Cron-Token (env CRON_SECRET).
 */

import { NextResponse } from "next/server";
import { getKv } from "@/lib/kv";
import { getTopMarket, type PriceSnapshot } from "@/lib/price-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KV_KEY = "price-source:top-snapshot";
const TTL_SECONDS = 24 * 3600; // 24h max — au-dela, considere stale

interface StaticSnapshotEntry {
  priceUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

export async function GET(request: Request) {
  // Securite : verifier le token cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Fetch top 50 via aggregator (CoinCap principalement, Binance enrichit
    // sparkline mais pas critique ici).
    const top = await getTopMarket(50);
    if (top.length < 10) {
      return NextResponse.json(
        { ok: false, error: "aggregator returned too few results", count: top.length },
        { status: 200 },
      );
    }

    // Build snapshot map { coingeckoId: { priceUsd, change24h, ... } }
    const snapshot: Record<string, StaticSnapshotEntry> = {};
    for (const c of top) {
      snapshot[c.id] = {
        priceUsd: c.priceUsd,
        change24h: c.change24h,
        marketCap: c.marketCap,
        volume24h: c.volume24h,
      };
    }

    const kv = getKv();
    await kv.set(
      KV_KEY,
      JSON.stringify({
        snapshot,
        updatedAt: new Date().toISOString(),
        sourceCount: top.length,
      }),
      { ex: TTL_SECONDS },
    );

    return NextResponse.json({
      ok: true,
      updatedCount: Object.keys(snapshot).length,
      mocked: kv.mocked,
      sample: {
        bitcoin: snapshot.bitcoin?.priceUsd,
        ethereum: snapshot.ethereum?.priceUsd,
        solana: snapshot.solana?.priceUsd,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

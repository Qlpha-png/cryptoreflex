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
 * Securite : header `Authorization: Bearer <CRON_SECRET>` obligatoire ;
 * CRON_SECRET absent → 401 (fail-closed).
 */

import { NextResponse } from "next/server";
import { getKv } from "@/lib/kv";
import { getTopMarket, type PriceSnapshot } from "@/lib/price-source";
import { verifyBearer } from "@/lib/auth";
import { CRON_TRACE_KEYS, writeCronTrace } from "@/lib/cron-trace";

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
  // Securite : verifier le token cron.
  // AUDIT 2026-10-02 : fail-CLOSED si CRON_SECRET est absent (avant : route
  // ouverte à tous → écriture KV déclenchable par n'importe qui) + comparaison
  // timing-safe via verifyBearer. Le cron Vercel (vercel.json) envoie
  // automatiquement `Authorization: Bearer <CRON_SECRET>`.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/update-static-prices] CRON_SECRET absent — refus (fail-closed).");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!verifyBearer(request, cronSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Fetch top 50 via aggregator (CoinCap principalement, Binance enrichit
    // sparkline mais pas critique ici).
    const top = await getTopMarket(50);
    if (top.length < 10) {
      await writeCronTrace(CRON_TRACE_KEYS.updateStaticPrices, { ok: false, raison: "trop peu de cours reçus", count: top.length });
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
        // heure du relevé : écrite juste après getTopMarket (exception justifiée du test des dates publiées)
        updatedAt: new Date().toISOString(),
        sourceCount: top.length,
      }),
      { ex: TTL_SECONDS },
    );
    // 08/10/2026 (lot fraîcheur A) : trace du passage pour la sentinelle (seuil 3 h)
    await writeCronTrace(CRON_TRACE_KEYS.updateStaticPrices, { ok: true, count: Object.keys(snapshot).length, mocked: kv.mocked });

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
    await writeCronTrace(CRON_TRACE_KEYS.updateStaticPrices, { ok: false, raison: err instanceof Error ? err.message : "erreur inconnue" });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

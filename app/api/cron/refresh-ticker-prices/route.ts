/**
 * GET /api/cron/refresh-ticker-prices — robot R1 (Vercel Cron toutes les 10 min, vercel.json).
 *
 * 08/10/2026 (lot Z2) : écrivain unique du marché (lib/marche-robot.ts). CoinMarketCap top 100 en USD, CoinGecko
 * seulement si CoinMarketCap échoue ; euro au taux de lib/fx.ts ; métriques globales une fois par heure ; bandeau +
 * instantané de secours + global en UNE commande MSET ; trace « dernier passage + résultat » (cron:refresh-ticker-prices:last).
 * Remplace aussi l'ancien cron horaire update-static-prices (doublon D9, supprimé).
 *
 * Paramètre : ?global=1 force le relevé des métriques globales (lancement manuel).
 * Réponse : { ok, source, count, global, durationMs } (jamais de secret).
 */

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import * as Sentry from "@sentry/nextjs";

import { verifyBearer } from "@/lib/auth";
import { CRON_TRACE_KEYS, writeCronTrace } from "@/lib/cron-trace";
import { KV_TICKER_TAG } from "@/lib/kv-ticker";
import { releverMarche } from "@/lib/marche-robot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request): Promise<NextResponse> {
  const startedAt = Date.now();
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const r = await releverMarche({ forceGlobal: new URL(req.url).searchParams.get("global") === "1" });
  await writeCronTrace(CRON_TRACE_KEYS.refreshTickerPrices, {
    ok: r.ok,
    ...(r.raison ? { raison: r.raison } : {}),
    source: r.source ?? "aucune",
    count: r.count,
    global: r.global,
    // Reprise Z2 : raison courte de l'échec CoinMarketCap (relais CoinGecko ou échec total), lue par la sentinelle.
    // Messages de lib/coinmarketcap.ts seulement (« HTTP 429 », « délai dépassé »…) : jamais la clé.
    ...(r.cmcErreur ? { cmcErreur: r.cmcErreur.slice(0, 120) } : {}),
  });

  if (r.ok) {
    try {
      revalidateTag(KV_TICKER_TAG);
    } catch {
      /* hors contexte Next (tests) */
    }
    if (r.source !== "coinmarketcap") Sentry.captureMessage(`refresh-ticker-prices : relais CoinGecko (${r.cmcErreur ?? "CMC indisponible"})`, "warning");
  } else {
    Sentry.captureMessage(`refresh-ticker-prices en échec : ${r.raison ?? "inconnu"}`, "error");
  }

  return NextResponse.json(
    { ok: r.ok, source: r.source, count: r.count, global: r.global, ...(r.raison ? { error: r.raison } : {}), durationMs: Date.now() - startedAt },
    { status: r.ok ? 200 : 502 },
  );
}

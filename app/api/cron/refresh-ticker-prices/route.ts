/**
 * GET /api/cron/refresh-ticker-prices — robot R1 (Vercel Cron toutes les 10 min, vercel.json).
 *
 * 08/10/2026 (lot Z2) : écrivain unique du marché (lib/marche-robot.ts). CoinMarketCap top 100 en USD, CoinGecko
 * seulement si CoinMarketCap échoue ; euro au taux de lib/fx.ts ; métriques globales une fois par heure ; bandeau +
 * instantané de secours + global en UNE commande MSET ; trace « dernier passage + résultat » (cron:refresh-ticker-prices:last).
 * Remplace aussi l'ancien cron horaire update-static-prices (doublon D9, supprimé).
 *
 * Frein du mois (lot Z2b) : projection CoinMarketCap > 90 % (ou erreur 1009 du jour) → un passage sur deux est sauté et le global
 * ne part que toutes les 3 h ; retour à la normale sous 75 % (scripts/lib/budget-mois.mjs). Jamais de coupure.
 *
 * Paramètres (lancement manuel) : ?global=1 force le relevé des métriques globales ; ?force=1 ignore le saut du frein.
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

  const params = new URL(req.url).searchParams;
  const r = await releverMarche({ forceGlobal: params.get("global") === "1", force: params.get("force") === "1" });

  // Frein du mois (lot Z2b) : passage sauté = relevé toutes les 20 min. Rien n'est appelé, rien n'est écrit (la trace garde
  // l'heure du dernier VRAI relevé, que la sentinelle et le frein relisent).
  if (r.saute) {
    return NextResponse.json({ ok: true, saute: true, frein: "actif", raison: r.frein?.raison, durationMs: Date.now() - startedAt });
  }

  await writeCronTrace(CRON_TRACE_KEYS.refreshTickerPrices, {
    ok: r.ok,
    ...(r.raison ? { raison: r.raison } : {}),
    source: r.source ?? "aucune",
    count: r.count,
    global: r.global,
    // Lot Z2b : état du frein du mois et compteur interne des crédits du mois (lus par le bilan et la sentinelle).
    ...(r.frein
      ? {
          frein: r.frein.actif ? "actif" : "normal",
          freinRaison: r.frein.raison.slice(0, 120),
          ...(r.frein.projectionPct !== null ? { projectionPct: Math.round(r.frein.projectionPct * 10) / 10 } : {}),
        }
      : {}),
    ...(r.mois !== undefined && r.creditsMois !== undefined ? { mois: r.mois, creditsMois: r.creditsMois } : {}),
    // Reprise Z2 : raison courte de l'échec CoinMarketCap (relais CoinGecko ou échec total), lue par la sentinelle.
    // Messages de lib/coinmarketcap.ts seulement (« HTTP 429 », « délai dépassé »…) : jamais la clé.
    ...(r.cmcErreur ? { cmcErreur: r.cmcErreur.slice(0, 120) } : {}),
    // Lot Z3 (R4) : point horaire du top 100 dans l'archive des cours (« non disponible » tant que la migration manque).
    ...(r.archive ? { archive: r.archive } : {}),
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

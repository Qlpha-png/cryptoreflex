/**
 * GET /api/diag/cmc-budget
 *
 * Bilan du budget CoinMarketCap (07/10/2026, Kev : « contrôler la consommation de CoinMarketCap pour qu'on ait
 * toujours les ressources pour 1 mois ») : compteur officiel de la clé (/v1/key/info, 0 crédit, lecture partagée
 * avec le garde-fou : au plus une toutes les 10 min par instance), rythme, besoin d'ici la fin du mois, mode du
 * garde-fou. Lu par la sentinelle (scripts/sentinelle.mjs) toutes les heures.
 *
 * Protégé comme les autres diagnostics (404 sans le bon jeton) :
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://www.cryptoreflex.fr/api/diag/cmc-budget
 *
 * Réponse : chiffres de consommation uniquement (jamais la clé).
 */

import { NextResponse } from "next/server";
import { verifyBearer } from "@/lib/auth";
import { cmcBudgetReport } from "@/lib/coinmarketcap";
import { lireTraceR1 } from "@/lib/marche-robot";
import { moisCle } from "@/scripts/lib/budget-mois.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bilan = await cmcBudgetReport();
  // Lot Z2b (08/10/2026) : état du FREIN du robot des cours et compteur interne des crédits du mois, tous deux écrits dans la
  // trace de R1 (cron:refresh-ticker-prices:last). null = aucune trace (premier passage pas encore fait) : rien n'est supposé.
  const trace = await lireTraceR1();
  const frein = trace?.frein
    ? { etat: trace.frein, raison: trace.freinRaison ?? null, projectionPct: trace.projectionPct ?? null, dernierReleve: trace.at ?? null }
    : null;
  const compteurRobots =
    trace?.mois === moisCle(Date.now()) && trace.creditsMois !== undefined ? { mois: trace.mois, credits: trace.creditsMois, source: "trace du robot des cours (robots seulement)" } : null;
  return NextResponse.json({ ...bilan, frein, compteurRobots }, { headers: { "Cache-Control": "no-store" } });
}

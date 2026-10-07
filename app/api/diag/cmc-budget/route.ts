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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  if (!verifyBearer(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bilan = await cmcBudgetReport();
  return NextResponse.json(bilan, { headers: { "Cache-Control": "no-store" } });
}

/**
 * GET /api/prices/stream
 *
 * ENDPOINT DESACTIVE — INCIDENT VERCEL 2026-05-04
 *
 * == Contexte ==
 *
 * Ce SSE etait initialement un stream temps-reel des prix Binance pour
 * la home (HeroLiveWidget), heatmap (LiveHeatmap), et tickers
 * (PriceTicker). Pattern : Edge Runtime, poll Binance REST toutes les
 * 2.5s, push SSE aux clients.
 *
 * Probleme : SSE garde la connexion ouverte = consomme du Active CPU
 * EN CONTINU tant que le tab visiteur est ouvert. Sur Vercel Hobby
 * (4h Active CPU/mois = 14400 s) :
 *
 *   1 visiteur × 1h tab ouvert = 3600 s = 25 % du quota mensuel
 *   25 visiteurs × 30 min     = 45000 s = 312 % du quota
 *
 * Resultat : suspension Vercel pour depassement 300% Fluid Active CPU.
 *
 * == Fix ==
 *
 * On retourne 503 immediatement sans ouvrir aucun stream. Le hook
 * `useLivePrices` cote client a deja un fallback automatique :
 *
 *   - Tente SSE → 503 → retry exponentiel 2s/5s/15s
 *   - Apres 3 echecs → bascule "fallback" mode : poll /api/prices REST
 *     toutes les 30s (cache 60s)
 *
 * Impact UX :
 *   - Prix updates 30s au lieu de 2.5s
 *   - Acceptable pour site editorial / affiliate (pas trading)
 *   - Aucun changement visuel
 *
 * == Reactivation possible ==
 *
 * Option A : passer Vercel Pro (1000h CPU/mois = 250x Hobby) - 20$/mois.
 * Option B : Upstash Redis Pub/Sub mutualisation cross-client.
 * Option C : webhooks Binance + KV cache + 1 polling serveur partage.
 *
 * Pour reactiver : restaurer l'ancien handler depuis git history (commit
 * antecedent a celui qui a desactive) + redeployer.
 *
 * == Historique git ==
 *
 * - Avant : SSE Binance 2.5s + heartbeat 25s + cleanup proper
 * - 2026-05-04 : DESACTIVE pour incident quota
 */

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      error:
        "SSE prices stream temporarily disabled (Vercel quota incident 2026-05-04). Use REST endpoint /api/prices?ids=... with polling.",
      fallback: "/api/prices",
    }),
    {
      status: 503,
      headers: {
        "content-type": "application/json",
        // Cache 5 min pour que l'erreur ne soit pas regeneree a chaque
        // retry SSE (sinon le hook useLivePrices fait 3 retries en 2s+5s+15s
        // = 3 hits a la function pour rien).
        "cache-control": "public, max-age=300",
      },
    },
  );
}

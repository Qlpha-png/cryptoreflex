/**
 * GET /api/prices/stream
 *
 * ENDPOINT DESACTIVE — INCIDENT VERCEL 2026-05-04 (puis migration Hetzner/Coolify)
 *
 * == Contexte historique ==
 *
 * Ce SSE etait initialement un stream temps-reel des prix Binance pour
 * la home (HeroLiveWidget), heatmap (LiveHeatmap), et tickers
 * (PriceTicker). Pattern : Edge Runtime, poll Binance REST toutes les
 * 2.5s, push SSE aux clients.
 *
 * Probleme initial (Vercel Hobby) : SSE garde la connexion ouverte =
 * consomme Active CPU en continu. Quota 4h CPU/mois explose des 25
 * visiteurs × 30 min. Resultat : suspension Vercel.
 *
 * Migration Hetzner/Coolify (2026-05) : on n'a plus de quota Vercel
 * mais l'endpoint reste desactive — la decision de reactiver SSE doit
 * etre prise consciemment (charge CPU continue sur le VPS).
 *
 * == Comportement actuel (FIX 2026-05-08) ==
 *
 * Avant : on retournait status 503 + JSON. Le browser logguait cela
 * comme "Failed to load resource: 503" → 3 console errors par audit
 * Lighthouse (le hook useLivePrices retry 3x avant fallback). BP
 * score plombe a 73/100.
 *
 * Maintenant : on retourne 200 OK + un stream SSE qui envoie un
 * unique event `{"disabled":true}` puis ferme. EventSource interprete
 * ca comme "stream termine proprement" → 0 console error, et le hook
 * detecte le payload `disabled` et bascule directement en fallback
 * REST polling sans retry inutile.
 *
 * Impact UX : identique (poll REST 30s au lieu de SSE 2.5s).
 *
 * == Reactivation possible ==
 *
 * Option A : restaurer l'ancien handler depuis git history. Surveiller
 *            la conso CPU sur Hetzner (top + Sentry performance traces).
 * Option B : Upstash Redis Pub/Sub mutualisation cross-client.
 * Option C : webhooks Binance + KV cache + 1 polling serveur partage.
 */

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  // Stream SSE qui envoie un unique event `disabled:true` puis se ferme.
  // EventSource cote client voit un 200 OK + 1 message + fin de stream.
  // Le hook useLivePrices detecte le payload et bascule en REST polling
  // sans retry (cf onmessage handler dans lib/hooks/useLivePrices.ts).
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Format SSE : "event: type\ndata: payload\n\n"
      controller.enqueue(
        encoder.encode(
          `event: disabled\ndata: ${JSON.stringify({
            disabled: true,
            reason: "SSE stream desactive — utiliser REST /api/prices avec polling",
            fallback: "/api/prices",
          })}\n\n`,
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      // Cache 5 min — la decision de desactivation est stable, le browser
      // peut servir cette reponse depuis son cache pour les retries.
      "cache-control": "public, max-age=300",
      "x-stream-status": "disabled",
    },
  });
}

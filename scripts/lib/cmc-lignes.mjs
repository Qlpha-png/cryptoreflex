/**
 * scripts/lib/cmc-lignes.mjs — lignes CoinMarketCap nécessaires à la table data/cmc-id-map.json (lot Z3, 10/10/2026).
 *
 * Partagé par :
 *  - la route du site app/api/cron/cmc-lignes (clé CMC_API_KEY de Vercel, jamais exposée) : le robot mensuel
 *    .github/workflows/cmc-id-map.yml l'appelle avec CRON_SECRET, puis construit la table avec
 *    « node scripts/construire-cmc-id-map.mjs --liste <réponse> --ecrire » (la clé n'a pas à être recopiée dans GitHub) ;
 *  - scripts/construire-cmc-id-map.mjs lancé en local avec CMC_API_KEY.
 *
 * Budget : /v1/key/info (0 crédit), puis /v1/cryptocurrency/map (1 crédit) et /v2/cryptocurrency/quotes/latest?id= par lots
 * de 100 pour les seuls candidats (même symbole qu'une fiche, ou slug désigné ci-dessous) : ≈ 8 crédits par mois. Refus si
 * le frein du mois est actif (scripts/lib/budget-mois.mjs) ou s'il reste moins de 300 crédits ce mois-ci.
 */
import { decisionFrein } from "./budget-mois.mjs";

export const CMC_BASE = "https://pro-api.coinmarketcap.com";
export const RESERVE_MOIS = 300;

/**
 * Désignations manuelles (slug CMC), reprises de la table du 06/10/2026 : renommages que ni le symbole ni le nom ne
 * suivent (Toncoin → Gram, LEO, xStock…). Elles restent soumises au contrôle du prix à ± 5 %.
 */
export const MANUELS = {
  apecoin: { cmcSlug: "apecoin-ape" },
  "world-liberty-financial": { cmcSlug: "world-liberty-financial-wlfi" },
  "the-open-network": { cmcSlug: "gram" },
  "leo-token": { cmcSlug: "unus-sed-leo" },
  "usd1-wlfi": { cmcSlug: "usd1" },
  "gatechain-token": { cmcSlug: "gatetoken" },
  "jupiter-exchange-solana": { cmcSlug: "jupiter-ag" },
  "pi-network": { cmcSlug: "pi" },
  bittorrent: { cmcSlug: "bittorrent-new" },
  eigenlayer: { cmcSlug: "eigencloud" },
  "gmt-token": { cmcSlug: "gomining-token" },
  "mina-protocol": { cmcSlug: "mina" },
  deep: { cmcSlug: "deepbook-protocol" },
  "beam-2": { cmcSlug: "onbeam" },
  "stp-network": { cmcSlug: "awe-network" },
  "genius-3": { cmcSlug: "genius-terminal" },
  "htx-dao": { cmcSlug: "htx" },
  pha: { cmcSlug: "phala-network" },
  bas: { cmcSlug: "bnb-attestation-service" },
  "threshold-network-token": { cmcSlug: "threshold" },
  sushi: { cmcSlug: "sushiswap" },
  "xyo-network": { cmcSlug: "xyo" },
  zignaly: { cmcSlug: "zigcoin" },
  "g-token": { cmcSlug: "gravity-token" },
  popcat: { cmcSlug: "popcat-sol" },
  holoworld: { cmcSlug: "holoworld-ai" },
  "tesla-xstock": { cmcSlug: "tesla-tokenized-stock-xstock" },
  "circle-xstock": { cmcSlug: "circle-tokenized-stock-xstock" },
  "sp500-xstock": { cmcSlug: "sp500-tokenized-stock-xstock" },
  "microstrategy-xstock": { cmcSlug: "microstrategy-tokenized-stock-xstock" },
  "strategy-pp-variable-xstock": { cmcSlug: "strategy-pp-variable-tokenized-stock-xstock" },
  "circle-internet-group-ondo-tokenized-stock": { cmcSlug: "circle-internet-group-tokenized-stock-ondo" },
  "cheems-token": { cmcSlug: "cheems-pet" },
  "helio-protocol-hay": { cmcSlug: "lisusd" },
  "ondo-u-s-dollar-token": { cmcSlug: "us-dollar-tokenized-currency-ondo" },
  // 10/10/2026 (lot Z3) : deux lignes CMC « Midnight » au même symbole et au même prix ; l'identifiant de la table du 06/10
  // (39064, midnight-network) est désigné, toujours soumis au contrôle du prix.
  "midnight-3": { cmcSlug: "midnight-network" },
};

async function cmcGet(p, key, fetchImpl) {
  const r = await fetchImpl(`${CMC_BASE}${p}`, { headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  const j = await r.json().catch(() => null);
  if (!r.ok || (j?.status?.error_code ?? 0) !== 0) throw new Error(`CoinMarketCap ${p.split("?")[0]} : HTTP ${r.status}, erreur ${j?.status?.error_code ?? "?"}`);
  return { data: j.data, credits: Number(j?.status?.credit_count) || 0 };
}

/**
 * Lignes CMC (cotations complètes) des candidats d'appariement : identifiants actifs dont le symbole est celui d'une fiche,
 * ou dont le slug est désigné dans MANUELS.
 * @param {{ symboles: string[], key: string, idsEnPlus?: number[], fetchImpl?: typeof fetch, attendreMs?: number, now?: number }} o
 *   idsEnPlus : identifiants de la table actuelle, toujours cotés (règle de continuité de scripts/lib/cmc-appariement.mjs :
 *   une fiche renommée chez CoinMarketCap garde son identifiant si le prix concorde).
 * @returns {Promise<{ lignes: object[], candidats: number, credits: number, source: string }>}
 */
export async function lireLignesCmc({ symboles, key, idsEnPlus = [], fetchImpl = fetch, attendreMs = 1500, now = Date.now() }) {
  const info = await cmcGet("/v1/key/info", key, fetchImpl);
  const u = info.data?.usage?.current_month;
  const limite = Number(info.data?.plan?.credit_limit_monthly) || 15_000;
  const consomme = Number(u?.credits_used);
  const restant = Number(u?.credits_left);
  const frein = decisionFrein({ consomme: Number.isFinite(consomme) ? consomme : null, limite, now });
  if (frein.actif) throw new Error(`frein du mois actif (${frein.raison}) : construction reportée`);
  if (Number.isFinite(restant) && restant < RESERVE_MOIS) throw new Error(`moins de ${RESERVE_MOIS} crédits restants ce mois-ci`);
  // Carte complète des identifiants actifs, par pages de 5 000 (plafond de l'API) : une seule page laissait de côté les
  // jetons au-delà des 5 000 premiers (116 fiches absentes de la table du 10/10). 5 pages au plus (25 000 identifiants).
  const carteData = [];
  let credits = 0;
  for (let page = 0; page < 5; page++) {
    const c = await cmcGet(`/v1/cryptocurrency/map?listing_status=active&sort=cmc_rank&start=${page * 5000 + 1}&limit=5000`, key, fetchImpl);
    credits += c.credits;
    const lot = Array.isArray(c.data) ? c.data : [];
    carteData.push(...lot);
    if (lot.length < 5000) break;
  }
  const voulus = new Set(symboles.map((s) => String(s).toUpperCase()));
  const slugs = new Set(Object.values(MANUELS).map((m) => m.cmcSlug));
  const ids = [
    ...new Set([
      ...carteData.filter((c) => voulus.has(String(c.symbol).toUpperCase()) || slugs.has(c.slug)).map((c) => c.id),
      ...idsEnPlus.filter((id) => Number.isInteger(id) && id > 0),
    ]),
  ];
  const lignes = [];
  for (let i = 0; i < ids.length; i += 100) {
    const lot = ids.slice(i, i + 100);
    const q = await cmcGet(`/v2/cryptocurrency/quotes/latest?id=${lot.join(",")}&convert=USD&skip_invalid=true`, key, fetchImpl);
    credits += q.credits;
    for (const v of Object.values(q.data ?? {}).flat()) lignes.push(v);
    if (attendreMs > 0 && i + 100 < ids.length) await new Promise((r) => setTimeout(r, attendreMs));
  }
  return { lignes, candidats: ids.length, credits, source: `API CoinMarketCap du ${new Date(now).toISOString()} (${credits} crédits)` };
}

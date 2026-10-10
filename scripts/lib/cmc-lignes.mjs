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
 * de 100 pour les seuls candidats (même symbole qu'une fiche, ou slug désigné ci-dessous) : ≈ 10 à 16 crédits par mois
 * (1 par lot de 100 candidats + carte ; 10 le 10/10/2026). Refus si le frein du mois est actif (scripts/lib/budget-mois.mjs)
 * ou s'il reste moins de 300 crédits ce mois-ci.
 */
import { decisionFrein } from "./budget-mois.mjs";

export const CMC_BASE = "https://pro-api.coinmarketcap.com";
export const RESERVE_MOIS = 300;
/**
 * Pause entre deux appels payants consécutifs (pages de la carte, puis chaque lot de cotations, le premier compris) :
 * 2,1 s, soit moins de 29 appels sur toute fenêtre de 60 s, quel que soit le volume (limite de 30 de l'offre Basic ;
 * /v1/key/info compris, puisque lui aussi est suivi de cette pause). 16 lots + 2 pages ≈ 38 s d'attente, sous
 * maxDuration = 180 de la route.
 */
export const ATTENTE_COTATIONS_MS = 2100;

/**
 * Désignations manuelles { slug CMC, identifiant CMC } (reprises de la table du 06/10/2026 ; identifiants relevés sur la
 * carte publique CMC du 10/10/2026, concordants avec la table) : renommages que ni le symbole ni le nom ne suivent
 * (Toncoin → Gram, LEO, xStock…). Une désignation vaut preuve d'identité (elle dispense de l'adresse commune exigée des
 * actifs à 1 $), mais elle reste soumise au contrôle du prix à ± 5 % contre une référence INDÉPENDANTE quand il en existe
 * une, et un contrat différent sur un même réseau la fait toujours rejeter. Introuvable → jamais reconduite. Slug qui
 * renvoie un AUTRE identifiant que cmcId (slug réattribué : précédent réel, « mantra » resté à l'ancien OM 6536) → refus
 * et ::warning:: (jamais suivie en silence).
 */
export const MANUELS = {
  apecoin: { cmcSlug: "apecoin-ape", cmcId: 18876 },
  "world-liberty-financial": { cmcSlug: "world-liberty-financial-wlfi", cmcId: 33251 },
  "the-open-network": { cmcSlug: "gram", cmcId: 11419 },
  "leo-token": { cmcSlug: "unus-sed-leo", cmcId: 3957 },
  "usd1-wlfi": { cmcSlug: "usd1", cmcId: 36148 },
  "gatechain-token": { cmcSlug: "gatetoken", cmcId: 4269 },
  "jupiter-exchange-solana": { cmcSlug: "jupiter-ag", cmcId: 29210 },
  "pi-network": { cmcSlug: "pi", cmcId: 35697 },
  bittorrent: { cmcSlug: "bittorrent-new", cmcId: 16086 },
  eigenlayer: { cmcSlug: "eigencloud", cmcId: 30494 },
  "gmt-token": { cmcSlug: "gomining-token", cmcId: 10180 },
  "mina-protocol": { cmcSlug: "mina", cmcId: 8646 },
  deep: { cmcSlug: "deepbook-protocol", cmcId: 33391 },
  "beam-2": { cmcSlug: "onbeam", cmcId: 28298 },
  "stp-network": { cmcSlug: "awe-network", cmcId: 4006 },
  "genius-3": { cmcSlug: "genius-terminal", cmcId: 39841 },
  "htx-dao": { cmcSlug: "htx", cmcId: 29160 },
  pha: { cmcSlug: "phala-network", cmcId: 6841 },
  bas: { cmcSlug: "bnb-attestation-service", cmcId: 37387 },
  "threshold-network-token": { cmcSlug: "threshold", cmcId: 17751 },
  sushi: { cmcSlug: "sushiswap", cmcId: 6758 },
  "xyo-network": { cmcSlug: "xyo", cmcId: 2765 },
  zignaly: { cmcSlug: "zigcoin", cmcId: 9260 },
  "g-token": { cmcSlug: "gravity-token", cmcId: 32120 },
  popcat: { cmcSlug: "popcat-sol", cmcId: 28782 },
  holoworld: { cmcSlug: "holoworld-ai", cmcId: 38309 },
  "tesla-xstock": { cmcSlug: "tesla-tokenized-stock-xstock", cmcId: 37004 },
  "circle-xstock": { cmcSlug: "circle-tokenized-stock-xstock", cmcId: 37005 },
  "sp500-xstock": { cmcSlug: "sp500-tokenized-stock-xstock", cmcId: 37006 },
  "microstrategy-xstock": { cmcSlug: "microstrategy-tokenized-stock-xstock", cmcId: 37003 },
  "strategy-pp-variable-xstock": { cmcSlug: "strategy-pp-variable-tokenized-stock-xstock", cmcId: 39711 },
  "circle-internet-group-ondo-tokenized-stock": { cmcSlug: "circle-internet-group-tokenized-stock-ondo", cmcId: 38056 },
  "cheems-token": { cmcSlug: "cheems-pet", cmcId: 33280 },
  "helio-protocol-hay": { cmcSlug: "lisusd", cmcId: 21330 },
  "ondo-u-s-dollar-token": { cmcSlug: "us-dollar-tokenized-currency-ondo", cmcId: 38273 },
  // 10/10/2026 (lot Z3) : deux lignes CMC « Midnight » au même symbole et au même prix ; l'identifiant de la table du 06/10
  // (39064, midnight-network) est désigné, toujours soumis au contrôle du prix.
  "midnight-3": { cmcSlug: "midnight-network", cmcId: 39064 },

  // 10/10/2026 (identité par contrat) — fiches SANS adresse de contrat en base (chaînes natives, fiches éditoriales) ou
  // au symbole/nom périmé en base : la continuité exige désormais une adresse commune, la désignation explicite est la
  // preuve d'identité. Relevés du 10/10/2026 vers 10:13-10:22 UTC : carte et cotations publiques CoinMarketCap
  // (data-api v3) contre CoinGecko public (/simple/price et /coins/<id>), même actif des deux côtés.
  // mantra : CMC 39611 « MANTRA (MANTRA) » 0,004495 $ ; CoinGecko mantra « MANTRA (mantra) » 0,004485 $ (nouveau jeton ; l'ancien
  // OM = CMC 6536 « MANTRA (old) », slug « mantra », 0,0018 $). Aucune adresse en base (chaîne native).
  mantra: { cmcSlug: "mantra-new", cmcId: 39611 },
  // story-2 : CMC 35626 « Data Network (DATA) » 0,19483 $ ; CoinGecko story-2 « Data Network (data) » 0,19465 $.
  "story-2": { cmcSlug: "data-network", cmcId: 35626 },
  // render-token : CMC 5690 « Render (RENDER) » 1,9313 $, ethereum 0x6de037ef… ; CoinGecko render-token « Render (render) »
  // 1,93 $, ethereum 0x6de037ef… (même contrat) ; aucune adresse en base, symbole RNDR périmé en base.
  "render-token": { cmcSlug: "render", cmcId: 5690 },
  // maker : CMC 1518 « Maker (MKR) » 1 784,74 $, ethereum 0x9f8f72aa… ; CoinGecko maker « Maker (mkr) » 1 783,96 $, même
  // contrat ; aucune adresse en base, nom « Sky (ex-Maker) » en base (SKY est un autre jeton).
  maker: { cmcSlug: "maker", cmcId: 1518 },
  // frax-share : CMC 6953 « Frax (prev. FXS) (FRAX) » 0,31539 $, ethereum 0x3432b6a6… ; CoinGecko frax-share « Frax (prev.
  // FXS) (frax) » 0,31547 $, même contrat ; aucune adresse en base, symbole FXS périmé en base.
  "frax-share": { cmcSlug: "frax-share", cmcId: 6953 },
  // Dollars numériques et actifs proches de 1 $ sans adresse commune lisible (la règle à 1 $ exige une adresse commune
  // ou cette désignation) : prix CMC / CoinGecko du 10/10/2026.
  tether: { cmcSlug: "tether", cmcId: 825 }, // CMC 825 « Tether USDt (USDT) » 0,99905 / 0,99918 ; aucune adresse en base
  "usd-coin": { cmcSlug: "usd-coin", cmcId: 3408 }, // CMC 3408 « USDC (USDC) » 0,99987 / 0,99971 ; aucune adresse en base
  dai: { cmcSlug: "multi-collateral-dai", cmcId: 4943 }, // CMC 4943 « Dai (DAI) » 0,99963 / 1,0 ; aucune adresse en base
  gusd: { cmcSlug: "gusd", cmcId: 38330 }, // CMC 38330 « GUSD (GUSD) » 0,99742 / 0,99754 ; aucune adresse en base
  bfusd: { cmcSlug: "bfusd", cmcId: 37760 }, // CMC 37760 « BFUSD (BFUSD) » 0,99814 / 0,99821 ; aucune adresse en base
  ylds: { cmcSlug: "ylds", cmcId: 40091 }, // CMC 40091 « YLDS (YLDS) » 0,99988 / 0,99936 ; aucune adresse en base
  qtum: { cmcSlug: "qtum", cmcId: 1684 }, // CMC 1684 « Qtum (QTUM) » 0,95180 / 0,95035 (proche de 1 $ par hasard) ; chaîne native
  // binance-usd : CMC 4687 « BUSD (BUSD) » 0,99975 / 0,99652 ; plateforme principale CMC = BEP2 « BUSD-BD1 », mais la fiche
  // CMC publique liste aussi ethereum 0x4fabb145…, l'adresse en base.
  "binance-usd": { cmcSlug: "binance-usd", cmcId: 4687 },
  "figure-heloc": { cmcSlug: "figure-heloc", cmcId: 39361 }, // CMC 39361 « Figure HELOC (FIGR_HELOC) » 1 / 1,001 ; Provenance, pas de plateforme CMC
  memecore: { cmcSlug: "memecore", cmcId: 35491 }, // CMC 35491 « MemeCore (M) » 1,0016 / 1,002 (proche de 1 $ par hasard) ; chaîne native
  terrausd: { cmcSlug: "terrausd", cmcId: 7129 }, // CMC 7129 « TerraClassicUSD (USTC) » 0,005446 / 0,005436 ; stablecoin décroché, IBC seulement
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
 * @param {{ symboles: string[], key: string, idsEnPlus?: number[], fetchImpl?: typeof fetch, attendreMs?: number, pause?: (ms: number) => Promise<void>, now?: number }} o
 *   idsEnPlus : identifiants de la table actuelle, toujours cotés (règle de continuité de scripts/lib/cmc-appariement.mjs :
 *   une fiche renommée chez CoinMarketCap garde son identifiant seulement avec une adresse de contrat commune).
 *   attendreMs : pause AVANT chaque appel qui suit /v1/key/info (pages de carte et lots de cotations, le premier compris).
 * @returns {Promise<{ lignes: object[], candidats: number, credits: number, source: string }>}
 */
export async function lireLignesCmc({ symboles, key, idsEnPlus = [], fetchImpl = fetch, attendreMs = ATTENTE_COTATIONS_MS, pause = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now() }) {
  const espacer = async () => {
    if (attendreMs > 0) await pause(attendreMs);
  };
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
    await espacer();
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
    await espacer();
    const q = await cmcGet(`/v2/cryptocurrency/quotes/latest?id=${lot.join(",")}&convert=USD&skip_invalid=true`, key, fetchImpl);
    credits += q.credits;
    for (const v of Object.values(q.data ?? {}).flat()) lignes.push(v);
  }
  return { lignes, candidats: ids.length, credits, source: `API CoinMarketCap du ${new Date(now).toISOString()} (${credits} crédits)` };
}

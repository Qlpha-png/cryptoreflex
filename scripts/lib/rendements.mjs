/**
 * scripts/lib/rendements.mjs — robot R8 « rendements » (lot Z5, 10/10/2026) : fonctions pures, testées sans réseau
 * (tests/lib/rendements.test.ts). Zéro dépendance (Node ≥ 20 et bundle Next).
 *
 * Demande de Kev : « tout ce qui n'est pas automatisé doit l'être », « 0 euro », données « toujours à jour », aucune
 * donnée inventée. Règle des licences (architecture § 1.1, relue par les éclaireurs Z5 le 10/10/2026) :
 *  - AFFICHAGE automatique : seulement une source « R ». Une seule reste : Lido (S15), dont la documentation dit
 *    « Lido APIs are strictly for read-only access » et invite à les intégrer « in your app or website »
 *    (https://docs.lido.fi/integrations/api). L'APR publié est celui de l'utilisateur, APRÈS la commission de Lido.
 *  - DÉTECTION interne seulement : sources « C » (Aave S17, Rocket Pool S16). Leur valeur est comparée à la valeur
 *    affichée sur le site ; elle n'est JAMAIS écrite dans le dépôt (public) ni dans le résumé public du run : elle part
 *    seulement dans le ticket privé. Le fichier ne garde que le verdict (cohérent / écart / source muette) et sa date.
 *  - Exclues : Morpho (S18, conditions du 11/09/2026, art. 13 : reproduction et extraction substantielle interdites
 *    sans autorisation expresse ; aucune ligne Morpho n'est affichée) et la page staking de Kraken (S19, conditions EEE
 *    du 07/10/2026 : « web scraping, web harvesting, or data extraction » et « bots, robots… » interdits). Les lignes
 *    Kraken, Coinbase, Bitpanda, SwissBorg, Compound… gardent leur date de relevé, affichée avec son âge.
 *
 * Garde-fous (architecture § 2.2) : bornes 0 à 25 % (rejet dur) ; bande de plausibilité 0,5 à 10 % pour le staking
 * ETH (une valeur divisée par 100 passerait les bornes) ; Aave : marché principal choisi PAR ADRESSE (4 marchés v3 sur
 * Ethereum ont un USDC), au moins 150 points horaires couvrant les 7 derniers jours, médiane (jamais un instantané : pic
 * quotidien vers 01:00 UTC) ; source muette ou valeur hors bornes = valeur précédente gardée, avec son âge, et ticket privé.
 *
 * Lido (reprise du lot Z5, 10/10/2026, juré fiabilité) :
 *  - FENÊTRE vérifiée : 6 à 8 points, jours UTC tous distincts, 20 à 28 h entre deux points, 5 à 7 jours entre le premier
 *    et le dernier ; dernier point jamais dans le futur ; sinon la source est traitée comme muette (format changé).
 *  - VARIATION relative : refus si la nouvelle valeur s'écarte de plus de 10 % (0,1 point au moins) de la valeur en place
 *    OU de la médiane des 7 dernières valeurs retenues (`historique`, dans le fichier). Calibrage : remplacer un point
 *    sur 7 ne déplace la médiane que jusqu'au 3e ou au 5e point classé ; sur la série réelle du 09/10/2026 (2,175 à
 *    2,342 %), cela fait 0,022 point au plus (1 %), donc 10 % laisse une marge de 10 fois et attrape un passage à l'APR
 *    brut (+11 %).
 *  - CONFIRMATION d'un nouveau niveau : 3 publications consécutives à moins de 0,25 point l'une de l'autre ET l'APR de
 *    Rocket Pool du même passage plus proche du nouveau niveau que de l'ancien ; le jour de l'acceptation, une alerte
 *    (« nouveau niveau accepté ») complète le ticket privé : jamais d'acceptation silencieuse.
 */

export const LIDO_URL = "https://eth-api.lido.fi/v1/protocol/steth/apr/sma";
export const LIDO_DOC_URL = "https://docs.lido.fi/integrations/api";
export const LIDO_PAGE_URL = "https://lido.fi";
export const AAVE_URL = "https://api.v3.aave.com/graphql";
/** AaveV3Ethereum, marché principal (les marchés Lido, EtherFi et Horizon ont aussi un USDC, à d'autres taux). */
export const AAVE_MARCHE = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
export const ROCKETPOOL_URL = "https://api.rocketpool.net/mainnet/reth/apr";

export const BORNES = { minPct: 0, maxPct: 25 };
/** bande de plausibilité du staking ETH (Lido, Rocket Pool), en % */
export const BANDE_STAKING = { minPct: 0.5, maxPct: 10 };
/** variation tolérée : 10 % de la valeur de référence, 0,1 point au moins (voir le calibrage en tête de fichier) */
export const VARIATION_MAX_REL = 0.1;
export const VARIATION_MIN_PT = 0.1;
export const CONFIRMATION_MAX_PT = 0.25;
/** publications consécutives exigées pour accepter un nouveau niveau */
export const CONFIRMATIONS_MIN = 3;
/** valeurs retenues gardées pour la médiane de référence */
export const HISTORIQUE_MAX = 7;
export const LIDO_AGE_MAX_J = 3;
export const LIDO_POINTS_MIN = 6;
export const LIDO_POINTS_MAX = 8;
/** écart entre deux points Lido consécutifs (h) et étendue de la série (jours) */
export const LIDO_PAS_H = { min: 20, max: 28 };
export const LIDO_ETENDUE_J = { min: 5, max: 7 };
/** tolérance sur l'horloge : un point daté de plus de 10 min après « maintenant » est dans le futur */
export const FUTUR_TOLERANCE_MS = 10 * 60_000;
/** écart maximal entre la moyenne publiée par Lido (smaApr) et notre médiane des mêmes points */
export const LIDO_ECART_SMA_MAX_PT = 0.5;
export const AAVE_POINTS_MIN = 150;
export const AAVE_AGE_MAX_H = 48;
export const HORS_BORNES_MAX = 0.1;
/** cohérent si la valeur de contrôle tombe dans [min − 0,3 ; max + 0,3] */
export const TOLERANCE_PT = 0.3;
/** un écart déjà signalé est rappelé (ticket) au plus une fois tous les 7 jours (date du dernier rappel : rappeleLe) */
export const RAPPEL_ECART_J = 7;
/** Aave : la série doit couvrir les 7 derniers jours (premier point au moins 6 jours avant le dernier) */
export const AAVE_ETENDUE_MIN_J = 6;

/**
 * Lignes du site contrôlées par une source C. `affiche` = valeur affichée par le site (un test impose l'égalité avec
 * lib/stablecoin-yields.ts et lib/staking-rates.ts : quand une session corrige une valeur, elle met cette table à jour).
 * Rocket Pool : le site affiche 2,9 % brut et retire 14 % de frais → 2,494 % net, comparé à l'APR net de rETH.
 */
export const CONTROLES = [
  {
    id: "aave-usdc",
    source: "aave",
    nom: "Aave USDC",
    jeton: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    affiche: { minPct: 3.8, maxPct: 6.2 },
    ligne: "lib/stablecoin-yields.ts · Aave V3 (DeFi) · USDC",
  },
  {
    id: "aave-dai",
    source: "aave",
    nom: "Aave DAI",
    jeton: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    affiche: { minPct: 4.0, maxPct: 7.5 },
    ligne: "lib/stablecoin-yields.ts · Aave V3 (DeFi) · DAI",
  },
  {
    id: "rocketpool-reth",
    source: "rocketpool",
    nom: "Rocket Pool rETH",
    affiche: { minPct: 2.494, maxPct: 2.494 },
    ligne: "lib/staking-rates.ts · Rocket Pool (rETH) · 2,9 % brut − 14 % de frais",
  },
];

/* ------------------------------------------------------------------ outils */
const JOUR_MS = 86_400_000;
const estNombre = (x) => typeof x === "number" && Number.isFinite(x);
const arrondi = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;
const jourUtc = (ms) => new Date(ms).toISOString().slice(0, 10);
const instantJour = (d) => Date.parse(`${d}T00:00:00Z`);
export const pctFr = (x, n = 2) => `${arrondi(x, n).toFixed(n).replace(".", ",")} %`;
/** écart entre deux taux : en points, jamais en % (« 7,26 points ») */
export const ptFr = (x, n = 2) => `${arrondi(x, n).toFixed(n).replace(".", ",")} point${Math.abs(arrondi(x, n)) >= 2 ? "s" : ""}`;
/** seuil de variation tolérée autour d'une valeur de référence (en points) */
export const seuilVariation = (ref) => Math.max(VARIATION_MIN_PT, VARIATION_MAX_REL * Math.abs(ref));

/** Médiane d'une liste de nombres (null si vide). */
export function mediane(valeurs) {
  const v = valeurs.filter(estNombre).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const dansBornes = (x) => estNombre(x) && x >= BORNES.minPct && x <= BORNES.maxPct;

/* ------------------------------------------------------------------ analyses (une source = un JSON) */
/**
 * Lido : { data: { aprs: [{ timeUnix, apr }], smaApr } } (APR en %). Renvoie
 * { horodatage, date, points: [{ date, aprPct }], medianePct, valeurPct, smaPct } ou { erreur }.
 */
export function analyserLido(json) {
  const d = json?.data;
  if (!d || !Array.isArray(d.aprs)) return { erreur: "structure Lido inattendue (data.aprs absent)" };
  if (d.aprs.length < LIDO_POINTS_MIN) return { erreur: `${d.aprs.length} point(s) Lido seulement (au moins ${LIDO_POINTS_MIN} pour une fenêtre de 7 jours)` };
  if (d.aprs.length > LIDO_POINTS_MAX) return { erreur: `${d.aprs.length} points Lido (au plus ${LIDO_POINTS_MAX} pour une fenêtre de 7 jours : fenêtre changée ?)` };
  const pts = [];
  for (const p of d.aprs) {
    if (!Number.isInteger(p?.timeUnix) || p.timeUnix < 1_600_000_000 || p.timeUnix > 4_000_000_000) return { erreur: `horodatage Lido illisible (${JSON.stringify(p?.timeUnix)})` };
    if (!estNombre(p.apr)) return { erreur: `APR Lido illisible (${JSON.stringify(p?.apr)})` };
    if (!dansBornes(p.apr)) return { erreur: `APR Lido hors bornes 0-25 % (${p.apr})` };
    pts.push({ t: p.timeUnix, apr: p.apr });
  }
  pts.sort((a, b) => a.t - b.t);
  for (let i = 1; i < pts.length; i++) if (pts[i].t === pts[i - 1].t) return { erreur: "deux points Lido au même horodatage" };
  // fenêtre « 7 jours » vérifiée (sinon l'étiquette affichée serait fausse) : un point par jour UTC, ~24 h d'écart
  const jours = new Set(pts.map((p) => jourUtc(p.t * 1000)));
  if (jours.size !== pts.length) return { erreur: `${pts.length} points Lido sur ${jours.size} jours seulement (un point par jour attendu : fenêtre changée ?)` };
  for (let i = 1; i < pts.length; i++) {
    const h = (pts[i].t - pts[i - 1].t) / 3600;
    if (h < LIDO_PAS_H.min || h > LIDO_PAS_H.max) return { erreur: `${arrondi(h, 1)} h entre deux points Lido (${LIDO_PAS_H.min} à ${LIDO_PAS_H.max} h attendues : fenêtre changée ?)` };
  }
  const etendueJ = (pts[pts.length - 1].t - pts[0].t) / 86_400;
  if (etendueJ < LIDO_ETENDUE_J.min - 0.2 || etendueJ > LIDO_ETENDUE_J.max + 0.2) return { erreur: `série Lido sur ${arrondi(etendueJ, 1)} jours (${LIDO_ETENDUE_J.min} à ${LIDO_ETENDUE_J.max} attendus : fenêtre changée ?)` };
  const med = mediane(pts.map((p) => p.apr));
  if (med < BANDE_STAKING.minPct || med > BANDE_STAKING.maxPct) return { erreur: `médiane Lido hors bande plausible ${BANDE_STAKING.minPct}-${BANDE_STAKING.maxPct} % (${med} : unité changée ?)` };
  if (!estNombre(d.smaApr)) return { erreur: "moyenne Lido (smaApr) absente" };
  if (Math.abs(d.smaApr - med) > LIDO_ECART_SMA_MAX_PT) return { erreur: `moyenne publiée (${arrondi(d.smaApr, 3)}) et médiane des points (${arrondi(med, 3)}) incohérentes` };
  const dernier = pts[pts.length - 1];
  return {
    horodatage: new Date(dernier.t * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    date: jourUtc(dernier.t * 1000),
    points: pts.map((p) => ({ date: jourUtc(p.t * 1000), aprPct: p.apr })),
    medianePct: med,
    valeurPct: arrondi(med, 2),
    smaPct: arrondi(d.smaApr, 4),
  };
}

/** Corps GraphQL de l'historique sur 7 jours d'un jeton du marché principal d'Aave (choix PAR ADRESSE). */
export function requeteAave(jeton) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(String(jeton))) throw new Error(`adresse de jeton invalide : ${jeton}`);
  return {
    query: `{ supplyAPYHistory(request: { chainId: 1, market: "${AAVE_MARCHE}", underlyingToken: "${jeton}", window: LAST_WEEK }) { date avgRate { value } } }`,
  };
}

/**
 * Aave : { data: { supplyAPYHistory: [{ date, avgRate: { value } }] } } (taux en FRACTION). Renvoie
 * { medianePct, points, exclus, du, au } ou { erreur }.
 */
export function analyserAave(json, aujourdhuiMs) {
  if (Array.isArray(json?.errors) && json.errors.length) return { erreur: `Aave refuse la requête (${String(json.errors[0]?.message ?? "?").slice(0, 120)})` };
  const h = json?.data?.supplyAPYHistory;
  if (!Array.isArray(h)) return { erreur: "structure Aave inattendue (supplyAPYHistory absent)" };
  const pts = [];
  let exclus = 0;
  for (const p of h) {
    const t = Date.parse(String(p?.date ?? ""));
    const v = Number(p?.avgRate?.value);
    if (!Number.isFinite(t) || p?.avgRate?.value == null || !Number.isFinite(v)) return { erreur: "point Aave illisible" };
    const pct = v * 100;
    if (!dansBornes(pct)) { exclus++; continue; }
    pts.push({ t, pct });
  }
  if (h.length < AAVE_POINTS_MIN) return { erreur: `${h.length} point(s) Aave sur 7 jours (au moins ${AAVE_POINTS_MIN})` };
  if (exclus / h.length > HORS_BORNES_MAX) return { erreur: `${exclus} point(s) Aave hors bornes 0-25 % sur ${h.length}` };
  const au = Math.max(...pts.map((p) => p.t));
  const du = Math.min(...pts.map((p) => p.t));
  if (estNombre(aujourdhuiMs) && aujourdhuiMs - au > AAVE_AGE_MAX_H * 3_600_000) return { erreur: `dernier point Aave trop ancien (${new Date(au).toISOString()})` };
  // fenêtre vérifiée (reprise Z5) : la série couvre les 7 derniers jours, et rien de plus ancien que 8 jours
  if (au - du < AAVE_ETENDUE_MIN_J * JOUR_MS) return { erreur: `série Aave sur ${arrondi((au - du) / JOUR_MS, 1)} jours seulement (7 attendus)` };
  if (au - du > 8 * JOUR_MS) return { erreur: `série Aave sur ${arrondi((au - du) / JOUR_MS, 1)} jours (fenêtre de 7 jours attendue : format changé ?)` };
  return { medianePct: mediane(pts.map((p) => p.pct)), points: pts.length, exclus, du: new Date(du).toISOString(), au: new Date(au).toISOString() };
}

/** Rocket Pool : { yearlyAPR: "2.18…" } (en %, souvent une chaîne de 100 décimales). Renvoie { valeurPct } ou { erreur }. */
export function analyserRocketPool(json) {
  const brut = json?.yearlyAPR;
  if (brut == null || brut === "") return { erreur: "structure Rocket Pool inattendue (yearlyAPR absent)" };
  const v = Number(brut);
  if (!Number.isFinite(v)) return { erreur: "APR Rocket Pool illisible" };
  if (!dansBornes(v)) return { erreur: `APR Rocket Pool hors bornes 0-25 % (${arrondi(v, 4)})` };
  if (v < BANDE_STAKING.minPct || v > BANDE_STAKING.maxPct) return { erreur: `APR Rocket Pool hors bande plausible ${BANDE_STAKING.minPct}-${BANDE_STAKING.maxPct} % (${arrondi(v, 4)} : unité changée ?)` };
  return { valeurPct: v };
}

/* ------------------------------------------------------------------ décision */
const memeAffiche = (a, b) => !!a && !!b && a.minPct === b.minPct && a.maxPct === b.maxPct;
export const coherent = (valeurPct, affiche) => valeurPct >= affiche.minPct - TOLERANCE_PT && valeurPct <= affiche.maxPct + TOLERANCE_PT;
const afficheTexte = (a) => (a.minPct === a.maxPct ? pctFr(a.minPct, 3) : `${pctFr(a.minPct, 1)} à ${pctFr(a.maxPct, 1)}`);

function lidoBase(lu, precedent, controle, historique) {
  return {
    source: "Lido, API publique (APR du stETH)",
    sourceUrl: LIDO_URL,
    docUrl: LIDO_DOC_URL,
    pageUrl: LIDO_PAGE_URL,
    methode: "mediane-7-jours",
    date: lu.date,
    horodatage: lu.horodatage,
    valeurPct: lu.valeurPct,
    medianePct: arrondi(lu.medianePct, 4),
    smaPct: lu.smaPct,
    points: lu.points,
    precedent,
    historique,
    controle,
  };
}

/** Valeurs retenues des derniers passages (au plus 7) ; ancien fichier sans historique : la valeur en place seule. */
function historiqueDe(actuel) {
  const h = Array.isArray(actuel?.historique) ? actuel.historique.filter((x) => estNombre(x?.valeurPct) && typeof x?.date === "string") : [];
  if (h.length) return h.slice(-HISTORIQUE_MAX);
  return estNombre(actuel?.valeurPct) && actuel?.date ? [{ date: actuel.date, valeurPct: actuel.valeurPct }] : [];
}
const ajouterHistorique = (h, e) => [...h.filter((x) => x.date !== e.date), e].slice(-HISTORIQUE_MAX);

/**
 * Lido : { lido (nouvel état), alerte: string | null, message }.
 * ctx : { aujourdhui, maintenant, rocketPoolPct? } — rocketPoolPct (contrôle interne, jamais écrit) sert seulement à
 * confirmer un nouveau niveau.
 * @returns {{ lido: any, alerte: string | null, message: string }}
 */
export function deciderLido(actuel, lu, ctx) {
  if (lu.erreur) return { lido: actuel ?? null, alerte: `Lido : ${lu.erreur} (valeur en place gardée, avec son âge)`, message: `Lido illisible : ${lu.erreur}` };
  const age = Math.floor((instantJour(ctx.aujourdhui) - instantJour(lu.date)) / JOUR_MS);
  const tLu = Date.parse(lu.horodatage);
  const tMaintenant = Date.parse(ctx.maintenant);
  if (age < 0 || (Number.isFinite(tMaintenant) && tLu > tMaintenant + FUTUR_TOLERANCE_MS)) {
    return { lido: actuel ?? null, alerte: `Lido : dernier point daté du futur (${lu.horodatage}, passage du ${ctx.maintenant}) : valeur en place gardée`, message: `Lido : date dans le futur (${lu.horodatage})` };
  }
  if (age > LIDO_AGE_MAX_J) return { lido: actuel ?? null, alerte: `Lido : dernière publication du ${lu.date} (${age} jours, maximum ${LIDO_AGE_MAX_J}) : valeur en place gardée`, message: `Lido : publication trop ancienne (${lu.date})` };
  const refusePrec = actuel?.controle?.statut === "variation-refusee" ? actuel.controle.refuse ?? null : null;
  const dejaRefusee = () => ({ lido: actuel, alerte: `Lido : ${actuel.controle.detail}`, message: "Lido : variation déjà refusée, rien de neuf" });
  const tAct = actuel?.horodatage ? Date.parse(actuel.horodatage) : NaN;
  let revision = false;
  const dernierApr = (x) => (Array.isArray(x?.points) && x.points.length ? x.points[x.points.length - 1]?.aprPct : null);
  if (tLu < tAct || (tLu === tAct && lu.valeurPct === actuel.valeurPct && dernierApr(lu) === dernierApr(actuel))) {
    if (refusePrec) return dejaRefusee();
    return { lido: actuel, alerte: null, message: `Lido : publication du ${actuel.date} déjà en place` };
  }
  // même horodatage, valeur différente : Lido a révisé sa dernière publication (piège P11) → jugée comme une nouvelle
  if (tLu === tAct) revision = true;
  // même publication déjà refusée (relue par le filet ou une relance) : rien de neuf, l'alerte reste ouverte
  if (refusePrec && refusePrec.horodatage === lu.horodatage && refusePrec.valeurPct === lu.valeurPct) return dejaRefusee();

  const hist = historiqueDe(actuel);
  const refMed = mediane(hist.map((x) => x.valeurPct));
  const ecartAct = estNombre(actuel?.valeurPct) ? Math.abs(lu.valeurPct - actuel.valeurPct) : 0;
  const ecartMed = estNombre(refMed) ? Math.abs(lu.valeurPct - refMed) : 0;
  const tropAct = estNombre(actuel?.valeurPct) && ecartAct > seuilVariation(actuel.valeurPct);
  const tropMed = estNombre(refMed) && ecartMed > seuilVariation(refMed);
  if (tropAct || tropMed) {
    // publications consécutives au nouveau niveau (une révision au même horodatage remplace la dernière sans compter)
    let n = 1;
    let serie = [{ date: lu.date, valeurPct: lu.valeurPct }];
    if (refusePrec && Math.abs(lu.valeurPct - refusePrec.valeurPct) <= Math.min(CONFIRMATION_MAX_PT, seuilVariation(refusePrec.valeurPct))) {
      const prec = Array.isArray(refusePrec.serie) && refusePrec.serie.length ? refusePrec.serie : [{ date: refusePrec.date, valeurPct: refusePrec.valeurPct }];
      const nPrec = Number.isInteger(refusePrec.n) ? refusePrec.n : prec.length;
      if (refusePrec.horodatage === lu.horodatage) { serie = [...prec.slice(0, -1), serie[0]]; n = nPrec; }
      else if (Date.parse(refusePrec.horodatage) < tLu) { serie = [...prec, serie[0]].slice(-CONFIRMATIONS_MIN); n = nPrec + 1; }
    }
    const rp = ctx.rocketPoolPct;
    const sensRocketPool = estNombre(rp) && estNombre(actuel?.valeurPct) && Math.abs(lu.valeurPct - rp) < Math.abs(actuel.valeurPct - rp);
    if (n >= CONFIRMATIONS_MIN && sensRocketPool) {
      const detail = `nouveau niveau accepté après ${n} publications consécutives (${serie.map((x) => x.date).join(", ")}) : ${pctFr(actuel.valeurPct)} au ${actuel.date} → ${pctFr(lu.valeurPct)} au ${lu.date}, dans le même sens que Rocket Pool`;
      const controle = { statut: "ok", verifieLe: ctx.maintenant, detail, refuse: null };
      // jamais d'acceptation silencieuse : l'alerte complète le ticket privé le jour même
      return { lido: lidoBase(lu, { date: actuel.date, valeurPct: actuel.valeurPct }, controle, serie.slice(-HISTORIQUE_MAX)), alerte: `Lido : ${detail}`, message: `Lido : ${detail}` };
    }
    const reference = tropAct ? `la valeur en place (${pctFr(actuel.valeurPct)} au ${actuel.date})` : `la médiane des ${hist.length} dernières valeurs retenues (${pctFr(refMed)})`;
    const ecart = tropAct ? ecartAct : ecartMed;
    const seuil = seuilVariation(tropAct ? actuel.valeurPct : refMed);
    const attente = n >= CONFIRMATIONS_MIN
      ? `${n} publications au nouveau niveau, mais Rocket Pool ${estNombre(rp) ? "ne va pas dans le même sens" : "est muet"} : nouveau niveau non confirmé`
      : `publication ${n} sur ${CONFIRMATIONS_MIN} au nouveau niveau`;
    const detail = `${revision ? "révision de la publication du " + lu.date + " : " : ""}écart de ${ptFr(ecart)} entre le ${lu.date} (${pctFr(lu.valeurPct)}) et ${reference}, maximum ${ptFr(seuil)} (10 %) : valeur du ${actuel.date} gardée ; ${attente}`;
    const controle = { statut: "variation-refusee", verifieLe: ctx.maintenant, detail, refuse: { date: lu.date, horodatage: lu.horodatage, valeurPct: lu.valeurPct, n, serie } };
    return { lido: { ...actuel, controle }, alerte: `Lido : ${detail}`, message: `Lido : ${detail}` };
  }
  const precedent = actuel?.date && actuel.date !== lu.date ? { date: actuel.date, valeurPct: actuel.valeurPct } : (actuel?.precedent ?? null);
  const historique = ajouterHistorique(hist, { date: lu.date, valeurPct: lu.valeurPct });
  const alerteRevision = revision && lu.valeurPct !== actuel.valeurPct ? `Lido : révision de la publication du ${lu.date} (${pctFr(actuel.valeurPct)} → ${pctFr(lu.valeurPct)}), dans la variation tolérée : acceptée` : null;
  return {
    lido: lidoBase(lu, precedent, { statut: "ok", verifieLe: ctx.maintenant, detail: alerteRevision ? alerteRevision.slice(7) : revision ? `révision du dernier point publié le ${lu.date}, médiane inchangée` : null, refuse: null }, historique),
    alerte: alerteRevision,
    message: `Lido : ${pctFr(lu.valeurPct)} (médiane sur 7 jours au ${lu.date})${revision ? ", révision" : ""}`,
  };
}

const joursEntre = (a, b) => Math.round((instantJour(b) - instantJour(a)) / JOUR_MS);

/**
 * Contrôle d'une ligne par une source C : { verdict, alerte: string | null, resume, ticket }.
 * `resume` (public) ne porte jamais la valeur de la source ; `ticket` (privé) la porte.
 */
export function deciderControle(c, prec, lu, ctx) {
  const p = prec && memeAffiche(prec.affiche, c.affiche) ? prec : null; // valeur du site changée : ancien verdict périmé
  const base = { source: c.source === "aave" ? "Aave" : "Rocket Pool", ligne: c.ligne, affiche: { ...c.affiche } };
  if (lu?.erreur || !estNombre(lu?.valeurPct)) {
    const raison = lu?.erreur ?? "aucune valeur";
    return {
      verdict: { ...base, statut: "source-muette", controleLe: p?.controleLe ?? null, depuis: p?.statut === "source-muette" ? p.depuis : ctx.aujourdhui, rappeleLe: null },
      alerte: `${c.nom} : source muette (${raison}) ; dernier contrôle cohérent gardé (${p?.controleLe ?? "aucun"})`,
      resume: `${c.nom} : source muette (dernier contrôle cohérent : ${p?.controleLe ?? "aucun"})`,
      ticket: `- **${c.nom}** : source muette — ${raison}. Ligne : ${c.ligne}.`,
    };
  }
  if (coherent(lu.valeurPct, c.affiche)) {
    return {
      verdict: { ...base, statut: "coherent", controleLe: ctx.aujourdhui, depuis: p?.statut === "coherent" ? p.depuis : ctx.aujourdhui, rappeleLe: null },
      alerte: null,
      resume: `${c.nom} : cohérent avec la valeur affichée`,
      ticket: null,
    };
  }
  const nouveau = p?.statut !== "ecart";
  // ticket à l'apparition de l'écart, puis rappel au plus une fois tous les 7 jours (date du dernier rappel dans le
  // verdict) : les filets et les relances du même jour ne recommentent pas le ticket (piège P9)
  const dernierRappel = nouveau ? null : (p.rappeleLe ?? p.depuis);
  const rappel = !nouveau && (!dernierRappel || joursEntre(dernierRappel, ctx.aujourdhui) >= RAPPEL_ECART_J);
  const signale = nouveau || rappel;
  const ticket = `- **${c.nom}** : écart. Site : ${afficheTexte(c.affiche)} ; source (${lu.methode ?? "valeur"}) : ${pctFr(lu.valeurPct, 3)}. Ligne : ${c.ligne}. Proposition : relire la ligne et corriger la valeur affichée (puis la table CONTROLES de scripts/lib/rendements.mjs). En attendant, le site n'affiche plus ce taux (« en cours de vérification »).`;
  return {
    verdict: { ...base, statut: "ecart", controleLe: p?.controleLe ?? null, depuis: nouveau ? ctx.aujourdhui : p.depuis, rappeleLe: signale ? ctx.aujourdhui : dernierRappel },
    alerte: signale ? `${c.nom} : écart avec la valeur affichée (${nouveau ? "nouveau" : `depuis le ${p.depuis}, rappel hebdomadaire`})` : null,
    resume: `${c.nom} : écart avec la valeur affichée${signale ? " (ticket privé)" : ` depuis le ${p.depuis} (ticket déjà ouvert)`}`,
    ticket,
  };
}

const sansPassage = (j) => {
  if (!j) return null;
  const { passeLe, ...reste } = j;
  return JSON.stringify(reste);
};

/**
 * Décide du nouveau contenu de data/rendements.json.
 *  - actuel : contenu en place (null si absent ou illisible)
 *  - lus : { lido: analyse, controles: { [id]: { valeurPct, methode } | { erreur } } }
 *  - ctx : { aujourdhui: "AAAA-MM-JJ", maintenant: ISO }
 * Renvoie { ecrire, contenu, alertes[], resume[] (public), ticket[] (privé), codeSortie }.
 * @returns {{ ecrire: boolean, contenu: any, alertes: string[], resume: string[], ticket: string[], codeSortie: number }}
 * Écrit seulement si une donnée change (valeur ou date Lido, verdict ou date de contrôle) : passeLe seul ne suffit pas.
 * opts.illisible : le fichier en place est illisible (reprise Z5, piège P7) ; `actuel` est alors la dernière version
 * lisible de l'historique git (ou null) : le contrôle de variation s'applique contre elle, le fichier est TOUJOURS
 * réécrit et une alerte « recréé » part dans le ticket privé. opts.reference : d'où vient `actuel` (texte du ticket).
 */
export function deciderRendements(actuel, lus, ctx, opts = {}) {
  const alertes = [];
  const resume = [];
  const ticket = [];
  if (opts.illisible) {
    const a = `data/rendements.json illisible : recréé (contrôle de variation contre ${opts.reference ?? "aucune version lisible : premier passage"})`;
    alertes.push(a);
    ticket.push(`- **Fichier** : ${a}`);
    resume.push(a);
  }
  const rp = lus.controles?.["rocketpool-reth"]?.valeurPct;
  const l = deciderLido(actuel?.lido ?? null, lus.lido ?? { erreur: "non lue" }, { ...ctx, rocketPoolPct: estNombre(rp) ? rp : undefined });
  if (l.alerte) { alertes.push(l.alerte); ticket.push(`- **Lido** : ${l.alerte}`); }
  resume.push(l.message);
  const controles = {};
  for (const c of CONTROLES) {
    const d = deciderControle(c, actuel?.controles?.[c.id] ?? null, lus.controles?.[c.id], ctx);
    controles[c.id] = d.verdict;
    resume.push(d.resume);
    if (d.alerte) { alertes.push(d.alerte); if (d.ticket) ticket.push(d.ticket); }
  }
  const toutEnEchec = !!(lus.lido?.erreur || !lus.lido) && CONTROLES.every((c) => !estNombre(lus.controles?.[c.id]?.valeurPct));
  if (toutEnEchec) return { ecrire: false, contenu: null, alertes, resume, ticket, codeSortie: 2 };
  const contenu = { version: 1, passeLe: ctx.maintenant, bornes: { ...BORNES }, lido: l.lido, controles };
  if (!contenu.lido) {
    // jamais de fichier sans la source affichée : rien n'est écrit tant que Lido n'a jamais été lu
    return { ecrire: false, contenu: null, alertes, resume, ticket, codeSortie: 0 };
  }
  const ecrire = !!opts.illisible || sansPassage(contenu) !== sansPassage(actuel);
  return { ecrire, contenu: ecrire ? contenu : null, alertes, resume, ticket, codeSortie: 0 };
}

/** Corps du ticket privé (valeurs des sources C comprises : JAMAIS commité ni affiché dans le résumé public). */
export function corpsTicket(d, ctx) {
  return [
    `Le robot des rendements (R8) signale ${d.alertes.length} point(s) au ${ctx.aujourdhui} :`,
    ``,
    ...d.ticket,
    ``,
    `Le site garde les valeurs en place, avec leur date. Une ligne en écart n'affiche plus de taux (« en cours de vérification ») tant qu'elle n'est pas corrigée.`,
    `Règle : Aave et Rocket Pool ne servent qu'au contrôle (conditions d'utilisation) ; seule la valeur de Lido est affichée automatiquement.`,
    ``,
    `_Ticket créé par \`.github/workflows/rendements.yml\` (lot Z5)._`,
  ].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n");
}

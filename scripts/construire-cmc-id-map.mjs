#!/usr/bin/env node
/**
 * scripts/construire-cmc-id-map.mjs — construit data/cmc-id-map.json (lot Z3, 10/10/2026).
 *
 * Table « identifiant de fiche (= id CoinGecko) → identifiant numérique CoinMarketCap » lue par le robot des fiches (R2,
 * app/api/cron/refresh-prices) pour demander les cours par lots de 100. Reconstruite chaque mois par le robot
 * .github/workflows/cmc-id-map.yml (le 1er à 08:30 UTC, juste après un passage de R2 : prix de référence frais),
 * jamais par R2 lui-même. Garde-fous à l'écriture : refus d'une table de moins de 90 % des correspondances actuelles dont
 * la fiche est ENCORE en base (une purge ne bloque plus), et refus séparé d'une lecture partielle de la base (moins de
 * fiches lues que le total exact annoncé par la base ; repli : moins de 90 % des fiches lues à la construction
 * précédente si ce total est illisible) ; --forcer pour passer (entrée « forcer » du lancement manuel du workflow).
 *
 * Appariement : symbole ET nom, identité par contrat (adresse commune exigée des actifs à 1 $ et des stablecoins ;
 * contrat différent sur un même réseau = rejet) ET prix à ± 5 % d'une référence INDÉPENDANTE
 * (scripts/lib/cmc-appariement.mjs). Le piège beam → onbeam (même symbole, même nom, 68 % d'écart) est rejeté.
 * Continuité : une fiche de la table actuelle n'est reconduite qu'avec une adresse de contrat commune ; chaque reconduite
 * est listée ({ id, ancienSymbole, nouveauSymbole, nomCmc, preuve }) et un changement de symbole ou de nom donne un
 * ::warning:: ; « retirees » (fiche absente de la base, information) séparées de « perdues » (alerte).
 *
 * Sources :
 *  - fiches : --fiches <fichier.json> (lignes de la base ou [{ id, symbol, name, prix, prixLe, prixSource, publie,
 *    categories, chains, contrats }]) ; sinon la base (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) :
 *    coingecko_id, symbol, name, price_usd, price_updated_at, price_source, is_published, categories, chains, contrats ;
 *  - CoinMarketCap : --liste <fichier.json> (réponse d'une liste CMC déjà téléchargée, champ data) ; sinon l'API avec
 *    CMC_API_KEY : /v1/cryptocurrency/map (identifiants), puis /v2/cryptocurrency/quotes/latest?id= par lots de 100 pour
 *    les seuls candidats (≈ 10 à 16 crédits : 1 par lot de 100 candidats + carte). Avant tout appel payant : compteur
 *    officiel /v1/key/info (0 crédit) et frein du mois (scripts/lib/budget-mois.mjs) ; refus si le frein est actif ou
 *    s'il reste moins de 300 crédits ce mois-ci.
 *
 * Référence de secours (finitions Z3, F4) : pour les fiches dont le prix en base n'est pas une référence indépendante
 * (plus de 6 h, ou venu de CoinMarketCap : cas de toutes les fiches déjà appariées), prix CoinGecko public par
 * l'identifiant de la fiche, sinon DexScreener par adresse de contrat, relevé il y a moins d'une heure
 * (scripts/lib/cmc-secours.mjs, 1 requête/s ; panne de la source + fiches suivies perdues faute de référence = refus) ;
 * validation interne seulement (jamais affichée, jamais écrite en base) ; bilan dans le journal et dans
 * _construction.referencesSecours. --sans-secours la désactive.
 *
 * Usage : node scripts/construire-cmc-id-map.mjs [--liste f] [--fiches f] [--ecrire] [--forcer] [--rapport f] [--sans-secours]
 *   sans --ecrire : affiche le bilan, n'écrit rien. Journaux publics : nombres et identifiants publics seulement.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGE_SECOURS_MAX_H, apparier, fichesSansReference, normaliserCmc, TOLERANCE_PRIX_PCT } from "./lib/cmc-appariement.mjs";
import { lireLignesCmc, MANUELS } from "./lib/cmc-lignes.mjs";
import { bilanSecours, referencesSecours } from "./lib/cmc-secours.mjs";
import { adressesFiche } from "./lib/fiches-prix.mjs";

// Désignations manuelles et lecture de l'API : scripts/lib/cmc-lignes.mjs (partagé avec la route app/api/cron/cmc-lignes).
export { MANUELS };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(ROOT, "data/cmc-id-map.json");

/**
 * Refus d'écrire une table de moins de 90 % des correspondances actuelles (raison), sinon null. `actuelle` = nombre de
 * correspondances de l'ancienne table dont la fiche est ENCORE en base (correspondancesEncoreEnBase) : une purge
 * légitime de fiches ne bloque plus le robot (contre-vérification du 10/10/2026, cas P2).
 */
export const TABLE_MIN_PCT = 90;
export function tableTropPetite(nouvelle, actuelle) {
  if (!(nouvelle > 0)) return "aucune correspondance : table non écrite";
  if (actuelle > 0 && nouvelle < (actuelle * TABLE_MIN_PCT) / 100) return `${nouvelle} correspondances contre ${actuelle} dans la table actuelle (fiches encore en base, ${TABLE_MIN_PCT} % exigés) : table non écrite`;
  return null;
}
/** Correspondances de la table précédente dont la fiche est encore en base. */
export function correspondancesEncoreEnBase(precedente, fiches) {
  const ids = new Set((fiches ?? []).map((f) => f.id));
  return Object.keys(precedente ?? {}).filter((id) => ids.has(id)).length;
}
/**
 * Contrôle SÉPARÉ de lecture partielle de la base → refus (raison), sinon null.
 *  - total annoncé par la base lisible (en-tête Content-Range de PostgREST, Prefer: count=exact) : refus seulement si
 *    moins de fiches lues que ce total (contrôle EXACT : une purge légitime, même de plus de 10 % des fiches, ne bloque
 *    plus ; reprise du 10/10/2026, purge de 79 fiches refusée chaque mois sinon) ;
 *  - total illisible (ou fichier --fiches) : repli sur le ratio, moins de 90 % des fiches lues à la construction
 *    précédente.
 */
export function lecturePartielle(fichesLues, fichesPrecedentes, totalAnnonce) {
  if (Number.isInteger(totalAnnonce) && totalAnnonce >= 0) {
    if (fichesLues < totalAnnonce) return `lecture partielle de la base : ${fichesLues} fiches lues contre ${totalAnnonce} annoncées par la base : table non écrite`;
    return null;
  }
  const avant = Number(fichesPrecedentes) || 0;
  if (avant > 0 && fichesLues < (avant * TABLE_MIN_PCT) / 100) return `lecture partielle de la base : ${fichesLues} fiches lues contre ${avant} à la construction précédente (${TABLE_MIN_PCT} % exigés, total de la base illisible) : table non écrite`;
  return null;
}

/** Total annoncé par PostgREST dans Content-Range (« 0-999/1234 », ou « 0/0 » quand la table est vide) ; null si absent ou illisible. */
export function totalContentRange(entete) {
  const m = /\/(\d+)\s*$/.exec(String(entete ?? ""));
  return m ? Number(m[1]) : null;
}

function arg(nom) {
  const i = process.argv.indexOf(nom);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function lireFichesBase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("ni --fiches ni accès à la base (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  // Par pages de 1 000 (plafond de PostgREST) : au-delà de 1 000 fiches, aucune n'est ignorée en silence. Total exact
  // demandé (Prefer: count=exact) : lecturePartielle compare les fiches lues à ce total.
  const lignes = [];
  let total = null;
  for (let debut = 0; ; debut += 1000) {
    // chains et contrats (raw_data_snapshot.contracts) : adresses de contrat pour la référence de secours DexScreener (F4)
    // price_source : un prix venu de CoinMarketCap n'est jamais une référence (contrôle circulaire) ; is_published : une
    // fiche dépubliée n'est ni reconduite ni comptée dans les doublons ; categories : règle des stablecoins.
    const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/cryptos?select=coingecko_id,symbol,name,price_usd,price_updated_at,price_source,is_published,categories,chains,contrats:raw_data_snapshot->contracts&order=coingecko_id&offset=${debut}&limit=1000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`base : HTTP ${r.status}`);
    total ??= totalContentRange(r.headers.get("content-range"));
    const page = await r.json();
    lignes.push(...page);
    if (page.length < 1000) break;
  }
  return { fiches: lignes.map(ficheDepuisBase), total };
}

/** Ligne de la base (ou d'un fichier --fiches au même format) → fiche d'appariement. */
export function ficheDepuisBase(x) {
  if (x && typeof x === "object" && typeof x.id === "string" && !("coingecko_id" in x)) return x; // déjà au format fiche
  return {
    id: x.coingecko_id,
    symbol: x.symbol,
    name: x.name,
    prix: Number(x.price_usd) || null,
    prixLe: x.price_updated_at,
    prixSource: x.price_source ?? null,
    publie: x.is_published !== false,
    categories: Array.isArray(x.categories) ? x.categories : [],
    chains: x.chains,
    contrats: x.contrats,
  };
}

/**
 * Source de référence EN PANNE (ex. CoinGecko public en HTTP 429) et fiches suivies perdues QUI DÉPENDAIENT de la partie
 * en panne : la table n'est pas écrite (raison), sinon null. `idsEnEchec` = identifiants des lots CoinGecko en échec et
 * des fiches des lots DexScreener en échec (referencesSecours). Le lien panne → perte est exigé (reprise du 10/10/2026) :
 *  - une fiche perdue de idsEnEchec fait refuser QUEL QUE SOIT le motif (CoinGecko en 429 puis faux écart DexScreener,
 *    cas olympus +10,4 %, ultima −19 %, usdai −9,9 %) ;
 *  - une panne sans rapport avec les fiches perdues ne fait jamais refuser (sinon refus répété chaque mois).
 * Mesure du 10/10/2026 : 2 lots CoinGecko sur 7 refusés → 45 fiches natives (solana, sui, stellar…) perdues, sous le seuil
 * de 90 % ; sans ce refus, la table aurait été écrite amputée. On relance plus tard plutôt que de perdre des fiches.
 */
export function refusReferenceEnPanne(perdues, echecs, idsEnEchec) {
  const enEchec = new Set(Array.isArray(idsEnEchec) ? idsEnEchec : []);
  if (!enEchec.size) return null;
  const faute = Object.keys(perdues ?? {}).filter((id) => enEchec.has(id)).sort();
  if (!faute.length) return null;
  const sources = Array.isArray(echecs) && echecs.length ? [...new Set(echecs)].join(" ; ") : "source de secours";
  return `référence de secours en échec (${sources}) : ${faute.length} fiche(s) suivie(s) perdue(s) alors que leur référence était en panne (${faute.slice(0, 10).join(", ")}${faute.length > 10 ? "…" : ""}) : table non écrite, relancer plus tard`;
}

/**
 * Bilan de la continuité (contre-vérification du 10/10/2026) :
 *  - reconduites : [{ id, cmcId, ancienSymbole, nouveauSymbole, nomCmc, ancienNom, preuve }] ;
 *  - alertesReconduites : reconduites dont le symbole ou le nom CoinMarketCap a changé depuis la table précédente
 *    (texte prêt pour le ::warning:: du run) ;
 *  - retirees : fiches de la table précédente absentes de la base (INFORMATION, suppression volontaire) ;
 *  - perdues : fiches de la table précédente encore en base mais non appariées (ALERTE), avec leur motif ;
 *  - idsChanges : fiches dont l'identifiant CMC CHANGE par rapport à la table précédente (ALERTE, ::warning::) :
 *    [{ id, ancienId, nouveauId, nouveauSymbole, nomCmc, preuve }] ;
 *  - alertesManuels : désignations manuelles refusées (slug réattribué à un autre identifiant, ou introuvable) (ALERTE).
 * @param {{ precedente?: Record<string, {id: number, symbol?: string}>, nomsAvant?: Record<string, string>, map?: Record<string, {id: number, symbol: string}>, details?: Record<string, any>, fiches?: Array<{id: string}> }} o
 */
export function bilanContinuite({ precedente = {}, nomsAvant = {}, map = {}, details = {}, fiches = [] }) {
  const enBase = new Set(fiches.map((f) => f.id));
  const reconduites = Object.entries(details)
    .filter(([id, d]) => d.reconduite && map[id])
    .map(([id, d]) => ({
      id,
      cmcId: map[id].id,
      ancienSymbole: precedente[id]?.symbol ?? null,
      nouveauSymbole: map[id].symbol,
      nomCmc: d.cmcNom,
      ancienNom: typeof nomsAvant[id] === "string" ? nomsAvant[id] : null,
      preuve: d.preuve,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const alertesReconduites = reconduites
    .filter((r) => (r.ancienSymbole && r.ancienSymbole !== r.nouveauSymbole) || (r.ancienNom && r.ancienNom !== r.nomCmc))
    .map((r) => `${r.id} : ${r.ancienSymbole ?? "?"} → ${r.nouveauSymbole}${r.ancienNom && r.ancienNom !== r.nomCmc ? `, « ${r.ancienNom} » → « ${r.nomCmc} »` : ""}`);
  const retirees = {};
  const perdues = {};
  for (const id of Object.keys(precedente).sort()) {
    if (map[id]) continue;
    if (!enBase.has(id)) retirees[id] = "fiche absente de la base";
    else perdues[id] = details[id]?.motif ?? "non appariée";
  }
  const idsChanges = Object.keys(map)
    .filter((id) => Number.isInteger(precedente[id]?.id) && precedente[id].id !== map[id].id)
    .sort()
    .map((id) => ({ id, ancienId: precedente[id].id, nouveauId: map[id].id, nouveauSymbole: map[id].symbol, nomCmc: details[id]?.cmcNom ?? null, preuve: details[id]?.preuve ?? null }));
  const alertesManuels = Object.entries(details)
    .filter(([, d]) => typeof d?.alerteManuel === "string")
    .map(([id, d]) => `${id} : ${d.alerteManuel}`)
    .sort();
  return { reconduites, alertesReconduites, retirees, perdues, idsChanges, alertesManuels };
}

/** Lignes CMC via l'API (identifiants puis cotations des seuls candidats) : scripts/lib/cmc-lignes.mjs. */
async function lireCmcApi(fiches, key, idsEnPlus) {
  const r = await lireLignesCmc({ symboles: fiches.map((f) => f.symbol), key, idsEnPlus });
  console.log(`[cmc-map] API CoinMarketCap : ${r.candidats} candidats, ${r.credits} crédit(s)`);
  return { lignes: r.lignes, source: r.source };
}

async function main() {
  const fichierFiches = arg("--fiches");
  const fichierListe = arg("--liste");
  const { fiches, total: totalBase } = fichierFiches ? { fiches: JSON.parse(readFileSync(fichierFiches, "utf8")).map(ficheDepuisBase), total: null } : await lireFichesBase();
  // Table actuelle : règle de continuité (une fiche déjà appariée garde son identifiant seulement avec une adresse de
  // contrat commune, et un prix à ± 5 % d'une référence indépendante quand il en existe une) et fiches perdues à signaler.
  const tableAvant = (() => { try { return JSON.parse(readFileSync(SORTIE, "utf8")); } catch { return null; } })();
  const precedente = tableAvant?.map && typeof tableAvant.map === "object" ? tableAvant.map : {};
  let lignes;
  let sourceCmc;
  if (fichierListe) {
    const j = JSON.parse(readFileSync(fichierListe, "utf8"));
    lignes = Array.isArray(j) ? j : j.data;
    sourceCmc = typeof j?.source === "string" && j.source
      ? `${j.source}, lue par la route du site (${lignes.length} lignes)`
      : `liste CoinMarketCap déjà téléchargée (${path.basename(fichierListe)}, ${lignes.length} lignes)`;
  } else if ((process.env.CMC_API_KEY ?? "").trim()) {
    ({ lignes, source: sourceCmc } = await lireCmcApi(fiches, process.env.CMC_API_KEY.trim(), Object.values(precedente).map((e) => e?.id)));
  } else {
    throw new Error("ni --liste ni CMC_API_KEY");
  }
  const candidats = lignes.map(normaliserCmc).filter(Boolean);
  // Finitions Z3 (F4) : référence de secours (validation interne seulement) pour les fiches dont le prix en base n'est pas
  // une référence indépendante valable (plus de 6 h, ou écrit par R2 depuis CoinMarketCap) ; sinon impasse ou contrôle
  // circulaire.
  const sansReference = process.argv.includes("--sans-secours") ? [] : fichesSansReference(fiches, candidats, { manuels: MANUELS, precedente });
  const parId = new Map(fiches.map((f) => [f.id, f]));
  const rs = sansReference.length
    ? await referencesSecours(sansReference.map((id) => ({ id, adresses: adressesFiche(parId.get(id)) })))
    : { secours: {}, appels: { dexscreener: 0, coingecko: 0 }, echecs: [], idsEnEchec: [] };
  const { map, exclus, details, adressesExclues } = apparier(fiches, candidats, { manuels: MANUELS, secours: rs.secours, precedente, maintenant: Date.now() });
  const { reconduites, alertesReconduites, retirees, perdues, idsChanges, alertesManuels } = bilanContinuite({ precedente, nomsAvant: tableAvant?._nomsCmc ?? {}, map, details, fiches });
  const secours = { ...bilanSecours(details, sansReference.length), relevees: Object.keys(rs.secours).length, appels: rs.appels, echecs: rs.echecs, ageMaxH: AGE_SECOURS_MAX_H };
  const ecartes = Object.fromEntries(
    Object.entries(details)
      .filter(([, d]) => d.statut === "non apparié" && typeof d.ecartPrixPct === "number")
      .map(([id, d]) => [id, { cmcId: d.cmcId, cmcSlug: d.cmcSlug, ecartPrixPct: d.ecartPrixPct }]),
  );
  const manuels = Object.fromEntries(Object.entries(details).filter(([, d]) => d.manuel && d.statut === "apparié").map(([id, d]) => [id, { cmcSlug: d.cmcSlug, cmcNom: d.cmcNom, ecartPrixPct: d.ecartPrixPct }]));
  const preuves = {};
  for (const id of Object.keys(map)) preuves[details[id].preuve] = (preuves[details[id].preuve] ?? 0) + 1;
  const sortie = {
    _lisezMoi:
      "Correspondance id du site (= id CoinGecko) -> id numérique CoinMarketCap. Construite par scripts/construire-cmc-id-map.mjs (lot Z3) : même symbole ET nom compatible, identité par contrat (adresse commune obligatoire pour un actif à 1 $ ou un stablecoin, contrat différent = rejet) ET prix CMC à ± 5 % d'une référence indépendante de CoinMarketCap ; jamais par symbole seul. Une fiche absente d'ici n'est jamais demandée à CoinMarketCap : le robot des fiches passe par DexScreener (adresse de contrat) ou la fiche garde le masquage au-delà de 48 h. Testée par tests/lib/coinmarketcap.test.ts, tests/lib/fiches-z3.test.ts et tests/lib/cmc-identite.test.ts.",
    _total: Object.keys(map).length,
    _construction: {
      le: new Date().toISOString(),
      fiches: fiches.length,
      sourceCmc,
      sourceReference: arg("--source-reference") ?? (fichierFiches ? path.basename(fichierFiches) : "base Supabase (price_usd hors price_source = coinmarketcap, price_updated_at)"),
      tolerancePct: TOLERANCE_PRIX_PCT,
      preuves,
      referencesSecours: { demandees: secours.demandees, utilisees: secours.utilisees, appariees: secours.appariees, parSource: secours.parSource },
      reconduites,
      idsChanges,
      retirees,
      perdues,
      adressesExclues: adressesExclues.length,
    },
    map,
    exclus,
    _controlePrix: `Contrôle à la construction : pour CHAQUE correspondance, identité par contrat puis prix CoinMarketCap comparé à une référence INDÉPENDANTE (prix en base seulement s'il ne vient pas de CoinMarketCap et relevé à 6 h au plus ; sinon référence de secours de moins de ${AGE_SECOURS_MAX_H} h, CoinGecko public par l'identifiant de la fiche puis DexScreener par adresse de contrat, validation interne seulement : voir _construction.referencesSecours). Tolérance ${TOLERANCE_PRIX_PCT} %. Hors tolérance → non appariée (voir _ecartesPrix). Sans référence indépendante : seule une adresse de contrat commune ou une désignation manuelle suffit.`,
    _manuels: manuels,
    _ecartesPrix: ecartes,
    // nom CoinMarketCap de chaque correspondance : la construction suivante signale un changement de nom d'une reconduite
    _nomsCmc: Object.fromEntries(Object.keys(map).map((id) => [id, details[id].cmcNom])),
  };
  const motifs = {};
  for (const d of Object.values(details)) if (d.statut !== "apparié") motifs[d.motif.replace(/[-\d.]+ %/, "N %").replace(/\(.*\)/, "(…)")] = (motifs[d.motif.replace(/[-\d.]+ %/, "N %").replace(/\(.*\)/, "(…)")] ?? 0) + 1;
  console.log(`[cmc-map] ${fiches.length} fiches : ${Object.keys(map).length} appariées, ${exclus.length} non appariées`);
  for (const [m, n] of Object.entries(motifs).sort((a, b) => b[1] - a[1])) console.log(`  - ${n} × ${m}`);
  console.log(
    `[cmc-map] référence de secours (moins de ${AGE_SECOURS_MAX_H} h, validation interne) : ${secours.demandees} fiche(s) sans prix de référence en base, ${secours.relevees} relevée(s) (${secours.appels.dexscreener} appel(s) DexScreener, ${secours.appels.coingecko} appel(s) CoinGecko), ${secours.utilisees} utilisée(s), ${Object.keys(secours.appariees).length} appariée(s) grâce à elle`,
  );
  for (const [id, src] of Object.entries(secours.appariees)) console.log(`  - appariée : ${id} (référence de secours : ${src})`);
  for (const [id, m] of Object.entries(secours.nonAppariees)) console.log(`  - non appariée : ${id} : ${m}`);
  for (const e of secours.echecs) console.log(`  - source de secours en échec : ${e}`);
  console.log(`[cmc-map] preuves des correspondances : ${Object.entries(preuves).map(([p, n]) => `${n} × ${p}`).join(", ")}`);
  console.log(`[cmc-map] continuité : ${reconduites.length} fiche(s) gardée(s) par l'identifiant de la table actuelle (adresse de contrat commune)`);
  for (const r of reconduites) console.log(`  - reconduite : ${r.id} → ${r.cmcId} (${r.ancienSymbole ?? "?"} → ${r.nouveauSymbole}, « ${r.nomCmc} », preuve : ${r.preuve})`);
  console.log(`[cmc-map] identifiants CMC changés par rapport à la table actuelle : ${idsChanges.length}`);
  for (const c of idsChanges) console.log(`  - identifiant changé : ${c.id} : ${c.ancienId} → ${c.nouveauId} (${c.nouveauSymbole}, « ${c.nomCmc} », preuve : ${c.preuve})`);
  console.log(`[cmc-map] adresses écartées des preuves (portées par 2 fiches ou 2 identifiants CMC au moins) : ${adressesExclues.length}${adressesExclues.length ? ` (${adressesExclues.slice(0, 10).join(", ")}${adressesExclues.length > 10 ? "…" : ""})` : ""}`);
  for (const a of alertesManuels) console.log(`  - désignation manuelle refusée : ${a}`);
  const nbRetirees = Object.keys(retirees).length;
  console.log(`[cmc-map] fiches retirées de la base depuis la table actuelle (information) : ${nbRetirees}${nbRetirees ? ` (${Object.keys(retirees).join(", ")})` : ""}`);
  const nbPerdues = Object.keys(perdues).length;
  console.log(`[cmc-map] fiches perdues par rapport à la table actuelle : ${nbPerdues}`);
  for (const [id, m] of Object.entries(perdues)) console.log(`  - perdue : ${id} : ${m}`);
  // annotations visibles dans le résumé du run GitHub : vraies pertes et reconduites dont le symbole ou le nom a changé
  if (process.env.GITHUB_ACTIONS) {
    if (nbPerdues) console.log(`::warning::${nbPerdues} fiche(s) perdue(s) par la table CoinMarketCap : ${Object.keys(perdues).join(", ")}`);
    if (alertesReconduites.length) console.log(`::warning::${alertesReconduites.length} reconduite(s) au symbole ou au nom changé chez CoinMarketCap (vérifier) : ${alertesReconduites.join(" ; ")}`);
    if (idsChanges.length) console.log(`::warning::${idsChanges.length} fiche(s) dont l'identifiant CoinMarketCap change (vérifier) : ${idsChanges.map((c) => `${c.id} ${c.ancienId} → ${c.nouveauId} (${c.nouveauSymbole}, preuve : ${c.preuve})`).join(" ; ")}`);
    if (alertesManuels.length) console.log(`::warning::${alertesManuels.length} désignation(s) manuelle(s) refusée(s) (MANUELS, scripts/lib/cmc-lignes.mjs) : ${alertesManuels.join(" ; ")}`);
  }
  const rapport = arg("--rapport");
  if (rapport) writeFileSync(rapport, JSON.stringify(details, null, 1) + "\n");
  if (process.argv.includes("--ecrire")) {
    // Reprise Z3 (I5) + contre-vérification du 10/10/2026 : le robot mensuel ne remplace jamais la table par une table
    // nettement plus petite. Deux contrôles séparés : (1) lecture partielle de la base (moins de 90 % des fiches lues la
    // fois précédente) ; (2) moins de 90 % des correspondances de l'ancienne table dont la fiche est ENCORE en base.
    // (3) source de référence en panne et fiches suivies perdues faute de référence : on n'écrit pas une table amputée.
    const refus =
      lecturePartielle(fiches.length, tableAvant?._construction?.fiches, totalBase) ??
      tableTropPetite(Object.keys(map).length, correspondancesEncoreEnBase(precedente, fiches)) ??
      refusReferenceEnPanne(perdues, rs.echecs, rs.idsEnEchec);
    if (refus && !process.argv.includes("--forcer")) throw new Error(refus);
    writeFileSync(SORTIE, JSON.stringify(sortie, null, 1) + "\n");
    console.log(`[cmc-map] écrit : ${path.relative(ROOT, SORTIE)}`);
  } else console.log("[cmc-map] sans --ecrire : rien n'est écrit");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`[cmc-map] échec : ${e.message}`);
    // annotation visible en tête de la page du run (le motif n'est plus enfoui en fin d'un journal de ~700 lignes)
    if (process.env.GITHUB_ACTIONS) console.log(`::error::[cmc-map] ${e.message}`);
    process.exit(1);
  });
}

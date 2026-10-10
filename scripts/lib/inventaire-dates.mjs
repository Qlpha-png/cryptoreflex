/**
 * Inventaire des dates « vérifié le … » (lot fraîcheur A2, 08/10/2026 ; base : scratchpad audit-fraicheur/scan-dates.mjs).
 * Intégré à la sentinelle complète (scripts/sentinelle.mjs, checkDatesVerification) :
 *  1. jugerPageDates(html) : dans une page rendue, toute date « vérifié / mis à jour / relevé / vérification » affichée
 *     HORS du composant <VerifieLe> (repère data-verifie-le) est un défaut. Exceptions : liste fermée EXCEPTIONS.
 *  2. inventaireDonnees(root, maintenant) : âge de chaque champ de date tenu à la main (liste fermée CHAMPS), comparé
 *     au seuil de sa famille (mêmes seuils que lib/fraicheur.ts, recopiés ici et contrôlés par un test).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

/** = SEUILS_JOURS de lib/fraicheur.ts (tests/lib/fraicheur-verifie-le.test.ts vérifie l'égalité) */
export const SEUILS = {
  frais: 90, mica: 14, securite: 14, support: 90, rendements: 14, evenements: 30, airdrops: 14, editorial: 180,
  roadmaps: 180, decentralisation: 120, wallets: 90, "historique-prix": 35, fiscalite: 30, notes: 30, "tarifs-partenaires": 90,
  change: 6, amf: 7, officiel: 9,
};

/**
 * une page de chaque gabarit qui affiche des dates de vérification (reprise du 08/10/2026, juré I6 : + méthodologie, API
 * publique, top, frais, partenaires, impôts, transparence, quiz, succession, widget du vérificateur, fonctionnement du
 * comparateur ; les avis tournent, voir pagesDatesDuJour)
 */
export const PAGES_DATES = [
  "/", "/avis/kraken", "/comparatif", "/comparatif/coinbase-vs-kraken", "/comparatif/securite", "/outils/verificateur-mica",
  "/cryptos/bitcoin", "/staking", "/outils/calculateur-apy-staking", "/outils/yield-stablecoins", "/calendrier", "/airdrops",
  "/historique-prix/bitcoin/2026", "/top/meilleures-plateformes-crypto-france-2026", "/cryptos/bitcoin/acheter-en-france",
  "/top", "/methodologie", "/api-publique", "/comparatif/frais", "/partenaires/waltio", "/impots", "/transparence",
  "/quiz/plateforme", "/outils/succession-crypto", "/embed/verificateur-mica/kraken", "/fonctionnement-du-comparateur",
  // lot Z5 (10/10/2026) : fiche staking avec fourchette datée ET repère Lido tenu par le robot R8
  "/staking/ethereum",
];

/**
 * Pages du jour : PAGES_DATES + 5 fiches /avis tirées dans la liste des plateformes (mélange déterministe par jour :
 * toutes les fiches passent en quelques jours, et un défaut vu un jour se rejoue le même jour).
 */
export function pagesDatesDuJour(slugsAvis, maintenant, nombre = 5) {
  const graine = Math.floor(maintenant / 86_400_000);
  const tournants = [...new Set(slugsAvis)]
    .filter((s) => `/avis/${s}` !== "/avis/kraken")
    .map((s) => ({ s, k: [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0) + graine) % 1_000_003, 11) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, nombre)
    .map((x) => `/avis/${x.s}`);
  return [...PAGES_DATES, ...tournants];
}

/** champs de date tenus à la main : [fichier, chemin (« [] » = chaque élément), famille] */
export const CHAMPS = [
  ["data/platforms.json", "platforms[].mica.lastVerified", "mica"],
  ["data/platforms.json", "platforms[].fees.verified.date", "frais"],
  ["data/platforms.json", "platforms[].fees.cost.date", "frais"],
  ["data/platforms.json", "platforms[].support.verified", "support"],
  ["data/platforms.json", "platforms[].security.verified", "securite"],
  ["data/wallets.json", "platforms[].mica.lastVerified", "wallets"],
  ["data/psan-registry.json", "_meta.lastUpdated", "mica"],
  ["data/psan-registry.json", "platforms[].lastVerified", "mica"],
  ["data/crypto-events.json", "_meta.lastUpdated", "evenements"],
  ["data/events.json", "_meta.lastUpdated", "evenements"],
  ["data/airdrops.json", "_meta.lastUpdated", "airdrops"],
  ["data/crypto-roadmaps.json", "_meta.lastUpdated", "roadmaps"],
  ["data/decentralization-scores.json", "lastUpdated", "decentralisation"],
  ["data/historical-ohlc.json", "meta._generatedAt", "historique-prix"],
  ["data/hidden-gems.json", "_meta.lastUpdated", "editorial"],
  ["data/top-cryptos.json", "_meta.lastUpdated", "editorial"],
  ["data/fiscal-tools.json", "_meta.lastUpdated", "tarifs-partenaires"],
  // lot Z5 : jour du dernier point Lido (robot R8)
  ["data/rendements.json", "lido.date", "rendements"],
];
/**
 * dates écrites dans le code (constante = expression régulière qui capture la date) ; drapeau « g » = une date par ligne
 * de données (lot Z5 : releveLe de chaque rendement de stablecoin, releve de chaque fourchette de /staking, début de
 * période de chaque ligne du calculateur), toutes comptées
 */
export const CONSTANTES = [
  ["lib/stablecoin-yields.ts", /releveLe:\s*"([\d-]+)"/g, "rendements"],
  ["lib/programmatic.ts", /releve:\s*"([\d-]+)"/g, "rendements"],
  ["lib/staking-rates.ts", /debut:\s*"([\d-]+)"/g, "rendements"],
  ["lib/events-seed.ts", /EVENTS_SEED_REVU_LE\s*=\s*"([\d-]+)"/, "evenements"],
];

const ISO = /^\d{4}-\d{2}(-\d{2})?/;
function valeurs(obj, chemin) {
  let cur = [obj];
  for (const part of chemin.split(".")) {
    const tableau = part.endsWith("[]");
    const cle = tableau ? part.slice(0, -2) : part;
    cur = cur.flatMap((o) => {
      const v = o && typeof o === "object" ? o[cle] : undefined;
      return tableau ? (Array.isArray(v) ? v : []) : v === undefined ? [] : [v];
    });
  }
  return cur.filter((v) => typeof v === "string" && ISO.test(v)).map((v) => v.slice(0, 10));
}
const instant = (d) => Date.parse(d.length === 7 ? `${d}-01T00:00:00Z` : `${d.slice(0, 10)}T00:00:00Z`);

/** [{ champ, famille, seuil, total, aReverifier, plusAncienne }] */
export function inventaireDonnees(root, maintenant) {
  const out = [];
  const ligne = (champ, famille, dates) => {
    const seuil = SEUILS[famille];
    const ages = dates.map((d) => Math.floor((maintenant - instant(d)) / 86_400_000));
    out.push({ champ, famille, seuil, total: dates.length, aReverifier: ages.filter((a) => a > seuil).length, plusAncienne: [...dates].sort()[0] ?? null });
  };
  for (const [f, chemin, famille] of CHAMPS) {
    let j;
    try { j = JSON.parse(readFileSync(path.join(root, f), "utf8")); } catch { out.push({ champ: `${f} (illisible)`, famille, seuil: SEUILS[famille], total: 0, aReverifier: 0, plusAncienne: null }); continue; }
    ligne(`${f} ${chemin}`, famille, valeurs(j, chemin));
  }
  for (const [f, re, famille] of CONSTANTES) {
    let src = "";
    try { src = readFileSync(path.join(root, f), "utf8"); } catch { /* fichier absent : 0 date */ }
    const dates = re.global ? [...src.matchAll(re)].map((m) => m[1]) : (src.match(re) ? [src.match(re)[1]] : []);
    ligne(`${f} ${re.source.split("\\")[0]}`, famille, dates);
  }
  return out;
}

const MOIS = "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre";
const MOIS_COURTS = "janv|févr|fevr|mars|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec";
// reprise du 08/10/2026 (juré I6) : + mois abrégé sans jour (« avr. 2026 »)
const DATE = `(?:\\d{1,2}(?:er)?\\s+(?:${MOIS})\\s+\\d{4}|\\d{1,2}\\s+(?:${MOIS_COURTS})\\.?\\s+\\d{4}|\\d{2}/\\d{2}/\\d{4}|\\d{4}-\\d{2}-\\d{2}|(?:${MOIS})\\s+\\d{4}|(?:${MOIS_COURTS})\\.?\\s+\\d{4})`;
/** mot de vérification suivi (à moins de 60 caractères, sans fin de phrase) d'une date */
export const DATE_VERIFICATION = new RegExp(
  `(?:v[ée]rifi[ée]e?s?|v[ée]rification|contr[ôo]l[ée]e?s?|mise?s? à jour|relev[ée]e?s?|relu(?:e|es|s)?|relecture|actualis[ée]e?s?|\\bMAJ\\b|Vérif\\.)[^.!?<]{0,60}?${DATE}`,
  "gi",
);

/** exceptions justifiées, liste fermée : [motif, raison] */
export const EXCEPTIONS = [
  [/^relevé du \d{2}\/\d{2}\/\d{4}$/i, "date du relevé des cours (CoursFiche, règle des 48 h de lib/cours-fiche.ts)"],
];

/** retire les éléments qui portent l'attribut donné (span imbriqués compris) */
function retirerElements(html, attr) {
  let out = html;
  for (;;) {
    const i = out.search(new RegExp(`<span[^>]*\\s${attr}=`));
    if (i < 0) return out;
    let profondeur = 0, j = i;
    const re = /<\/?span\b[^>]*>/g;
    re.lastIndex = i;
    let m;
    while ((m = re.exec(out))) {
      profondeur += m[0].startsWith("</") ? -1 : 1;
      if (profondeur === 0) { j = re.lastIndex; break; }
    }
    if (j === i) return out;
    out = out.slice(0, i) + " " + out.slice(j);
  }
}

/** dates de vérification affichées hors composant dans une page rendue (texte visible seulement) */
export function jugerPageDates(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  h = retirerElements(h, "data-verifie-le");
  h = retirerElements(h, "data-cours-releve");
  h = retirerElements(h, "data-cours-non-suivi");
  const texte = h.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;| | /g, " ").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
  const trouvees = [];
  for (const m of texte.matchAll(DATE_VERIFICATION)) {
    const s = m[0].trim();
    if (!EXCEPTIONS.some(([re]) => re.test(s))) trouvees.push(s);
  }
  return trouvees;
}

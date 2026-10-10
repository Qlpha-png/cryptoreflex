/**
 * scripts/lib/echeances.mjs — calendrier fiscal et transposition de DAC8 dans la veille de nuit (R5, lot Z6, 10/10/2026 ;
 * famille 28 de la carte de fraîcheur).
 *
 * Deux sources, suivies par EMPREINTE seulement :
 *  - les dates de la page officielle impots.gouv.fr « Les modalités de la déclaration de revenus » (calendrier de la campagne :
 *    dates limites par département, déclaration papier, correction en ligne) ;
 *  - les textes de loi français qui citent la directive (UE) 2023/2226 (DAC8), trouvés par la recherche de l'API officielle
 *    Légifrance (PISTE, accès déjà utilisé par la veille). On suit l'ENSEMBLE des identifiants Légifrance trouvés : un texte ou
 *    un article nouveau, ou une nouvelle version, change l'empreinte.
 * Un changement ouvre un ticket privé (ligne « ❌ » de la veille) et n'est JAMAIS fusionné par un robot : zéro erreur fiscale.
 * EUR-Lex n'est pas automatisé (défi anti-robot : non prouvé).
 * Fonctions pures et testées (tests/lib/echeances-z6.test.ts). Zéro dépendance.
 */
import { createHash } from "node:crypto";

const MOIS = "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre";
const JOURS = "lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche";

/**
 * Dates écrites en toutes lettres dans le texte d'une page (« jeudi 28 mai », « mardi 19 mai 2026 », « 1er juin »), jour de la
 * semaine compris, en minuscules, dédoublonnées et triées. Une date qui change ou apparaît change l'empreinte ; un texte autour
 * qui change ne la touche pas.
 */
export function datesDePage(texte) {
  const re = new RegExp(`(?:(?:${JOURS})\\s+)?\\d{1,2}(?:er)?\\s+(?:${MOIS})(?:\\s+20\\d{2})?`, "gi");
  return [...new Set((String(texte).match(re) || []).map((s) => s.toLowerCase().replace(/\s+/g, " ").trim()))].sort();
}

export const empreinte = (liste) => createHash("sha256").update(liste.join("|")).digest("hex").slice(0, 16);

/** Identifiants Légifrance (LEGIARTI…, LEGITEXT…, LEGISCTA…, JORFTEXT…) trouvés n'importe où dans une réponse JSON, triés. */
export function idsLegifrance(json) {
  const s = typeof json === "string" ? json : JSON.stringify(json ?? null);
  return [...new Set(s.match(/(?:LEGIARTI|LEGITEXT|LEGISCTA|JORFTEXT|JORFSCTA|JORFARTI)\d{12}/g) || [])].sort();
}

/**
 * Corps d'une recherche PISTE (Légifrance, POST /search) du texte exact `valeur` dans un fonds consolidé daté (CODE_DATE,
 * LODA_DATE). Les fonds « _DATE » exigent une date de version : le jour de la veille.
 */
export function corpsRecherchePiste(fond, valeur, jourMs) {
  return {
    fond,
    recherche: {
      champs: [{ typeChamp: "ALL", criteres: [{ typeRecherche: "EXACTE", valeur, operateur: "ET" }], operateur: "ET" }],
      filtres: [{ facette: "DATE_VERSION", singleDate: jourMs }],
      pageNumber: 1,
      pageSize: 50,
      operateur: "ET",
      sort: "PERTINENCE",
      typePagination: "DEFAUT",
    },
  };
}

/**
 * Compare ce qui est lu cette nuit à la référence.
 * @param {{ empreinte: string, liste: string[] }|undefined} ref
 * @param {{ empreinte: string, liste: string[] }} obs
 * @returns {{ etat: "nouvelle"|"inchangee"|"changee", plus: string[], moins: string[] }}
 */
export function comparer(ref, obs) {
  if (!ref) return { etat: "nouvelle", plus: [], moins: [] };
  if (ref.empreinte === obs.empreinte) return { etat: "inchangee", plus: [], moins: [] };
  const avant = ref.liste || [];
  return { etat: "changee", plus: obs.liste.filter((x) => !avant.includes(x)), moins: avant.filter((x) => !obs.liste.includes(x)) };
}

/**
 * Faut-il avancer la date du contrôle (data/veille/echeances.json → controle) ? Seulement si TOUTES les sources ont été lues
 * cette nuit et sont INCHANGÉES par rapport à une référence qui existait déjà (une première référence n'est pas un contrôle).
 * @param {Array<{ lu: boolean, etat?: string }>} sources
 */
export function controleAvance(sources) {
  return sources.length > 0 && sources.every((s) => s.lu && s.etat === "inchangee");
}

/**
 * lib/fr-accents.ts — rétablit les accents manquants dans un texte généré (fiches crypto écrites par IA, stockées en base).
 *
 * Audit du 05/10/2026 : 93 passages des fiches exploratoires affichaient « À verifier », « fiscalite », etc. La base n'est
 * pas modifiée : le texte est corrigé à l'affichage. Le dictionnaire ne contient QUE des mots qui n'existent pas sans
 * accent en français (aucun risque de transformer un mot juste) ; la casse d'origine est conservée.
 * Tests : tests/lib/fr-accents.test.ts.
 */
const DICT: Record<string, string> = {
  verifier: "vérifier", verifie: "vérifié", verifiee: "vérifiée", verifies: "vérifiés", verifiees: "vérifiées",
  verification: "vérification", verifications: "vérifications", verifiable: "vérifiable", verifiables: "vérifiables",
  fiscalite: "fiscalité", securite: "sécurité", liquidite: "liquidité", volatilite: "volatilité", activite: "activité",
  donnees: "données", donnee: "donnée", strategie: "stratégie", strategies: "stratégies", methode: "méthode",
  methodologie: "méthodologie", categorie: "catégorie", categories: "catégories", reseau: "réseau", reseaux: "réseaux",
  ecosysteme: "écosystème", developpeurs: "développeurs", developpement: "développement", decentralise: "décentralisé",
  decentralisee: "décentralisée", decentralises: "décentralisés", decentralisees: "décentralisées", communaute: "communauté",
  equipe: "équipe", equipes: "équipes", etape: "étape", etapes: "étapes", evaluation: "évaluation", evaluer: "évaluer",
  elevee: "élevée", eleves: "élevés", reglementation: "réglementation", reglementaire: "réglementaire", reglementaires: "réglementaires",
  recompenses: "récompenses", recompense: "récompense", criteres: "critères", critere: "critère", apres: "après", tres: "très",
  deja: "déjà", etre: "être", francaise: "française", francaises: "françaises", interet: "intérêt", interets: "intérêts",
  precedent: "précédent", precedente: "précédente", specifique: "spécifique", specifiques: "spécifiques", probleme: "problème",
  problemes: "problèmes", systeme: "système", systemes: "systèmes", periode: "période", periodes: "périodes", annees: "années",
  societe: "société", societes: "sociétés", proprietaire: "propriétaire", detenteurs: "détenteurs", detenteur: "détenteur",
  benefice: "bénéfice", benefices: "bénéfices", resultat: "résultat", resultats: "résultats", reduit: "réduit", reduite: "réduite",
  identifiee: "identifiée", identifiees: "identifiées", identifies: "identifiés",
};
const RE = new RegExp(`(?<![\\p{L}\\-_/.@])(${Object.keys(DICT).join("|")})(?![\\p{L}\\-_/])`, "giu");

export function corrigerAccents(text: string): string;
export function corrigerAccents(text: string | null | undefined): string | null | undefined;
export function corrigerAccents(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  return text.replace(RE, (w) => {
    const rep = DICT[w.toLowerCase()];
    if (w === w.toLowerCase()) return rep;
    if (w === w.toUpperCase() && w.length > 1) return rep.toUpperCase();
    return rep[0].toUpperCase() + rep.slice(1);
  });
}

/**
 * Décimales à l'anglaise → virgule française (« +11.59% » → « +11,59% », « 44.9M USD » → « 44,9M USD »).
 * Audit du 05/10/2026 : 742 formes sur 5 110 pages. Seul un nombre suivi d'une unité (%, x, /5, €, $, M, Md, k, minutes,
 * ticker en majuscules…) est converti : « Web 3.0 », « v2.5 », « 1.2.3 », les URL et les dates restent intacts.
 */
const UNIT = String.raw`\s?(?:%|×|x\b|\/\s?\d|€|\$|M\$|Mds?\b|Mrds?\b|[MkKB]\b|Bn\b|minutes?\b|min\b|secondes?\b|s\b|ans?\b|années?\b|jours?\b|j\b|h\b|heures?\b|fois\b|ms\b|gwei\b|sats?\b|[A-Z]{2,6}\b)`;
const RE_DEC = new RegExp(
  String.raw`(?<![\p{L}\d.,_/])(?<!(?:Web|web|version|Version|DeFi|GameFi|Ethereum|Bitcoin|Uniswap|ERC|BEP)\s?)(?:(?<=\$)(\d+)\.(\d+)(?!\.\d)|(\d+)\.(\d+)(?!\.\d)(?=${UNIT}))`,
  "gu",
);
export function corrigerDecimales(text: string): string;
export function corrigerDecimales(text: string | null | undefined): string | null | undefined;
export function corrigerDecimales(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  return text.replace(RE_DEC, (_m, a, b, c, d) => (a !== undefined ? `${a},${b}` : `${c},${d}`));
}

/** Accents puis décimales. */
export function corrigerTexteFr(text: string): string;
export function corrigerTexteFr(text: string | null | undefined): string | null | undefined;
export function corrigerTexteFr(text: string | null | undefined): string | null | undefined {
  return corrigerDecimales(corrigerAccents(text));
}

/** Applique corrigerTexteFr (accents + décimales) à toutes les chaînes d'un objet (contenu JSON d'une fiche), sans toucher aux clés. */
export function corrigerAccentsProfond<T>(value: T): T {
  if (typeof value === "string") return corrigerTexteFr(value) as T;
  if (Array.isArray(value)) return value.map((v) => corrigerAccentsProfond(v)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, /url|href|id$|slug|symbol/i.test(k) ? v : corrigerAccentsProfond(v)]),
    ) as T;
  }
  return value;
}

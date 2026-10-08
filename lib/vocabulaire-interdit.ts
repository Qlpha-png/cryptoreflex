/**
 * lib/vocabulaire-interdit.ts — expressions de RECOMMANDATION interdites près d'un indicateur (pages d'analyses
 * techniques, lot L2 du regroupement, 08/10/2026 ; doctrine AMF du 04/08/2026 sur le conseil en crypto-actifs).
 *
 * Liste de la spécification (§ 1, règles communes) complétée par la consigne du lot : « stop », « taille de
 * position », « scénario », « support / résistance », « acheteur / vendeur », « signal haussier / baissier »,
 * « rebond », « correction ». Bornes de mots : « signal » seul suffit à échouer sur ces pages (aucun usage technique
 * n'y est nécessaire) ; « cible » seul aussi (le gabarit dit « seuil que vous choisissez »).
 * Utilisée par tests/lib/analyses-gabarit.test.ts (HTML rendu) et par le banc de contrôle local.
 */

const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const re = (s: string) => new RegExp(`${B}(?:${s})${E}`, "iu");

export const EXPRESSIONS_INTERDITES: { libelle: string; motif: RegExp }[] = [
  { libelle: "acheter maintenant", motif: re("acheter maintenant") },
  { libelle: "achat possible", motif: re("achat possible") },
  { libelle: "signal (achat, vente, haussier, baissier…)", motif: re("signa(?:l|ux)") },
  { libelle: "vendre (injonction)", motif: re("vendez|vendre maintenant|il faut vendre") },
  { libelle: "opportunité", motif: re("opportunit[ée]s?") },
  { libelle: "rebond", motif: re("rebonds?") },
  { libelle: "correction", motif: re("corrections?") },
  { libelle: "recommandé(e)(s)", motif: re("recommand[ée]e?s?|nous recommandons|recommandation") },
  { libelle: "meilleur(e) pour vous", motif: re("meilleure? pour vous") },
  { libelle: "plutôt adapté", motif: re("plut[ôo]t adapt[ée]e?s?") },
  { libelle: "à surveiller", motif: re("[àa] surveiller") },
  { libelle: "potentiel", motif: re("potentiel(?:le)?s?") },
  { libelle: "cible", motif: re("cibles?") },
  { libelle: "stop", motif: re("stop(?:-loss)?") },
  { libelle: "objectif de prix", motif: re("objectifs? de (?:prix|cours)") },
  { libelle: "taille de position", motif: re("(?:taille|prise) de position") },
  { libelle: "scénario", motif: re("sc[ée]narios?") },
  { libelle: "support / résistance", motif: re("supports?|r[ée]sistances?") },
  { libelle: "acheteur / vendeur", motif: re("acheteu(?:r|se)s?|vendeu(?:r|se)s?") },
  { libelle: "momentum", motif: re("momentum") },
  { libelle: "pour acheter", motif: re("pour acheter|acheter du|acheter de l") },
  { libelle: "prudence", motif: re("prudence") },
  // reprise L2 (juré juridique, I1) : « ne les utilisez pas pour décider » présentait a contrario les valeurs comme une aide à la décision
  { libelle: "pour décider", motif: re("pour (?:vous )?d[ée]cider") },
];

/**
 * Exceptions RELUES pour le test sur le HTML COMPLET (menu, pied de page, JSON-LD) des pages d'analyses (reprise L2,
 * 08/10/2026). Liste fermée : chaque entrée est un extrait exact, hors de tout indicateur, avec sa raison.
 * Les liens /acheter du menu commun (« Acheter une crypto en France », « Mon premier achat ») sont de la navigation
 * générale du site, hors du `<main>` : ils sont tolérés là, jamais dans le contenu (le test du `<main>` les refuse).
 */
export const EXCEPTIONS_PAGE_COMPLETE: { extrait: string; raison: string }[] = [
  { extrait: "ni une incitation à acheter ou vendre", raison: "négation de l'avertissement du pied de page" },
  { extrait: "Il ne constitue ni une recommandation personnalisée", raison: "négation de l'avertissement du pied de page" },
  { extrait: "Vendre à perte : le vrai calcul", raison: "titre d'un guide fiscal du menu Impôts" },
  { extrait: "Corrections", raison: "lien du pied de page vers le journal des corrections (charte éditoriale)" },
  { extrait: "Évaluer un projet et repérer les signaux d’alerte", raison: "guide anti-arnaque du menu, sans rapport avec un indicateur" },
  { extrait: "Repérer les signaux d’alerte d’un projet", raison: "même guide anti-arnaque, intitulé du pied de page" },
  { extrait: "customer support", raison: "contactType du JSON-LD Organization (gabarit commun)" },
];

/** Retire les exceptions relues d'un texte avant la recherche des expressions interdites. */
export function sansExceptions(texte: string): string {
  let t = texte;
  for (const { extrait } of EXCEPTIONS_PAGE_COMPLETE) t = t.split(extrait).join(" ");
  return t;
}

/** Texte visible d'un fragment HTML (balises retirées, entités courantes décodées, espaces normalisées). */
export function texteVisible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Expressions interdites trouvées dans un texte (« libellé : extrait »). */
export function trouverInterdits(texte: string): string[] {
  const fautes: string[] = [];
  for (const { libelle, motif } of EXPRESSIONS_INTERDITES) {
    const m = motif.exec(texte);
    if (m) fautes.push(`${libelle} : « ${texte.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40)} »`);
  }
  return fautes;
}

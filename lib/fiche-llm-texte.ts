/**
 * lib/fiche-llm-texte.ts — retire des textes générés des fiches les montants de marché figés (lot fraîcheur A2, L3 d).
 *
 * Audit de fraîcheur du 08/10/2026 (n° 42) : le texte généré cite le prix, la capitalisation et le rang du JOUR DE LA
 * GÉNÉRATION (« Cotée à 0,51 USD avec une capitalisation de 136M USD », « market cap de 17,5 Md USD » alors que le champ
 * vivant dit 24 Md $). Ces chiffres ne sont jamais mis à jour. Au rendu :
 * - toute PHRASE qui cite un montant en dollars/euros ou un rang, sans date qui en fait un fait historique (ATH du
 *   16 avril 2024…), est retirée (phrase entière : le texte reste grammatical) ;
 * - les « chiffres clés » de marché (prix, capitalisation, rang, volume, FDV, variations, plus haut/bas sur 90 j…) sont
 *   retirés : le prix, la capitalisation et le rang vivants sont affichés en tête de fiche (lib/cours-fiche.ts) ;
 * - les autres chiffres (offre en circulation, activité GitHub, scores) restent.
 * Rien n'est écrit en base : le texte d'origine reste intact.
 */

/** montant monétaire : « 0,51 USD », « 136M USD », « 1,2 Md$ », « $3.58 », « 17,5 Md USD », « ~50 millions USD », « 3,58 $ » */
const NOMBRE = String.raw`\d[\d\s  .,]*`;
const ECHELLE = String.raw`(?:\s?(?:k|K|M|Md|Mds|Mrd|B|bn|mille|millions?|milliards?|billions?)\b\.?)?`;
const DEVISE = String.raw`\s?(?:USD|US\$|\$|dollars?|€|EUR|euros?)`;
const MONTANT = new RegExp(String.raw`(?:${NOMBRE}${ECHELLE}${DEVISE}(?![A-Za-z])|(?:\$|US\$|€)\s?\d[\d.,]*${ECHELLE})`, "i");
/** rang de capitalisation : « rang #511 », « rang 201 », « rank 63 », « #9 CoinGecko », « classé 270e » */
const RANG = /\brang\s*(?:n°\s*)?#?\s*\d+|\brank\s*#?\s*\d+|#\d+\s+(?:sur\s+|du\s+classement\s+|de\s+)?coingecko|\bclass[ée]e?s?\s+(?:au\s+)?\d+(?:e|ème)\b/i;
/** date explicite qui fait du montant un fait historique daté */
const DATE_EXPLICITE = new RegExp(
  String.raw`\b(?:19|20)\d{2}-\d{2}-\d{2}\b|\b\d{1,2}(?:er)?\s+(?:janv|févr|fevr|mars|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec)[a-zéû]*\.?\s+(?:19|20)\d{2}\b`,
  "i",
);
/** relatif à la date de génération : jamais historique (« sur 90 jours », « 24h », « actuel »…) */
const RELATIF = /\b(?:actuel(?:le)?s?|actuellement|aujourd'hui|en ce moment|24\s?h|7\s?j|7d|30\s?j|30d|90\s?j(?:ours)?|90d|sur\s+\d+\s+(?:jours|semaines|mois))\b/i;

/** montant en dollars (les cours sont en dollars ; un montant en euros seul est souvent un seuil fiscal, ex. 305 €) */
const MONTANT_DOLLARS = new RegExp(String.raw`${NOMBRE}${ECHELLE}\s?(?:USD|US\$|\$|dollars?)(?![A-Za-z])|(?:\$|US\$)\s?\d`, "i");
/** vocabulaire de marché */
const MARCHE = /\bprix\b|\bcot[ée]e?s?\b|\bcours\b|capitalis|market\s*cap|valoris|\bvolume|\bfdv\b|\bvaut\b|\bvalait\b|\bATH\b|\bATL\b|plus haut|plus bas|\btrade\b|\bs'échange/i;

/** true si la phrase cite un montant de marché ou un rang figé (à retirer). */
export function citeUnMontantFige(phrase: string): boolean {
  if (RANG.test(phrase)) return true;
  if (!MONTANT.test(phrase)) return false;
  if (!MONTANT_DOLLARS.test(phrase) && !MARCHE.test(phrase)) return false; // ex. « au-delà de 305 € de cessions »
  // montant daté (« ATH de 1,18 USD le 16 avril 2024 ») et non relatif à la génération : fait historique, gardé
  return !(DATE_EXPLICITE.test(phrase) && !RELATIF.test(phrase));
}

/**
 * Découpe en phrases (fin = . ! ? suivi d'un espace puis d'une majuscule, d'un chiffre ou d'un guillemet) en gardant les
 * séparateurs ; une décimale « 0.5 » ou « 1,2 » ne coupe pas.
 */
function phrases(texte: string): string[] {
  return texte.split(/(?<=[.!?…])(\s+)(?=[A-ZÀ-ÖØ-Ý0-9«"(])/u);
}

/** Retire d'un texte les phrases qui citent un montant de marché figé. Les sauts de ligne sont conservés. */
export function retirerMontantsFiges(texte: string | null | undefined): string {
  if (!texte) return "";
  return texte
    .split(/(\n+)/)
    .map((bloc) => {
      if (/^\n+$/.test(bloc)) return bloc;
      const morceaux = phrases(bloc);
      const garde: string[] = [];
      for (let i = 0; i < morceaux.length; i += 2) {
        const p = morceaux[i];
        if (!p || citeUnMontantFige(p)) continue;
        garde.push(p.trim());
      }
      return garde.join(" ");
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** libellés de « chiffres clés » de marché (toujours figés à la génération) */
const CHIFFRE_MARCHE =
  /prix|price|cours|capitali|market\s*cap|mcap|rang|rank|volume|fdv|valorisation|dilu|variation|change|drawdown|recovery|rebond|\bath\b|\batl\b|plus haut|plus bas|performance|rendement sur/i;

export interface ChiffreCle {
  label: string;
  value: string;
}

/** Garde les chiffres clés qui ne sont pas des chiffres de marché figés. */
export function filtrerChiffresCles(liste: ReadonlyArray<ChiffreCle> | null | undefined): ChiffreCle[] {
  return (liste ?? []).filter(
    (k) => k && typeof k.label === "string" && typeof k.value === "string" && !CHIFFRE_MARCHE.test(k.label) && !citeUnMontantFige(k.value),
  );
}

/**
 * Applique le nettoyage à tout le contenu généré d'une fiche (copie, l'original n'est pas modifié). Les éléments de liste
 * dont le texte devient vide sont retirés (risque, avantage) ; un concurrent garde son nom sans phrase de différence.
 */
export function nettoyerContenuLlm<T extends Record<string, unknown>>(llm: T): T {
  const c = structuredClone(llm) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const k of ["tldr", "thesis", "howItWorks", "tokenomics", "frEuStatus", "recentNews", "disclaimer"]) {
    if (typeof c[k] === "string") c[k] = retirerMontantsFiges(c[k]);
  }
  if (c.metrics && typeof c.metrics === "object") {
    if (typeof c.metrics.narrative === "string") c.metrics.narrative = retirerMontantsFiges(c.metrics.narrative);
    if (Array.isArray(c.metrics.keyFigures)) c.metrics.keyFigures = filtrerChiffresCles(c.metrics.keyFigures);
  }
  if (c.scores && typeof c.scores === "object") {
    for (const v of Object.values(c.scores) as Array<Record<string, unknown> | null>) {
      if (v && typeof v.rationale === "string") v.rationale = retirerMontantsFiges(v.rationale);
    }
  }
  for (const k of ["risks", "moats"]) {
    if (Array.isArray(c[k])) {
      c[k] = c[k]
        .map((x: Record<string, unknown>) => (x && typeof x.description === "string" ? { ...x, description: retirerMontantsFiges(x.description) } : x))
        .filter((x: Record<string, unknown>) => x && (typeof x.description !== "string" || x.description.length > 0));
    }
  }
  if (Array.isArray(c.competitors)) {
    c.competitors = c.competitors.map((x: Record<string, unknown>) =>
      x && typeof x.differentiator === "string" ? { ...x, differentiator: retirerMontantsFiges(x.differentiator) } : x,
    );
  }
  return c as T;
}

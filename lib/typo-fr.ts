/**
 * lib/typo-fr.ts — typographie française au RENDU (jamais dans le contenu).
 *
 * Le contenu écrit des espaces ordinaires devant « : ; ? ! % € » » : à la fin d'une ligne, le signe passe seul à la ligne
 * suivante (« 31,4 / % », « Il se décompose en / : »). Au rendu, on remplace :
 *  - U+202F (espace fine insécable) devant « ; ? ! » », après « « », et entre les groupes de chiffres d'un nombre ;
 *  - U+00A0 (espace insécable) devant « : % € ».
 * La police « Cryptoreflex NNBSP » (app/globals.css) porte U+202F : l'espace fine garde sa largeur.
 *
 * À utiliser pour les textes de données affichés par les composants ; le MDX passe par lib/rehype-typo-fr.ts.
 */

// Les deux espaces sont construites par code (U+202F et U+00A0) : jamais d'espace invisible écrite dans le source.
const NNBSP = String.fromCharCode(0x202f);
const NBSP = String.fromCharCode(0x00a0);

/** Renvoie le texte avec les espaces ordinaires remplacées là où une coupe de ligne serait fautive. Idempotent. */
export function typoFr(texte: string): string {
  return texte
    .replace(/(?<![\d,.])(\d{1,3}) (?=\d{3}(?!\d))/g, "$1" + NNBSP) // groupes de chiffres : « 1 982 », « 12 345 »
    .replace(/ (?=[;?!»])/g, NNBSP)
    .replace(/« /g, "«" + NNBSP)
    .replace(/ (?=[:%€])/g, NBSP);
}

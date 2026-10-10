/**
 * lib/typo-fr.ts — typographie française au RENDU (jamais dans le contenu).
 *
 * Le contenu écrit des espaces ordinaires devant « : ; ? ! % € » » : à la fin d'une ligne, le signe passe seul à la ligne
 * suivante (« 31,4 / % », « Il se décompose en / : »). Au rendu, on remplace :
 *  - U+202F (espace fine insécable) devant « ; ? ! » », après « « », et entre les groupes de chiffres d'un nombre ;
 *  - U+00A0 (espace insécable) devant « : % € », et insérée entre un nombre et un « % » collé (« 3,17% » -> « 3,17 % »).
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
    .replace(/ (?=[:%€])/g, NBSP)
    .replace(/(\d)%(?![\w%])/g, "$1" + NBSP + "%"); // « 3,17% » devient « 3,17 % » : une seule convention
}

/**
 * Guillemets droits appariés → guillemets français avec espace fine insécable (« mot de passe oublié »). Seulement si le
 * texte contient un nombre PAIR de guillemets droits (une paire coupée par une balise reste telle quelle plutôt que
 * d'ouvrir sans fermer).
 */
function guillemetsFr(texte: string): string {
  const n = (texte.match(/"/g) ?? []).length;
  if (n === 0 || n % 2 === 1) return texte;
  let i = 0;
  return texte.replace(/"/g, () => (i++ % 2 === 0 ? "«" + NNBSP : NNBSP + "»"));
}

/**
 * Typographie « riche » (lot B4, ronde 1 du jury, 10/10/2026) = typoFr() PLUS :
 *  - apostrophe typographique entre deux lettres ou chiffres (« d'un » → « d’un ») ;
 *  - guillemets droits appariés → « … » avec espaces fines insécables ;
 *  - cadratin d'incise précédé d'une espace insécable (« 2026 — Guide » : le tiret ne commence jamais une ligne).
 * Adoptée surface par surface, avec les lots de migration (articles, actualités, guides, MDX : B4) : typoFr() reste
 * inchangée pour le reste du site, dont les tests comparent encore le texte à apostrophe droite. Idempotente.
 */
export function typoFrRiche(texte: string): string {
  return typoFr(
    guillemetsFr(texte)
      // « 'piraté à distance' » (apostrophes simples en guillemets) → « piraté à distance »
      .replace(/(^|[\s(])'([^'\n]{1,80}?)'(?=[\s.,;:!?)]|$)/gu, (_m, avant: string, dedans: string) => `${avant}«${NNBSP}${dedans}${NNBSP}»`)
      // apostrophe entre deux lettres ou chiffres, ou en fin de morceau de texte (« l'<lien> » : l'élément suivant commence ailleurs)
      .replace(/(?<=[\p{L}\d])'(?=[\p{L}\d]|$)/gu, "’")
      // (aussi en tête d'un morceau de texte : « <strong>Mot</strong> — suite », l'espace est alors le premier caractère)
      .replace(/(?<=\S) — |^ — /g, NBSP + "— "),
  );
}

/**
 * Variante pour un fragment HTML déjà construit (réponses riches rendues par dangerouslySetInnerHTML) : seul le texte
 * entre les balises est traité, jamais les balises ni leurs attributs (href, alt, data-*).
 */
export function typoHtml(html: string, riche = false): string {
  return html
    .split(/(<[^>]*>)/)
    .map((morceau) => (morceau.startsWith("<") ? morceau : riche ? typoFrRiche(morceau) : typoFr(morceau)))
    .join("");
}

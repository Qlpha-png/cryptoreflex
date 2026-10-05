/**
 * lib/seo-text.ts — longueur des titres et descriptions servis à Google.
 *
 * Audit du 05/10/2026 : 553 pages avaient un titre de plus de 70 caractères (suffixe « | Cryptoreflex » compris) et
 * 247 une description de plus de 170 caractères. Google coupe au-delà d'environ 60 caractères pour un titre et
 * 155-160 pour une description, souvent au milieu d'un mot. Ces deux fonctions raccourcissent proprement :
 * d'abord en retirant le dernier segment accessoire (« — fiche complète », « : guide 2026 »…), sinon à la fin d'un
 * mot, avec des points de suspension. Un texte déjà court est rendu tel quel.
 * Tests : tests/lib/seo-text.test.ts.
 */

/** Suffixe ajouté par le gabarit du layout racine (`%s | Cryptoreflex`). */
const SUFFIX = " | Cryptoreflex";
export const TITLE_MAX = 65;
export const DESCRIPTION_MAX = 160;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Petits mots qui ne terminent jamais un texte coupé (« … des plateformes en… »). */
const WEAK_END =
  /\s+(?:à|au|aux|avec|ce|ces|cette|dans|de|des|dont|du|en|et|la|le|les|l'|d'|leur|leurs|nos|notre|ou|par|pour|que|qui|sa|sans|ses|son|sur|un|une|vos|votre|vs|[+&—–:-])$/i;

function cutAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  let cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  if (sp > max * 0.6) cut = cut.slice(0, sp);
  cut = cut.replace(/[\s,;:—–(+&-]+$/, "");
  while (WEAK_END.test(cut)) cut = cut.replace(WEAK_END, "").replace(/[\s,;:—–(+&-]+$/, "");
  return `${cut}…`;
}

/**
 * Version raccourcie en retirant le dernier segment accessoire (« — x », « | x », « (x) »), ou null.
 * Jamais après « : » : dans un titre d'actu, c'est la partie qui distingue (« Bitcoin au plus haut : Wintermute… » et
 * « Bitcoin au plus haut : Bernstein… » devenaient le même titre, audit du 05/10/2026).
 */
function dropTail(s: string): string | null {
  const m = /^(.+?)\s*(?:\s[—–|]\s|\s-\s|\s\()[^—–|(]*\)?$/.exec(s);
  return m ? m[1].trim() : null;
}

/** Au-dessous de cette longueur, un titre raccourci par segments perd trop de sens : on coupe au mot. */
const MIN_SHORT_TITLE = 25;

/**
 * Titre d'une page : rendu tel quel (le gabarit ajoute « | Cryptoreflex ») s'il tient avec le suffixe, sinon sans
 * suffixe (`absolute`), raccourci si besoin.
 */
export function fitTitle(title: string): string | { absolute: string } {
  const t = clean(title);
  if (t.length + SUFFIX.length <= TITLE_MAX) return t;
  if (t.length <= TITLE_MAX) return { absolute: t };
  let cand: string | null = t;
  while (cand && cand.length > TITLE_MAX) cand = dropTail(cand);
  if (cand && cand.length >= MIN_SHORT_TITLE) return cand.length + SUFFIX.length <= TITLE_MAX ? cand : { absolute: cand };
  return { absolute: cutAtWord(t, TITLE_MAX) };
}

/** Description : coupée à la fin d'une phrase si possible, sinon à la fin d'un mot. */
export function fitDescription(description: string): string {
  const d = clean(description);
  if (d.length <= DESCRIPTION_MAX) return d;
  const head = d.slice(0, DESCRIPTION_MAX);
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf(" ! "), head.lastIndexOf(" ? "));
  if (end >= 100) return head.slice(0, end + 1);
  return cutAtWord(d, DESCRIPTION_MAX);
}

/**
 * lib/rehype-typo-fr.ts — plugin rehype : typographie française au rendu du MDX (voir lib/typo-fr.ts).
 *
 * Parcourt l'arbre HTML produit par le MDX et remplace les espaces ordinaires devant « : ; ? ! % € » » (et dans les
 * nombres) par des espaces insécables, SANS toucher au fichier source. Les blocs de code (code, pre), les scripts et
 * les styles sont laissés tels quels. À placer APRÈS rehype-slug : les identifiants d'ancres sont calculés sur le texte
 * d'origine.
 */
import { typoFr } from "./typo-fr";

type NoeudHast = { type: string; value?: string; tagName?: string; children?: NoeudHast[] };

const IGNORES = new Set(["code", "pre", "script", "style", "textarea"]);

function parcourir(noeud: NoeudHast): void {
  if (noeud.type === "element" && noeud.tagName && IGNORES.has(noeud.tagName)) return;
  if (noeud.type === "text" && typeof noeud.value === "string") {
    noeud.value = typoFr(noeud.value);
    return;
  }
  if (noeud.children) for (const enfant of noeud.children) parcourir(enfant);
}

export default function rehypeTypoFr() {
  return (arbre: NoeudHast) => {
    parcourir(arbre);
  };
}

/**
 * components/ui/Typo.tsx — typographie française au rendu pour les textes des composants (lot B1-bis).
 *
 * `typoNode` parcourt un arbre React (déjà construit, côté serveur comme côté client) et applique `typoFr` aux seuls
 * textes affichés : espace insécable devant « : % € », espace fine insécable devant « ; ? ! » » et dans les nombres.
 * Les données (data/*.json, MDX) ne sont jamais modifiées ; aucune réécriture du DOM côté client.
 *
 * Jamais touchés : les attributs (href, key, data-*, valeur de champ), le code (code, pre, kbd, samp), les scripts et
 * styles, les champs de saisie et leurs options (leur texte peut servir de valeur), les contenus injectés par
 * dangerouslySetInnerHTML (voir typoHtml dans lib/typo-fr.ts pour ceux-là), les enfants-fonctions.
 * Le code et le CSS rendus par des COMPOSANTS (et non des balises) sont aussi exclus (reprise B1-bis, jury code) :
 *   - les blocs `<style jsx>` compilés, qui deviennent jsx(JSXStyle, { id, children: "<css>" }) (voir estIgnore) ;
 *   - tout composant marqué par `sansTypo(Composant)` (ex. `code` et `pre` de MdxContent, qui remplacent les balises).
 * Sans cela, un `width:100%` ou une étape `0%` de keyframes deviendrait « 100 % » et casserait le CSS sans bruit.
 *
 * Usage : `export default avecTypo(Page)` pour une page ou un composant, ou `<Typo>…</Typo>` autour d'un bloc.
 */
import { cloneElement, isValidElement, type ComponentType, type ReactElement, type ReactNode } from "react";
import { typoFr } from "@/lib/typo-fr";

const IGNORES = new Set(["code", "pre", "kbd", "samp", "script", "style", "textarea", "option", "select", "input", "title", "svg"]);

/** Marqueur statique : un composant qui porte `__sansTypo = true` n'est jamais traité (code, CSS, valeurs techniques). */
const MARQUEUR = "__sansTypo";
const REF_CLIENT = Symbol.for("react.client.reference");

/** Marque un composant (fonction ou classe) pour que `typoNode` ne touche ni lui ni ses enfants. Renvoie le composant. */
export function sansTypo<T extends object>(Composant: T): T {
  (Composant as Record<string, unknown>)[MARQUEUR] = true;
  return Composant;
}

/**
 * JSXStyle (styled-jsx/style) est reconnu à sa signature statique `JSXStyle.dynamic` (fonction), sans l'importer :
 * l'import ajouterait styled-jsx au JavaScript de chaque composant client enveloppé. Le test
 * tests/lib/typo-composants.test.ts vérifie la reconnaissance sur le vrai JSXStyle (une montée de version qui la
 * casserait fait échouer le test).
 */
function estIgnore(type: unknown): boolean {
  if (typeof type === "string") return IGNORES.has(type);
  if (typeof type !== "function" && (typeof type !== "object" || type === null)) return false;
  const t = type as Record<string, unknown>;
  // Côté serveur, un composant client (next/image, tout fichier « use client ») est une RÉFÉRENCE : un proxy qui lève
  // « Cannot access X.prop on the server » pour toute propriété autre que $$typeof, $$id, name… On ne lit donc rien
  // d'autre : la référence n'est pas ignorée, les enfants texte que le serveur lui passe restent traités comme avant.
  if (t.$$typeof === REF_CLIENT) return false;
  return t[MARQUEUR] === true || (typeof type === "function" && typeof t.dynamic === "function");
}

export function typoNode(noeud: ReactNode): ReactNode {
  if (typeof noeud === "string") return typoFr(noeud);
  if (noeud == null || typeof noeud !== "object") return noeud;
  if (Array.isArray(noeud)) return noeud.map(typoNode);
  if (!isValidElement(noeud)) return noeud;
  const el = noeud as ReactElement<{ children?: ReactNode; dangerouslySetInnerHTML?: unknown }>;
  if (estIgnore(el.type)) return el;
  const enfants = el.props?.children;
  if (enfants === undefined || enfants === null || typeof enfants === "function" || el.props.dangerouslySetInnerHTML) return el;
  return cloneElement(el, { children: typoNode(enfants) });
}

/** Bloc de JSX à traiter : `<Typo>…</Typo>`. */
export function Typo({ children }: { children?: ReactNode }) {
  return <>{typoNode(children)}</>;
}

/** Enveloppe un composant (ou une page) dont le rendu est un arbre React : le résultat passe par `typoNode`. */
export function avecTypo<P extends object>(Composant: (props: P) => ReactNode | Promise<ReactNode>): (props: P) => Promise<ReactElement> {
  // Le type de retour reste celui d'un composant serveur asynchrone (JSX.Element) ; le rendu réel peut être null ou une chaîne.
  const Enveloppe = async (props: P) => typoNode(await Composant(props)) as ReactElement;
  return Enveloppe;
}

/** Idem pour un composant synchrone (client ou serveur) : reste synchrone, hooks autorisés dans le composant d'origine. */
export function avecTypoSync<P extends object>(Composant: ComponentType<P> | ((props: P) => ReactNode)): (props: P) => ReactElement {
  const Enveloppe = (props: P) => typoNode((Composant as (props: P) => ReactNode)(props)) as ReactElement;
  return Enveloppe;
}

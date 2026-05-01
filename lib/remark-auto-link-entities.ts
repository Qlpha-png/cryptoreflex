/**
 * lib/remark-auto-link-entities.ts — Plugin remark d'auto-linking d'entités.
 *
 * Pour chaque article MDX rendu, ce plugin scanne les nodes `text` du body
 * et transforme la PREMIÈRE occurrence de chaque entité connue (crypto,
 * platform, tool, comparison, term de glossaire) en lien interne.
 *
 * # Règles
 *
 * - Une transformation par entité par article maximum (anti-spam Google).
 * - Budget total `MAX_AUTO_LINKS` par article (défaut 12), sinon densité de
 *   liens internes excessive (signal Penguin / "over-optimization").
 * - Skip si le node text est dans :
 *     - `link`         (déjà lié manuellement par le rédacteur)
 *     - `code` / `inlineCode` / `pre`
 *     - `heading` (h1-h6) — les titres restent neutres typographiquement
 *     - `mdxJsxFlowElement` / `mdxJsxTextElement` (composants custom Cryptoreflex)
 * - Match insensible à la casse / accents, mais case-PRESERVING dans le rendu
 *   (la mention reste affichée comme tapée par le rédacteur).
 *
 * # Pourquoi côté remark plutôt que post-render HTML ?
 *
 * remark opère sur l'AST mdast, donc on a une garantie structurelle :
 *  - On ne casse jamais le markup (vs regex sur HTML qui peut se planter sur
 *    les attributs `<a href="bitcoin">` ou les commentaires).
 *  - On peut ignorer proprement les `code`, `link`, `heading`, etc.
 *  - Performance : un seul pass d'AST, pas de re-parse du HTML.
 *
 * # Coût au build
 *
 * - Construction de l'index : ~5 ms (singleton, mémoïsé).
 * - Par article : 1 visit() AST + indexOf() par alias trouvé.
 *   Sur ~40 articles × 350 aliases × ~12 mentions matchées = négligeable
 *   (<10 ms total au build SSG).
 */

import { visit, SKIP } from "unist-util-visit";
import type { Plugin, Transformer } from "unified";
import type { Root, Text, Link, PhrasingContent, Parent } from "mdast";

import {
  getAliasMatchList,
  type EntityIndexEntry,
} from "./internal-link-graph";

/* -------------------------------------------------------------------------- */
/*  Options                                                                    */
/* -------------------------------------------------------------------------- */

export interface RemarkAutoLinkEntitiesOptions {
  /** Budget max de liens auto-générés par article. Défaut : 12. */
  maxLinks?: number;
  /**
   * Types d'entités auto-linkables. Défaut : crypto, platform, tool, term.
   * Les `comparison` sont exclus par défaut (alias trop génériques type
   * "binance vs coinbase" → faux positifs).
   */
  enabledTypes?: ReadonlyArray<EntityIndexEntry["type"]>;
}

const DEFAULT_MAX_LINKS = 12;
const DEFAULT_ENABLED_TYPES: ReadonlyArray<EntityIndexEntry["type"]> = [
  "crypto",
  "platform",
  "tool",
  "term",
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Lower + strip accents — DOIT être identique à `normalizeAlias` du graph. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Cherche dans un texte la 1re occurrence d'un alias (insensible casse +
 * accents), en respectant les frontières de mot ASCII.
 *
 * @returns { start, end, original } ou null si pas trouvé.
 */
function findAlias(
  text: string,
  alias: string
): { start: number; end: number; original: string } | null {
  const normText = normalize(text);
  const i = normText.indexOf(alias);
  if (i === -1) return null;
  const before = i === 0 ? " " : normText[i - 1] ?? " ";
  const after =
    i + alias.length >= normText.length
      ? " "
      : normText[i + alias.length] ?? " ";
  if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) return null;
  // Le slice sur le texte ORIGINAL préserve la casse + les accents.
  return {
    start: i,
    end: i + alias.length,
    original: text.slice(i, i + alias.length),
  };
}

/** Types de parents qu'on ne traverse JAMAIS (skip total du sous-arbre). */
const SKIP_PARENT_TYPES = new Set<string>([
  "link",
  "code",
  "inlineCode",
  "pre",
  "heading",
  "html", // raw HTML = on touche pas
  "mdxJsxFlowElement",
  "mdxJsxTextElement",
  "mdxFlowExpression",
  "mdxTextExpression",
  "yaml",
  "definition",
  "linkReference",
  "imageReference",
]);

/* -------------------------------------------------------------------------- */
/*  Plugin                                                                     */
/* -------------------------------------------------------------------------- */

const remarkAutoLinkEntities: Plugin<[RemarkAutoLinkEntitiesOptions?], Root> = (
  options = {}
) => {
  const maxLinks = options.maxLinks ?? DEFAULT_MAX_LINKS;
  const enabledTypes = new Set<EntityIndexEntry["type"]>(
    options.enabledTypes ?? DEFAULT_ENABLED_TYPES
  );

  const transformer: Transformer<Root> = (tree) => {
    // État par article : ne pas auto-linker 2× la même entité, et plafonner.
    const usedUrls = new Set<string>();
    let linkCount = 0;

    // Liste pré-triée (long → court). On filtre par enabledTypes ici.
    const aliases = getAliasMatchList().filter((a) =>
      enabledTypes.has(a.entry.type)
    );

    visit(
      tree,
      "text",
      (node: Text, index: number | undefined, parent: Parent | undefined) => {
        if (!parent || index === undefined) return;
        if (linkCount >= maxLinks) return;
        if (SKIP_PARENT_TYPES.has(parent.type)) return;

        // On ne cherche QUE le 1er alias matchant non encore utilisé.
        for (const { alias, entry } of aliases) {
          if (linkCount >= maxLinks) return;
          if (usedUrls.has(entry.url)) continue;
          if (alias.length < 3) continue; // garde-fou

          const match = findAlias(node.value, alias);
          if (!match) continue;

          // Construit les 3 morceaux : avant, lien, après.
          const before = node.value.slice(0, match.start);
          const after = node.value.slice(match.end);

          const linkNode: Link = {
            type: "link",
            url: entry.url,
            title: undefined,
            children: [
              {
                type: "text",
                value: match.original,
              } as Text,
            ],
          };

          const replacement: PhrasingContent[] = [];
          if (before.length > 0) {
            replacement.push({ type: "text", value: before } as Text);
          }
          replacement.push(linkNode);
          if (after.length > 0) {
            replacement.push({ type: "text", value: after } as Text);
          }

          // Splice dans le parent. visit() reprend correctement après mutation
          // si on retourne le nouvel index.
          parent.children.splice(
            index,
            1,
            ...(replacement as Parent["children"])
          );

          usedUrls.add(entry.url);
          linkCount += 1;

          // Une seule transformation par node text — on stoppe la boucle
          // des aliases pour ce node. Les nodes text suivants seront visités
          // au prochain visit() callback.
          // [SKIP, nextIndex] : on ne descend pas dans le link inséré (sinon
          // le text inside serait re-scanné et on créerait des liens nested),
          // et on saute par-dessus les nodes qu'on vient d'insérer.
          return [SKIP, index + replacement.length];
        }
        return undefined;
      }
    );
  };

  return transformer;
};

export default remarkAutoLinkEntities;

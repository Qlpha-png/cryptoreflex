/**
 * lib/search-client.ts — Code de recherche PUR (zéro dépendance Node.js).
 *
 * Pourquoi ce fichier existe (RCA 26-04 commits d776b2d → 7bd30ba) :
 *  Bug : `lib/search.ts` importe `getAllArticleSummaries` depuis `lib/mdx.ts`
 *  qui utilise `node:fs` + `node:path`. Quand un Client Component importait
 *  même UN SEUL symbole de `lib/search.ts` (ex: `searchIndex`, type-only ou
 *  function pure), webpack analysait statiquement l'arbre de deps complet
 *  et tentait de bundler `node:fs` côté navigateur → 7 deploys en ERROR
 *  d'affilée :
 *    Module build failed: UnhandledSchemeError: Reading from "node:fs"…
 *    Import trace : node:fs → ./lib/mdx.ts → ./lib/search.ts
 *                 → ./components/CommandPalette.tsx
 *
 * Fix : on isole TOUT ce qui est pur (types, normalize, scoreItem, searchIndex,
 *  SEARCH_TYPES) dans ce fichier. Le client n'importe QUE ça.
 *  `lib/search.ts` reste server-only (marker `import "server-only"`) et
 *  ré-exporte les symboles d'ici pour la compat des routes API existantes.
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type SearchType =
  | "article"
  | "platform"
  | "crypto"
  | "comparatif"
  | "outil"
  | "glossary";

export interface SearchItem {
  /** Identifiant unique global ("article:foo", "platform:bar"…) */
  id: string;
  title: string;
  type: SearchType;
  /** URL canonique relative ("/blog/foo") */
  url: string;
  /** Court extrait/desc affiché sous le titre dans la palette */
  snippet: string;
  /** Mots-clés pour booster le ranking */
  keywords: string[];
}

export interface SearchResult extends SearchItem {
  /** Score de pertinence (plus c'est haut, mieux c'est) */
  score: number;
}

/* -------------------------------------------------------------------------- */
/*  Normalisation FR (lowercase + strip accents)                              */
/* -------------------------------------------------------------------------- */

// U+0300 → U+036F : combining diacritical marks. On construit la regex via
// String.fromCharCode pour rester safe même si le fichier source est ré-encodé.
const DIACRITICS_RE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g"
);

/** Normalise une chaîne pour comparaison : lowercase + sans accents. */
export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(DIACRITICS_RE, "").trim();
}

/** Tokenise une requête en mots significatifs (>= 2 chars). */
function tokenize(q: string): string[] {
  return normalize(q)
    .split(/[\s,;.\-_/]+/)
    .filter((t) => t.length >= 2);
}

/* -------------------------------------------------------------------------- */
/*  Scoring + recherche fuzzy                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Score un item pour une requête. Plus c'est élevé, mieux c'est.
 *
 * Ranking :
 *   - title match exact    → +1000
 *   - title startsWith     → +500
 *   - title contains       → +200
 *   - keyword match exact  → +120
 *   - keyword contains     → +60
 *   - snippet contains     → +20
 *   - bonus type plateforme/crypto/article (légèrement priorisés)
 */
export function scoreItem(item: SearchItem, query: string): number {
  const q = normalize(query);
  if (!q) return 0;

  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;

  const title = normalize(item.title);
  const snippet = normalize(item.snippet);
  const keywords = item.keywords.map(normalize);

  let score = 0;

  // Match plein texte (toute la requête)
  if (title === q) score += 1000;
  else if (title.startsWith(q)) score += 500;
  else if (title.includes(q)) score += 200;

  // Match par token (utile pour requêtes multi-mots)
  for (const tok of tokens) {
    if (title === tok) score += 400;
    else if (title.startsWith(tok)) score += 180;
    else if (title.includes(tok)) score += 90;

    for (const kw of keywords) {
      if (kw === tok) score += 120;
      else if (kw.includes(tok)) score += 50;
    }

    if (snippet.includes(tok)) score += 20;
  }

  // Bonus / malus par type pour stabiliser l'ordre quand scores égaux
  const typeBoost: Record<SearchType, number> = {
    platform: 5,
    crypto: 4,
    article: 3,
    comparatif: 2,
    outil: 2,
    glossary: 1,
  };
  if (score > 0) score += typeBoost[item.type];

  return score;
}

/**
 * Recherche fuzzy : filtre l'index, classe par score, retourne au max `limit`
 * résultats. `query` vide → tableau vide (la palette gère son propre vide).
 */
export function searchIndex(
  index: SearchItem[],
  query: string,
  limit = 50
): SearchResult[] {
  if (!query || !query.trim()) return [];

  const scored: SearchResult[] = [];
  for (const item of index) {
    const score = scoreItem(item, query);
    if (score > 0) {
      scored.push({ ...item, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // tie-breaker stable : alpha titre
    return a.title.localeCompare(b.title, "fr");
  });

  return scored.slice(0, limit);
}

/** Liste statique des types pour l'UI (tabs page /recherche). */
export const SEARCH_TYPES: ReadonlyArray<{
  key: SearchType | "all";
  label: string;
}> = [
  { key: "all", label: "Tout" },
  { key: "article", label: "Articles" },
  { key: "platform", label: "Plateformes" },
  { key: "crypto", label: "Cryptos" },
  { key: "comparatif", label: "Comparatifs" },
  { key: "outil", label: "Outils" },
  { key: "glossary", label: "Glossaire" },
] as const;

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

/* -------------------------------------------------------------------------- */
/*  Recherche de l'en-tête (lot B3b) : index court, synonymes, aucun appel    */
/*  réseau par frappe. Index construit par lib/search-rapide.ts.             */
/* -------------------------------------------------------------------------- */

export interface ItemRapide {
  /** Titre affiché (typographie française déjà appliquée). */
  t: string;
  /** Adresse relative. */
  u: string;
  /** Phrase sous le titre. */
  p: string;
  /** Famille : l'ordre des résultats à score égal est outil, page, plateforme, crypto. */
  g: "outil" | "page" | "plateforme" | "crypto";
  /** Étiquette affichée à droite (rubrique ou famille). */
  tag: string;
  /** Mots-clés (symbole, nom). */
  k: string[];
  /** Synonymes (architecture § 5, plan SEO § 2.2). */
  s?: string[];
}

const BONUS_FAMILLE: Record<ItemRapide["g"], number> = { outil: 30, page: 20, plateforme: 10, crypto: 0 };

/** Mots vides : ignorés (« frais de coinbase » = « frais coinbase »). */
const MOTS_VIDES = new Set(["de", "du", "des", "la", "le", "les", "un", "une", "en", "et", "ou", "au", "aux", "pour", "sur", "ma", "mon", "mes", "est", "que", "quoi", "comment", "quel", "quelle"]);

/**
 * Mots d'intention (reprise B3b, jury du 08/10/2026) : ils ORIENTENT sans être exigés. « acheter bitcoin », « cours
 * bitcoin », « frais coinbase », « binance autorisée » : le mot porteur (bitcoin, coinbase, binance) trouve la fiche,
 * le mot d'intention ajoute un bonus aux familles ou aux pages qui y répondent.
 */
const INTENTIONS: Map<string, { g?: ItemRapide["g"][]; u?: string[] }> = (() => {
  const achat = { g: ["crypto"] as ItemRapide["g"][], u: ["/acheter"] };
  const cours = { g: ["crypto"] as ItemRapide["g"][], u: ["/marche"] };
  const frais = { g: ["plateforme"] as ItemRapide["g"][], u: ["/comparatif/frais"] };
  const statut = { g: ["plateforme"] as ItemRapide["g"][], u: ["/outils/verificateur-mica"] };
  const plateforme = { g: ["plateforme"] as ItemRapide["g"][] };
  const neutre = {};
  return new Map(Object.entries({
    acheter: achat, achat: achat, achete: achat,
    cours: cours, prix: cours, valeur: cours,
    frais: frais, commission: frais, commissions: frais, tarif: frais, tarifs: frais,
    autorisee: statut, autorise: statut, autorisees: statut, autorises: statut, agree: statut, agreee: statut,
    legal: statut, legale: statut, fiable: statut, verifier: statut, verification: statut, statut: statut,
    plateforme: plateforme, plateformes: plateforme, exchange: plateforme, avis: plateforme,
    crypto: neutre, cryptos: neutre, cryptomonnaie: neutre, cryptomonnaies: neutre, france: neutre,
  }));
})();

/** Texte aplati pour comparer : minuscules, sans accents, séparateurs (tiret, apostrophe, ponctuation) → espace. */
function aplatir(s: string): string {
  return normalize(s).replace(/[^a-z0-9]+/g, " ").trim();
}

/** Longueur du préfixe commun de deux mots (« verifier » / « verificateur » : 6). */
function prefixeCommun(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** Écho d'un mot de la requête dans un élément (0 = aucun). */
function echoMot(m: string, item: ItemRapide, motsTitre: string[], cles: string[], syn: string[], motsPhrase: string[]): number {
  if (motsTitre.includes(m)) return 90;
  if (cles.includes(m)) return 80;
  if (motsTitre.some((w) => w.startsWith(m))) return 60;
  if (m.length >= 6 && motsTitre.some((w) => prefixeCommun(w, m) >= 6)) return 50;
  if (syn.some((s) => s.split(" ").some((w) => w === m || (m.length >= 3 && w.startsWith(m))))) return 40;
  if ((item.g === "outil" || item.g === "page") && motsPhrase.some((w) => w === m || (m.length >= 4 && w.startsWith(m)))) return 15;
  return 0;
}

/**
 * Score d'un élément de l'index court (0 = hors résultats). Score PAR MOT (reprise B3b) : chaque mot porteur qui trouve
 * un écho ajoute des points, l'élément qui les couvre tous gagne un bonus ; les mots d'intention (acheter, cours, prix,
 * frais, autorisée…) ne sont jamais exigés. Il faut au moins un mot porteur trouvé, ou un synonyme / titre complet.
 */
export function scoreRapide(item: ItemRapide, requete: string): number {
  const q = aplatir(requete);
  if (q.length < 2) return 0;
  const mots = q.split(" ").filter((m) => m.length >= 2 && !MOTS_VIDES.has(m));
  if (!mots.length) return 0;
  const titre = aplatir(item.t);
  const cles = item.k.map(aplatir);
  const syn = (item.s ?? []).map(aplatir);
  const motsTitre = titre.split(" ").filter(Boolean);
  const motsPhrase = aplatir(item.p).split(" ").filter(Boolean);

  // 1. La requête entière.
  let entier = 0;
  if (syn.includes(q)) entier += 900;
  else if (q.length >= 3 && syn.some((s) => s.startsWith(q))) entier += 400;
  else {
    // Un synonyme contenu dans la requête (« plus-value crypto » contient « plus-value ») : fort s'il porte un mot
    // porteur, faible s'il n'est fait que de mots d'intention (« frais coinbase » ne doit pas passer avant Coinbase).
    const contenu = syn.filter((s) => s.length >= 3 && ` ${q} `.includes(` ${s} `));
    if (contenu.length) entier += contenu.some((s) => s.split(" ").some((w) => !INTENTIONS.has(w) && !MOTS_VIDES.has(w))) ? 450 : 200;
  }
  if (cles.includes(q)) entier += 700;
  if (titre === q) entier += 800;
  else if (titre.startsWith(q)) entier += 500;
  else if (titre.includes(q)) entier += 300;

  // 2. Mot par mot.
  let porteurs = 0;
  let trouves = 0;
  let echos = 0;
  let bonusIntention = 0;
  let echoIntention = 0;
  for (const m of mots) {
    const echo = echoMot(m, item, motsTitre, cles, syn, motsPhrase);
    const intention = INTENTIONS.get(m);
    if (intention) {
      echoIntention += echo;
      if (intention.u?.includes(item.u)) bonusIntention += 120;
      else if (intention.g?.includes(item.g)) bonusIntention += 60;
      continue;
    }
    porteurs++;
    if (echo) {
      trouves++;
      echos += echo;
    }
  }

  let score = entier;
  if (porteurs > 0) {
    if (trouves === 0 && entier < 200) return 0; // aucun mot porteur trouvé, pas de synonyme : hors résultats
    score += echos + echoIntention;
    if (trouves > 0) score += (trouves === porteurs ? 150 : 0) + bonusIntention;
  } else {
    // Requête faite de mots d'intention seulement (« prix », « vérifier plateforme ») : écho réel exigé.
    if (echoIntention === 0 && entier < 300) return 0;
    score += echoIntention;
  }
  if (score <= 0) return 0;
  // À score égal, le titre le plus court (« Bitcoin (BTC) » avant « Bitcoin Cash (BCH) »).
  return score + BONUS_FAMILLE[item.g] - motsTitre.length * 2;
}

/** Les meilleurs résultats de l'index court (vide si la requête fait moins de 2 caractères). */
export function chercherRapide(index: ItemRapide[], requete: string, limite = 6): ItemRapide[] {
  return index
    .map((item) => ({ item, s: scoreRapide(item, requete) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.item.t.localeCompare(b.item.t, "fr"))
    .slice(0, limite)
    .map((x) => x.item);
}

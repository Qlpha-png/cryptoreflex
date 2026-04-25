/**
 * lib/search.ts — Index de recherche unifié pour Cryptoreflex.
 *
 * Agrège dans un même format :
 *   - Articles MDX (content/articles/*.mdx)
 *   - Plateformes (data/platforms.json + data/wallets.json) → /avis/[slug]
 *   - Comparatifs                                            → /comparatif/[slug]
 *   - Top 10 + Hidden gems (data/top-cryptos.json + data/hidden-gems.json)
 *   - Outils                                                  → /outils/*
 *   - Glossaire (constante locale, FAQ rapide)
 *
 * On expose un index "léger" (pas de contenu MDX entier) pour pouvoir
 * être renvoyé par l'API route sans saturer la bande passante.
 *
 * Cache : `unstable_cache` 1h — les sources statiques (JSON + MDX) ne
 * bougent qu'au build, donc 1h est très conservateur.
 */

import { unstable_cache } from "next/cache";
import { getAllArticleSummaries } from "@/lib/mdx";
import { getAllPlatforms, type Platform } from "@/lib/platforms";
import { getAllCryptos, type AnyCrypto } from "@/lib/cryptos";
import { getPublishableComparisons } from "@/lib/programmatic";

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
/*  Glossaire — petit dictionnaire pour les termes les plus cherchés         */
/* -------------------------------------------------------------------------- */

const GLOSSARY: Array<{
  term: string;
  definition: string;
  url: string;
  keywords: string[];
}> = [
  {
    term: "MiCA",
    definition:
      "Règlement européen Markets in Crypto-Assets. Régule les prestataires crypto en UE depuis 2024.",
    url: "/blog/mica-binance-france-2026",
    keywords: ["regulation", "ue", "europe", "psan", "casp", "amf"],
  },
  {
    term: "PSAN",
    definition:
      "Prestataire de Services sur Actifs Numériques — statut français supplanté progressivement par MiCA.",
    url: "/methodologie",
    keywords: ["amf", "regulation", "france", "agrement", "enregistrement"],
  },
  {
    term: "DCA",
    definition:
      "Dollar-Cost Averaging — stratégie consistant à investir un montant fixe à intervalle régulier.",
    url: "/outils/simulateur-dca",
    keywords: ["investissement", "strategie", "achat", "regulier", "moyenne"],
  },
  {
    term: "Staking",
    definition:
      "Verrouillage de cryptos pour sécuriser un réseau Proof-of-Stake en échange de rendements.",
    url: "/blog",
    keywords: ["yield", "rendement", "validateur", "pos", "ethereum", "solana"],
  },
  {
    term: "Spread",
    definition:
      "Écart entre prix d'achat et de vente. Frais cachés sur les brokers ; nul sur les exchanges en mode spot.",
    url: "/comparatif",
    keywords: ["frais", "broker", "exchange", "trading", "spot"],
  },
  {
    term: "Cold storage",
    definition:
      "Stockage hors-ligne des cryptos (hardware wallet). Standard pour les fonds long terme.",
    url: "/avis/ledger",
    keywords: ["hardware", "wallet", "ledger", "trezor", "securite", "offline"],
  },
  {
    term: "KYC",
    definition:
      "Know Your Customer — vérification d'identité obligatoire sur toutes les plateformes régulées.",
    url: "/methodologie",
    keywords: ["identite", "verification", "amf", "compliance", "passeport"],
  },
  {
    term: "Formulaire 2086",
    definition:
      "Déclaration française des plus-values crypto (annexe à la 2042). Obligatoire pour toute cession.",
    url: "/blog/formulaire-2086-3916-bis-crypto-2026",
    keywords: ["fiscalite", "impots", "declaration", "plus-value", "france", "2086", "3916"],
  },
  {
    term: "3916-bis",
    definition:
      "Déclaration des comptes crypto détenus à l'étranger (Binance, Kraken…). Pénalités lourdes en cas d'oubli.",
    url: "/blog/formulaire-2086-3916-bis-crypto-2026",
    keywords: ["fiscalite", "compte", "etranger", "declaration", "amende"],
  },
  {
    term: "Flat tax",
    definition:
      "PFU 30 % (12,8 % IR + 17,2 % PS) sur les plus-values crypto en France pour les particuliers.",
    url: "/outils/calculateur-fiscalite",
    keywords: ["fiscalite", "impot", "pfu", "30", "plus-value"],
  },
  {
    term: "Halving",
    definition:
      "Division par deux de la récompense des mineurs Bitcoin tous les 4 ans environ.",
    url: "/blog",
    keywords: ["bitcoin", "btc", "minage", "supply", "rarete"],
  },
  {
    term: "Stablecoin",
    definition:
      "Crypto adossée à une monnaie fiat (USDC, USDT, EURC). Sert de cash on-chain.",
    url: "/blog",
    keywords: ["usdc", "usdt", "eurc", "dollar", "euro", "peg"],
  },
];

/* -------------------------------------------------------------------------- */
/*  Outils statiques (pas de data côté serveur)                               */
/* -------------------------------------------------------------------------- */

const TOOLS: Array<{
  id: string;
  title: string;
  url: string;
  snippet: string;
  keywords: string[];
}> = [
  {
    id: "convertisseur",
    title: "Convertisseur crypto",
    url: "/outils/convertisseur",
    snippet: "Conversion temps réel BTC ↔ ETH ↔ EUR/USD avec prix CoinGecko.",
    keywords: ["convert", "convertir", "btc", "eth", "eur", "usd", "prix", "taux"],
  },
  {
    id: "calculateur-fiscalite",
    title: "Calculateur fiscalité crypto FR",
    url: "/outils/calculateur-fiscalite",
    snippet: "Calcule tes plus-values et l'impôt à payer (PFU 30 %).",
    keywords: ["impot", "fiscalite", "pfu", "plus-value", "declaration", "france"],
  },
  {
    id: "simulateur-dca",
    title: "Simulateur DCA",
    url: "/outils/simulateur-dca",
    snippet: "Simule un investissement régulier (DCA) sur plusieurs années.",
    keywords: ["dca", "dollar cost averaging", "strategie", "investissement"],
  },
  {
    id: "verificateur-mica",
    title: "Vérificateur MiCA",
    url: "/outils/verificateur-mica",
    snippet:
      "Vérifie en un clic si une plateforme crypto est conforme MiCA / agréée AMF.",
    keywords: ["mica", "amf", "psan", "regulation", "conformite", "europe"],
  },
];

/* -------------------------------------------------------------------------- */
/*  Builders d'index par section                                              */
/* -------------------------------------------------------------------------- */

function buildArticleItems(
  articles: Awaited<ReturnType<typeof getAllArticleSummaries>>
): SearchItem[] {
  return articles.map((a) => ({
    id: `article:${a.slug}`,
    title: a.title,
    type: "article",
    url: `/blog/${a.slug}`,
    snippet: a.description.slice(0, 160),
    keywords: [a.category, ...a.keywords].filter(Boolean),
  }));
}

function buildPlatformItems(platforms: Platform[]): SearchItem[] {
  return platforms.map((p) => ({
    id: `platform:${p.id}`,
    title: p.name,
    type: "platform",
    url: `/avis/${p.id}`,
    snippet: p.tagline,
    keywords: [
      p.category,
      p.mica.micaCompliant ? "mica" : "non-mica",
      ...p.strengths.slice(0, 3),
      p.idealFor,
    ].filter(Boolean) as string[],
  }));
}

function buildCryptoItems(cryptos: AnyCrypto[]): SearchItem[] {
  return cryptos.map((c) => ({
    id: `crypto:${c.id}`,
    title: `${c.name} (${c.symbol})`,
    type: "crypto",
    url: `/cryptos/${c.id}`,
    snippet: c.tagline,
    keywords: [
      c.symbol,
      c.symbol.toLowerCase(),
      c.category,
      c.kind === "top10" ? "top 10" : "hidden gem",
      ...(c.kind === "hidden-gem" ? ["pepite", "hidden gem"] : []),
    ].filter(Boolean) as string[],
  }));
}

function buildComparatifItems(platforms: Platform[]): SearchItem[] {
  const byId = new Map(platforms.map((p) => [p.id, p.name]));
  // On ne génère un item que si les DEUX plateformes ont une fiche publiée.
  return getPublishableComparisons().map((c) => {
    const aName = byId.get(c.a) ?? c.a;
    const bName = byId.get(c.b) ?? c.b;
    return {
      id: `comparatif:${c.slug}`,
      title: `${aName} vs ${bName}`,
      type: "comparatif" as const,
      url: `/comparatif/${c.slug}`,
      snippet: `Comparatif détaillé : frais, sécurité, conformité MiCA — ${aName} face à ${bName}.`,
      keywords: [c.a, c.b, aName, bName, "comparatif", "duel", "vs"],
    };
  });
}

function buildToolItems(): SearchItem[] {
  return TOOLS.map((t) => ({
    id: `outil:${t.id}`,
    title: t.title,
    type: "outil",
    url: t.url,
    snippet: t.snippet,
    keywords: t.keywords,
  }));
}

function buildGlossaryItems(): SearchItem[] {
  return GLOSSARY.map((g) => ({
    id: `glossary:${g.term.toLowerCase().replace(/\s+/g, "-")}`,
    title: g.term,
    type: "glossary",
    url: g.url,
    snippet: g.definition,
    keywords: [g.term.toLowerCase(), ...g.keywords],
  }));
}

/* -------------------------------------------------------------------------- */
/*  Index public (caché 1h)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Renvoie l'index complet (concaténé, sans dédup — les `id` sont uniques par
 * type:slug). À consommer côté serveur (API route, page /recherche) ou
 * exposé tel quel à un composant client.
 */
export const getSearchIndex = unstable_cache(
  async (): Promise<SearchItem[]> => {
    const [articles, platforms, cryptos] = await Promise.all([
      getAllArticleSummaries(),
      Promise.resolve(getAllPlatforms()),
      Promise.resolve(getAllCryptos()),
    ]);

    return [
      ...buildArticleItems(articles),
      ...buildPlatformItems(platforms),
      ...buildCryptoItems(cryptos),
      ...buildComparatifItems(platforms),
      ...buildToolItems(),
      ...buildGlossaryItems(),
    ];
  },
  ["search:index"],
  { tags: ["search", "articles"], revalidate: 3600 }
);

/* -------------------------------------------------------------------------- */
/*  Recherche fuzzy (substring + ranking)                                     */
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

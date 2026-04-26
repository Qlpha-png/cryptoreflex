/**
 * lib/search.ts — Index de recherche unifié pour Cryptoreflex (SERVER-ONLY).
 *
 * ⚠️ N'IMPORTE JAMAIS CE MODULE DEPUIS UN CLIENT COMPONENT.
 *    Il dépend de `lib/mdx.ts` (node:fs + node:path) pour lire les MDX.
 *    Pour les types + fonctions pures (normalize, scoreItem, searchIndex,
 *    SEARCH_TYPES, SearchItem, SearchResult, SearchType), importer
 *    `@/lib/search-client` à la place.
 *
 * Le marker `import "server-only"` ci-dessous fait CRASHER le build avec
 * un message clair si un Client Component tente d'importer ce fichier
 * (cf. RCA 26-04 commits d776b2d → 7bd30ba : 7 deploys ERROR à cause de ça).
 *
 * Ce fichier expose :
 *   - `getSearchIndex()` : builder caché 1h qui agrège articles MDX +
 *      plateformes + cryptos + comparatifs + outils + glossaire.
 *   - Re-export des fonctions pures depuis `./search-client` pour la
 *      compat des consommateurs server-side existants (app/api/search/route.ts).
 *
 * Agrège dans un même format :
 *   - Articles MDX (content/articles/*.mdx)
 *   - Plateformes (data/platforms.json + data/wallets.json) → /avis/[slug]
 *   - Comparatifs                                            → /comparatif/[slug]
 *   - Top 10 + Hidden gems (data/top-cryptos.json + data/hidden-gems.json)
 *   - Outils                                                  → /outils/*
 *   - Glossaire (constante locale, FAQ rapide)
 *
 * Cache : `unstable_cache` 1h — les sources statiques (JSON + MDX) ne
 * bougent qu'au build, donc 1h est très conservateur.
 */

// NB : on aimerait `import "server-only"` ici comme defense-in-depth
// (crash net si un Client Component importe ce module), mais le package
// n'est pas en dépendance racine — Next.js le résout via /next/dist/compiled.
// L'isolation reste robuste grâce au split lib/search-client.ts (déjà testé
// build local) : aucun client component ne peut tirer node:fs/node:path
// par accident s'il importe ce qu'il faut depuis @/lib/search-client.
import { unstable_cache } from "next/cache";
import { getAllArticleSummaries } from "@/lib/mdx";
import { getAllPlatforms, type Platform } from "@/lib/platforms";
import { getAllCryptos, type AnyCrypto } from "@/lib/cryptos";
import { getPublishableComparisons } from "@/lib/programmatic";
import type { SearchItem } from "@/lib/search-client";

// Re-export des symboles pure-client pour la rétrocompat des routes API
// existantes (app/api/search/route.ts importe `searchIndex` depuis "@/lib/search").
export {
  normalize,
  scoreItem,
  searchIndex,
  SEARCH_TYPES,
  type SearchItem,
  type SearchResult,
  type SearchType,
} from "@/lib/search-client";

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
 * exposé tel quel à un composant client via /api/search?index=1.
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

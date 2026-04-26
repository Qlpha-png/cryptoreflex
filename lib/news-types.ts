/**
 * lib/news-types.ts — Types partagés pour le pilier "News auto" (Pilier 1).
 *
 * Distinction claire :
 *  - `NewsRaw`        — item brut tel que fourni par un flux RSS source
 *                       (CoinTelegraph FR, Decrypt, CryptoSlate, …). Sert
 *                       d'input à `news-rewriter.ts`.
 *  - `NewsArticle`    — article réécrit & publié sur Cryptoreflex sous forme
 *                       MDX (frontmatter + body), équivalent à `Article` de
 *                       `lib/mdx.ts` mais spécifique au flux news.
 *  - `NewsCategory`   — taxonomie restreinte côté news (4 valeurs), distincte
 *                       des catégories du blog (libres) pour permettre des
 *                       filtres URL stables et une UI prévisible.
 *
 * Pourquoi ne pas réutiliser `Article` de lib/mdx.ts ?
 *  - Les news ont un cycle de vie différent : générées en pull, publiées
 *    quotidiennement, durée de vie ~30 jours en SEO frais, puis archives.
 *  - Frontmatter spécifique : `source`, `sourceUrl`, `originalTitle`
 *    (traçabilité éditoriale obligatoire pour la conformité agrégation).
 *  - Catégories closed-set (vs blog open) — facilite le filtrage et le SEO.
 */

/* -------------------------------------------------------------------------- */
/*  Catégories (closed-set)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Taxonomie news Cryptoreflex. 4 entrées seulement — toute valeur hors set
 * doit être normalisée vers `Marche` (catch-all par défaut).
 */
export const NEWS_CATEGORIES = [
  "Marche",        // évolutions de prix, ETF spot, halving, ATH/ATL
  "Regulation",    // MiCA, AMF, ESMA, fiscalité, banques centrales
  "Technologie",   // upgrades L1/L2, EIPs, halvings techniques, Layer 2
  "Plateformes",   // exchanges, wallets, agréments CASP/PSAN, listings
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

/** Libellés affichés (avec accents) — stables pour l'UI et SEO H1/breadcrumb. */
export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  Marche: "Marché",
  Regulation: "Régulation",
  Technologie: "Technologie",
  Plateformes: "Plateformes",
};

/** Slugs URL (kebab-case ASCII) — utilisés dans `?categorie=...`. */
export const NEWS_CATEGORY_SLUGS: Record<NewsCategory, string> = {
  Marche: "marche",
  Regulation: "regulation",
  Technologie: "technologie",
  Plateformes: "plateformes",
};

/** Reverse map slug → category (case-insensitive côté caller). */
export function categoryFromSlug(slug: string | undefined | null): NewsCategory | null {
  if (!slug) return null;
  const norm = slug.toLowerCase().trim();
  for (const cat of NEWS_CATEGORIES) {
    if (NEWS_CATEGORY_SLUGS[cat] === norm) return cat;
  }
  return null;
}

/** Garde-fou typage : true si `value` est une catégorie connue. */
export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === "string" && (NEWS_CATEGORIES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/*  Item brut RSS (input du rewriter)                                         */
/* -------------------------------------------------------------------------- */

/**
 * Item RSS brut. Le rewriter consomme ce shape, il ne dépend pas du parser
 * concret derrière (regex maison ou rss-parser).
 */
export interface NewsRaw {
  /** Titre original du média source (avant réécriture). */
  title: string;
  /** URL canonique de l'article source (cité avec rel=nofollow). */
  link: string;
  /** Description / extrait fourni par le flux RSS (ASCII propre, déjà strippé HTML). */
  description: string;
  /** Date de publication source (ISO 8601). Peut être vide si non parsable. */
  pubDate: string;
  /** Nom affiché du média ("CoinTelegraph FR", "Decrypt"…). */
  source: string;
  /** URL absolue de l'image de cover si fournie par le flux (enclosure / media:content). */
  image?: string;
  /** Liste de mots-clés détectés dans le titre/description (pour le filtre keyword). */
  matchedKeywords?: string[];
  /**
   * Catégorie pré-attribuée par l'aggregator d'après les keywords.
   * Le rewriter peut surcharger après lecture du body.
   */
  category?: NewsCategory;
}

/* -------------------------------------------------------------------------- */
/*  Article réécrit (output du rewriter, persisté en MDX)                     */
/* -------------------------------------------------------------------------- */

/**
 * Frontmatter MDX d'une news Cryptoreflex (sérialisé YAML en tête de fichier).
 * Tous les champs sont obligatoires côté lecture — le rewriter renseigne tout.
 */
export interface NewsFrontmatter {
  title: string;             // titre Cryptoreflex (réécrit)
  description: string;       // meta description SEO (≤ 160 chars)
  date: string;              // ISO "YYYY-MM-DD"
  category: NewsCategory;
  source: string;            // nom du média source
  sourceUrl: string;         // URL article source
  /** Titre original conservé pour traçabilité (jamais affiché tel quel). */
  originalTitle?: string;
  /** URL absolue d'une image (cover OG/Twitter). Optionnelle. */
  image?: string;
  /** Tags/keywords pour le SEO et les liens internes. */
  keywords?: string[];
  /** Auteur — par défaut "Cryptoreflex" pour les news auto. */
  author?: string;
}

/**
 * Article complet (frontmatter + body MDX) tel que rendu par les pages
 * `/actualites` et `/actualites/[slug]`.
 */
export interface NewsArticle extends NewsFrontmatter {
  /** Slug URL (= nom de fichier sans extension). */
  slug: string;
  /** Body MDX brut, à passer à `<MdxContent />`. */
  content: string;
}

/** Variante sans body — pour les listes (cards, sitemap). */
export type NewsSummary = Omit<NewsArticle, "content">;

/* -------------------------------------------------------------------------- */
/*  Output du cron                                                            */
/* -------------------------------------------------------------------------- */

export interface NewsCronReport {
  ok: boolean;
  /** Nombre d'items RSS bruts récupérés. */
  processed: number;
  /** Nombre de fichiers MDX créés sur disque. */
  created: number;
  /** Nombre d'items skippés (slug déjà existant ou hors-keyword). */
  skipped: number;
  /** Nombre d'items en erreur (rewriter throw, fs write fail, etc.). */
  errors: number;
  /** Liste détaillée des erreurs (message + slug si dispo) pour debug logs. */
  errorDetails?: Array<{ slug?: string; message: string }>;
  /** Durée totale du cron en ms. */
  durationMs: number;
  /** ISO timestamp du run. */
  startedAt: string;
}

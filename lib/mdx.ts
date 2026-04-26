/**
 * Pipeline MDX — lecture, parsing & cache des articles de blog Cryptoreflex.
 *
 * Convention :
 * - Les articles vivent dans `content/articles/*.mdx`
 * - Le frontmatter doit a minima contenir `title`, `slug`, `date`.
 * - Champs supportés (cf. Article ci-dessous). Les variantes des autres rédacteurs
 *   (`excerpt` ↔ `description`, `lastUpdated` ↔ `updated`, `tags` ↔ `keywords`)
 *   sont normalisées ici, pour que les pages consommatrices aient un schéma stable.
 *
 * Le parsing est gratuit (gray-matter + fs), mais on cache via `unstable_cache`
 * pour éviter de relire le disque à chaque requête en dev.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unstable_cache } from "next/cache";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  description: string;
  category: string;
  date: string;            // ISO "2026-04-25"
  lastUpdated: string;     // ISO — fallback = date
  readTime: string;        // ex: "8 min"
  author: string;
  keywords: string[];
  /** Tailwind gradient utilities pour la cover (ex: "from-amber-500/40 to-orange-600/40"). */
  gradient: string;
  /** Optionnel : chemin vers une image de cover (`/blog/foo.jpg`). */
  cover?: string;
}

export interface Article extends ArticleFrontmatter {
  /** Contenu MDX brut (string), à passer à `<MdxContent />`. */
  content: string;
}

export interface ArticleSummary extends ArticleFrontmatter {
  // Pas de `content` pour limiter la taille des listes.
}

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

/** Gradient par défaut si l'article n'en spécifie pas. */
const DEFAULT_GRADIENT = "from-amber-500/40 to-orange-600/40";

/** Cycle de gradients pour combler les articles sans cover. */
const FALLBACK_GRADIENTS = [
  "from-amber-500/40 to-orange-600/40",
  "from-cyan-500/40 to-blue-600/40",
  "from-emerald-500/40 to-teal-600/40",
  "from-fuchsia-500/40 to-pink-600/40",
  "from-violet-500/40 to-indigo-600/40",
];

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

/** Estime un temps de lecture à partir d'un texte. ~220 mots/min. */
function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min`;
}

/** Normalise le frontmatter brut (yml) vers notre schéma stable. */
function normalizeFrontmatter(
  raw: Record<string, unknown>,
  fallbackSlug: string,
  rawContent: string,
  index = 0
): ArticleFrontmatter {
  const slug =
    typeof raw.slug === "string" && raw.slug.trim().length > 0
      ? raw.slug.trim()
      : fallbackSlug;

  const date = (raw.date as string) ?? new Date().toISOString().slice(0, 10);
  const lastUpdated =
    (raw.lastUpdated as string) ??
    (raw.updated as string) ??
    (raw.dateModified as string) ??
    date;

  // Description : excerpt > description > première phrase du body
  const description =
    (raw.description as string) ??
    (raw.excerpt as string) ??
    rawContent.replace(/\s+/g, " ").trim().slice(0, 180) + "…";

  // keywords : keywords (string[]) > tags (string[])
  const rawKw = raw.keywords ?? raw.tags;
  const keywords: string[] = Array.isArray(rawKw)
    ? rawKw.map(String)
    : typeof rawKw === "string"
      ? rawKw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const gradient =
    (typeof raw.gradient === "string" && raw.gradient) ||
    FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length] ||
    DEFAULT_GRADIENT;

  return {
    title: String(raw.title ?? slug),
    slug,
    description: String(description),
    category: String(raw.category ?? "Crypto"),
    date,
    lastUpdated,
    readTime: String(raw.readTime ?? estimateReadTime(rawContent)),
    author: String(raw.author ?? "Cryptoreflex"),
    keywords,
    gradient,
    cover: typeof raw.cover === "string" ? raw.cover : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*  Lecture FS (sources non cachées)                                          */
/* -------------------------------------------------------------------------- */

async function readArticlesFromDisk(): Promise<Article[]> {
  let files: string[];
  try {
    files = await fs.readdir(ARTICLES_DIR);
  } catch {
    return [];
  }

  const mdxFiles = files.filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const articles = await Promise.all(
    mdxFiles.map(async (file, idx) => {
      const fullPath = path.join(ARTICLES_DIR, file);
      const raw = await fs.readFile(fullPath, "utf8");
      const { data, content } = matter(raw);
      const fallbackSlug = file.replace(/\.mdx?$/, "");
      const fm = normalizeFrontmatter(
        data as Record<string, unknown>,
        fallbackSlug,
        content,
        idx
      );
      return { ...fm, content };
    })
  );

  // Tri par date desc (puis par lastUpdated en fallback)
  return articles.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return db - da;
  });
}

/* -------------------------------------------------------------------------- */
/*  API publique cachée                                                        */
/* -------------------------------------------------------------------------- */

/**
 * TTL revalidate des caches MDX.
 *
 * Pourquoi 60s vs 3600s d'avant :
 *  Bug observé 26-04 : si Googlebot ou un visiteur hit /blog/<slug> AVANT
 *  qu'un nouvel article ne soit déployé, `getArticleBySlug` cache un `null`
 *  pendant 1h. Après deploy, la page renvoie encore "Article introuvable"
 *  jusqu'à expiration TTL.
 *
 *  Avec 60s, fenêtre de bug réduite de 1h → 1 min. Trade-off perf : 60×
 *  plus de lectures FS, mais le coût est négligeable (les fichiers MDX font
 *  10-30 KB chacun, lecture <5ms, et Vercel Data Cache deduplicate les
 *  appels concurrents).
 *
 *  Le cache reste tagué "articles" pour permettre un bust manuel via
 *  POST /api/revalidate?tag=articles + revalidatePath ciblé.
 */
const ARTICLES_CACHE_TTL_SEC = 60;

/** Retourne tous les articles (avec leur contenu MDX), triés par date desc. */
export const getAllArticles = unstable_cache(
  async (): Promise<Article[]> => {
    return readArticlesFromDisk();
  },
  ["mdx:all-articles"],
  { tags: ["articles"], revalidate: ARTICLES_CACHE_TTL_SEC }
);

/**
 * Variante sans le contenu — utile pour les listes (blog index, sitemap)
 * pour éviter de transporter inutilement les ~30 KB de chaque article.
 */
export const getAllArticleSummaries = unstable_cache(
  async (): Promise<ArticleSummary[]> => {
    const all = await readArticlesFromDisk();
    return all.map(({ content: _content, ...rest }) => rest);
  },
  ["mdx:all-summaries"],
  { tags: ["articles"], revalidate: ARTICLES_CACHE_TTL_SEC }
);

/** Retourne un article par slug, ou `null` si introuvable. */
export const getArticleBySlug = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    const all = await readArticlesFromDisk();
    return all.find((a) => a.slug === slug) ?? null;
  },
  ["mdx:article-by-slug"],
  { tags: ["articles"], revalidate: ARTICLES_CACHE_TTL_SEC }
);

/** Retourne uniquement les slugs (pour generateStaticParams). */
export const getArticleSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const all = await readArticlesFromDisk();
    return all.map((a) => a.slug);
  },
  ["mdx:article-slugs"],
  { tags: ["articles"], revalidate: ARTICLES_CACHE_TTL_SEC }
);

/** Toutes les catégories distinctes, triées alphabétiquement. */
export const getAllCategories = unstable_cache(
  async (): Promise<string[]> => {
    const all = await readArticlesFromDisk();
    const set = new Set(all.map((a) => a.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  },
  ["mdx:all-categories"],
  { tags: ["articles"], revalidate: 3600 }
);

/**
 * Articles similaires : même catégorie en priorité, puis chevauchement de
 * keywords. Renvoie au max `limit` articles, sans inclure `excludeSlug`.
 */
export async function getRelatedArticles(
  excludeSlug: string,
  limit = 3
): Promise<ArticleSummary[]> {
  const all = await getAllArticleSummaries();
  const me = all.find((a) => a.slug === excludeSlug);
  if (!me) return all.slice(0, limit);

  const scored = all
    .filter((a) => a.slug !== excludeSlug)
    .map((a) => {
      let score = 0;
      if (a.category === me.category) score += 10;
      const overlap = a.keywords.filter((k) =>
        me.keywords.some((mk) => mk.toLowerCase() === k.toLowerCase())
      ).length;
      score += overlap * 2;
      return { a, score };
    })
    .sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score;
      return new Date(y.a.date).getTime() - new Date(x.a.date).getTime();
    });

  return scored.slice(0, limit).map((s) => s.a);
}

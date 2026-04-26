/**
 * lib/news-mdx.ts — Pipeline MDX dédié aux NEWS (`content/news/*.mdx`).
 *
 * Distinct de `lib/mdx.ts` (articles de blog) parce que :
 *  - Schéma frontmatter différent (cf. `NewsFrontmatter` dans news-types.ts)
 *  - TTL cache plus court (60s) — les news sont très volatiles
 *  - Catégories closed-set (Marche/Regulation/Technologie/Plateformes)
 *
 * Les pages `/actualites` et `/actualites/[slug]` consomment exclusivement
 * cette API. La route cron `/api/cron/aggregate-news` ÉCRIT dans le même
 * dossier mais ne lit jamais le cache (lecture FS directe via `fs.access`
 * pour le check d'idempotence).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unstable_cache } from "next/cache";
import {
  type NewsArticle,
  type NewsSummary,
  type NewsCategory,
  isNewsCategory,
} from "@/lib/news-types";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

/** Dossier source des news MDX. Créé à la volée si absent par le cron. */
export const NEWS_DIR = path.join(process.cwd(), "content", "news");

/** Tag de cache `unstable_cache` — invalidable depuis l'API revalidate. */
export const NEWS_MDX_TAG = "news-mdx" as const;

/**
 * TTL court : les news sont volatiles (création quotidienne via cron).
 * Le cron lui-même appelle `revalidateTag(NEWS_MDX_TAG)` pour forcer un
 * refresh immédiat post-écriture (cf. route cron).
 */
const CACHE_TTL_SEC = 60;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Normalise un frontmatter brut (yml) vers `NewsArticle`.
 * Les champs absents reçoivent un fallback raisonnable, jamais undefined.
 */
function normalizeNewsFrontmatter(
  raw: Record<string, unknown>,
  fallbackSlug: string,
  rawContent: string
): Omit<NewsArticle, "content"> {
  const slug =
    typeof raw.slug === "string" && raw.slug.trim().length > 0
      ? String(raw.slug).trim()
      : fallbackSlug;

  const date = String(raw.date ?? new Date().toISOString().slice(0, 10));

  const description = String(
    raw.description ??
      raw.excerpt ??
      rawContent.replace(/\s+/g, " ").trim().slice(0, 160) + "…"
  );

  const rawCategory = String(raw.category ?? "Marche");
  const category: NewsCategory = isNewsCategory(rawCategory) ? rawCategory : "Marche";

  const keywords: string[] = Array.isArray(raw.keywords)
    ? raw.keywords.map(String)
    : typeof raw.keywords === "string"
      ? String(raw.keywords).split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  return {
    slug,
    title: String(raw.title ?? slug),
    description,
    date,
    category,
    source: String(raw.source ?? "Inconnu"),
    sourceUrl: String(raw.sourceUrl ?? "#"),
    originalTitle: typeof raw.originalTitle === "string" ? raw.originalTitle : undefined,
    image: typeof raw.image === "string" ? raw.image : undefined,
    keywords,
    author: String(raw.author ?? "Cryptoreflex"),
  };
}

/* -------------------------------------------------------------------------- */
/*  Lecture FS (non cachée)                                                   */
/* -------------------------------------------------------------------------- */

async function readNewsFromDisk(): Promise<NewsArticle[]> {
  let files: string[];
  try {
    files = await fs.readdir(NEWS_DIR);
  } catch {
    // Le dossier n'existe pas encore (avant le 1er run du cron) — comportement OK.
    return [];
  }

  const mdxFiles = files.filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const articles = await Promise.all(
    mdxFiles.map(async (file) => {
      const fullPath = path.join(NEWS_DIR, file);
      const raw = await fs.readFile(fullPath, "utf8");
      const { data, content } = matter(raw);
      const fallbackSlug = file.replace(/\.mdx?$/, "");
      const fm = normalizeNewsFrontmatter(
        data as Record<string, unknown>,
        fallbackSlug,
        content
      );
      return { ...fm, content };
    })
  );

  // Tri par date desc — pour les listes type /actualites
  return articles.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return db - da;
  });
}

/* -------------------------------------------------------------------------- */
/*  API publique cachée                                                       */
/* -------------------------------------------------------------------------- */

/** Toutes les news avec leur body, triées par date desc. */
export const getAllNews = unstable_cache(
  async (): Promise<NewsArticle[]> => readNewsFromDisk(),
  ["news-mdx:all"],
  { tags: [NEWS_MDX_TAG], revalidate: CACHE_TTL_SEC }
);

/** Toutes les news en mode summary (sans body) — pour les listes. */
export const getAllNewsSummaries = unstable_cache(
  async (): Promise<NewsSummary[]> => {
    const all = await readNewsFromDisk();
    return all.map(({ content: _content, ...rest }) => rest);
  },
  ["news-mdx:summaries"],
  { tags: [NEWS_MDX_TAG], revalidate: CACHE_TTL_SEC }
);

/** Une news par slug, ou null si introuvable. */
export const getNewsBySlug = unstable_cache(
  async (slug: string): Promise<NewsArticle | null> => {
    const all = await readNewsFromDisk();
    return all.find((a) => a.slug === slug) ?? null;
  },
  ["news-mdx:by-slug"],
  { tags: [NEWS_MDX_TAG], revalidate: CACHE_TTL_SEC }
);

/** Liste des slugs (pour generateStaticParams). */
export const getNewsSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const all = await readNewsFromDisk();
    return all.map((a) => a.slug);
  },
  ["news-mdx:slugs"],
  { tags: [NEWS_MDX_TAG], revalidate: CACHE_TTL_SEC }
);

/**
 * News liées : 3 articles de la même catégorie, triés par date desc,
 * en excluant l'article courant. Fallback : 3 plus récents toutes catégories.
 */
export async function getRelatedNews(
  excludeSlug: string,
  limit = 3
): Promise<NewsSummary[]> {
  const all = await getAllNewsSummaries();
  const me = all.find((a) => a.slug === excludeSlug);
  const sameCat = all.filter(
    (a) => a.slug !== excludeSlug && (me ? a.category === me.category : true)
  );
  if (sameCat.length >= limit) return sameCat.slice(0, limit);

  // Compléter avec d'autres catégories si pas assez d'articles dans la cat.
  const others = all.filter(
    (a) => a.slug !== excludeSlug && !sameCat.some((c) => c.slug === a.slug)
  );
  return [...sameCat, ...others].slice(0, limit);
}

/** Compte par catégorie (pour les badges des filtres UI). */
export async function getNewsCountsByCategory(): Promise<Record<NewsCategory, number>> {
  const all = await getAllNewsSummaries();
  const counts: Record<NewsCategory, number> = {
    Marche: 0,
    Regulation: 0,
    Technologie: 0,
    Plateformes: 0,
  };
  for (const n of all) counts[n.category]++;
  return counts;
}

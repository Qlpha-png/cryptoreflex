/**
 * lib/ta-mdx.ts — Pipeline de lecture des analyses techniques MDX.
 *
 * Pendant léger de `lib/mdx.ts` mais dédié à `content/analyses-tech/*.mdx`.
 * Schéma du frontmatter spécifique aux analyses techniques (voir TAFrontmatter).
 *
 * Cache : unstable_cache 60s avec tag "ta-articles" pour permettre un bust
 * manuel via revalidateTag("ta-articles") (utilisé par le cron après écriture).
 *
 * FIX PROD 2026-10-02 — erreurs 500 « EMFILE: too many open files » sur
 * /analyses-techniques. Cause : chaque getter caché relisait les ~340 fichiers
 * en parallèle (Promise.all), plusieurs fois par requête / par page générée.
 * Désormais :
 *  - UNE lecture disque partagée par process (promesse mémoïsée au niveau du
 *    module) : en production le dossier content/ est figé au déploiement
 *    (filesystem Lambda en lecture seule) → lu une seule fois ; en dev, relue
 *    après TA_CACHE_TTL secondes (le cron local peut écrire de nouveaux MDX) ;
 *  - concurrence bornée à 16 fichiers ouverts (lib/ta-mdx-reader.ts) ;
 *  - getTAArticleBySlug lit le seul fichier <slug>.mdx tant que la liste
 *    complète n'est pas déjà en mémoire.
 * API publique et tags unstable_cache inchangés.
 */

import path from "node:path";
import { unstable_cache } from "next/cache";
import {
  readAllTAFromDir,
  readTAFileBySlug,
  type TAArticleFull,
  type TAArticleSummary,
} from "./ta-mdx-reader";

export type { TAArticleFull, TAArticleSummary } from "./ta-mdx-reader";

/* -------------------------------------------------------------------------- */
/*  FS layer (mémoïsée au niveau du process)                                  */
/* -------------------------------------------------------------------------- */

const TA_DIR = path.join(process.cwd(), "content", "analyses-tech");

const TA_CACHE_TTL = 60;

let diskPromise: Promise<TAArticleFull[]> | null = null;
let diskLoadedAt = 0;

function diskCacheFresh(): boolean {
  if (!diskPromise) return false;
  if (process.env.NODE_ENV === "production") return true;
  return Date.now() - diskLoadedAt < TA_CACHE_TTL * 1000;
}

/** Toutes les analyses (tri date DESC), lues au plus une fois par process en prod. */
function readAllFromDisk(): Promise<TAArticleFull[]> {
  if (diskCacheFresh()) return diskPromise as Promise<TAArticleFull[]>;
  diskLoadedAt = Date.now();
  const p = readAllTAFromDir(TA_DIR);
  diskPromise = p;
  // Un échec (ex. EMFILE transitoire) n'est pas mémoïsé : prochain appel = relecture.
  p.catch(() => {
    if (diskPromise === p) diskPromise = null;
  });
  return p;
}

/* -------------------------------------------------------------------------- */
/*  API publique cachée                                                       */
/* -------------------------------------------------------------------------- */

export const getAllTAArticles = unstable_cache(
  async (): Promise<TAArticleFull[]> => readAllFromDisk(),
  ["ta:all"],
  { tags: ["ta-articles"], revalidate: TA_CACHE_TTL },
);

export const getAllTASummaries = unstable_cache(
  async (): Promise<TAArticleSummary[]> => {
    const all = await readAllFromDisk();
    return all.map(({ content: _c, ...rest }) => rest);
  },
  ["ta:summaries"],
  { tags: ["ta-articles"], revalidate: TA_CACHE_TTL },
);

export const getTAArticleBySlug = unstable_cache(
  async (slug: string): Promise<TAArticleFull | null> => {
    // Liste déjà en mémoire → aucun accès disque.
    if (diskCacheFresh()) {
      const all = await readAllFromDisk();
      return all.find((a) => a.slug === slug) ?? null;
    }
    // Sinon : un seul fichier (cas nominal : nom de fichier = slug).
    const direct = await readTAFileBySlug(TA_DIR, slug);
    if (direct) return direct;
    // Slug déclaré dans le frontmatter ≠ nom de fichier, ou slug inconnu.
    const all = await readAllFromDisk();
    return all.find((a) => a.slug === slug) ?? null;
  },
  ["ta:by-slug"],
  { tags: ["ta-articles"], revalidate: TA_CACHE_TTL },
);

export const getTASlugs = unstable_cache(
  async (): Promise<string[]> => {
    const all = await readAllFromDisk();
    return all.map((a) => a.slug);
  },
  ["ta:slugs"],
  { tags: ["ta-articles"], revalidate: TA_CACHE_TTL },
);

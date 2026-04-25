/**
 * Loader pour data/comparisons.json — 12 comparatifs binaires prioritaires.
 *
 * Source unique pour :
 *   - app/comparatif/[slug]/page.tsx  (generateStaticParams)
 *   - app/comparatif/page.tsx          (mini hub)
 *   - app/sitemap.ts                   (URLs)
 *
 * On valide à la lecture que les 2 ids référencés existent (platforms.json
 * ou wallets.json). Les comparatifs orphelins sont filtrés silencieusement.
 */

import comparisonsData from "@/data/comparisons.json";
import { getAllPlatforms, getPlatformById, type Platform } from "@/lib/platforms";

export type ComparisonIntent = "debutant" | "avance";

export interface ComparisonEntry {
  slug: string;
  platforme1_id: string;
  platforme2_id: string;
  intent: ComparisonIntent;
  volume_estime: number;
  kw_principal: string;
  criteres_focus: string[];
}

interface ComparisonsFile {
  _meta: { lastUpdated: string; source: string; schemaVersion: string; note?: string };
  comparisons: ComparisonEntry[];
}

const data = comparisonsData as unknown as ComparisonsFile;

/** Liste brute (12 entrées) telle que dans le JSON. */
export function getAllComparisons(): ComparisonEntry[] {
  return data.comparisons;
}

/**
 * Comparatifs où LES DEUX plateformes existent dans platforms.json/wallets.json.
 *
 * ⚠️ NE PAS confondre avec `getPublishableComparisons()` de `lib/programmatic.ts`.
 * Celui-ci retourne des `ComparisonEntry` issus de `data/comparisons.json` (12 duels
 * éditoriaux avec contenu rédactionnel via `lib/comparison-content.ts`).
 * L'autre retourne des `ComparisonSpec` issus de `lib/programmatic.ts` (40 duels
 * data-driven utilisés pour le sitemap et `app/comparatif/[slug]`).
 *
 * Source unique pour le sitemap et la page /comparatif/[slug] : `lib/programmatic.ts`.
 * Cette fonction n'est conservée que pour d'éventuels usages éditoriaux (ex: hub
 * `app/comparatif/page.tsx` qui voudrait n'afficher que les 12 duels rédigés).
 */
export function getPublishableComparisonEntries(): ComparisonEntry[] {
  const ids = new Set(getAllPlatforms().map((p) => p.id));
  return data.comparisons.filter(
    (c) => ids.has(c.platforme1_id) && ids.has(c.platforme2_id)
  );
}

export function getComparisonBySlug(slug: string): ComparisonEntry | undefined {
  return data.comparisons.find((c) => c.slug === slug);
}

export interface ResolvedComparison {
  entry: ComparisonEntry;
  a: Platform;
  b: Platform;
}

/** Charge la comparaison ET les deux plateformes. Renvoie null si un id manque. */
export function resolveComparison(slug: string): ResolvedComparison | null {
  const entry = getComparisonBySlug(slug);
  if (!entry) return null;
  const a = getPlatformById(entry.platforme1_id);
  const b = getPlatformById(entry.platforme2_id);
  if (!a || !b) return null;
  return { entry, a, b };
}

export const comparisonsMeta = data._meta;

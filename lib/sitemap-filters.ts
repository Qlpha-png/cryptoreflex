/**
 * lib/sitemap-filters.ts — règles d'exclusion du sitemap (logique pure, testée
 * dans tests/lib/sitemap-filters.test.ts).
 *
 * Principe : le sitemap ne liste QUE des URLs canoniques, indexables, en 200.
 * Audit SEO 2026-10-02 — étaient soumises à tort :
 *  - 120 /academie/<parcours>/<slug> (canonical → /blog/<slug>) ;
 *  - 100 /cryptos/<id>/acheter-en-france des fiches éditoriales
 *    (canonical → /acheter/<id>/fr) ;
 *  - /cryptos/<coingeckoId> des fiches éditoriales (redirigées en 308) ;
 *  - /lp/cerfa-2026 (noindex) ; /lp/mica-2026 redirigée (308) le 03/10/2026 ;
 *  - /pro, /pro-plus, /cgv-abonnement (pages de transition « tout est gratuit »,
 *    noindex depuis la démonétisation de juin 2026) ;
 *  - /alternative-a/ledger, /alternative-a/trezor (404 : wallets exclus de la route).
 */

import { getAllCryptos } from "@/lib/cryptos";
import { EDITORIAL_CG_TO_ID } from "@/lib/crypto-page-slug";
import { SLUG_ALIASES } from "@/lib/crypto-slug-aliases";

/** Chemins exacts jamais soumis (noindex / transition). */
export const SITEMAP_EXCLUDED_PATHS: ReadonlySet<string> = new Set([
  "/lp/cerfa-2026",
  "/pro",
  "/pro-plus",
  "/cgv-abonnement",
]);

export interface SitemapFilterContext {
  /** Ids des fiches éditoriales (data/top-cryptos.json + data/hidden-gems.json). */
  editorialIds: ReadonlySet<string>;
  /**
   * Slugs /cryptos/<slug> qui redirigent (coingeckoId ≠ id des fiches
   * éditoriales, alias d'URL) : jamais canoniques.
   */
  cryptoRedirectSlugs: ReadonlySet<string>;
}

/** Contexte réel (data éditoriale + redirections /cryptos). */
export function buildSitemapFilterContext(): SitemapFilterContext {
  return {
    editorialIds: new Set(getAllCryptos().map((c) => c.id)),
    cryptoRedirectSlugs: new Set([
      ...Object.keys(EDITORIAL_CG_TO_ID),
      ...Object.keys(SLUG_ALIASES),
    ]),
  };
}

/** true si le chemin (sans domaine) ne doit PAS figurer au sitemap. */
export function shouldExcludeFromSitemap(path: string, ctx: SitemapFilterContext): boolean {
  const p = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (SITEMAP_EXCLUDED_PATHS.has(p)) return true;

  const seg = p.split("/").filter(Boolean);

  // /academie/<parcours>/<leçon> : même MDX que /blog/<slug>, canonical vers le blog.
  if (seg[0] === "academie" && seg.length === 3) return true;

  if (seg[0] === "cryptos" && seg.length >= 2) {
    // /cryptos/<coingeckoId|alias>[/…] → 308 vers l'id éditorial.
    if (ctx.cryptoRedirectSlugs.has(seg[1])) return true;
    // /cryptos/<id éditorial>/acheter-en-france → canonical /acheter/<id>/fr.
    if (seg.length === 3 && seg[2] === "acheter-en-france" && ctx.editorialIds.has(seg[1])) return true;
  }

  return false;
}

/** Chemin d'une URL absolue ou relative. */
export function sitemapPathOf(url: string): string {
  try {
    return new URL(url, "https://placeholder.invalid").pathname;
  } catch {
    return url;
  }
}

/**
 * Filtre + déduplique (première occurrence conservée) une liste d'entrées
 * sitemap. Générique : marche pour MetadataRoute.Sitemap comme pour les
 * entrées XML maison (sitemap-articles.xml).
 */
export function filterSitemapEntries<T>(
  entries: readonly T[],
  getUrl: (e: T) => string,
  ctx: SitemapFilterContext,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const e of entries) {
    const url = getUrl(e);
    if (seen.has(url)) continue;
    if (shouldExcludeFromSitemap(sitemapPathOf(url), ctx)) continue;
    seen.add(url);
    out.push(e);
  }
  return out;
}

/** Date ISO (YYYY-MM-DD ou ISO complet) → Date, ou undefined si invalide/absente. */
export function toLastModified(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : undefined;
}

/** Date la plus récente d'une liste (ignore les valeurs invalides). */
export function latestDate(values: ReadonlyArray<string | null | undefined>): Date | undefined {
  let best: Date | undefined;
  for (const v of values) {
    const d = toLastModified(v);
    if (d && (!best || d > best)) best = d;
  }
  return best;
}

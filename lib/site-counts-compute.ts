/**
 * lib/site-counts-compute.ts — calcule les vrais chiffres du site (Kev, 04/10/2026 : « que les chiffres soient
 * automatisés et contrôlés »). Résultat écrit dans data/site-counts.json, lu partout via STATS (lib/brand.ts).
 *
 * Sources (aucun nombre écrit à la main) :
 *  - plateformes disponibles en France / auditées : lib/platforms.ts (registres officiels, isAvailableFr) ;
 *  - fiches crypto éditoriales : lib/cryptos.ts ; fiches publiées au total : plan du site en ligne
 *    (/cryptos/<slug>), les fiches exploratoires vivant en base ;
 *  - outils publiés : lib/tools-catalog.ts (hors « à venir ») ;
 *  - cartes Reflex : data/reflex-cards-univers.json (meta.total) ;
 *  - actus et guides : fichiers de content/.
 *
 * Mise à jour : `node scripts/update-site-counts.mjs` (chaque nuit par la sentinelle) ; contrôle permanent :
 * tests/lib/site-counts.test.ts (le fichier doit correspondre aux données du dépôt).
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { getAvailablePlatformCount, getExchangePlatforms } from "@/lib/platforms";
import { getAllCryptos } from "@/lib/cryptos";
import { PUBLISHED_TOOLS } from "@/lib/tools-catalog";
import universe from "@/data/reflex-cards-univers.json";

export interface SiteCounts {
  platforms: number;
  platformsAudited: number;
  cryptosCurated: number;
  llmFiches: number;
  cryptos: number;
  vsPairs: number;
  tools: number;
  cards: number;
  news: number;
  articles: number;
}

const countFiles = (dir: string) =>
  readdirSync(path.join(process.cwd(), dir)).filter((f) => /\.mdx?$/.test(f)).length;

/**
 * Fiches exploratoires publiées, comptées EN BASE avec exactement les filtres de la page /cryptos
 * (lib/cryptos-extended.ts : hors doublons des fiches éditoriales et des anciens identifiants qui redirigent).
 * Source préférée (le plan du site en ligne peut dater de quelques heures) ; null si la base est inaccessible.
 */
export async function countLlmFichesFromDb(): Promise<number | null> {
  try {
    const { getAllPublishedLlmCryptosLight } = await import("@/lib/cryptos-db");
    const { SLUG_ALIASES } = await import("@/lib/crypto-slug-aliases");
    const llm = await getAllPublishedLlmCryptosLight(5000);
    if (!llm.length) return null;
    const statics = getAllCryptos();
    const staticIds = new Set([...statics.map((c) => c.coingeckoId), ...statics.map((c) => c.id)]);
    return new Set(llm.map((f) => f.coingecko_id).filter((id) => !staticIds.has(id) && !(id in SLUG_ALIASES))).size;
  } catch {
    return null;
  }
}

/** Nombre de fiches /cryptos/<slug> du plan du site en ligne (secours), ou null si indisponible ou tronqué. */
export async function fetchPublishedFiches(): Promise<number | null> {
  try {
    const res = await fetch("https://www.cryptoreflex.fr/sitemap.xml", {
      headers: { "user-agent": "cryptoreflex-site-counts" },
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const slugs = new Set(
      [...xml.matchAll(/<loc>https:\/\/www\.cryptoreflex\.fr\/cryptos\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]),
    );
    return slugs.size >= 50 ? slugs.size : null;
  } catch {
    return null;
  }
}

/** Chiffres calculés depuis le dépôt ; `llmFiches` vient du plan du site (ou de la valeur précédente). */
export function computeSiteCounts(llmFiches: number): SiteCounts {
  const cryptosCurated = getAllCryptos().length;
  return {
    platforms: getAvailablePlatformCount(),
    platformsAudited: getExchangePlatforms().length,
    cryptosCurated,
    llmFiches,
    cryptos: cryptosCurated + llmFiches,
    vsPairs: (cryptosCurated * (cryptosCurated - 1)) / 2,
    tools: PUBLISHED_TOOLS.length,
    cards: Number((universe as { meta: { total: number } }).meta.total),
    news: countFiles("content/news"),
    articles: countFiles("content/articles"),
  };
}

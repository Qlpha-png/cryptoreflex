/**
 * lib/ta-redirect.ts — redirection des anciennes analyses techniques datées (middleware Edge, lot L2, 08/10/2026).
 *
 * R1 : /analyses-techniques/AAAA-MM-JJ-(btc|eth|sol|xrp|ada)-analyse-technique → /analyses-techniques/<crypto>
 *      (301, SANS ancre : la page n'affiche que les 30 derniers calculs). Règle par MOTIF, sans lecture de données :
 *      l'ancienne garde « liste en ligne ≥ 20 » (lib/gone-content.ts) aurait coupé toute redirection une fois les 368
 *      fichiers supprimés (défaut D1 de la spécification).
 * Conservation : une analyse datée d'une AUTRE crypto (hbar, near… supprimées en mai 2026, déjà redirigées vers le hub
 *      depuis le 04/10/2026, relevées en 404 dans la Search Console) garde sa redirection vers le hub, en 301.
 * Tout le reste (slug inventé) : pas de redirection → 404 de la page (dynamicParams = false), règle R2.
 */

export const TA_SYMBOL_TO_SLUG: Readonly<Record<string, string>> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  xrp: "xrp",
  ada: "cardano",
};

/** Les 5 pages vivantes (identiques aux fiches /cryptos/<slug>). */
export const TA_PAGE_SLUGS: readonly string[] = Object.values(TA_SYMBOL_TO_SLUG);

const DATED =/^\/analyses-techniques\/(\d{4})-(\d{2})-(\d{2})-([a-z0-9]+)-analyse-technique\/?$/;

/** Chemin cible (sans ancre) d'une ancienne adresse d'analyse datée, ou null. */
export function taRedirectTarget(pathname: string): string | null {
  const m = DATED.exec(pathname);
  if (!m) return null;
  const [, y, mo, d, sym] = m;
  const t = Date.UTC(+y, +mo - 1, +d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +mo - 1 || dt.getUTCDate() !== +d) return null; // date impossible
  const slug = TA_SYMBOL_TO_SLUG[sym];
  return slug ? `/analyses-techniques/${slug}` : "/analyses-techniques";
}

/** En-tête de cache des 301 du middleware (spécification § 2.1, point 8). */
export const TA_REDIRECT_CACHE = "public, max-age=86400";

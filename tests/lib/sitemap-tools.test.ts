import { describe, expect, it } from "vitest";
import { TOOLS, PUBLISHED_TOOLS } from "@/lib/tools-catalog";
import { buildSitemapFilterContext, shouldExcludeFromSitemap } from "@/lib/sitemap-filters";

/**
 * Sentinelle 05/10/2026 : 9 pages d'outils en noindex (« à venir », rendements stablecoins) étaient soumises dans le
 * plan du site. Règle : un outil « à venir » du catalogue n'est jamais soumis ; un outil publié l'est.
 */
describe("outils et plan du site", () => {
  const ctx = buildSitemapFilterContext();
  it("chaque outil « à venir » est exclu du plan du site", () => {
    for (const t of TOOLS.filter((x) => x.status === "soon")) expect(shouldExcludeFromSitemap(t.href, ctx), t.href).toBe(true);
  });
  it("les outils publiés ne sont pas exclus", () => {
    for (const t of PUBLISHED_TOOLS.filter((x) => x.href.startsWith("/outils/"))) expect(shouldExcludeFromSitemap(t.href, ctx), t.href).toBe(false);
  });
  it("la page des rendements stablecoins (noindex jusqu'à sa refonte) est exclue", () => {
    expect(shouldExcludeFromSitemap("/outils/yield-stablecoins", ctx)).toBe(true);
  });
});

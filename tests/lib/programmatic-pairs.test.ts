/**
 * /vs — paires « pertinentes » (lot 2b, 04/10/2026) : les 4 950 paires restent servies, mais seules les paires pertinentes
 * sont poussées (sitemap, liens croisés) : une tête de marché (top 10) contre n'importe qui, ou deux cryptos du top 40.
 */
import { describe, it, expect } from "vitest";
import { getCryptoPairs, getComparerPairRoutes, isMeaningfulPair, isCanonicalPair, TOP_100_CRYPTO_IDS } from "@/lib/programmatic-pages";

describe("/vs — paires pertinentes", () => {
  const ids = TOP_100_CRYPTO_IDS;
  it("une tête de marché (top 10) contre n'importe quelle crypto du catalogue est pertinente", () => {
    const top = ids[0], last = ids[ids.length - 1];
    const [a, b] = [top, last].sort();
    expect(isMeaningfulPair(a, b)).toBe(true);
  });
  it("deux cryptos du top 40 : pertinente ; deux cryptos de la longue traîne : non", () => {
    const [a, b] = [ids[15], ids[30]].sort();
    expect(isMeaningfulPair(a, b)).toBe(true);
    const [c, d] = [ids[60], ids[90]].sort();
    expect(isMeaningfulPair(c, d)).toBe(false);
    expect(isCanonicalPair(c, d)).toBe(true); // toujours servie
  });
  it("inconnue ou non canonique : jamais pertinente", () => {
    expect(isMeaningfulPair("zzz", ids[0])).toBe(false);
    expect(isMeaningfulPair(ids[1], ids[0])).toBe(isCanonicalPair(ids[1], ids[0]) ? true : false);
  });
  it("le sitemap ne pousse que les paires pertinentes : entre 1 000 et 1 600, toutes canoniques, sans doublon", () => {
    const routes = getComparerPairRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(1000);
    expect(routes.length).toBeLessThanOrEqual(1600);
    expect(routes.length).toBeLessThan(getCryptoPairs().length);
    const seen = new Set<string>();
    for (const r of routes) {
      const m = r.path.match(/^\/vs\/([^/]+)\/([^/]+)$/);
      expect(m).not.toBeNull();
      expect(isCanonicalPair(m![1], m![2])).toBe(true);
      expect(isMeaningfulPair(m![1], m![2])).toBe(true);
      expect(seen.has(r.path)).toBe(false);
      seen.add(r.path);
    }
  });
});

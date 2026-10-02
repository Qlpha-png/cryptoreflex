import { describe, expect, it } from "vitest";
import {
  buildSitemapFilterContext,
  filterSitemapEntries,
  latestDate,
  shouldExcludeFromSitemap,
  sitemapPathOf,
  toLastModified,
} from "@/lib/sitemap-filters";

const ctx = buildSitemapFilterContext();
const SITE = "https://www.cryptoreflex.fr";

describe("shouldExcludeFromSitemap", () => {
  it.each([
    "/lp/cerfa-2026",
    "/lp/mica-2026",
    "/pro",
    "/pro-plus",
    "/cgv-abonnement",
    "/academie/debutant/qu-est-ce-que-bitcoin",
    "/cryptos/xrp/acheter-en-france",
    "/cryptos/bitcoin/acheter-en-france",
    "/cryptos/ripple",
    "/cryptos/binancecoin",
    "/cryptos/near",
    "/cryptos/onyxcoin",
    "/cryptos/immutable-x/acheter-en-france",
  ])("exclut %s", (p) => {
    expect(shouldExcludeFromSitemap(p, ctx)).toBe(true);
  });

  it.each([
    "/",
    "/academie",
    "/academie/debutant",
    "/cryptos/xrp",
    "/cryptos/bitcoin",
    "/cryptos/chain-2",
    // Crypto sans fiche éditoriale : le guide /acheter-en-france reste self-canonical.
    "/cryptos/vechain/acheter-en-france",
    "/acheter/xrp/fr",
    "/blog/qu-est-ce-que-bitcoin",
    "/historique-prix/xrp/2025",
    "/proactif",
  ])("garde %s", (p) => {
    expect(shouldExcludeFromSitemap(p, ctx)).toBe(false);
  });

  it("tolère un slash final", () => {
    expect(shouldExcludeFromSitemap("/pro/", ctx)).toBe(true);
  });
});

describe("filterSitemapEntries", () => {
  it("filtre et dédoublonne (première occurrence gagnante)", () => {
    const entries = [
      { url: `${SITE}/cryptos/bitcoin`, p: 1 },
      { url: `${SITE}/cryptos/ripple`, p: 2 },
      { url: `${SITE}/cryptos/bitcoin`, p: 3 },
      { url: `${SITE}/academie/debutant/x`, p: 4 },
      { url: `${SITE}/blog/x`, p: 5 },
    ];
    const out = filterSitemapEntries(entries, (e) => e.url, ctx);
    expect(out.map((e) => e.p)).toEqual([1, 5]);
  });

  it("sitemapPathOf extrait le chemin d'une URL absolue", () => {
    expect(sitemapPathOf(`${SITE}/cryptos/xrp?x=1`)).toBe("/cryptos/xrp");
    expect(sitemapPathOf("/blog")).toBe("/blog");
  });
});

describe("dates lastmod", () => {
  it("toLastModified ignore les valeurs vides ou invalides", () => {
    expect(toLastModified(undefined)).toBeUndefined();
    expect(toLastModified("")).toBeUndefined();
    expect(toLastModified("pas une date")).toBeUndefined();
    expect(toLastModified("2026-06-13")?.toISOString()).toBe("2026-06-13T00:00:00.000Z");
  });

  it("latestDate renvoie la plus récente", () => {
    expect(latestDate(["2026-04-25", null, "2026-06-13", "x"])?.toISOString()).toBe(
      "2026-06-13T00:00:00.000Z",
    );
    expect(latestDate([])).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { getAllCryptos, getCryptoBySlug } from "@/lib/cryptos";
import {
  HIST_HUB_IDS,
  HIST_YEARS,
  getHistHubCryptos,
  getHistYearsFor,
} from "@/lib/historique-prix";
import {
  ALL_CRYPTOS,
  getPublishableComparisons,
  getPublishableReviewSlugs,
  getRelatedComparisons,
  getReviewHref,
} from "@/lib/programmatic";
import { COUNTRIES, COUNTRY_CODES, capitalizeFirst } from "@/lib/programmatic-pages";
import { getAllPlatforms } from "@/lib/platforms";
import { stripBrandSuffix } from "@/lib/seo-title";
import { getEntityIndex, resetEntityIndexCache } from "@/lib/internal-link-graph";

/** Liens internes générés par le code : jamais vers une page inexistante. */

describe("hub /historique-prix", () => {
  it("ne lie que des ids acceptés par /historique-prix/[crypto]/[annee]", () => {
    for (const id of HIST_HUB_IDS) expect(getCryptoBySlug(id), id).toBeDefined();
    expect(getHistHubCryptos()).toHaveLength(HIST_HUB_IDS.length);
  });

  it("n'utilise plus les ids CoinGecko qui faisaient 404", () => {
    for (const cg of ["binancecoin", "ripple", "avalanche-2", "the-open-network", "hedera-hashgraph", "near", "maker", "matic-network", "ethereum-classic"]) {
      expect(HIST_HUB_IDS).not.toContain(cg);
    }
  });

  it("années servies = années d'existence du projet (pas de page « avant lancement »)", () => {
    for (const c of getAllCryptos()) {
      const years = getHistYearsFor(c);
      expect(years.every((y) => Number(y) >= c.yearCreated)).toBe(true);
      expect(years.every((y) => (HIST_YEARS as readonly string[]).includes(y))).toBe(true);
    }
  });
});

describe("liens plateformes / comparatifs", () => {
  it("getReviewHref : /avis/<id> seulement si la fiche existe", () => {
    const published = new Set(getPublishableReviewSlugs());
    for (const p of getAllPlatforms()) {
      const href = getReviewHref(p.id);
      expect(href).toBe(published.has(p.id) ? `/avis/${p.id}` : null);
    }
    expect(getReviewHref("plateforme-inexistante")).toBeNull();
  });

  it("getRelatedComparisons ne propose que des duels publiés", () => {
    const published = new Set(getPublishableComparisons().map((c) => c.slug));
    for (const p of getAllPlatforms()) {
      for (const c of getRelatedComparisons(p.id, 10)) expect(published.has(c.slug), c.slug).toBe(true);
    }
    expect(getRelatedComparisons("revolut", 10).map((c) => c.slug)).not.toContain("n26-vs-revolut");
  });

  it("graphe d'entités (« Voir aussi ») : uniquement des comparatifs publiés", () => {
    resetEntityIndexCache();
    const published = new Set(getPublishableComparisons().map((c) => `/comparatif/${c.slug}`));
    const urls = [...getEntityIndex().values()].filter((e) => e.type === "comparison").map((e) => e.url);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(published.has(u), u).toBe(true);
    expect(urls).not.toContain("/comparatif/bitget-vs-bybit");
    expect(urls).not.toContain("/comparatif/coinbase-vs-bitpanda");
  });

  it("ALL_CRYPTOS : aucun coingeckoId en double (immutable-x, maker…)", () => {
    const cgs = ALL_CRYPTOS.map((c) => c.coingeckoId);
    expect(new Set(cgs).size).toBe(cgs.length);
    expect(ALL_CRYPTOS.map((c) => c.id)).not.toContain("immutable-x");
    expect(ALL_CRYPTOS.map((c) => c.id)).not.toContain("maker");
  });
});

describe("prépositions pays (/acheter/[crypto]/[pays])", () => {
  it("valeurs attendues", () => {
    expect(COUNTRIES.fr.inName).toBe("en France");
    expect(COUNTRIES.lu.inName).toBe("au Luxembourg");
    expect(COUNTRIES.mc.inName).toBe("à Monaco");
    expect(COUNTRIES["ca-fr"].inName).toBe("au Canada (Québec)");
    expect(COUNTRIES.lu.fromName).toBe("depuis le Luxembourg");
    expect(COUNTRIES.fr.regulatorWithArticle).toBe("l'AMF");
    expect(capitalizeFirst(COUNTRIES.mc.inName)).toBe("À Monaco");
  });

  it("chaque pays a une préposition et un article cohérents", () => {
    for (const code of COUNTRY_CODES) {
      const c = COUNTRIES[code];
      expect(c.inName).toMatch(/^(en|au|aux|à) /);
      expect(c.inName.endsWith(c.name)).toBe(true);
      expect(c.fromName).toMatch(/^depuis /);
      expect(c.fromName.endsWith(c.name)).toBe(true);
      expect(c.regulatorWithArticle.endsWith(c.regulator)).toBe(true);
    }
  });
});

describe("stripBrandSuffix", () => {
  it.each([
    ["Halving Bitcoin : où en est le cycle ? — analyse Cryptoreflex", "Halving Bitcoin : où en est le cycle ?"],
    ["Widgets crypto embed gratuits | Cryptoreflex", "Widgets crypto embed gratuits"],
    ["Titre - Cryptoreflex", "Titre"],
    ["L'impact Cryptoreflex en chiffres", "L'impact Cryptoreflex en chiffres"],
    ["Cryptoreflex", "Cryptoreflex"],
  ])("%s", (input, expected) => {
    expect(stripBrandSuffix(input)).toBe(expected);
  });
});

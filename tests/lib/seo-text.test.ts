import { describe, expect, it } from "vitest";
import { DESCRIPTION_MAX, TITLE_MAX, fitDescription, fitTitle } from "@/lib/seo-text";

const full = (t: ReturnType<typeof fitTitle>) => (typeof t === "string" ? `${t} | Cryptoreflex` : t.absolute);

describe("fitTitle", () => {
  it("garde un titre court avec le suffixe du site", () => {
    expect(fitTitle("Comparatif des frais crypto")).toBe("Comparatif des frais crypto");
  });
  it("retire le suffixe quand le titre seul tient", () => {
    const t = "Staking Ethereum (ETH) 2026 — APY, plateformes MiCA, risques";
    expect(fitTitle(t)).toEqual({ absolute: t });
  });
  it("retire d'abord le segment accessoire de fin", () => {
    expect(fitTitle("BlackRock USD Institutional Digital Liquidity Fund (BUIDL) — fiche complète")).toEqual({
      absolute: "BlackRock USD Institutional Digital Liquidity Fund (BUIDL)",
    });
  });
  it("coupe à la fin d'un mot, jamais au milieu", () => {
    const t = fitTitle("MiCA et stablecoins Circle demande à Bruxelles d'assouplir les règles de réserve des émetteurs européens");
    const s = full(t);
    expect(s.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(s.endsWith("…")).toBe(true);
    expect(s).not.toMatch(/\s…$/);
  });
  it.each([
    "Comprendre la blockchain en 5 minutes — Parcours Débutant",
    "Prix Artificial Superintelligence Alliance (FET) en 2018",
    "Acheter Artificial Superintelligence Alliance en France (2026)",
    "Où acheter une crypto en 2026 : guides par pays (France, Belgique, Suisse…)",
    "Comment éviter le PFU 31,4 % crypto légalement : option barème progressif 2026",
  ])("« %s » tient en 65 caractères", (t) => {
    expect(full(fitTitle(t)).length).toBeLessThanOrEqual(TITLE_MAX);
  });
});

describe("fitDescription", () => {
  it("garde une description courte", () => {
    expect(fitDescription("Une phrase courte.")).toBe("Une phrase courte.");
  });
  it("coupe à la fin d'une phrase quand c'est possible", () => {
    const d =
      "Toutes les fiches crypto Cryptoreflex : 100 fiches éditoriales et 679 fiches exploratoires, triées par catégorie. Filtres par catégorie, recherche instantanée et comparateur côte à côte pour choisir.";
    const out = fitDescription(d);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.endsWith(".")).toBe(true);
  });
  it("sinon coupe à la fin d'un mot", () => {
    const out = fitDescription("mot ".repeat(80));
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.endsWith("mot…")).toBe(true);
  });
});

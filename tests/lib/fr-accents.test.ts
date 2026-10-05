import { describe, expect, it } from "vitest";
import { corrigerAccents, corrigerAccentsProfond, corrigerDecimales } from "@/lib/fr-accents";

describe("corrigerDecimales", () => {
  it("met la virgule française devant une unité", () => {
    expect(corrigerDecimales("Les variations (24h : +2.94%, 7j : -11.59 %) et un volume de 44.9M USD, ratio 2.6x, note 4.2 /5, 8.5/10.")).toBe(
      "Les variations (24h : +2,94%, 7j : -11,59 %) et un volume de 44,9M USD, ratio 2,6x, note 4,2 /5, 8,5/10.",
    );
    expect(corrigerDecimales("bloc toutes les 2.5 minutes, frais (0.08 / 0.1 %), prix 0.00142393 USD, $1.44, 2.3 Md$")).toBe(
      "bloc toutes les 2,5 minutes, frais (0,08 / 0,1 %), prix 0,00142393 USD, $1,44, 2,3 Md$",
    );
  });
  it("laisse intacts versions, URL, dates et nombres sans unité", () => {
    const t = "Web 3.0, Uniswap v3.5 %, version 1.2.3, https://x.io/v1.5%, le 2026.10.05, Ethereum 2.0, la 1.5 édition, 1,234.56 USD";
    expect(corrigerDecimales(t)).toBe(t);
  });
});

describe("corrigerAccents", () => {
  it("rétablit les accents en gardant la casse", () => {
    expect(corrigerAccents("À verifier : la fiscalite et la Securite du reseau.")).toBe("À vérifier : la fiscalité et la Sécurité du réseau.");
  });
  it("ne touche ni aux mots justes, ni aux URL, ni aux identifiants", () => {
    const t = "Voir https://example.com/verification et le token data-verifier, gouvernance et marche.";
    expect(corrigerAccents(t)).toBe(t);
  });
  it("laisse null et chaîne vide intacts", () => {
    expect(corrigerAccents(null)).toBeNull();
    expect(corrigerAccents("")).toBe("");
  });
  it("corrige un contenu JSON sans toucher aux clés ni aux URL", () => {
    const out = corrigerAccentsProfond({ tldr: "Equipe identifiee, donnees ouvertes", sourceUrl: "https://x.io/donnees", competitors: [{ coingeckoId: "securite", name: "Securite" }] });
    expect(out).toEqual({ tldr: "Équipe identifiée, données ouvertes", sourceUrl: "https://x.io/donnees", competitors: [{ coingeckoId: "securite", name: "Sécurité" }] });
  });
});

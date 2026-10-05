import { describe, it, expect } from "vitest";
import {
  SEUIL_EXONERATION_EUR,
  TAUX_IR_PFU,
  TAUX_PS,
  TAUX_PFU,
  computeTaxPFU,
  computeTaxBareme,
  computeTaxBNC,
  computeTax,
  formatPercent,
  formatEuro,
  regimeLabel,
  type FiscaliteInput,
  type Regime,
} from "@/lib/fiscalite";

/**
 * Tests du moteur fiscal du Calculateur (/outils/calculateur-fiscalite).
 *
 * Ce moteur (lib/fiscalite.ts) n'était PAS testé jusqu'ici, alors qu'il porte
 * les taux 2026 (PFU 31,4 % = 12,8 % IR + 18,6 % PS). Premier rôle de ce
 * fichier : GARDE-FOU sur les taux (toute régression vers 30 % / 17,2 % casse
 * le build). Second rôle : verrouiller la logique de calcul par régime, le
 * seuil 305 €, les déficits et le dispatcher.
 */

const base = (over: Partial<FiscaliteInput> = {}): FiscaliteInput => ({
  totalCessions: 10000,
  totalAchats: 5000,
  fraisCourtage: 100,
  regime: "pfu",
  ...over,
});

describe("fiscalité — garde-fou des taux 2026 (anti-régression)", () => {
  it("PFU = 31,4 % (12,8 % IR + 18,6 % PS)", () => {
    expect(TAUX_IR_PFU).toBe(0.128);
    expect(TAUX_PS).toBe(0.186);
    expect(TAUX_PFU).toBeCloseTo(0.314, 10);
    // Interdit explicitement les anciens taux périmés.
    expect(TAUX_PFU).not.toBe(0.30);
    expect(TAUX_PS).not.toBe(0.172);
  });

  it("seuil d'exonération = 305 € ; plus aucun taux de cotisations « BIC 22 % » (supprimé le 05/10/2026, sans base légale)", async () => {
    expect(SEUIL_EXONERATION_EUR).toBe(305);
    const mod = (await import("@/lib/fiscalite")) as Record<string, unknown>;
    expect(mod.TAUX_COTISATIONS_BIC).toBeUndefined();
  });
});

describe("computeTaxPFU", () => {
  it("calcule IR + PS sur la plus-value nette et un taux effectif de 31,4 %", () => {
    const r = computeTaxPFU(base()); // PV brute = 10000 - 5000 - 100 = 4900
    expect(r.plusValueBrute).toBeCloseTo(4900, 6);
    expect(r.plusValueNette).toBeCloseTo(4900, 6);
    expect(r.montantIR).toBeCloseTo(4900 * 0.128, 6); // 627,2
    expect(r.montantPS).toBeCloseTo(4900 * 0.186, 6); // 911,4
    expect(r.impotTotal).toBeCloseTo(1538.6, 4);
    expect(r.netApresImpot).toBeCloseTo(4900 - 1538.6, 4);
    expect(r.tauxEffectif).toBeCloseTo(0.314, 10);
    expect(r.cotisationsSociales).toBe(0);
    expect(r.exonere).toBe(false);
    expect(r.deficit).toBe(false);
  });

  it("exonère totalement si total cessions ≤ 305 €", () => {
    const r = computeTaxPFU(base({ totalCessions: 305, totalAchats: 0, fraisCourtage: 0 }));
    expect(r.exonere).toBe(true);
    expect(r.impotTotal).toBe(0);
    expect(r.netApresImpot).toBeCloseTo(305, 6); // PV conservée, non imposée
  });

  it("impose dès 306 € de cessions (juste au-dessus du seuil)", () => {
    const r = computeTaxPFU(base({ totalCessions: 306, totalAchats: 0, fraisCourtage: 0 }));
    expect(r.exonere).toBe(false);
    expect(r.impotTotal).toBeCloseTo(306 * 0.314, 4);
  });

  it("ne génère aucun impôt en cas de moins-value (déficit)", () => {
    const r = computeTaxPFU(base({ totalCessions: 5000, totalAchats: 8000, fraisCourtage: 0 }));
    expect(r.deficit).toBe(true);
    expect(r.plusValueNette).toBeCloseTo(-3000, 6);
    expect(r.impotTotal).toBe(0);
    expect(r.netApresImpot).toBe(0); // max(0, négatif)
  });

  it("déduit les frais de courtage de la base imposable", () => {
    const sans = computeTaxPFU(base({ fraisCourtage: 0 }));
    const avec = computeTaxPFU(base({ fraisCourtage: 500 }));
    expect(avec.plusValueNette).toBeCloseTo(sans.plusValueNette - 500, 6);
    expect(avec.impotTotal).toBeLessThan(sans.impotTotal);
  });

  it("IGNORE les reports antérieurs en PFU : un particulier ne reporte jamais ses moins-values (audit 03/10/2026)", () => {
    const r = computeTaxPFU(base({ fraisCourtage: 0, reportablePrevious: 2000 }));
    // PV brute = 5000, nette = 5000 (le champ reportablePrevious ne compte pas hors BNC)
    expect(r.plusValueBrute).toBeCloseTo(5000, 6);
    expect(r.plusValueNette).toBeCloseTo(5000, 6);
    expect(r.impotTotal).toBeCloseTo(5000 * 0.314, 4);
  });

  it("IGNORE aussi les reports au barème", () => {
    const r = computeTax(base({ regime: "bareme", tmi: 0.3, fraisCourtage: 0, reportablePrevious: 2000 }));
    expect(r.plusValueNette).toBeCloseTo(5000, 6);
  });

  it("déduit les déficits reportables en BNC seulement (art. 156-I-2° : 6 ans, sur des BNC non professionnels)", () => {
    const r = computeTax(base({ regime: "bnc", tmi: 0.3, fraisCourtage: 0, reportablePrevious: 2000 }));
    // PV brute = 5000, nette = 5000 - 2000 = 3000
    expect(r.plusValueNette).toBeCloseTo(3000, 6);
  });

  it("TMI 0 % disponible au barème : seuls les prélèvements sociaux (18,6 %) restent dus", () => {
    const r = computeTaxBareme(base({ regime: "bareme" }), 0);
    // nette = 10000 - 5000 - 100 = 4900
    expect(r.montantIR).toBeCloseTo(0, 6);
    expect(r.montantPS).toBeCloseTo(4900 * 0.186, 4);
    expect(r.impotTotal).toBeCloseTo(4900 * 0.186, 4);
  });

  it("assainit les entrées négatives (safePositive → 0)", () => {
    const r = computeTaxPFU(base({ totalCessions: -100, totalAchats: -50, fraisCourtage: -10 }));
    // cessions sanitizées à 0 → ≤ 305 → exonéré
    expect(r.exonere).toBe(true);
    expect(r.impotTotal).toBe(0);
  });
});

describe("prorata du portefeuille (ligne 212) — audit 03/10/2026", () => {
  it("vente partielle : fraction du prix d'acquisition = achats × cessions / valeur globale (exemple Sophie)", () => {
    // 1,5 BTC achetés 48 000 €, vente de 1 BTC à 50 000 € (frais 50 €), portefeuille 75 000 € juste avant
    const r = computeTaxPFU(
      base({ totalCessions: 50000, totalAchats: 48000, fraisCourtage: 50, valeurPortefeuille: 75000 }),
    );
    expect(r.methode).toBe("prorata");
    expect(r.partCedee).toBeCloseTo(2 / 3, 10);
    expect(r.fractionAcquisition).toBeCloseTo(32000, 6); // 48 000 × 50 000 / 75 000
    expect(r.plusValueBrute).toBeCloseTo(17950, 6); // 49 950 − 32 000
    expect(r.impotTotal).toBeCloseTo(17950 * 0.314, 4); // 5 636,30 €
  });

  it("les frais ne réduisent que le premier terme, jamais le quotient", () => {
    const sans = computeTaxPFU(base({ totalCessions: 50000, totalAchats: 48000, fraisCourtage: 0, valeurPortefeuille: 75000 }));
    const avec = computeTaxPFU(base({ totalCessions: 50000, totalAchats: 48000, fraisCourtage: 50, valeurPortefeuille: 75000 }));
    expect(avec.fractionAcquisition).toBeCloseTo(sans.fractionAcquisition, 10);
    expect(avec.plusValueBrute).toBeCloseTo(sans.plusValueBrute - 50, 10);
  });

  it("sans valeur globale (ou valeur ≤ cessions) : tout vendu, fraction = tout le prix d'acquisition", () => {
    const a = computeTaxPFU(base({ totalCessions: 10000, totalAchats: 5000, fraisCourtage: 100 }));
    expect(a.methode).toBe("tout_vendu");
    expect(a.partCedee).toBe(1);
    expect(a.fractionAcquisition).toBe(5000);
    expect(a.plusValueBrute).toBeCloseTo(4900, 10);
    const b = computeTaxPFU(base({ totalCessions: 10000, totalAchats: 5000, fraisCourtage: 100, valeurPortefeuille: 9000 }));
    expect(b.methode).toBe("tout_vendu");
    expect(b.plusValueBrute).toBeCloseTo(4900, 10);
  });

  it("le prorata s'applique aussi au barème et en BNC", () => {
    const inp = base({ totalCessions: 50000, totalAchats: 48000, fraisCourtage: 50, valeurPortefeuille: 75000 });
    expect(computeTaxBareme({ ...inp, regime: "bareme" }, 0.30).plusValueBrute).toBeCloseTo(17950, 6);
    expect(computeTaxBNC({ ...inp, regime: "bnc" }, 0.30).plusValueBrute).toBeCloseTo(17950, 6);
  });

  it("seuil de 305 € mesuré sur les cessions NETTES de frais (l. 218 / l. 51 du 2086)", () => {
    // 310 € bruts − 6 € de frais = 304 € nets → exonéré ; 312 − 6 = 306 → imposable
    expect(computeTaxPFU(base({ totalCessions: 310, totalAchats: 100, fraisCourtage: 6 })).exonere).toBe(true);
    expect(computeTaxPFU(base({ totalCessions: 312, totalAchats: 100, fraisCourtage: 6 })).exonere).toBe(false);
  });
});

describe("computeTaxBareme", () => {
  it("applique la TMI choisie + 18,6 % PS (taux effectif = TMI + PS)", () => {
    const r = computeTaxBareme(base(), 0.41); // PV 4900
    expect(r.montantIR).toBeCloseTo(4900 * 0.41, 6);
    expect(r.montantPS).toBeCloseTo(4900 * 0.186, 6);
    expect(r.tauxEffectif).toBeCloseTo(0.41 + 0.186, 10); // 0,596
    expect(r.cotisationsSociales).toBe(0);
  });

  it("respecte aussi le seuil d'exonération 305 €", () => {
    const r = computeTaxBareme(base({ totalCessions: 100, totalAchats: 0, fraisCourtage: 0 }), 0.30);
    expect(r.exonere).toBe(true);
    expect(r.impotTotal).toBe(0);
  });
});

describe("computeTaxBNC (art. 92, 2-1° bis CGI, depuis le 01/01/2023)", () => {
  it("barème (TMI) + 18,6 % de prélèvements sociaux du patrimoine, AUCUNE cotisation d'indépendant (art. L136-6, I-f CSS)", () => {
    const r = computeTaxBNC(base({ regime: "bnc" }), 0.30); // PV 4900
    expect(r.regime).toBe("bnc");
    expect(r.montantIR).toBeCloseTo(4900 * 0.30, 6);
    expect(r.montantPS).toBeCloseTo(4900 * 0.186, 6);
    expect(r.cotisationsSociales).toBe(0);
    expect(r.impotTotal).toBeCloseTo(4900 * (0.30 + 0.186), 6);
    expect(r.tauxEffectif).toBeCloseTo(0.30 + 0.186, 10); // 0,486 (l'ancien « BIC » en comptait 0,706)
  });

  it("N'applique PAS le seuil de 305 € (propre à l'article 150 VH bis)", () => {
    const r = computeTaxBNC(base({ regime: "bnc", totalCessions: 200, totalAchats: 0, fraisCourtage: 0 }), 0.30);
    expect(r.exonere).toBe(false);
    expect(r.impotTotal).toBeCloseTo(200 * (0.30 + 0.186), 4);
  });

  it("déficit : aucun impôt", () => {
    const r = computeTaxBNC(base({ regime: "bnc", totalCessions: 1000, totalAchats: 3000, fraisCourtage: 0 }), 0.30);
    expect(r.deficit).toBe(true);
    expect(r.impotTotal).toBe(0);
  });
});

describe("computeTax — dispatcher", () => {
  it("route vers le bon régime", () => {
    expect(computeTax(base({ regime: "pfu" })).regime).toBe("pfu");
    expect(computeTax(base({ regime: "bareme", tmi: 0.30 })).regime).toBe("bareme");
    expect(computeTax(base({ regime: "bnc", tmi: 0.30 })).regime).toBe("bnc");
  });

  it("retombe sur TMI 30 % par défaut pour barème/BNC sans TMI", () => {
    const r = computeTax(base({ regime: "bareme" }));
    expect(r.montantIR).toBeCloseTo(4900 * 0.30, 6);
  });

  it("régime inconnu → comportement PFU (garde-fou)", () => {
    const r = computeTax(base({ regime: "wat" as unknown as Regime }));
    expect(r.regime).toBe("pfu");
    expect(r.tauxEffectif).toBeCloseTo(0.314, 10);
  });

  it("PFU est cohérent entre dispatcher et fonction directe", () => {
    expect(computeTax(base())).toEqual(computeTaxPFU(base()));
  });
});

describe("formatters", () => {
  it("formatPercent(0.314) ≈ « 31,4 % »", () => {
    expect(formatPercent(0.314)).toMatch(/31,4\s?%/);
  });
  it("formatEuro formate en EUR fr-FR", () => {
    expect(formatEuro(1538.6)).toMatch(/1\s?538,60/);
  });
  it("regimeLabel(pfu) mentionne 31,4 %", () => {
    expect(regimeLabel("pfu")).toMatch(/31,4\s?%/);
  });
});

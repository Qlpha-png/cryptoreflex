import { describe, it, expect } from "vitest";
import {
  SEUIL_EXONERATION_EUR,
  TAUX_IR_PFU,
  TAUX_PS,
  TAUX_PFU,
  TAUX_COTISATIONS_BIC,
  computeTaxPFU,
  computeTaxBareme,
  computeTaxBIC,
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

  it("seuil d'exonération = 305 € et cotisations BIC = 22 %", () => {
    expect(SEUIL_EXONERATION_EUR).toBe(305);
    expect(TAUX_COTISATIONS_BIC).toBe(0.22);
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

  it("déduit les reports antérieurs (reportablePrevious) de la PV nette", () => {
    const r = computeTaxPFU(base({ fraisCourtage: 0, reportablePrevious: 2000 }));
    // PV brute = 5000, nette = 5000 - 2000 = 3000
    expect(r.plusValueBrute).toBeCloseTo(5000, 6);
    expect(r.plusValueNette).toBeCloseTo(3000, 6);
    expect(r.impotTotal).toBeCloseTo(3000 * 0.314, 4);
  });

  it("assainit les entrées négatives (safePositive → 0)", () => {
    const r = computeTaxPFU(base({ totalCessions: -100, totalAchats: -50, fraisCourtage: -10 }));
    // cessions sanitizées à 0 → ≤ 305 → exonéré
    expect(r.exonere).toBe(true);
    expect(r.impotTotal).toBe(0);
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

describe("computeTaxBIC", () => {
  it("ajoute les cotisations URSSAF 22 % (taux effectif = TMI + PS + 22 %)", () => {
    const r = computeTaxBIC(base(), 0.30); // PV 4900
    expect(r.montantIR).toBeCloseTo(4900 * 0.30, 6);
    expect(r.montantPS).toBeCloseTo(4900 * 0.186, 6);
    expect(r.cotisationsSociales).toBeCloseTo(4900 * 0.22, 6);
    expect(r.tauxEffectif).toBeCloseTo(0.30 + 0.186 + 0.22, 10); // 0,706
  });

  it("N'applique PAS le seuil 305 € (régime professionnel)", () => {
    const r = computeTaxBIC(base({ totalCessions: 200, totalAchats: 0, fraisCourtage: 0 }), 0.30);
    expect(r.exonere).toBe(false);
    expect(r.impotTotal).toBeGreaterThan(0); // imposé malgré cessions ≤ 305
    expect(r.impotTotal).toBeCloseTo(200 * (0.30 + 0.186 + 0.22), 4);
  });
});

describe("computeTax — dispatcher", () => {
  it("route vers le bon régime", () => {
    expect(computeTax(base({ regime: "pfu" })).regime).toBe("pfu");
    expect(computeTax(base({ regime: "bareme", tmi: 0.30 })).regime).toBe("bareme");
    expect(computeTax(base({ regime: "bic", tmi: 0.30 })).regime).toBe("bic");
  });

  it("retombe sur TMI 30 % par défaut pour barème/BIC sans TMI", () => {
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

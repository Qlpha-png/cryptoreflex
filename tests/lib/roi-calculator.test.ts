/**
 * Calculateur ROI — règle d'exonération (art. 150 VH bis, II B du CGI) : aucune imposition quand le
 * TOTAL DES PRIX DE CESSION de l'année ne dépasse pas 305 €. Le seuil ne porte jamais sur la plus-value.
 * Audit 03/10/2026 : l'outil affichait 0 € d'impôt pour 10 300 € de ventes et 300 € de gain.
 */
import { describe, expect, it } from "vitest";
import { calculateROI } from "@/lib/roi-calculator";

describe("calculateROI — seuil de 305 € sur le total des ventes", () => {
  it("10 300 € de ventes et 300 € de gain → 94,20 € d'impôt (cas de l'audit)", () => {
    const r = calculateROI({ buyPrice: 100, sellPrice: 103, quantity: 100, buyFeeRate: 0, sellFeeRate: 0 });
    expect(r.valueFinal).toBe(10300);
    expect(r.profitNet).toBe(300);
    expect(r.taxFr).toBeCloseTo(94.2, 2);
  });

  it("200 € de ventes → exonéré, même avec un gain", () => {
    const r = calculateROI({ buyPrice: 100, sellPrice: 200, quantity: 1, buyFeeRate: 0.5, sellFeeRate: 0.5 });
    expect(r.valueFinal).toBe(200);
    expect(r.profitNet).toBeGreaterThan(0);
    expect(r.taxFr).toBe(0);
  });

  it("305 € de ventes exactement → encore exonéré ; 306 € → imposé", () => {
    expect(calculateROI({ buyPrice: 1, sellPrice: 3.05, quantity: 100, buyFeeRate: 0, sellFeeRate: 0 }).taxFr).toBe(0);
    const r = calculateROI({ buyPrice: 1, sellPrice: 3.06, quantity: 100, buyFeeRate: 0, sellFeeRate: 0 });
    expect(r.taxFr).toBeCloseTo((306 - 100) * 0.314, 2);
  });

  it("moins-value → aucun impôt, quel que soit le montant vendu", () => {
    const r = calculateROI({ buyPrice: 100, sellPrice: 90, quantity: 100, buyFeeRate: 0, sellFeeRate: 0 });
    expect(r.profitNet).toBeLessThan(0);
    expect(r.taxFr).toBe(0);
  });

  it("exemple de la page : 500 € investis, 1 000 € de ventes, 7,50 € de frais → 154,65 €", () => {
    const r = calculateROI({ buyPrice: 100, sellPrice: 200, quantity: 5, buyFeeRate: 0.5, sellFeeRate: 0.5 });
    expect(r.profitNet).toBeCloseTo(492.5, 2);
    expect(r.taxFr).toBeCloseTo(154.65, 2);
  });
});

/**
 * Comparateur (refonte du 05/10/2026) : coûts explicites vérifiés (fees.cost), tri honnête (un coût publié en entier passe devant
 * une marge non publiée, et un coût non publié passe en dernier), filtres par objectif, libellés, et cohérence des données réelles.
 */
import { describe, it, expect } from "vitest";
import { buildRows, costLabel, rowCost, sortRows, euros, type Row } from "@/lib/comparateur";
import { getAllPlatforms, isAvailableFr } from "@/lib/platforms";

const base = (o: Partial<Row>): Row => ({
  id: "x", name: "X", authority: "AMF", country: "France", french: true, supportFr: "chat", score: 4, ux: 4,
  simple: { c100: 1, c1000: 10, kind: "exact" }, card: { c100: 2, c1000: 20, kind: "exact" }, path: "achat", note: null,
  verifiedDate: "2026-10-05", source: "https://x", affiliateUrl: "https://x", affiliationNotice: "", ...o,
});

describe("sortRows", () => {
  const rows = [
    base({ id: "cher", simple: { c100: 2, c1000: 20, kind: "exact" } }),
    base({ id: "partiel", simple: { c100: 0, c1000: 1, kind: "partiel" } }),
    base({ id: "bon", simple: { c100: 0.5, c1000: 5, kind: "exact" } }),
    base({ id: "auplus", simple: { c100: 1.5, c1000: 15, kind: "max" } }),
    base({ id: "inconnu", simple: { c100: null, c1000: null, kind: "partiel" } }),
    base({ id: "sanscarte", simple: { c100: 0.8, c1000: 8, kind: "exact" }, card: null, french: false, supportFr: "non" }),
  ];
  it("prix : coûts publiés (exacts ou « au plus ») d'abord, puis marge non publiée, puis non publié", () => {
    expect(sortRows(rows, 100, "prix").map((r) => r.id)).toEqual(["bon", "sanscarte", "auplus", "cher", "partiel", "inconnu"]);
  });
  it("le montant choisi change le classement (1 000 €)", () => {
    expect(sortRows(rows, 1000, "prix")[0].id).toBe("bon");
  });
  it("carte : retire les plateformes sans achat par carte", () => {
    expect(sortRows(rows, 100, "carte").map((r) => r.id)).not.toContain("sanscarte");
  });
  it("français : seulement les agréments AMF", () => {
    expect(sortRows(rows, 100, "francais").every((r) => r.french)).toBe(true);
  });
  it("rowCost : montant et fiabilité ; null sans carte", () => {
    expect(rowCost(rows[1], 100, "prix")).toEqual({ fee: 0, kind: "partiel" });
    expect(rowCost(rows[0], 1000, "prix")).toEqual({ fee: 20, kind: "exact" });
    expect(rowCost(rows[5], 100, "carte")).toBeNull();
  });
});

describe("libellés", () => {
  it("exact, au plus, marge non publiée, non publié", () => {
    expect(costLabel({ fee: 2.5, kind: "exact" })).toEqual({ main: "2,50 €", prefix: null, suffix: null });
    expect(costLabel({ fee: 2.5, kind: "max" }).prefix).toBe("au plus");
    expect(costLabel({ fee: 1, kind: "partiel" }).suffix).toBe("+ marge non publiée");
    expect(costLabel({ fee: null, kind: "partiel" }).main).toBe("Non publié");
    expect(euros(14.9)).toBe("14,90 €");
  });
});

describe("plateformes réelles", () => {
  const all = getAllPlatforms();
  const rows = buildRows(all, () => "");
  it("une ligne par plateforme autorisée, sans portefeuille matériel", () => {
    const expected = all.filter((p) => p.category !== "wallet" && isAvailableFr(p)).length;
    expect(rows.length).toBe(expected);
    expect(rows.every((r) => !/ledger|trezor/i.test(r.id))).toBe(true);
  });
  it("chaque plateforme autorisée a un coût relevé, daté et sourcé (fees.cost)", () => {
    for (const p of all.filter((x) => x.category !== "wallet" && isAvailableFr(x))) {
      const c = p.fees.cost;
      expect(c, p.id).toBeTruthy();
      expect(c!.source, p.id).toMatch(/^https:\/\//);
      expect(c!.date, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const v of [c!.c100, c!.c1000, c!.card?.c100 ?? null, c!.card?.c1000 ?? null]) {
        if (v != null) expect(Number.isFinite(v) && v >= 0, p.id).toBe(true);
      }
      /* un coût publié pour 1 000 € n'est jamais inférieur à celui de 100 € */
      if (c!.c100 != null && c!.c1000 != null) expect(c!.c1000, p.id).toBeGreaterThanOrEqual(c!.c100);
    }
  });
  it("relevés du 05/10/2026 recalculés : Revolut (minimum de 2,49 € à 100 €), Coinhouse (+ 0,12 €), Bitstack (au plus, marge 1 %)", () => {
    const get = (id: string) => all.find((p) => p.id === id)!.fees.cost!;
    expect([get("revolut").c100, get("revolut").c1000]).toEqual([2.49, 14.9]);
    expect([get("coinhouse").c100, get("coinhouse").c1000]).toEqual([1.11, 10.02]);
    expect(get("bitstack")).toMatchObject({ c100: 2.5, c1000: 22.5, kind: "max" });
    expect(get("21bitcoin").card).toBeNull();
    expect(get("coinbase").c100).toBeNull();
  });
});

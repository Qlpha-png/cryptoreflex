/**
 * Taux de change (audit du 05/10/2026) : plus de taux figé de mai (1 USD = 0,92 €) ; taux BCE du jour, secours cohérent.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { FX_FALLBACK } from "@/lib/fx-fallback";
import { eurPerUnit, fiatPerUsd } from "@/lib/fx";
import { FIAT_EUR_PRICE } from "@/lib/convertisseur-stats";

describe("taux de change", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("taux de secours plausibles et datés", () => {
    expect(FX_FALLBACK.eur).toBeGreaterThan(0.8);
    expect(FX_FALLBACK.eur).toBeLessThan(1);
    expect(FX_FALLBACK.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("prix en euros d'une unité de devise : cohérents entre eux", () => {
    const fx = { ...FX_FALLBACK, source: "secours" as const };
    const e = eurPerUnit(fx);
    expect(e.eur).toBe(1);
    expect(e.usd).toBeCloseTo(0.89087, 5);
    expect(e.gbp).toBeCloseTo(0.89087 / 0.75753, 6); // ≈ 1,176 € pour 1 £
    expect(e.chf).toBeCloseTo(0.89087 / 0.82664, 6); // ≈ 1,078 € pour 1 CHF
    expect(FIAT_EUR_PRICE.usd).toBe(FX_FALLBACK.eur);
    expect(FIAT_EUR_PRICE).not.toMatchObject({ usd: 0.92 });
  });
  it("sans réseau : jamais d'exception, dernier taux BCE connu", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("hors ligne"); }));
    const fx = await fiatPerUsd();
    expect(fx.source).toBe("secours");
    expect(fx.eur).toBe(FX_FALLBACK.eur);
  });
});

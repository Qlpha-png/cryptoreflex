import { describe, expect, it } from "vitest";
import { formatCompactNumber, formatCompactUsd } from "@/lib/coingecko";

/**
 * Tests unitaires des formatters compact (USD + nombre).
 *
 * Garanties à protéger (audit Kev 19/05/2026) :
 *  - JAMAIS de "Bn" ni "B" dans les sorties (ambigu FR : "billion" = milliard).
 *  - Unités explicites : k, M, Md, T (échelle française courte).
 *  - Fallback "—" pour null/undefined/NaN/<=0 (jamais "0,0 $US" trompeur).
 *  - Espace insécable typo française entre nombre et unité.
 *  - Format USD : suffixe "$" (pas "$US" qui est un Intl artifact).
 *
 * Une régression silencieuse re-introduirait la confusion x1000 sur la
 * capitalisation BTC/ETH (~2 T $) que les visiteurs FR lisaient comme
 * "milliards" (1000 fois plus petit qu'attendu).
 */

describe("formatCompactUsd", () => {
  /* --------------------------- Fallbacks robustes -------------------------- */
  it("retourne — pour null", () => {
    expect(formatCompactUsd(null)).toBe("—");
  });
  it("retourne — pour undefined", () => {
    expect(formatCompactUsd(undefined)).toBe("—");
  });
  it("retourne — pour NaN", () => {
    expect(formatCompactUsd(NaN)).toBe("—");
  });
  it("retourne — pour 0 (donnée nulle = invalide pour cap. marché)", () => {
    expect(formatCompactUsd(0)).toBe("—");
  });
  it("retourne — pour valeur négative", () => {
    expect(formatCompactUsd(-100)).toBe("—");
  });
  it("retourne — pour Infinity", () => {
    expect(formatCompactUsd(Infinity)).toBe("—");
  });

  /* --------------------- Valeurs nominales par tier ------------------------ */
  it("1 500 → milliers (k $)", () => {
    expect(formatCompactUsd(1_500)).toBe("1,5 k $");
  });
  it("1 500 000 → millions (M $)", () => {
    expect(formatCompactUsd(1_500_000)).toBe("1,5 M $");
  });
  it("1 500 000 000 → milliards (Md $)", () => {
    expect(formatCompactUsd(1_500_000_000)).toBe("1,5 Md $");
  });
  it("1 500 000 000 000 → trillions (T $)", () => {
    expect(formatCompactUsd(1_500_000_000_000)).toBe("1,5 T $");
  });

  /* ------------------------- Valeurs réalistes BTC/ETH --------------------- */
  it("BTC market cap ~ 2 T $ — affiché en T, pas Bn", () => {
    const out = formatCompactUsd(2_100_000_000_000);
    expect(out).toMatch(/T \$/);
    expect(out).not.toMatch(/Bn|B \$/);
  });

  it("ETH market cap ~ 350 Md $ — affiché en Md, pas G", () => {
    const out = formatCompactUsd(350_000_000_000);
    expect(out).toMatch(/Md \$/);
    expect(out).not.toMatch(/Bn|G \$/);
  });

  /* ------------------------- Aucune sortie ambigüe ------------------------- */
  it("AUCUNE sortie ne contient 'Bn' (audit anti-confusion FR)", () => {
    for (const v of [1, 999, 1_000, 999_999, 1e6, 1e9, 1e12, 1e15]) {
      const out = formatCompactUsd(v);
      expect(out).not.toMatch(/Bn/);
    }
  });

  /* -------------------------- Petites valeurs ------------------------------ */
  it("< 1 000 → valeur entière sans unité", () => {
    expect(formatCompactUsd(500)).toBe("500 $");
  });
  it("999 → reste en unité simple", () => {
    expect(formatCompactUsd(999)).toBe("999 $");
  });
});

describe("formatCompactNumber", () => {
  /* --------------------------- Fallbacks robustes -------------------------- */
  it("retourne — pour null", () => {
    expect(formatCompactNumber(null)).toBe("—");
  });
  it("retourne — pour undefined", () => {
    expect(formatCompactNumber(undefined)).toBe("—");
  });
  it("retourne — pour NaN", () => {
    expect(formatCompactNumber(NaN)).toBe("—");
  });
  it("0 légitime (supply nulle peut être un cas réel) → '0'", () => {
    expect(formatCompactNumber(0)).toBe("0");
  });

  /* --------------------- Valeurs nominales par tier ------------------------ */
  it("1 500 → k (sans unité $)", () => {
    expect(formatCompactNumber(1_500)).toBe("1,5 k");
  });
  it("1 500 000 → M", () => {
    expect(formatCompactNumber(1_500_000)).toBe("1,5 M");
  });
  it("1 500 000 000 → Md (pas B, pas Bn)", () => {
    const out = formatCompactNumber(1_500_000_000);
    expect(out).toBe("1,5 Md");
    expect(out).not.toMatch(/B/);
  });
  it("1 500 000 000 000 → T", () => {
    expect(formatCompactNumber(1_500_000_000_000)).toBe("1,5 T");
  });

  /* ----------------------- Valeurs réalistes BTC/ETH supply ---------------- */
  it("BTC supply 19,7 M → '19,7 M' (pas 19.7M en-US)", () => {
    const out = formatCompactNumber(19_700_000);
    expect(out).toMatch(/M$/);
    expect(out).not.toMatch(/B/);
  });
  it("ETH supply 120,4 M → '120,4 M'", () => {
    const out = formatCompactNumber(120_400_000);
    expect(out).toMatch(/M$/);
  });

  /* --------------------------- Signed values ------------------------------- */
  it("valeur négative supportée (ex: variation flux)", () => {
    expect(formatCompactNumber(-1_500_000)).toBe("-1,5 M");
  });

  /* ------------------------- Aucune sortie ambigüe ------------------------- */
  it("AUCUNE sortie ne contient 'B' (audit anti-confusion FR)", () => {
    for (const v of [1, 1e3, 1e6, 1e9, 1e12, 1e15]) {
      const out = formatCompactNumber(v);
      expect(out).not.toMatch(/[^Md]B/); // Md OK, "B" seul non
    }
  });
});

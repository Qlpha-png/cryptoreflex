/**
 * OHLC historique (data/historical-ohlc.json) — cohérence de l'instantané annuel + mensuel et des statistiques dérivées
 * affichées par /historique-prix/[crypto]/[annee] (04/10/2026, lot 2b).
 */
import { describe, it, expect } from "vitest";
import raw from "@/data/historical-ohlc.json";
import { getYearOhlc, getYearMonths, yearStats, formatSignedPct, formatCompactUsd, MONTHS_FR, type YearOhlc } from "@/lib/historical-ohlc";

const DATA = (raw as { data: Record<string, { years: Record<string, YearOhlc> }> }).data;
const cells = Object.entries(DATA).flatMap(([id, c]) => Object.entries(c.years).map(([y, v]) => ({ id, y, v })));

describe("instantané OHLC : annuel et mensuel cohérents", () => {
  it("couvre au moins 60 cryptos dont bitcoin, avec un détail mensuel partout", () => {
    expect(Object.keys(DATA).length).toBeGreaterThanOrEqual(60);
    expect(DATA.bitcoin).toBeDefined();
    const sansMois = cells.filter(({ v }) => !v.months?.length).map(({ id, y }) => `${id}/${y}`);
    expect(sansMois).toEqual([]);
  });
  it("chaque année : mois triés et uniques, ouverture = 1er mois, clôture = dernier mois, plus haut/bas = extrêmes des mois, m = nombre de mois", () => {
    const fautes: string[] = [];
    for (const { id, y, v } of cells) {
      const ms = v.months!;
      const ns = ms.map((m) => m.n);
      if (ns.some((n, i) => n < 1 || n > 12 || (i > 0 && n <= ns[i - 1]))) fautes.push(`${id}/${y} ordre`);
      if (ms[0].o !== v.o) fautes.push(`${id}/${y} ouverture`);
      if (ms[ms.length - 1].c !== v.c) fautes.push(`${id}/${y} clôture`);
      if (Math.max(...ms.map((m) => m.h)) !== v.h) fautes.push(`${id}/${y} plus haut`);
      if (Math.min(...ms.map((m) => m.l)) !== v.l) fautes.push(`${id}/${y} plus bas`);
      if (v.m !== ms.length) fautes.push(`${id}/${y} m`);
      if (ms.some((m) => !(m.l <= m.o && m.l <= m.c && m.h >= m.o && m.h >= m.c))) fautes.push(`${id}/${y} bougie incohérente`);
      if (Math.round((v.c / v.o - 1) * 100) !== v.chg) fautes.push(`${id}/${y} variation`);
    }
    expect(fautes).toEqual([]);
  });
  it("Bitcoin 2022 : repères connus (ouverture ≈ 46 200, clôture ≈ 16 500, −64 %, 12 mois) et stats dérivées plausibles", () => {
    const y = getYearOhlc("bitcoin", 2022)!;
    expect(y.o).toBeGreaterThan(46000); expect(y.o).toBeLessThan(47000);
    expect(y.c).toBeGreaterThan(16000); expect(y.c).toBeLessThan(17000);
    expect(y.chg).toBe(-64);
    const ms = getYearMonths("bitcoin", 2022);
    expect(ms.length).toBe(12);
    expect(ms[0].n).toBe(1); expect(ms[11].n).toBe(12);
    const s = yearStats(y)!;
    expect(s.up + s.down).toBeLessThanOrEqual(12);
    expect(s.down).toBeGreaterThan(s.up); // année baissière
    expect(s.worst.chg).toBeLessThan(-20); // juin 2022 (Terra/Celsius) ou novembre (FTX)
    expect([6, 11]).toContain(s.worst.n);
    expect(s.amplitude).toBeGreaterThan(150); // 15 476 → 48 190
    expect(s.maxDrawdown).toBeLessThan(-60);
    expect(s.maxDrawdown).toBeGreaterThanOrEqual(-100);
    expect(s.volume).toBeGreaterThan(1e11); // des centaines de milliards de dollars échangés sur BTCUSDT en 2022
  });
  it("sans détail mensuel ou crypto inconnue : liste vide, stats nulles", () => {
    expect(getYearMonths("crypto-inconnue", 2022)).toEqual([]);
    expect(getYearMonths("bitcoin", 1999)).toEqual([]);
    expect(yearStats(null)).toBeNull();
    expect(yearStats({ o: 1, c: 2, h: 2, l: 1, chg: 100, m: 12 })).toBeNull();
  });
  it("formats : pourcentage signé typographique, dollars compacts, douze mois en français", () => {
    expect(formatSignedPct(12)).toBe("+12 %");
    expect(formatSignedPct(-8)).toBe("−8 %");
    expect(formatSignedPct(0)).toBe("0 %");
    expect(formatCompactUsd(1_234_000_000)).toBe("1,2 Md $");
    expect(formatCompactUsd(350_000_000)).toBe("350 M $");
    expect(formatCompactUsd(4_800)).toBe("4,8 k $");
    expect(formatCompactUsd(0)).toBe("—");
    expect(MONTHS_FR.length).toBe(12);
    expect(MONTHS_FR[0]).toBe("janvier");
    expect(MONTHS_FR[11]).toBe("décembre");
  });
});

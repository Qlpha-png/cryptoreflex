/** /convertisseur/[pair] — grille de montants et statistiques sur un an (fonctions pures, 04/10/2026). */
import { describe, it, expect } from "vitest";
import { conversionGrid, formatConverted, ratioSeries, rateStats, pairKind, historySupported, signedPct, pairUseText, GRID_AMOUNTS, formatDay } from "@/lib/convertisseur-stats";

const DAY = 86_400_000;
const T0 = Date.UTC(2025, 9, 4); // 4 octobre 2025
const series = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => ({ t: T0 + i * DAY + 3_600_000, price: f(i) }));

describe("grille de conversion", () => {
  it("multiplie chaque montant par le taux ; vide sans taux valable", () => {
    const g = conversionGrid(2.5);
    expect(g.map((r) => r.amount)).toEqual([...GRID_AMOUNTS]);
    expect(g[0].value).toBe(2.5);
    expect(g[g.length - 1].value).toBe(25000);
    expect(conversionGrid(null)).toEqual([]);
    expect(conversionGrid(0)).toEqual([]);
    expect(conversionGrid(Number.NaN)).toEqual([]);
  });
  it("formate avec une précision adaptée (français)", () => {
    expect(formatConverted(58234.567)).toBe("58 235");
    expect(formatConverted(1.23456)).toBe("1,23");
    expect(formatConverted(0.004567)).toBe("0,004567"); // 4 chiffres significatifs sous 0,01 (taux EUR→crypto)
    expect(formatConverted(0.00001234)).toBe("0,00001234");
    expect(formatConverted(null)).toBe("—");
  });
});

describe("série du taux et statistiques", () => {
  it("aligne les deux côtés jour par jour et divise (crypto/crypto) ; euro = 1", () => {
    const btc = series(10, () => 50000);
    const eth = series(10, () => 2500);
    const r = ratioSeries(btc, eth);
    expect(r.length).toBe(10);
    expect(r.every((p) => p.price === 20)).toBe(true);
    const inv = ratioSeries(null, eth);
    expect(inv[0].price).toBeCloseTo(1 / 2500, 10);
    expect(ratioSeries(btc, null)[3].price).toBe(50000);
    expect(ratioSeries(null, null)).toEqual([]);
    /* un jour absent d'un côté n'apparaît pas */
    const r2 = ratioSeries(btc, eth.filter((_, i) => i !== 4));
    expect(r2.length).toBe(9);
  });
  it("statistiques sur un an : moyennes, extrêmes datés, variations ; null sous 30 jours", () => {
    const s = series(365, (i) => 100 + i); // hausse régulière 100 → 464
    const st = rateStats(s)!;
    expect(st.days).toBe(365);
    expect(st.last).toBe(464);
    expect(st.min).toBe(100);
    expect(st.max).toBe(464);
    expect(formatDay(st.minAt)).toBe("4 octobre 2025");
    expect(st.avg7).toBeCloseTo(461, 6);
    expect(st.avg30).toBeCloseTo(449.5, 6);
    expect(st.avg365).toBeCloseTo(282, 6);
    expect(st.chg30).toBe(Math.round((464 / 435 - 1) * 100));
    expect(st.chg365).toBe(Math.round((464 / 100 - 1) * 100));
    expect(rateStats(series(20, () => 1))).toBeNull();
  });
  it("série courte (60 jours) : pas de variation ni de moyenne annuelle annoncées", () => {
    const st = rateStats(series(60, (i) => 10 + (i % 3)))!;
    expect(st.chg365).toBeNull();
    expect(st.avg365).toBeNull();
    expect(st.chg30).not.toBeNull();
  });
});

describe("type de paire et textes", () => {
  it("classe les paires et n'autorise l'historique qu'en euros ou entre cryptos", () => {
    expect(pairKind("btc", "eur")).toBe("crypto-fiat");
    expect(pairKind("eur", "btc")).toBe("fiat-crypto");
    expect(pairKind("btc", "eth")).toBe("crypto-crypto");
    expect(pairKind("eur", "usd")).toBe("fiat-fiat");
    expect(pairKind("btc", "usdt")).toBe("crypto-fiat");
    expect(historySupported("eur")).toBe(true);
    expect(historySupported("btc")).toBe(true);
    expect(historySupported("usd")).toBe(false);
    expect(historySupported("usdt")).toBe(false);
  });
  it("texte d'usage sans chiffre, signé typographiquement", () => {
    for (const k of ["crypto-fiat", "fiat-crypto", "crypto-crypto", "fiat-fiat"] as const) {
      const t = pairUseText(k, "Bitcoin", "Euro", "BTC", "EUR");
      expect(t.length).toBeGreaterThan(120);
      expect(/\d/.test(t)).toBe(false);
    }
    expect(signedPct(12)).toBe("+12 %");
    expect(signedPct(-3)).toBe("−3 %");
    expect(signedPct(null)).toBe("—");
  });
});

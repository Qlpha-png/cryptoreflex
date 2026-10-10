/**
 * Taux de change (audit du 05/10/2026, lot Z4 du 10/10/2026) : plus de taux figé, plus d'appel réseau au rendu ;
 * le site lit data/fx-bce.json (robot R6) partout où un taux USD↔EUR sert.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, afterEach } from "vitest";
import fichier from "@/data/fx-bce.json";
import { FX_BCE, lireFxBce, mentionConversionBce, mentionFxBce, jourFx } from "@/lib/fx-bce";
import { eurPerUnit, fiatPerUsd } from "@/lib/fx";
import { FIAT_EUR_PRICE } from "@/lib/convertisseur-stats";

const RACINE = path.resolve(__dirname, "../..");
const lire = (f: string) => readFileSync(path.join(RACINE, f), "utf8");

describe("taux de change : data/fx-bce.json", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("le fichier du robot est lu tel quel : 1 $ = 1 / USD €, livre et franc suisse par rapport au dollar", () => {
    expect(FX_BCE.source).toBe("bce");
    expect(FX_BCE.date).toBe(fichier.date);
    expect(FX_BCE.eur).toBeCloseTo(1 / fichier.parEuro.USD, 12);
    expect(FX_BCE.gbp).toBeCloseTo(fichier.parEuro.GBP / fichier.parEuro.USD, 12);
    expect(FX_BCE.chf).toBeCloseTo(fichier.parEuro.CHF / fichier.parEuro.USD, 12);
    expect(fichier.sourceUrl).toBe("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
    // « variation-refusee » doit pouvoir être commité : c'est l'état sur main qui permet le déblocage le jour suivant
    // (les valeurs servies restent celles de la publication précédente, déjà contrôlées).
    expect(["ok", "variation-refusee"]).toContain(fichier.controle.statut);
  });

  it("fichier illisible ou incomplet : repli daté, marqué « secours »", () => {
    for (const mauvais of [null, {}, { date: "2026-10-09" }, { date: "x", parEuro: { USD: 1.1, GBP: 0.8, CHF: 0.9 } }, { date: "2026-10-09", parEuro: { USD: 50, GBP: 0.8, CHF: 0.9 } }]) {
      const fx = lireFxBce(mauvais);
      expect(fx.source).toBe("secours");
      expect(fx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fx.eur).toBeGreaterThan(0.8);
      expect(fx.eur).toBeLessThan(1);
    }
  });

  it("mentions : « converti au taux BCE du JJ/MM » et « taux de référence BCE du JJ/MM/AAAA »", () => {
    expect(mentionConversionBce({ date: "2026-10-09", source: "bce" })).toBe("converti au taux BCE du 09/10");
    expect(mentionConversionBce({ date: "2026-10-09", source: "secours" })).toBe("converti au dernier taux BCE connu, du 09/10/2026");
    expect(mentionFxBce({ date: "2026-10-09", source: "bce" })).toBe("taux de référence BCE du 09/10/2026");
    expect(mentionFxBce({ date: "2026-10-09", source: "secours" })).toBe("dernier taux de référence BCE connu, du 09/10/2026");
    expect(jourFx("2026-01-05")).toBe("05/01");
  });

  it("prix en euros d'une unité de devise : cohérents entre eux et avec la grille du convertisseur", () => {
    const e = eurPerUnit(FX_BCE);
    expect(e.eur).toBe(1);
    expect(e.usd).toBeCloseTo(1 / fichier.parEuro.USD, 12);
    expect(e.gbp).toBeCloseTo(1 / fichier.parEuro.GBP, 12); // 1 £ en euros = 1 / (livres pour 1 €)
    expect(e.chf).toBeCloseTo(1 / fichier.parEuro.CHF, 12);
    expect(FIAT_EUR_PRICE.usd).toBe(FX_BCE.eur);
    expect(FIAT_EUR_PRICE).not.toMatchObject({ usd: 0.92 });
  });

  it("aucun appel réseau : fiatPerUsd rend le taux du fichier même hors ligne", async () => {
    const f = vi.fn(async () => { throw new Error("hors ligne"); });
    vi.stubGlobal("fetch", f);
    const fx = await fiatPerUsd();
    expect(fx).toEqual(FX_BCE);
    expect(f).not.toHaveBeenCalled();
  });

  it("plus de taux en dur ni de relais : lib/fx-fallback.ts supprimé, ni Frankfurter ni EURUSDT dans le code des taux", () => {
    expect(existsSync(path.join(RACINE, "lib", "fx-fallback.ts"))).toBe(false);
    for (const f of ["lib/fx.ts", "lib/fx-bce.ts", "lib/historical-prices.ts", "lib/convertisseur-stats.ts", "components/crypto-detail/PairConverter.tsx", "components/crypto-detail/PfuQuickCalc.tsx"]) {
      const src = lire(f);
      expect(src, f).not.toMatch(/frankfurter|EURUSDT|FX_FALLBACK|0\.89087/);
    }
  });

  it("attribution : chaque écran qui affiche un euro dérivé d'un prix en dollars porte la mention BCE", () => {
    expect(lire("components/crypto-detail/PairConverter.tsx")).toMatch(/mentionConversionBce\(\)/);
    expect(lire("components/crypto-detail/PfuQuickCalc.tsx")).toMatch(/mentionConversionBce\(\)/);
    expect(lire("components/PortfolioView.tsx")).toMatch(/mentionConversionBce\(\)/);
    expect(lire("components/PortfolioTracker.tsx")).toMatch(/mentionConversionBce\(\)/);
    expect(lire("components/Converter.tsx")).toMatch(/mentionFxBce\(\)/);
    const conv = lire("app/convertisseur/[pair]/page.tsx");
    expect(conv).toMatch(/mentionConversionBce\(\)/);
    expect(conv).toMatch(/au taux BCE du \{jourFx\(FX_BCE\.date, true\)\}/);
    expect(conv).not.toMatch(/taux de change constant/);
    // repli CoinGecko du portefeuille : dollars × taux BCE (plus d'euros au taux propre de CoinGecko)
    const pp = lire("app/api/portfolio-prices/route.ts");
    expect(pp).toMatch(/vs_currency=usd/);
    expect(pp).toMatch(/\* FX_BCE\.eur/);
  });
});

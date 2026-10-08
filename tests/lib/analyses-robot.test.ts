/**
 * Lot L1 du regroupement (08/10/2026) : robot des analyses techniques (scripts/lib/analyses-techniques.mjs).
 * Calculs sur données connues, sources (bougie du jour écartée, replis), idempotence, échec = fichier intact,
 * aucun fichier daté écrit, aucun mot interdit dans les 5 fichiers de données.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  RETRY,
  SOURCE_CHAIN,
  TA_CRYPTOS,
  computeIndicators,
  fetchIndicators,
  generateAnalyses,
  mergeAnalysis,
  rsiWilder,
  serializeAnalysis,
  sma,
  trendOf,
  volatility,
} from "../../scripts/lib/analyses-techniques.mjs";
import { trouverInterdits } from "@/lib/vocabulaire-interdit";

const ROOT = process.cwd();
const DAY = 86_400_000;
const silence = { log() {}, warn() {}, error() {} } as unknown as Console;

beforeAll(() => {
  RETRY.delayMs = 0;
});

/** n bougies Kraken journalières se terminant par la bougie EN COURS du jour de `now`. */
function krakenRows(n: number, now: Date, close: (i: number) => number) {
  const today0 = Math.floor(now.getTime() / DAY) * DAY;
  return Array.from({ length: n }, (_, i) => {
    const t = (today0 - (n - 1 - i) * DAY) / 1000;
    const c = close(i).toFixed(2);
    return [t, c, c, c, c, c, "1.0", 10];
  });
}

function fakeFetch(handlers: Record<string, () => { status?: number; body?: unknown }>) {
  const calls: string[] = [];
  const f = async (url: string) => {
    calls.push(url);
    const key = Object.keys(handlers).find((k) => url.includes(k));
    if (!key) return new Response("{}", { status: 404 });
    const r = handlers[key]();
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  };
  return Object.assign(f, { calls });
}

const krakenOk = (now: Date, close = (i: number) => 100 + i + (i % 3)) =>
  fakeFetch({
    "api.kraken.com": () => ({
      body: { error: [], result: { ...Object.fromEntries(TA_CRYPTOS.map((c) => [c.kraken, krakenRows(720, now, close)])), last: 0 } },
    }),
  });

describe("calculs", () => {
  it("RSI de Wilder : exemple de référence sur 15 clôtures (gains 3,34, pertes 1,40)", () => {
    const closes = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28];
    expect(rsiWilder(closes, 14)).toBeCloseTo(100 - 100 / (1 + 3.34 / 1.4), 6);
    expect(rsiWilder(closes, 14)).toBeCloseTo(70.4641, 3);
  });

  it("RSI : série toujours croissante = 100 ; lissage de Wilder sur la suite de la série", () => {
    expect(rsiWilder(Array.from({ length: 50 }, (_, i) => 10 + i))).toBe(100);
    // 15 clôtures de référence puis une baisse de 1 : avgGain = 3,34/14 × 13/14, avgLoss = (1,40/14 × 13 + 1)/14
    const closes = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 45.28];
    const g = ((3.34 / 14) * 13) / 14;
    const l = ((1.4 / 14) * 13 + 1) / 14;
    expect(rsiWilder(closes)).toBeCloseTo(100 - 100 / (1 + g / l), 6);
  });

  it("moyennes 50 et 200 jours : moyenne arithmétique des dernières clôtures", () => {
    const closes = Array.from({ length: 300 }, (_, i) => i + 1);
    expect(sma(closes, 50)).toBe(275.5);
    expect(sma(closes, 200)).toBe(200.5);
  });

  it("volatilité 30 jours : écart-type des rendements logarithmiques × √365", () => {
    expect(volatility(Array.from({ length: 40 }, (_, i) => 100 * 1.01 ** i))).toBeCloseTo(0, 8);
    const alt = Array.from({ length: 31 }, (_, i) => (i % 2 === 0 ? 100 : 101));
    const lr = Math.log(1.01);
    expect(volatility(alt)).toBeCloseTo(Math.sqrt(30 / 29) * lr * Math.sqrt(365) * 100, 8);
  });

  it("tendance calculée : règle historique du robot", () => {
    expect(trendOf(110, 100, 90)).toBe("haussière");
    expect(trendOf(80, 90, 100)).toBe("baissière");
    expect(trendOf(95, 100, 90)).toBe("neutre");
    expect(trendOf(105, 90, 100)).toBe("neutre");
  });

  it("indicateurs : valeurs brutes, closes30 = 30 dernières clôtures, refus sous 201 clôtures", () => {
    const series = Array.from({ length: 250 }, (_, i) => ({ date: new Date(Date.UTC(2026, 0, 1) + i * DAY).toISOString().slice(0, 10), close: 1 + i / 7 }));
    const ind = computeIndicators(series);
    expect(ind.price).toBe(series[249].close);
    expect(ind.closeDate).toBe(series[249].date);
    expect(ind.closes30).toEqual(series.slice(-30).map((p) => p.close));
    expect(ind.change24h).toBeCloseTo((series[249].close / series[248].close - 1) * 100, 10);
    expect(Number.isInteger(ind.ma50 * 100)).toBe(false); // pas d'arrondi au stockage
    expect(() => computeIndicators(series.slice(0, 200))).toThrow(/trop court/);
  });
});

describe("sources", () => {
  it("Kraken : la bougie du jour en cours est écartée (clôtures terminées seulement), euros", async () => {
    const now = new Date("2026-10-08T04:31:12Z");
    const f = krakenOk(now);
    const ind = await fetchIndicators(TA_CRYPTOS[0], { fetchImpl: f as unknown as typeof fetch, nowMs: now.getTime(), log: silence });
    expect(ind.source).toBe("kraken");
    expect(ind.pair).toBe("XBTEUR");
    expect(ind.closeDate).toBe("2026-10-07");
    expect(f.calls[0]).toContain("pair=XBTEUR&interval=1440");
  });

  it("repli : Kraken en panne → données publiques de Binance en euros (bougies terminées)", async () => {
    const now = new Date("2026-10-08T04:31:12Z");
    const today0 = Date.UTC(2026, 9, 8);
    const klines = Array.from({ length: 400 }, (_, i) => {
      const open = today0 - (399 - i) * DAY;
      return [open, "1", "1", "1", String(50 + i), "1", open + DAY - 1];
    });
    const f = fakeFetch({ "api.kraken.com": () => ({ status: 503 }), "data-api.binance.vision": () => ({ body: klines }) });
    const ind = await fetchIndicators(TA_CRYPTOS[1], { fetchImpl: f as unknown as typeof fetch, nowMs: now.getTime(), log: silence });
    expect(ind.source).toBe("binance-data-api");
    expect(ind.pair).toBe("ETHEUR");
    expect(ind.closeDate).toBe("2026-10-07");
    expect(f.calls.some((u) => u.includes("symbol=ETHEUR"))).toBe(true);
  });

  it("plus de repli CoinGecko (licence) : Kraken et Binance en panne → échec, aucun appel à CoinGecko", async () => {
    const now = new Date("2026-10-08T04:31:12Z");
    const f = fakeFetch({ "api.kraken.com": () => ({ status: 503 }), "data-api.binance.vision": () => ({ status: 503 }), "api.coingecko.com": () => ({ body: { prices: [] } }) });
    await expect(fetchIndicators(TA_CRYPTOS[0], { fetchImpl: f as unknown as typeof fetch, nowMs: now.getTime(), log: silence })).rejects.toThrow(/toutes les sources/);
    expect(f.calls.some((u) => u.includes("coingecko"))).toBe(false);
    expect(SOURCE_CHAIN.map((s) => s.id)).toEqual(["kraken", "binance-data-api"]);
  });
});

describe("fichiers de données", () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ta-robot-"));

  it("idempotent : deux passages le même jour = une seule ligne du jour, JSON identiques hormis calculatedAt", async () => {
    const dir = tmp();
    const t1 = new Date("2026-10-08T04:31:12Z");
    const t2 = new Date("2026-10-08T09:02:45Z");
    await generateAnalyses({ dir, fetchImpl: krakenOk(t1) as unknown as typeof fetch, now: t1, log: silence });
    const avant = Object.fromEntries(TA_CRYPTOS.map((c) => [c.slug, fs.readFileSync(path.join(dir, `${c.slug}.json`), "utf8")]));
    const r = await generateAnalyses({ dir, fetchImpl: krakenOk(t2) as unknown as typeof fetch, now: t2, log: silence });
    expect(r).toEqual({ updated: 5, errors: 0 });
    for (const c of TA_CRYPTOS) {
      const apres = fs.readFileSync(path.join(dir, `${c.slug}.json`), "utf8");
      // `latest` ET la ligne du jour portent l'heure du calcul (reprise L2) : seules ces valeurs changent
      const sans = (s: string) => s.replace(/"calculatedAt": ?"[^"]+"/g, "");
      expect(sans(apres)).toBe(sans(avant[c.slug]));
      expect(apres).toContain('"calculatedAt": "2026-10-08T09:02:45Z"');
      const j = JSON.parse(apres);
      expect(j.history.filter((h: { date: string }) => h.date === "2026-10-08")).toHaveLength(1);
      expect(j.latest.currency).toBe("EUR");
    }
    expect(fs.readdirSync(dir).sort()).toEqual(TA_CRYPTOS.map((c) => `${c.slug}.json`).sort());
  });

  it("le lendemain : une ligne de plus, l'historique importé est gardé, tri du plus récent au plus ancien", async () => {
    const dir = tmp();
    const ancien = { slug: "bitcoin", symbol: "BTC", name: "Bitcoin", latest: null, history: [{ date: "2026-10-07", currency: "USD", price: 84050, rsi14: 55.96, ma50: 80311, ma200: 71769, trend: "haussière", origin: "publié" }] };
    fs.writeFileSync(path.join(dir, "bitcoin.json"), serializeAnalysis(ancien));
    const t = new Date("2026-10-08T04:31:12Z");
    await generateAnalyses({ dir, fetchImpl: krakenOk(t) as unknown as typeof fetch, now: t, log: silence, cryptos: [TA_CRYPTOS[0]] });
    const j = JSON.parse(fs.readFileSync(path.join(dir, "bitcoin.json"), "utf8"));
    expect(j.history.map((h: { date: string }) => h.date)).toEqual(["2026-10-08", "2026-10-07"]);
    expect(j.history[1]).toEqual(ancien.history[0]);
  });

  it("échec d'une source : le fichier de la crypto n'est PAS touché (octet pour octet), les autres sont mis à jour", async () => {
    const dir = tmp();
    const t = new Date("2026-10-08T04:31:12Z");
    await generateAnalyses({ dir, fetchImpl: krakenOk(t) as unknown as typeof fetch, now: t, log: silence });
    const avant = fs.readFileSync(path.join(dir, "solana.json"));
    const t2 = new Date("2026-10-09T04:31:12Z");
    const ok = krakenOk(t2);
    const panne = async (url: string) => {
      if (/SOLEUR|solana/.test(url)) return new Response("{}", { status: 500 });
      return ok(url);
    };
    const r = await generateAnalyses({ dir, fetchImpl: panne as unknown as typeof fetch, now: t2, log: silence });
    expect(r).toEqual({ updated: 4, errors: 1 });
    expect(fs.readFileSync(path.join(dir, "solana.json")).equals(avant)).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(dir, "bitcoin.json"), "utf8")).latest.date).toBe("2026-10-09");
    expect(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("fichier illisible : aucune écriture, erreur comptée", async () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, "xrp.json"), "{ cassé");
    const t = new Date("2026-10-08T04:31:12Z");
    const r = await generateAnalyses({ dir, fetchImpl: krakenOk(t) as unknown as typeof fetch, now: t, log: silence, cryptos: [TA_CRYPTOS[3]] });
    expect(r).toEqual({ updated: 0, errors: 1 });
    expect(fs.readFileSync(path.join(dir, "xrp.json"), "utf8")).toBe("{ cassé");
  });

  it("mergeAnalysis : latest complet (horodatage UTC sans millisecondes, source, paire, devise, closes30, règle)", () => {
    const series = Array.from({ length: 300 }, (_, i) => ({ date: new Date(Date.UTC(2025, 11, 1) + i * DAY).toISOString().slice(0, 10), close: 10 + i }));
    const ind = { source: "kraken", pair: "XBTEUR", ...computeIndicators(series) };
    const a = mergeAnalysis(null, TA_CRYPTOS[0], ind, new Date("2026-10-08T04:31:12.345Z"));
    expect(a.latest.calculatedAt).toBe("2026-10-08T04:31:12Z");
    expect(a.latest).toMatchObject({ currency: "EUR", source: "kraken", sourceLabel: "Kraken (API publique)", pair: "XBTEUR" });
    expect(a.latest.closes30).toHaveLength(30);
    expect(a.latest.trendRule).toMatch(/haussière si le cours est au-dessus/);
    expect(a.history[0]).toMatchObject({ source: "kraken", pair: "XBTEUR", closeDate: a.latest.closeDate, calculatedAt: "2026-10-08T04:31:12Z" });
  });
});

describe("le robot n'écrit plus de fichier daté", () => {
  it("generate-daily-content.mjs n'écrit plus dans content/analyses-tech ni de MDX d'analyse", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts/generate-daily-content.mjs"), "utf8");
    expect(src).not.toMatch(/"analyses-tech"/);
    expect(src).not.toMatch(/analyse-technique`/);
    expect(src).not.toMatch(/function buildTAArticle/);
    expect(src).toMatch(/generateAnalyses\(\{ dir: TA_DATA_DIR \}\)/);
  });

  it("content/analyses-tech/ n'existe plus (ou est vide)", () => {
    const d = path.join(ROOT, "content/analyses-tech");
    expect(fs.existsSync(d) ? fs.readdirSync(d) : []).toEqual([]);
  });

  it("aucun mot interdit dans les 5 fichiers de données publiés", () => {
    for (const c of TA_CRYPTOS) {
      const t = fs.readFileSync(path.join(ROOT, "data/analyses-techniques", `${c.slug}.json`), "utf8");
      expect(trouverInterdits(t), c.slug).toEqual([]);
    }
  });
});

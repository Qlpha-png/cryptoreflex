/**
 * Lot L1 du regroupement (08/10/2026) : import unique des 368 analyses datées dans l'historique des pages vivantes
 * (scripts/import-ta-history.mjs). Lecture tolérante des formats successifs du robot, puis contrôle du résultat publié :
 * ≥ 368 lignes, 0 valeur manquante, devise portée par chaque ligne, une ligne par date.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED, mergeImported, parseNumber, parseTAMdx } from "../../scripts/import-ta-history.mjs";
import { TA_CRYPTOS } from "../../scripts/lib/analyses-techniques.mjs";
import anciennes from "../fixtures/analyses-datees.json";
import { LIGNES_RETIREES } from "@/lib/analyses-techniques";

const ROOT = process.cwd();
const NNBSP = String.fromCharCode(0x202f);
const NBSP = String.fromCharCode(0x00a0);

const ANCIEN = `---
title: "Cardano (ADA) — Analyse technique du 26 avril 2026"
date: "2026-04-26"
symbol: "ADA"
currentPrice: 0.7825
trend: "neutral"
rsi: 45.0
change24h: -2.10
indicators:
  rsi: 45.0
  ma50: 0.8120
  ma200: 0.7450
---

| Indicateur | Valeur | Lecture |
| --- | --- | --- |
| MA 50 | 0,9999 $ | Prix en-dessous |
`;

const RECENT = (sep: string) => `---\r
title: "Analyse technique BTC du 3 octobre 2026"\r
date: "2026-10-03"\r
symbol: "BTC"\r
currentPrice: 84520\r
trend: "Haussier"\r
rsi: 63.08\r
change24h: -2.60\r
---\r
\r
| Indicateur | Valeur | Lecture |\r
|---|---|---|\r
| RSI (14) | 63,1 | Zone neutre |\r
| MA 50 | 78${sep}551,66 $ | Prix au-dessus de la moyenne |\r
| MA 200 | 71${sep}415,69 $ | Prix au-dessus de la moyenne |\r
`;

describe("lecture tolérante des analyses publiées", () => {
  it("nombres : espaces ordinaires, insécables ou fines, virgule décimale, symbole $", () => {
    expect(parseNumber("78 551,66 $")).toBe(78551.66);
    expect(parseNumber(`79${NNBSP}926 $`)).toBe(79926);
    expect(parseNumber(`0,7825${NBSP}$`)).toBe(0.7825);
    expect(parseNumber("85921.5")).toBe(85921.5);
    expect(parseNumber("—")).toBeNull();
  });

  it("ancien format (avril) : moyennes de l'en-tête, préférées au tableau ; tendance « neutral »", () => {
    const { slug, row, problems } = parseTAMdx(ANCIEN, "2026-04-26-ada-analyse-technique.mdx");
    expect(problems).toEqual([]);
    expect(slug).toBe("cardano");
    expect(row).toEqual({ date: "2026-04-26", currency: "USD", price: 0.7825, rsi14: 45, ma50: 0.812, ma200: 0.745, trend: "neutre", change24h: -2.1, origin: "publié" });
  });

  it.each([" ", NBSP, NNBSP])("format récent (tableau, fins de ligne CRLF), séparateur de milliers %j", (sep) => {
    const { row, problems } = parseTAMdx(RECENT(sep), "2026-10-03-btc-analyse-technique.mdx");
    expect(problems).toEqual([]);
    expect(row).toMatchObject({ date: "2026-10-03", price: 84520, rsi14: 63.08, ma50: 78551.66, ma200: 71415.69, trend: "haussière" });
  });

  it("valeur manquante ou nom incohérent : signalé, jamais inventé", () => {
    const sansMa = parseTAMdx(RECENT(" ").replace(/\| MA 200 .*\r\n/, ""), "2026-10-03-btc-analyse-technique.mdx");
    expect(sansMa.problems).toContain("ma200 manquant");
    expect(sansMa.row.ma200).toBeNull();
    expect(parseTAMdx(RECENT(" "), "2026-10-04-btc-analyse-technique.mdx").problems.join()).toMatch(/date du nom/);
    expect(parseTAMdx(RECENT(" "), "2026-10-03-eth-analyse-technique.mdx").problems.join()).toMatch(/symbole du nom/);
  });

  it("fusion : une ligne déjà présente à la même date (calcul du robot) est gardée", () => {
    const existing = { latest: { date: "2026-10-08" }, history: [{ date: "2026-10-08", currency: "EUR", price: 1 }] };
    const m = mergeImported(existing, TA_CRYPTOS[0], [
      { date: "2026-10-08", currency: "USD", price: 2 },
      { date: "2026-10-07", currency: "USD", price: 3 },
    ]);
    expect(m.history.map((h: { date: string; currency: string }) => `${h.date} ${h.currency}`)).toEqual(["2026-10-08 EUR", "2026-10-07 USD"]);
    expect(m.latest).toBe(existing.latest);
  });
});

describe("historique publié (data/analyses-techniques)", () => {
  const fichiers = TA_CRYPTOS.map((c) => ({ c, j: JSON.parse(fs.readFileSync(path.join(ROOT, "data/analyses-techniques", `${c.slug}.json`), "utf8")) }));
  const lignes = fichiers.flatMap(({ j }) => j.history);

  // reprise L2 : les 5 lignes du 26/04/2026 (valeurs d'essai) sont retirées
  const retirees = new Set(LIGNES_RETIREES.map((r) => r.date));
  const nbRetirees = anciennes.slugs.filter((s: string) => retirees.has(s.slice(0, 10))).length;

  it("≥ 368 − 5 lignes (une par analyse datée publiée, hors lignes retirées), 0 valeur manquante", () => {
    expect(anciennes.slugs).toHaveLength(368);
    expect(nbRetirees).toBe(5);
    expect(lignes.length).toBeGreaterThanOrEqual(368 - nbRetirees);
    const manques = lignes.flatMap((h: Record<string, unknown>) =>
      REQUIRED.filter((k: string) => h[k] == null || (typeof h[k] === "number" && !Number.isFinite(h[k] as number))).map((k: string) => `${h.date} ${k}`),
    );
    expect(manques).toEqual([]);
  });

  it("chaque analyse datée publiée a sa ligne (même date, même crypto) ; celles du 08/10 remplacées par le calcul en euros du jour", () => {
    const bySym = Object.fromEntries(TA_CRYPTOS.map((c) => [c.symbol.toLowerCase(), c.slug]));
    const manquantes: string[] = [];
    for (const s of anciennes.slugs) {
      const [, date, sym] = /^(\d{4}-\d{2}-\d{2})-([a-z]+)-/.exec(s)!;
      const f = fichiers.find(({ c }) => c.slug === bySym[sym])!;
      const presente = f.j.history.some((h: { date: string }) => h.date === date);
      if (retirees.has(date)) expect(presente, `${s} doit être retirée`).toBe(false);
      else if (!presente) manquantes.push(s);
    }
    expect(manquantes).toEqual([]);
    const usd = lignes.filter((h: { currency: string }) => h.currency === "USD");
    expect(usd.length).toBe(368 - nbRetirees - lignes.filter((h: { date: string; currency: string }) => h.currency === "EUR").length);
    expect(usd.every((h: { origin: string }) => h.origin === "publié")).toBe(true);
  });

  it("vraisemblance : entre deux calculs de même devise, MA50 et MA200 ne varient pas plus que l'arithmétique ne le permet", () => {
    // Chaque jour, une clôture entre dans la moyenne et une en sort : |ΔMA_n| ≤ jours × (plus haut cours) / n. Le plus haut
    // cours de la fenêtre est inconnu : borne large = 3 × le plus grand nombre des deux lignes (aucune ligne réelle n'en
    // approche ; les lignes d'essai du 26/04/2026 la dépassaient de loin).
    const fautes: string[] = [];
    for (const { c, j } of fichiers) {
      const h = [...j.history].sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
      for (let i = 1; i < h.length; i++) {
        const a = h[i - 1];
        const b = h[i];
        if (a.currency !== b.currency) continue;
        const jours = (Date.parse(b.date) - Date.parse(a.date)) / 86_400_000;
        const haut = 3 * Math.max(a.price, b.price, a.ma50, b.ma50, a.ma200, b.ma200);
        if (Math.abs(b.ma200 - a.ma200) > (jours * haut) / 200 || Math.abs(b.ma50 - a.ma50) > (jours * haut) / 50) {
          fautes.push(`${c.slug} ${a.date} → ${b.date}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it("le contrôle de vraisemblance aurait refusé la ligne d'essai du 26/04/2026 (Bitcoin)", () => {
    const essai = { ma200: 78450, ma50: 89320, price: 95420 };
    const reel = { ma200: 84758.66, ma50: 71808.69, price: 77830 };
    const haut = 3 * Math.max(essai.price, reel.price, essai.ma50, reel.ma50, essai.ma200, reel.ma200);
    expect(Math.abs(reel.ma200 - essai.ma200) > (1 * haut) / 200).toBe(true);
  });

  it("une ligne par date, du plus récent au plus ancien, devise EUR ou USD, tendance au féminin", () => {
    for (const { c, j } of fichiers) {
      const dates = j.history.map((h: { date: string }) => h.date);
      expect(new Set(dates).size, c.slug).toBe(dates.length);
      expect([...dates].sort().reverse(), c.slug).toEqual(dates);
      for (const h of j.history) {
        expect(["EUR", "USD"]).toContain(h.currency);
        expect(["haussière", "baissière", "neutre"]).toContain(h.trend);
        expect(h.rsi14).toBeGreaterThanOrEqual(0);
        expect(h.rsi14).toBeLessThanOrEqual(100);
      }
      expect(j.latest.date, c.slug).toBe(dates[0]);
      expect(j.latest.currency).toBe("EUR");
      expect(j.latest.closes30).toHaveLength(30);
    }
  });
});

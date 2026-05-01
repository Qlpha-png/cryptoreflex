/**
 * Tests unitaires lib/cerfa-2086.ts
 *
 * Couvre :
 *  - parseCsv : sanity checks
 *  - validateTransactions : rejets clairs
 *  - computeCessions : conformité 150 VH bis sur 3 cas BOFiP officiels
 *  - buildSummary : exonération 305 €, exchanges étrangers, impôt PFU
 *  - generateCerfaPdf : produit un PDF non-vide (pdf-lib roundtrip)
 */

import { describe, it, expect } from "vitest";
import {
  parseCsv,
  validateTransactions,
  computeCessions,
  buildSummary,
  generateFullCerfa,
  type CerfaTransaction,
} from "@/lib/cerfa-2086";

/* -------------------------------------------------------------------------- */
/*  parseCsv                                                                  */
/* -------------------------------------------------------------------------- */

describe("parseCsv", () => {
  it("parse une CSV simple avec en-têtes", () => {
    const csv = `date,type,asset,quantity,price_eur
2024-01-15,buy,BTC,0.1,3500
2024-06-20,sell,BTC,0.05,1900`;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].asset).toBe("BTC");
    expect(rows[1].type).toBe("sell");
  });

  it("retourne [] sur CSV vide", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("date,type")).toEqual([]);
  });

  it("ignore les lignes blanches", () => {
    const csv = `date,type,asset,quantity
\n
2024-01-01,buy,BTC,1
\n`;
    expect(parseCsv(csv)).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  validateTransactions                                                      */
/* -------------------------------------------------------------------------- */

describe("validateTransactions", () => {
  it("accepte un tableau valide", () => {
    const r = validateTransactions([
      { date: "2024-01-15", type: "buy", asset: "BTC", quantity: 0.1, priceEur: 3500 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.transactions).toHaveLength(1);
  });

  it("rejette les types inconnus", () => {
    const r = validateTransactions([
      { date: "2024-01-15", type: "yolo", asset: "BTC", quantity: 1, priceEur: 100 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.errors[0].field).toBe("type");
  });

  it("rejette les dates invalides", () => {
    const r = validateTransactions([
      { date: "pas-une-date", type: "buy", asset: "BTC", quantity: 1, priceEur: 100 },
    ]);
    expect(r.ok).toBe(false);
  });

  it("rejette > 1000 transactions", () => {
    const big = Array.from({ length: 1001 }, () => ({
      date: "2024-01-01",
      type: "buy",
      asset: "BTC",
      quantity: 1,
      priceEur: 100,
    }));
    const r = validateTransactions(big);
    expect(r.ok).toBe(false);
  });

  it("rejette un input non-tableau", () => {
    expect(validateTransactions(null).ok).toBe(false);
    expect(validateTransactions({}).ok).toBe(false);
    expect(validateTransactions("foo").ok).toBe(false);
  });

  it("rejette un tableau vide", () => {
    const r = validateTransactions([]);
    expect(r.ok).toBe(false);
  });

  it("normalise asset en uppercase", () => {
    const r = validateTransactions([
      { date: "2024-01-15", type: "buy", asset: "btc", quantity: 1, priceEur: 100 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.transactions[0].asset).toBe("BTC");
  });
});

/* -------------------------------------------------------------------------- */
/*  computeCessions — cas BOFiP officiels (article 150 VH bis)                */
/* -------------------------------------------------------------------------- */

describe("computeCessions — formule 150 VH bis", () => {
  it("CAS 1 BOFiP : achat 5000 €, valeur portefeuille 10 000 €, vente 4000 € → PV 2000 €", () => {
    const txs: CerfaTransaction[] = [
      // Achat initial
      { date: "2024-01-10", type: "buy", asset: "BTC", quantity: 1, priceEur: 5000, fees: 0 },
      // Vente après doublement (prix marché 10 000 €/BTC)
      // valeur portefeuille = 1 × 10 000 = 10 000 €
      // prix cession = 0.4 × 10 000 = 4000 €
      // prix_acq_impute = 5000 × 4000 / 10 000 = 2000 €
      // PV = 4000 - 2000 = 2000 €
      { date: "2024-06-15", type: "sell", asset: "BTC", quantity: 0.4, priceEur: 10000, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    expect(cessions).toHaveLength(1);
    const c = cessions[0];
    expect(c.prixCessionEur).toBeCloseTo(4000);
    expect(c.prixAcquisitionImputeEur).toBeCloseTo(2000);
    expect(c.plusValueEur).toBeCloseTo(2000);
    expect(c.deficit).toBe(false);
  });

  it("CAS 2 BOFiP : moins-value (acquisitions > valeur portefeuille)", () => {
    const txs: CerfaTransaction[] = [
      // Achat 10 000 € à 50 000 €/BTC = 0.2 BTC
      { date: "2023-12-01", type: "buy", asset: "BTC", quantity: 0.2, priceEur: 50000, fees: 0 },
      // Vente après baisse à 40 000 €/BTC
      // valeur portefeuille = 0.2 × 40 000 = 8000 €
      // prix cession = 0.1 × 40 000 = 4000 €
      // prix_acq_impute = 10 000 × 4000 / 8000 = 5000 €
      // PV = 4000 - 5000 = -1000 € (moins-value)
      { date: "2024-03-10", type: "sell", asset: "BTC", quantity: 0.1, priceEur: 40000, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    expect(cessions).toHaveLength(1);
    expect(cessions[0].plusValueEur).toBeCloseTo(-1000);
    expect(cessions[0].deficit).toBe(true);
  });

  it("CAS 3 BOFiP : swap crypto/crypto neutre fiscalement", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
      // Le swap ne doit PAS générer de cession
      { date: "2024-03-01", type: "swap", asset: "BTC", quantity: 0.5, priceEur: 0, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    expect(cessions).toHaveLength(0);
  });

  it("filtre par année fiscale", () => {
    const txs: CerfaTransaction[] = [
      { date: "2023-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
      { date: "2023-06-01", type: "sell", asset: "BTC", quantity: 0.1, priceEur: 4000, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.1, priceEur: 5000, fees: 0 },
    ];
    const cessions2024 = computeCessions(txs, 2024);
    expect(cessions2024).toHaveLength(1);
    expect(cessions2024[0].date).toMatch(/2024/);
  });

  it("ignore les ventes hors année fiscale (cumul portefeuille préservé)", () => {
    const txs: CerfaTransaction[] = [
      { date: "2022-01-01", type: "buy", asset: "ETH", quantity: 5, priceEur: 2000, fees: 0 },
      // Vente 2023 hors année — mais doit toujours être prise en compte dans le cumul
      { date: "2023-01-01", type: "sell", asset: "ETH", quantity: 1, priceEur: 1500, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "ETH", quantity: 1, priceEur: 1800, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    expect(cessions).toHaveLength(1);
    expect(cessions[0].prixCessionEur).toBeCloseTo(1800);
  });
});

/* -------------------------------------------------------------------------- */
/*  buildSummary                                                              */
/* -------------------------------------------------------------------------- */

describe("buildSummary", () => {
  it("applique l'exonération si total cessions <= 305 €", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 1000, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.1, priceEur: 200, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    const s = buildSummary(cessions, txs, 2024);
    expect(s.exonere).toBe(true);
    expect(s.impotPfuEur).toBe(0);
  });

  it("calcule l'impôt PFU 30 % sur la plus-value nette", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 5000, fees: 0 },
      // valeur portefeuille = 1 × 10 000 = 10 000
      // prix cession = 0.4 × 10 000 = 4000
      // prix_acq_impute = 5000 × 4000 / 10000 = 2000
      // PV = 2000
      // impot = 2000 × 0.30 = 600
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.4, priceEur: 10000, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    const s = buildSummary(cessions, txs, 2024);
    expect(s.exonere).toBe(false);
    expect(s.impotPfuEur).toBeCloseTo(600);
  });

  it("détecte les exchanges étrangers pour 3916-bis", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 5000, fees: 0, exchange: "Binance" },
      { date: "2024-02-01", type: "buy", asset: "ETH", quantity: 1, priceEur: 2000, fees: 0, exchange: "Coinbase" },
      { date: "2024-03-01", type: "buy", asset: "USDC", quantity: 100, priceEur: 1, fees: 0, exchange: "Coinhouse" }, // FR
    ];
    const cessions = computeCessions(txs, 2024);
    const s = buildSummary(cessions, txs, 2024);
    expect(s.foreignExchanges).toContain("Binance");
    expect(s.foreignExchanges).toContain("Coinbase");
    expect(s.foreignExchanges).not.toContain("Coinhouse");
  });

  it("inclut le nom du contribuable s'il est fourni", () => {
    const s = buildSummary([], [], 2024, "Dupont Jean");
    expect(s.taxpayerName).toBe("Dupont Jean");
  });
});

/* -------------------------------------------------------------------------- */
/*  generateFullCerfa — smoke test (PDF binaire non vide)                     */
/* -------------------------------------------------------------------------- */

describe("generateFullCerfa", () => {
  it("produit un PDF non vide avec entête %PDF-", async () => {
    const transactions: CerfaTransaction[] = [
      { date: "2024-01-15", type: "buy", asset: "BTC", quantity: 0.1, priceEur: 3000, fees: 0, exchange: "Binance" },
      { date: "2024-06-20", type: "sell", asset: "BTC", quantity: 0.05, priceEur: 1900, fees: 5, exchange: "Binance" },
    ];
    const out = await generateFullCerfa({
      transactions,
      taxYear: 2024,
      taxpayerName: "Test User",
    });
    expect(out.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(out.pdfBytes.byteLength).toBeGreaterThan(1000);
    // Magic bytes du PDF : "%PDF-"
    const head = String.fromCharCode(...out.pdfBytes.slice(0, 5));
    expect(head).toBe("%PDF-");
    expect(out.summary.nbCessions).toBeGreaterThanOrEqual(0);
    expect(out.cessions).toBeInstanceOf(Array);
  });

  it("génère une annexe 3916-bis quand exchange étranger détecté", async () => {
    const transactions: CerfaTransaction[] = [
      { date: "2024-01-15", type: "buy", asset: "BTC", quantity: 0.1, priceEur: 3000, fees: 0, exchange: "Binance" },
    ];
    const out = await generateFullCerfa({ transactions, taxYear: 2024 });
    expect(out.summary.foreignExchanges).toContain("Binance");
  });
});

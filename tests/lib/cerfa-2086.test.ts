/**
 * Tests unitaires lib/cerfa-2086.ts (+ lib/tax-fr.ts calculatePlusValue)
 *
 * Référence : article 150 VH bis du CGI + BOFiP BOI-RPPM-PVBMC-30-20
 * (§50 frais, §100-120 fractions de capital initial / soultes, §140 valeur
 * globale) + formulaire 2086 (lignes 211 à 224).
 *
 * Formule officielle (formulaire 2086, ligne 224) :
 *   224 = 218 − [223 × (217 / 212)]
 *   212 = valeur globale du portefeuille au moment de la cession
 *   213 = prix de cession, 214 = frais de cession
 *   217 = prix de cession net des soultes (SANS déduction des frais)
 *   218 = prix de cession net des frais et des soultes
 *   220 = prix total d'acquisition du portefeuille (toutes cryptos, cumul)
 *   221 = fractions de capital initial déjà imputées aux cessions antérieures
 *   222 = soultes reçues lors d'échanges antérieurs
 *   223 = 220 − 221 − 222
 *
 * Couvre :
 *  - parseCsv / validateTransactions
 *  - computeLigne2086 : arithmétique des lignes (exemples BOFiP §110 et §120)
 *  - computeCessions : exemples officiels au centime, prix total d'acquisition
 *    GLOBAL minoré des fractions imputées, valeur globale au jour de la
 *    cession (saisie / calculée / à compléter), frais au 1er terme seulement
 *  - buildSummary : exonération 305 € (total des ventes), 2 années fiscales,
 *    calcul incomplet, avertissements
 *  - calculatePlusValue (lib/tax-fr) : frais de cession
 *  - generateFullCerfa : PDF non vide, y compris avec cession à compléter
 */

import { describe, it, expect } from "vitest";
import {
  parseCsv,
  validateTransactions,
  computeLigne2086,
  computeCessions,
  buildSummary,
  generateFullCerfa,
  type CerfaTransaction,
} from "@/lib/cerfa-2086";
import { calculatePlusValue } from "@/lib/tax-fr";

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

  it("accepte portfolioValueEur (valeur globale ligne 212 saisie) sur une vente", () => {
    const r = validateTransactions([
      {
        date: "2024-03-01",
        type: "sell",
        asset: "BTC",
        quantity: 1,
        priceEur: 450,
        portfolioValueEur: 1200,
      },
      { date: "2024-03-02", type: "sell", asset: "BTC", quantity: 1, priceEur: 450, portfolio_value_eur: "1300" },
    ]);
    expect(r.ok).toBe(true);
    expect(r.transactions[0].portfolioValueEur).toBe(1200);
    expect(r.transactions[1].portfolioValueEur).toBe(1300);
  });

  it("rejette un portfolioValueEur négatif ou non numérique", () => {
    const r = validateTransactions([
      { date: "2024-03-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 450, portfolioValueEur: -5 },
      { date: "2024-03-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 450, portfolioValueEur: "abc" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0].field).toBe("portfolioValueEur");
  });
});

/* -------------------------------------------------------------------------- */
/*  computeLigne2086 — arithmétique des lignes du formulaire                   */
/* -------------------------------------------------------------------------- */

describe("computeLigne2086 — lignes 212 à 224", () => {
  it("BOFiP §110, 1re cession : 450 − 1000 × 450 / 1200 = 75 €", () => {
    const l = computeLigne2086({
      valeurGlobaleEur: 1200,
      prixCessionEur: 450,
      prixTotalAcquisitionEur: 1000,
    });
    expect(l.prixCessionNetSoultesEur).toBe(450); // 217
    expect(l.prixCessionNetEur).toBe(450); // 218
    expect(l.prixAcquisitionNetEur).toBe(1000); // 223
    expect(l.fractionCapitalInitialEur).toBe(375);
    expect(l.plusValueEur).toBe(75);
  });

  it("BOFiP §110, 2e cession : 1300 − (1000 − 375) × 1300 / 1300 = 675 €", () => {
    const l = computeLigne2086({
      valeurGlobaleEur: 1300,
      prixCessionEur: 1300,
      prixTotalAcquisitionEur: 1000,
      fractionsAnterieuresEur: 375,
    });
    expect(l.prixAcquisitionNetEur).toBe(625);
    expect(l.fractionCapitalInitialEur).toBe(625);
    expect(l.plusValueEur).toBe(675);
  });

  it("BOFiP §120 (échange avec soulte) : lignes 222/223 — mars 250 €, octobre 200 €", () => {
    // Mars N : échange d'actifs (500 € payés) contre 600 € d'actifs + soulte 150 €,
    // valeur globale 750 → (600 + 150) − 500 × 750 / 750 = 250 €.
    const mars = computeLigne2086({
      valeurGlobaleEur: 750,
      prixCessionEur: 750,
      prixTotalAcquisitionEur: 500,
    });
    expect(mars.fractionCapitalInitialEur).toBe(500);
    expect(mars.plusValueEur).toBe(250);
    // Octobre N : 800 − [((500 + 750) − 500 − 150) × 800 / 800] = 200 €.
    const octobre = computeLigne2086({
      valeurGlobaleEur: 800,
      prixCessionEur: 800,
      prixTotalAcquisitionEur: 1250, // 220
      fractionsAnterieuresEur: 500, // 221
      soultesRecuesAnterieuresEur: 150, // 222
    });
    expect(octobre.prixAcquisitionNetEur).toBe(600); // 223
    expect(octobre.plusValueEur).toBe(200);
  });

  it("frais de cession (BOFiP §50) : déduits du 1er terme, PAS du quotient", () => {
    // (10 000 − 50) − 6 000 × 10 000 / 20 000 = 6 950 €
    const l = computeLigne2086({
      valeurGlobaleEur: 20000,
      prixCessionEur: 10000,
      fraisCessionEur: 50,
      prixTotalAcquisitionEur: 6000,
    });
    expect(l.prixCessionNetSoultesEur).toBe(10000); // 217 (brut de frais)
    expect(l.prixCessionNetEur).toBe(9950); // 218
    expect(l.fractionCapitalInitialEur).toBe(3000); // 6000 × 10000 / 20000
    expect(l.plusValueEur).toBe(6950);
  });

  it("refuse une valeur globale nulle ou négative", () => {
    expect(() =>
      computeLigne2086({ valeurGlobaleEur: 0, prixCessionEur: 10, prixTotalAcquisitionEur: 5 }),
    ).toThrow();
    expect(() =>
      computeLigne2086({ valeurGlobaleEur: -1, prixCessionEur: 10, prixTotalAcquisitionEur: 5 }),
    ).toThrow();
  });
});

/* -------------------------------------------------------------------------- */
/*  computeCessions — exemples officiels                                      */
/* -------------------------------------------------------------------------- */

describe("computeCessions — exemples officiels (au centime)", () => {
  it("EXEMPLE 1 (BOFiP §110) : 2 cessions, prix total d'acquisition minoré de la fraction imputée (75 € puis 675 €)", () => {
    // Portefeuille mono-actif : la valeur globale est calculée = qty détenue × prix
    // de cession (le prix de la cession EST le prix de l'actif au moment T).
    const txs: CerfaTransaction[] = [
      // Janvier : 1 000 € d'actifs (1 unité à 1 000 €)
      { date: "2024-01-10", type: "buy", asset: "XYZ", quantity: 1, priceEur: 1000, fees: 0 },
      // Mars : valeur globale 1 × 1 200 = 1 200 € ; cession 0,375 × 1 200 = 450 €
      { date: "2024-03-10", type: "sell", asset: "XYZ", quantity: 0.375, priceEur: 1200, fees: 0 },
      // Août : valeur globale 0,625 × 2 080 = 1 300 € ; cession de tout = 1 300 €
      { date: "2024-08-10", type: "sell", asset: "XYZ", quantity: 0.625, priceEur: 2080, fees: 0 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c).toHaveLength(2);

    expect(c[0].statut).toBe("calculee");
    expect(c[0].valeurGlobaleEur).toBeCloseTo(1200, 10); // 212
    expect(c[0].valeurGlobaleSource).toBe("calculee");
    expect(c[0].prixCessionEur).toBeCloseTo(450, 10); // 213
    expect(c[0].prixTotalAcquisitionEur).toBeCloseTo(1000, 10); // 220
    expect(c[0].fractionsAnterieuresEur).toBeCloseTo(0, 10); // 221
    expect(c[0].prixAcquisitionNetEur).toBeCloseTo(1000, 10); // 223
    expect(c[0].fractionCapitalInitialEur).toBeCloseTo(375, 10);
    expect(c[0].plusValueEur).toBeCloseTo(75, 10); // 224

    expect(c[1].statut).toBe("calculee");
    expect(c[1].valeurGlobaleEur).toBeCloseTo(1300, 10);
    expect(c[1].prixCessionEur).toBeCloseTo(1300, 10);
    expect(c[1].prixTotalAcquisitionEur).toBeCloseTo(1000, 10); // 220 inchangé (cumul des achats)
    expect(c[1].fractionsAnterieuresEur).toBeCloseTo(375, 10); // 221 = fraction imputée en mars
    expect(c[1].prixAcquisitionNetEur).toBeCloseTo(625, 10); // 223
    expect(c[1].fractionCapitalInitialEur).toBeCloseTo(625, 10);
    expect(c[1].plusValueEur).toBeCloseTo(675, 10);
  });

  it("EXEMPLE 1 bis : mêmes résultats avec la valeur globale SAISIE (portfolioValueEur)", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-10", type: "buy", asset: "XYZ", quantity: 1, priceEur: 1000, fees: 0 },
      { date: "2024-03-10", type: "sell", asset: "XYZ", quantity: 0.375, priceEur: 1200, fees: 0, portfolioValueEur: 1200 },
      { date: "2024-08-10", type: "sell", asset: "XYZ", quantity: 0.625, priceEur: 2080, fees: 0, portfolioValueEur: 1300 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c).toHaveLength(2);
    expect(c[0].valeurGlobaleSource).toBe("saisie");
    expect(c[0].plusValueEur).toBeCloseTo(75, 10);
    expect(c[1].valeurGlobaleSource).toBe("saisie");
    expect(c[1].fractionsAnterieuresEur).toBeCloseTo(375, 10);
    expect(c[1].plusValueEur).toBeCloseTo(675, 10);
  });

  it("EXEMPLE 3 (multi-cryptos) : BTC 10 000 € + ETH 10 000 €, vente BTC 30 000 € (portefeuille 40 000 €) → 15 000 € ; puis ETH 10 000 € → 5 000 €", () => {
    // Détail :
    //  Cession 1 : 212 = 40 000 ; 213 = 30 000 ; 220 = 20 000 ; 221 = 0 ; 223 = 20 000
    //              fraction = 20 000 × 30 000 / 40 000 = 15 000 → PV = 15 000
    //  Cession 2 : 212 = 10 000 (10 ETH × 1 000) ; 213 = 10 000 ; 220 = 20 000 ;
    //              221 = 15 000 ; 223 = 5 000 ; fraction = 5 000 × 10 000 / 10 000 = 5 000
    //              → PV = 10 000 − 5 000 = 5 000 (et NON −5 000 : le prix total
    //              d'acquisition restant est bien 5 000, pas 15 000).
    //  Contrôle : PV totale = 20 000 = (30 000 + 10 000) − 20 000 investis.
    const txs: CerfaTransaction[] = [
      { date: "2024-01-05", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 0 },
      { date: "2024-01-06", type: "buy", asset: "ETH", quantity: 10, priceEur: 1000, fees: 0 },
      // Valeur globale saisie (le CSV ne donne pas le prix ETH du jour)
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0, portfolioValueEur: 40000 },
      // Après la vente du BTC, le portefeuille ne contient plus que l'ETH → 212 calculable
      { date: "2024-09-01", type: "sell", asset: "ETH", quantity: 10, priceEur: 1000, fees: 0 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c).toHaveLength(2);

    expect(c[0].valeurGlobaleEur).toBe(40000);
    expect(c[0].prixTotalAcquisitionEur).toBeCloseTo(20000, 10);
    expect(c[0].fractionCapitalInitialEur).toBeCloseTo(15000, 10);
    expect(c[0].plusValueEur).toBeCloseTo(15000, 10);

    expect(c[1].statut).toBe("calculee");
    expect(c[1].valeurGlobaleSource).toBe("calculee");
    expect(c[1].valeurGlobaleEur).toBeCloseTo(10000, 10);
    expect(c[1].prixTotalAcquisitionEur).toBeCloseTo(20000, 10);
    expect(c[1].fractionsAnterieuresEur).toBeCloseTo(15000, 10);
    expect(c[1].prixAcquisitionNetEur).toBeCloseTo(5000, 10);
    expect(c[1].plusValueEur).toBeCloseTo(5000, 10);

    const s = buildSummary(c, txs, 2024);
    expect(s.plusValueNetteEur).toBeCloseTo(20000, 10);
  });

  it("EXEMPLE 4 (frais) : cession 10 000 € − 50 € de frais, 220 = 6 000 €, 212 = 20 000 € → 6 950 € ; la fraction imputée reste 3 000 €", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-05", type: "buy", asset: "BTC", quantity: 1, priceEur: 6000, fees: 0 },
      // 212 = 1 × 20 000 = 20 000 ; 213 = 0,5 × 20 000 = 10 000 ; 214 = 50
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.5, priceEur: 20000, fees: 50 },
      // Solde : 212 = 0,5 × 20 000 = 10 000 ; 213 = 10 000 ; 223 = 6 000 − 3 000 = 3 000
      { date: "2024-07-01", type: "sell", asset: "BTC", quantity: 0.5, priceEur: 20000, fees: 0 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c).toHaveLength(2);
    expect(c[0].prixCessionEur).toBeCloseTo(10000, 10); // 213
    expect(c[0].fraisCessionEur).toBe(50); // 214
    expect(c[0].prixCessionNetEur).toBeCloseTo(9950, 10); // 218
    expect(c[0].fractionCapitalInitialEur).toBeCloseTo(3000, 10); // 6000 × 10000 / 20000 (frais exclus du quotient)
    expect(c[0].plusValueEur).toBeCloseTo(6950, 10);

    expect(c[1].fractionsAnterieuresEur).toBeCloseTo(3000, 10); // 221 = 3 000 (pas 2 985)
    expect(c[1].prixAcquisitionNetEur).toBeCloseTo(3000, 10);
    expect(c[1].plusValueEur).toBeCloseTo(7000, 10);
    // Contrôle : 6 950 + 7 000 = 13 950 = 20 000 − 6 000 − 50
    expect((c[0].plusValueEur ?? 0) + (c[1].plusValueEur ?? 0)).toBeCloseTo(13950, 10);
  });
});

/* -------------------------------------------------------------------------- */
/*  computeCessions — règles de calcul                                        */
/* -------------------------------------------------------------------------- */

describe("computeCessions — formule 150 VH bis", () => {
  it("achat 5 000 €, valeur portefeuille 10 000 €, vente 4 000 € → PV 2 000 €", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-10", type: "buy", asset: "BTC", quantity: 1, priceEur: 5000, fees: 0 },
      // 212 = 1 × 10 000 ; 213 = 0,4 × 10 000 = 4 000 ; fraction = 5 000 × 4 000 / 10 000 = 2 000
      { date: "2024-06-15", type: "sell", asset: "BTC", quantity: 0.4, priceEur: 10000, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    expect(cessions).toHaveLength(1);
    const c = cessions[0];
    expect(c.prixCessionEur).toBeCloseTo(4000, 10);
    expect(c.fractionCapitalInitialEur).toBeCloseTo(2000, 10);
    expect(c.plusValueEur).toBeCloseTo(2000, 10);
    expect(c.deficit).toBe(false);
  });

  it("moins-value (acquisitions > valeur portefeuille)", () => {
    const txs: CerfaTransaction[] = [
      { date: "2023-12-01", type: "buy", asset: "BTC", quantity: 0.2, priceEur: 50000, fees: 0 },
      // 212 = 0,2 × 40 000 = 8 000 ; 213 = 4 000 ; fraction = 10 000 × 4 000 / 8 000 = 5 000 → −1 000
      { date: "2024-03-10", type: "sell", asset: "BTC", quantity: 0.1, priceEur: 40000, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    expect(cessions).toHaveLength(1);
    expect(cessions[0].plusValueEur).toBeCloseTo(-1000, 10);
    expect(cessions[0].deficit).toBe(true);
  });

  it("swap crypto/crypto sans soulte : pas de cession (sursis art. 150 VH bis II B)", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
      { date: "2024-03-01", type: "swap", asset: "BTC", quantity: 0.5, priceEur: 0, fees: 0 },
    ];
    expect(computeCessions(txs, 2024)).toHaveLength(0);
  });

  it("2 années fiscales : la fraction imputée en N−1 minore le prix total d'acquisition en N", () => {
    // Exemple BOFiP §110 étalé sur 2023 / 2024
    const txs: CerfaTransaction[] = [
      { date: "2023-01-10", type: "buy", asset: "XYZ", quantity: 1, priceEur: 1000, fees: 0 },
      { date: "2023-03-10", type: "sell", asset: "XYZ", quantity: 0.375, priceEur: 1200, fees: 0 },
      { date: "2024-08-10", type: "sell", asset: "XYZ", quantity: 0.625, priceEur: 2080, fees: 0 },
    ];
    const c2023 = computeCessions(txs, 2023);
    expect(c2023).toHaveLength(1);
    expect(c2023[0].plusValueEur).toBeCloseTo(75, 10);

    const c2024 = computeCessions(txs, 2024);
    expect(c2024).toHaveLength(1);
    expect(c2024[0].date).toMatch(/^2024/);
    expect(c2024[0].fractionsAnterieuresEur).toBeCloseTo(375, 10);
    expect(c2024[0].plusValueEur).toBeCloseTo(675, 10);
  });

  it("filtre par année fiscale (ancien test, chiffres exacts)", () => {
    const txs: CerfaTransaction[] = [
      { date: "2023-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
      // 2023 : 212 = 4 000 ; 213 = 400 ; fraction = 30 000 × 400 / 4 000 = 3 000 ; PV −2 600
      { date: "2023-06-01", type: "sell", asset: "BTC", quantity: 0.1, priceEur: 4000, fees: 0 },
      // 2024 : 212 = 0,9 × 5 000 = 4 500 ; 213 = 500 ; 223 = 27 000 ; fraction = 3 000 ; PV −2 500
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.1, priceEur: 5000, fees: 0 },
    ];
    const cessions2024 = computeCessions(txs, 2024);
    expect(cessions2024).toHaveLength(1);
    expect(cessions2024[0].date).toMatch(/2024/);
    expect(cessions2024[0].fractionsAnterieuresEur).toBeCloseTo(3000, 10);
    expect(cessions2024[0].fractionCapitalInitialEur).toBeCloseTo(3000, 10);
    expect(cessions2024[0].plusValueEur).toBeCloseTo(-2500, 10);
  });

  it("ventes hors année fiscale : cumul (220/221) préservé", () => {
    const txs: CerfaTransaction[] = [
      { date: "2022-01-01", type: "buy", asset: "ETH", quantity: 5, priceEur: 2000, fees: 0 },
      // 2023 : 212 = 7 500 ; 213 = 1 500 ; fraction = 10 000 × 1 500 / 7 500 = 2 000
      { date: "2023-01-01", type: "sell", asset: "ETH", quantity: 1, priceEur: 1500, fees: 0 },
      // 2024 : 212 = 4 × 1 800 = 7 200 ; 213 = 1 800 ; 223 = 8 000 ; fraction = 2 000 ; PV −200
      { date: "2024-06-01", type: "sell", asset: "ETH", quantity: 1, priceEur: 1800, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    expect(cessions).toHaveLength(1);
    expect(cessions[0].prixCessionEur).toBeCloseTo(1800, 10);
    expect(cessions[0].fractionsAnterieuresEur).toBeCloseTo(2000, 10);
    expect(cessions[0].plusValueEur).toBeCloseTo(-200, 10);
  });

  it("ligne 'fee' en crypto : la quantité sort du portefeuille (valeur globale exacte)", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 0 },
      { date: "2024-02-01", type: "fee", asset: "BTC", quantity: 0.1, priceEur: 0, fees: 0 },
      // Détenu : 0,9 BTC → 212 = 0,9 × 20 000 = 18 000 = 213 → fraction = 10 000 → PV 8 000
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.9, priceEur: 20000, fees: 0 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c).toHaveLength(1);
    expect(c[0].statut).toBe("calculee");
    expect(c[0].valeurGlobaleEur).toBeCloseTo(18000, 8);
    expect(c[0].plusValueEur).toBeCloseTo(8000, 8);
  });

  it("date de cession en heure de Paris : vente horodatée 31/12 23h30 UTC → année fiscale suivante", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 0 },
      // 2024-12-31T23:30Z = 1er janvier 2025 00:30 à Paris
      { date: "2024-12-31T23:30:00Z", type: "sell", asset: "BTC", quantity: 1, priceEur: 20000, fees: 0 },
    ];
    expect(computeCessions(txs, 2024)).toHaveLength(0);
    const c2025 = computeCessions(txs, 2025);
    expect(c2025).toHaveLength(1);
    expect(c2025[0].plusValueEur).toBeCloseTo(10000, 8);
    // Une date sans heure reste sur son jour calendaire
    const plain: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 0 },
      { date: "2024-12-31", type: "sell", asset: "BTC", quantity: 1, priceEur: 20000, fees: 0 },
    ];
    expect(computeCessions(plain, 2024)).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  computeCessions — valeur globale du portefeuille (ligne 212)              */
/* -------------------------------------------------------------------------- */

describe("computeCessions — valeur globale au jour de la cession", () => {
  const achats: CerfaTransaction[] = [
    { date: "2024-01-05", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 0 },
    { date: "2024-01-06", type: "buy", asset: "ETH", quantity: 10, priceEur: 1000, fees: 0 },
  ];

  it("prix manquant pour un actif détenu → cession « à compléter », PV null, et les cessions suivantes aussi (221 inconnu)", () => {
    const txs: CerfaTransaction[] = [
      ...achats,
      // Vente BTC : ETH détenu mais aucun prix ETH ce jour-là → 212 non calculable
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
      // Vente ETH : mono-actif donc 212 calculable, MAIS la fraction imputée en juin est inconnue
      { date: "2024-09-01", type: "sell", asset: "ETH", quantity: 10, priceEur: 1000, fees: 0 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c).toHaveLength(2);

    expect(c[0].statut).toBe("a_completer");
    expect(c[0].valeurGlobaleEur).toBeNull();
    expect(c[0].plusValueEur).toBeNull();
    expect(c[0].fractionCapitalInitialEur).toBeNull();
    expect(c[0].prixCessionEur).toBeCloseTo(30000, 10); // 213 connu
    expect(c[0].prixTotalAcquisitionEur).toBeCloseTo(20000, 10); // 220 connu
    expect(c[0].alertes.join(" ")).toMatch(/ETH/);
    expect(c[0].valorisation.find((v) => v.asset === "ETH")?.source).toBe("manquant");
    expect(c[0].valorisation.find((v) => v.asset === "BTC")?.source).toBe("prix_de_cession");

    expect(c[1].statut).toBe("a_completer");
    expect(c[1].valeurGlobaleEur).toBeCloseTo(10000, 10); // 212 calculable (mono-actif)
    expect(c[1].fractionsAnterieuresEur).toBeNull(); // 221 inconnu
    expect(c[1].plusValueEur).toBeNull();
    expect(c[1].alertes.join(" ")).toMatch(/ant[ée]rieure/i);

    const s = buildSummary(c, txs, 2024);
    expect(s.calculIncomplet).toBe(true);
    expect(s.nbCessions).toBe(2);
    expect(s.nbCessionsACompleter).toBe(2);
    expect(s.nbCessionsCalculees).toBe(0);
    expect(s.totalCessionsEur).toBeCloseTo(40000, 10); // 213 des 2 cessions
    expect(s.exonere).toBe(false);
  });

  it("un prix d'un AUTRE jour ne vaut pas prix du jour (pas d'extrapolation)", () => {
    const txs: CerfaTransaction[] = [
      ...achats,
      // Trade ETH la veille : ne doit PAS servir pour le 1er juin
      { date: "2024-05-31", type: "buy", asset: "ETH", quantity: 1, priceEur: 1500, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c[0].statut).toBe("a_completer");
  });

  it("prix du jour issu d'une transaction du même jour sur l'autre actif → 212 calculée, source tracée", () => {
    const txs: CerfaTransaction[] = [
      ...achats,
      // Même jour : achat 1 ETH à 1 200 € → prix ETH du jour = 1 200 €
      { date: "2024-06-01", type: "buy", asset: "ETH", quantity: 1, priceEur: 1200, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c).toHaveLength(1);
    expect(c[0].statut).toBe("calculee");
    expect(c[0].valeurGlobaleSource).toBe("calculee");
    // 212 = 1 × 30 000 + 11 × 1 200 = 43 200 ; 220 = 10 000 + 10 000 + 1 200 = 21 200
    expect(c[0].valeurGlobaleEur).toBeCloseTo(43200, 8);
    expect(c[0].prixTotalAcquisitionEur).toBeCloseTo(21200, 8);
    // fraction = 21 200 × 30 000 / 43 200 = 14 722,22… ; PV = 15 277,78
    expect(c[0].fractionCapitalInitialEur).toBeCloseTo((21200 * 30000) / 43200, 8);
    expect(c[0].plusValueEur).toBeCloseTo(30000 - (21200 * 30000) / 43200, 8);
    const eth = c[0].valorisation.find((v) => v.asset === "ETH");
    expect(eth?.source).toBe("transaction_meme_jour");
    expect(eth?.prixUnitaireEur).toBe(1200);
    expect(eth?.quantite).toBeCloseTo(11, 10);
  });

  it("priceLookup externe (option) : utilisé si aucune transaction du jour, source « source_externe »", () => {
    const txs: CerfaTransaction[] = [
      ...achats,
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
    ];
    const seen: string[] = [];
    const c = computeCessions(txs, 2024, {
      priceLookup: (asset, dateIso) => {
        seen.push(`${asset}@${dateIso}`);
        return asset === "ETH" && dateIso === "2024-06-01" ? 1000 : null;
      },
    });
    expect(seen).toContain("ETH@2024-06-01");
    expect(c[0].statut).toBe("calculee");
    expect(c[0].valeurGlobaleEur).toBeCloseTo(40000, 8);
    expect(c[0].plusValueEur).toBeCloseTo(15000, 8);
    expect(c[0].valorisation.find((v) => v.asset === "ETH")?.source).toBe("source_externe");
  });

  it("valeur globale SAISIE prioritaire sur le calcul (même si un prix manque)", () => {
    const txs: CerfaTransaction[] = [
      ...achats,
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0, portfolioValueEur: 41000 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c[0].statut).toBe("calculee");
    expect(c[0].valeurGlobaleSource).toBe("saisie");
    expect(c[0].valeurGlobaleEur).toBe(41000);
    expect(c[0].plusValueEur).toBeCloseTo(30000 - (20000 * 30000) / 41000, 8);
  });

  it("swap antérieur : composition du portefeuille non traçable → à compléter, sauf valeur saisie", () => {
    const base: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
      { date: "2024-03-01", type: "swap", asset: "BTC", quantity: 0.5, priceEur: 0, fees: 0 },
    ];
    const sansSaisie = computeCessions(
      [...base, { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.5, priceEur: 40000, fees: 0 }],
      2024,
    );
    expect(sansSaisie).toHaveLength(1);
    expect(sansSaisie[0].statut).toBe("a_completer");
    expect(sansSaisie[0].alertes.join(" ")).toMatch(/swap/i);

    const avecSaisie = computeCessions(
      [...base, { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.5, priceEur: 40000, fees: 0, portfolioValueEur: 50000 }],
      2024,
    );
    expect(avecSaisie[0].statut).toBe("calculee");
    // 213 = 20 000 ; 220 = 30 000 ; fraction = 30 000 × 20 000 / 50 000 = 12 000 → PV 8 000
    expect(avecSaisie[0].plusValueEur).toBeCloseTo(8000, 8);
  });

  it("historique incomplet (vente > quantité connue) → à compléter + alerte explicite", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 0.5, priceEur: 10000, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 20000, fees: 0 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c).toHaveLength(1);
    expect(c[0].statut).toBe("a_completer");
    expect(c[0].plusValueEur).toBeNull();
    expect(c[0].alertes.join(" ")).toMatch(/quantit/i);
  });

  it("prix de cession manquant (priceEur = 0) → à compléter, jamais ignoré en silence", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.5, priceEur: 0, fees: 0 },
    ];
    const c = computeCessions(txs, 2024);
    expect(c).toHaveLength(1);
    expect(c[0].statut).toBe("a_completer");
    expect(c[0].alertes.join(" ")).toMatch(/prix de cession/i);
  });
});

/* -------------------------------------------------------------------------- */
/*  buildSummary                                                              */
/* -------------------------------------------------------------------------- */

describe("buildSummary", () => {
  it("exonération si TOTAL des prix de cession de l'année ≤ 305 € (pas la plus-value)", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 100, fees: 0 },
      // 2 ventes : 150 € + 155 € = 305 € (≤ 305 → exonéré), PV largement positive
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.5, priceEur: 300, fees: 0 },
      { date: "2024-07-01", type: "sell", asset: "BTC", quantity: 0.5, priceEur: 310, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    const s = buildSummary(cessions, txs, 2024);
    expect(s.totalCessionsEur).toBeCloseTo(305, 10);
    expect(s.exonere).toBe(true);
    expect(s.impotPfuEur).toBe(0);
    // Les lignes 224 restent calculées (information), seule l'imposition tombe
    expect(cessions[0].plusValueEur).toBeCloseTo(100, 10); // 150 − 100 × 150 / 150
    expect(s.plusValueNetteEur).toBeGreaterThan(0);
  });

  it("le seuil se mesure sur les prix de cession NETS de frais (l. 218, total l. 51 du formulaire)", () => {
    // 310 € bruts − 6 € de frais = 304 € nets → exonéré, bien que la l. 213 dépasse 305 €
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 100, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 310, fees: 6 },
    ];
    const cessions = computeCessions(txs, 2024);
    const s = buildSummary(cessions, txs, 2024);
    expect(s.totalCessionsEur).toBeCloseTo(310, 10);
    expect(s.totalCessionsNetEur).toBeCloseTo(304, 10);
    expect(s.exonere).toBe(true);
    expect(s.impotPfuEur).toBe(0);
    // et 311 − 6 = 305,00 nets → encore exonéré (≤), 311,02 − 6 = 305,02 → imposable
    const t2 = [txs[0], { ...txs[1], priceEur: 311 }];
    expect(buildSummary(computeCessions(t2, 2024), t2, 2024).exonere).toBe(true);
    const t3 = [txs[0], { ...txs[1], priceEur: 311.02 }];
    expect(buildSummary(computeCessions(t3, 2024), t3, 2024).exonere).toBe(false);
  });

  it("3916-bis : « Bitpanda France » est un compte étranger (Bitpanda GmbH, Autriche), Coinhouse non", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 100, fees: 0, exchange: "Bitpanda France" },
      { date: "2024-02-01", type: "buy", asset: "ETH", quantity: 1, priceEur: 100, fees: 0, exchange: "Coinhouse" },
      { date: "2024-03-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 100, fees: 0, exchange: "Bitstack" },
    ];
    const s = buildSummary(computeCessions(txs, 2024), txs, 2024);
    expect(s.foreignExchanges).toContain("Bitpanda France");
    expect(s.foreignExchanges).not.toContain("Coinhouse");
    expect(s.foreignExchanges).not.toContain("Bitstack"); // Bitstack Digital Assets SAS, France
  });

  it("pas d'exonération à 305,01 € de ventes", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 100, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 305.01, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    const s = buildSummary(cessions, txs, 2024);
    expect(s.exonere).toBe(false);
    expect(s.impotPfuEur).toBeCloseTo((305.01 - 100) * 0.314, 8);
  });

  it("calcule l'impôt PFU 31,4 % sur la plus-value nette", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 5000, fees: 0 },
      // PV = 4 000 − 5 000 × 4 000 / 10 000 = 2 000 → impôt 628
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 0.4, priceEur: 10000, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    const s = buildSummary(cessions, txs, 2024);
    expect(s.exonere).toBe(false);
    expect(s.impotPfuEur).toBeCloseTo(628, 8);
    expect(s.calculIncomplet).toBe(false);
    expect(s.totalFraisCessionEur).toBe(0);
  });

  it("moins-values de l'année imputées sur les plus-values de l'année (nette = PV − MV)", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 0 },
      // 212 = 20 000 ; 213 = 10 000 ; fraction 5 000 → +5 000
      { date: "2024-03-01", type: "sell", asset: "BTC", quantity: 0.5, priceEur: 20000, fees: 0 },
      // 212 = 0,5 × 8 000 = 4 000 ; 213 = 4 000 ; 223 = 5 000 → fraction 5 000 → −1 000
      { date: "2024-09-01", type: "sell", asset: "BTC", quantity: 0.5, priceEur: 8000, fees: 0 },
    ];
    const cessions = computeCessions(txs, 2024);
    const s = buildSummary(cessions, txs, 2024);
    expect(s.totalPlusValuesEur).toBeCloseTo(5000, 8);
    expect(s.totalMoinsValuesEur).toBeCloseTo(1000, 8);
    expect(s.plusValueNetteEur).toBeCloseTo(4000, 8);
    expect(s.impotPfuEur).toBeCloseTo(4000 * 0.314, 8);
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

  it("avertissements : rewards (hypothèse) et frais d'acquisition (non intégrés) sont annoncés avec leur montant", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 25 },
      { date: "2024-02-01", type: "reward", asset: "ETH", quantity: 2, priceEur: 1000, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 20000, fees: 0, portfolioValueEur: 22000 },
    ];
    const cessions = computeCessions(txs, 2024);
    const s = buildSummary(cessions, txs, 2024);
    const txt = s.avertissements.join("\n");
    expect(txt).toMatch(/r[ée]compense|reward|staking/i);
    expect(txt).toMatch(/2[\s  ]?000/); // valeur des rewards intégrée en 220
    expect(txt).toMatch(/frais d.acquisition/i);
    expect(txt).toMatch(/25/);
    // 220 = 10 000 + 2 000 (reward) ; frais d'achat 25 € NON ajoutés
    expect(cessions[0].prixTotalAcquisitionEur).toBeCloseTo(12000, 8);
  });

  it("sans reward ni frais d'achat : pas d'avertissement correspondant", () => {
    const txs: CerfaTransaction[] = [
      { date: "2024-01-01", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 20000, fees: 0 },
    ];
    const s = buildSummary(computeCessions(txs, 2024), txs, 2024);
    expect(s.avertissements.join("\n")).not.toMatch(/reward|frais d.acquisition/i);
    expect(s.calculIncomplet).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*  calculatePlusValue (lib/tax-fr) — frais de cession                         */
/* -------------------------------------------------------------------------- */

describe("calculatePlusValue (lib/tax-fr)", () => {
  it("formule de base inchangée sans frais", () => {
    const r = calculatePlusValue({
      montantVente: 4000,
      acquisitionsTotales: 5000,
      valeurPortefeuille: 10000,
    });
    expect(r.plusValue).toBe(2000);
    expect(r.prixAcquisitionImpute).toBe(2000);
  });

  it("frais de cession : déduits du 1er terme uniquement (BOFiP §50) → 6 950 €", () => {
    const r = calculatePlusValue({
      montantVente: 10000,
      fraisCession: 50,
      acquisitionsTotales: 6000,
      valeurPortefeuille: 20000,
    });
    expect(r.prixAcquisitionImpute).toBe(3000);
    expect(r.plusValue).toBe(6950);
    expect(r.deficit).toBe(false);
  });

  it("exonération ≤ 305 € sur le total des cessions de l'année", () => {
    const r = calculatePlusValue({
      montantVente: 200,
      acquisitionsTotales: 100,
      valeurPortefeuille: 500,
      totalCessionsAnnee: 300,
    });
    expect(r.exonere).toBe(true);
    expect(r.plusValue).toBe(0);
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
    const head = String.fromCharCode(...out.pdfBytes.slice(0, 5));
    expect(head).toBe("%PDF-");
    expect(out.summary.nbCessions).toBe(1);
    expect(out.summary.calculIncomplet).toBe(false);
    expect(out.cessions[0].fraisCessionEur).toBe(5);
  });

  it("génère le PDF même avec une cession à compléter (sans planter) et le signale", async () => {
    const transactions: CerfaTransaction[] = [
      { date: "2024-01-05", type: "buy", asset: "BTC", quantity: 1, priceEur: 10000, fees: 0 },
      { date: "2024-01-06", type: "buy", asset: "ETH", quantity: 10, priceEur: 1000, fees: 0 },
      { date: "2024-06-01", type: "sell", asset: "BTC", quantity: 1, priceEur: 30000, fees: 0 },
    ];
    const out = await generateFullCerfa({ transactions, taxYear: 2024 });
    expect(out.pdfBytes.byteLength).toBeGreaterThan(1000);
    expect(out.summary.calculIncomplet).toBe(true);
    expect(out.summary.nbCessionsACompleter).toBe(1);
  });

  it("génère une annexe 3916-bis quand exchange étranger détecté", async () => {
    const transactions: CerfaTransaction[] = [
      { date: "2024-01-15", type: "buy", asset: "BTC", quantity: 0.1, priceEur: 3000, fees: 0, exchange: "Binance" },
    ];
    const out = await generateFullCerfa({ transactions, taxYear: 2024 });
    expect(out.summary.foreignExchanges).toContain("Binance");
  });
});

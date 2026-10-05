/**
 * Modèles CSV téléchargeables du générateur Cerfa 2086 (public/modeles/cerfa-2086-modele.csv et sa version Excel en
 * français cerfa-2086-modele-excel.csv), lus par la même fonction que le composant (lib/cerfa-csv.ts, parseCerfaFile).
 *
 * 05/10/2026 : le générateur ne lit PAS les exports natifs des plateformes (Coinbase, Kraken, Bitpanda…) ni l'export
 * Excel de Waltio, mais ce format pivot. Les modèles doivent passer tels quels dans le moteur et donner un résultat
 * connu, calculé à la main :
 *   212 = 0,02 BTC × 100 000 + 0,5 ETH × 4 000 = 4 000 € (saisie) ; 213 = 1 000 € ; 214 = 4 € ; 218 = 996 €
 *   220 = 1 800 + 1 500 = 3 300 € ; 221 = 0 ; 223 = 3 300 €
 *   224 = 996 − 3 300 × 1 000 / 4 000 = 171 €
 * Revues du 05/10 : aucune valeur douteuse ne doit être lue en silence (colonnes décalées, « 90.000 », prix vide…),
 * et les heures se lisent à l'heure de Paris.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { validateTransactions, computeCessions } from "@/lib/cerfa-2086";
import { parseCerfaFile, readNumber, normalizeDate } from "@/lib/cerfa-csv";

const read = (f: string) => readFileSync(join(process.cwd(), "public/modeles", f), "utf8");
const HEAD = "date,type,asset,quantity,price_eur,fees,exchange,portfolio_value_eur";

function cessionsOf(text: string) {
  const { txs, errors } = parseCerfaFile(text);
  expect(errors).toEqual([]);
  const v = validateTransactions(txs);
  expect(v.ok).toBe(true);
  return computeCessions(v.ok ? v.transactions : [], 2025);
}

function expect171(text: string) {
  const cessions = cessionsOf(text);
  expect(cessions).toHaveLength(1);
  const c = cessions[0];
  expect(c.statut).toBe("calculee");
  expect(c.valeurGlobaleEur).toBe(4000);
  expect(c.prixCessionNetEur).toBe(996);
  expect(c.prixTotalAcquisitionEur).toBe(3300);
  expect(c.plusValueEur).toBeCloseTo(171, 2);
}

function errorsOf(lines: string[]) {
  return parseCerfaFile([HEAD, ...lines].join("\n")).errors;
}

describe("modèles CSV du générateur Cerfa 2086", () => {
  it("le modèle standard porte exactement les colonnes lues et donne 171 €", () => {
    const csv = read("cerfa-2086-modele.csv");
    expect(csv.split(/\r?\n/)[0]).toBe(HEAD);
    expect171(csv);
  });

  it("le modèle « Excel en français » (« ; », virgule décimale, JJ/MM/AAAA, types en français) donne 171 €", () => {
    expect171(read("cerfa-2086-modele-excel.csv"));
  });

  it("le même modèle réenregistré par Excel (BOM, CRLF, guillemets, espaces insécables) donne 171 €", () => {
    const excelFr = [
      "﻿date;type;asset;quantity;price_eur;fees;exchange;portfolio_value_eur",
      "15/01/2025;achat;BTC;0,02;90 000;5;Coinbase;",
      '10/03/2025;Achat;ETH;0,5;"3 000,00";3;Kraken;',
      "20/09/2025;vente;BTC;0,01;100 000;4;Coinbase;4 000",
    ].join("\r\n");
    expect171(excelFr);
  });

  it("refuse clairement un export brut de plateforme (colonnes différentes)", () => {
    const coinbase = "ID,Timestamp,Transaction Type,Asset,Quantity Transacted\nx,2025-01-15T10:00:00Z,Buy,BTC,0.02";
    const { txs, errors } = parseCerfaFile(coinbase);
    expect(txs).toEqual([]);
    expect(errors[0]).toMatch(/Colonne manquante : date/);
  });
});

describe("aucune lecture silencieuse d'une valeur douteuse (revue du 05/10/2026)", () => {
  it("« 0,02 » non protégé dans le modèle à virgules : ligne signalée, pas lue de travers", () => {
    const res = parseCerfaFile([HEAD, "2025-01-15,buy,BTC,0,02,90000,5,Coinbase,"].join("\n"));
    expect(res.txs).toEqual([]);
    expect(res.errors[0]).toMatch(/^Ligne 2 : 9 valeurs pour 8 colonnes/);
  });

  it("montant ambigu « 90.000 », « 100.000 », « 1,234 » : refusé avec le numéro de ligne", () => {
    expect(errorsOf(["2025-01-15,buy,BTC,0.02,90.000,5,Coinbase,"])[0]).toMatch(/^Ligne 2 : prix « 90\.000 » ambigu/);
    expect(errorsOf(["2025-09-20,sell,BTC,0.01,100.000,4,Coinbase,4000"])[0]).toMatch(/ambigu/);
    expect(errorsOf(['2025-01-15,buy,BTC,0.02,"1,234",5,Coinbase,'])[0]).toMatch(/ambigu/);
    expect(errorsOf(["2025-09-20,sell,BTC,0.01,100000,4,Coinbase,4.000"])[0]).toMatch(/valeur du portefeuille .* ambiguë/);
  });

  it("prix manquant ou illisible sur un achat, frais ou quantité négatifs : refusés", () => {
    expect(errorsOf(["2025-01-15,buy,BTC,0.02,,5,Coinbase,"])[0]).toMatch(/^Ligne 2 : prix unitaire en euros manquant/);
    expect(errorsOf(["2025-01-15,buy,BTC,0.02,90000 EUR,5,Coinbase,"])[0]).toMatch(/illisible/);
    expect(errorsOf(["2025-01-15,buy,BTC,0.02,90000,−4,Coinbase,"])[0]).toMatch(/frais négatifs/);
    expect(errorsOf(["2025-01-15,buy,BTC,-0.02,90000,4,Coinbase,"])[0]).toMatch(/quantité nulle ou négative/);
  });

  it("un échange (swap) ou un transfert peut rester sans prix", () => {
    const res = parseCerfaFile([HEAD, "2025-02-01,transfer,BTC,0.01,,,Ledger,"].join("\n"));
    expect(res.errors).toEqual([]);
    expect(res.txs[0].priceEur).toBe(0);
  });
});

describe("lecture des nombres et des dates", () => {
  it("nombres à la française et à l'anglaise", () => {
    const v = (s: string, amount = false) => {
      const r = readNumber(s, amount);
      return r.ok ? r.value : r.reason;
    };
    expect(v("90 000", true)).toBe(90000);
    expect(v("1 234,56", true)).toBe(1234.56);
    expect(v("1.234,56", true)).toBe(1234.56);
    expect(v("1,234.56", true)).toBe(1234.56);
    expect(v("1.234.567", true)).toBe(1234567);
    expect(v("0,5")).toBe(0.5);
    expect(v("1.234")).toBe(1.234); // quantité : décimale
    expect(v("1.234", true)).toBe("ambigu"); // montant : 1,234 € ou 1 234 € ?
    expect(v("12 €", true)).toBe(12);
    expect(v("abc")).toBe("illisible");
    expect(v("")).toBe("vide");
  });

  it("dates ISO et JJ/MM/AAAA ; heures lues à l'heure de Paris ; dates impossibles refusées", () => {
    expect(normalizeDate("2025-09-20")).toBe("2025-09-20");
    expect(normalizeDate("20/09/2025")).toBe("2025-09-20");
    expect(normalizeDate("31/12/2025 23:30")).toBe("2025-12-31T22:30:00.000Z"); // hiver : UTC+1
    expect(normalizeDate("2025-12-31T23:30:00")).toBe("2025-12-31T22:30:00.000Z");
    expect(normalizeDate("05/03/2025 00:30")).toBe("2025-03-04T23:30:00.000Z");
    expect(normalizeDate("05/07/2025 01:30")).toBe("2025-07-04T23:30:00.000Z"); // été : UTC+2
    expect(normalizeDate("2025-06-01T10:00:00Z")).toBe("2025-06-01T10:00:00Z");
    expect(normalizeDate("31/02/2025")).toBeNull();
    expect(normalizeDate("2025-02-30")).toBeNull();
    expect(normalizeDate("2025/09/20")).toBeNull();
  });

  it("une vente du 31/12/2025 à 23 h 30 (heure de Paris) reste dans l'année 2025", () => {
    const text = [
      HEAD,
      "01/01/2025,buy,BTC,1,1000,0,Kraken,",
      "31/12/2025 23:30,sell,BTC,0.5,2000,0,Kraken,2000",
    ].join("\n");
    const { txs, errors } = parseCerfaFile(text);
    expect(errors).toEqual([]);
    expect(computeCessions(txs, 2025)).toHaveLength(1);
    expect(computeCessions(txs, 2026)).toHaveLength(0);
  });
});

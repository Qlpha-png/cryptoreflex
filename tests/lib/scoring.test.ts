import { describe, expect, it } from "vitest";
import {
  SCORING_WEIGHTS,
  computeCatalogueScore,
  computeGlobalScore,
  validateScoring,
  MULTI_ASSET_BROKER_IDS,
} from "@/lib/scoring";

/**
 * Tests unitaires lib/scoring.ts — coeur de la méthodologie publique.
 *
 * Critique car affichée sur /methodologie comme "formule publique reproductible
 * par tout lecteur". Une régression silencieuse ferait dériver le score global
 * de la promesse → casse de confiance + risque AMF/DDPP (info trompeuse).
 */

describe("SCORING_WEIGHTS", () => {
  it("somme à 1.00 (les 6 critères couvrent 100%)", () => {
    const total = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("respecte les pondérations annoncées sur /methodologie", () => {
    expect(SCORING_WEIGHTS.fees).toBe(0.2);
    expect(SCORING_WEIGHTS.security).toBe(0.25);
    expect(SCORING_WEIGHTS.mica).toBe(0.2);
    expect(SCORING_WEIGHTS.ux).toBe(0.15);
    expect(SCORING_WEIGHTS.support).toBe(0.1);
    expect(SCORING_WEIGHTS.catalogue).toBe(0.1);
  });
});

describe("computeGlobalScore", () => {
  it("calcule l'exemple Bitpanda affiché publiquement (4.4/5)", () => {
    // L'exemple est repris VERBATIM dans /methodologie + le PDF lead magnet.
    // Si ce test casse, le contenu utilisateur public n'est plus aligné.
    expect(
      computeGlobalScore({
        fees: 3.0,
        security: 4.7,
        mica: 4.9,
        ux: 4.6,
        support: 4.2,
        catalogue: 5.0,
      }),
    ).toBe(4.4);
  });

  it("calcule Coinbase (4.4/5)", () => {
    expect(
      computeGlobalScore({
        fees: 3.2,
        security: 4.9,
        mica: 4.8,
        ux: 4.7,
        support: 3.8,
        catalogue: 4.6,
      }),
    ).toBe(4.4);
  });

  it("retourne 0 quand toutes les sous-notes sont 0", () => {
    expect(
      computeGlobalScore({
        fees: 0,
        security: 0,
        mica: 0,
        ux: 0,
        support: 0,
        catalogue: 0,
      }),
    ).toBe(0);
  });

  it("retourne 5 quand toutes les sous-notes sont 5", () => {
    expect(
      computeGlobalScore({
        fees: 5,
        security: 5,
        mica: 5,
        ux: 5,
        support: 5,
        catalogue: 5,
      }),
    ).toBe(5);
  });

  it("arrondit toujours à 1 décimale", () => {
    const score = computeGlobalScore({
      fees: 4.123,
      security: 4.456,
      mica: 4.789,
      ux: 4.123,
      support: 4.456,
      catalogue: 4.789,
    });
    // Vérifier qu'il n'y a pas de décimale supplémentaire
    expect(score.toString()).toMatch(/^\d\.\d$/);
  });
});

describe("computeCatalogueScore", () => {
  it("retourne 2.5 pour catalogue très étroit (<=30 cryptos)", () => {
    expect(
      computeCatalogueScore({
        totalCryptos: 25,
        stakingAvailable: false,
        paymentMethodsCount: 2,
        isMultiAssetBroker: false,
      }),
    ).toBe(2.5);
  });

  it("retourne 5.0 capped pour très large catalogue (>700) avec tous bonus", () => {
    expect(
      computeCatalogueScore({
        totalCryptos: 800,
        stakingAvailable: true,
        paymentMethodsCount: 5,
        isMultiAssetBroker: true,
      }),
    ).toBe(5);
  });

  it("ajoute +0.3 si staking disponible", () => {
    const without = computeCatalogueScore({
      totalCryptos: 100,
      stakingAvailable: false,
      paymentMethodsCount: 2,
      isMultiAssetBroker: false,
    });
    const withStaking = computeCatalogueScore({
      totalCryptos: 100,
      stakingAvailable: true,
      paymentMethodsCount: 2,
      isMultiAssetBroker: false,
    });
    expect(withStaking - without).toBeCloseTo(0.3, 5);
  });

  it("ajoute +0.2 si >=5 méthodes de paiement", () => {
    const four = computeCatalogueScore({
      totalCryptos: 100,
      stakingAvailable: false,
      paymentMethodsCount: 4,
      isMultiAssetBroker: false,
    });
    const five = computeCatalogueScore({
      totalCryptos: 100,
      stakingAvailable: false,
      paymentMethodsCount: 5,
      isMultiAssetBroker: false,
    });
    expect(five - four).toBeCloseTo(0.2, 5);
  });

  it("ajoute +0.3 pour broker multi-actifs", () => {
    const without = computeCatalogueScore({
      totalCryptos: 100,
      stakingAvailable: false,
      paymentMethodsCount: 2,
      isMultiAssetBroker: false,
    });
    const broker = computeCatalogueScore({
      totalCryptos: 100,
      stakingAvailable: false,
      paymentMethodsCount: 2,
      isMultiAssetBroker: true,
    });
    expect(broker - without).toBeCloseTo(0.3, 5);
  });

  it("ne dépasse jamais 5.0", () => {
    const max = computeCatalogueScore({
      totalCryptos: 9999,
      stakingAvailable: true,
      paymentMethodsCount: 100,
      isMultiAssetBroker: true,
    });
    expect(max).toBeLessThanOrEqual(5);
  });

  it("Bitpanda (480 cryptos + staking + 7 methods + broker) = 5.0", () => {
    const bitpanda = computeCatalogueScore({
      totalCryptos: 480,
      stakingAvailable: true,
      paymentMethodsCount: 7,
      isMultiAssetBroker: true,
    });
    expect(bitpanda).toBe(5);
  });
});

describe("validateScoring", () => {
  it("ne lève pas d'erreur quand global est aligné sur la formule", () => {
    expect(() =>
      validateScoring("test", {
        global: 4.4,
        fees: 3.0,
        security: 4.7,
        mica: 4.9,
        ux: 4.6,
        support: 4.2,
        catalogue: 5.0,
      }),
    ).not.toThrow();
  });

  it("lève une erreur quand global dérive de >0.05", () => {
    expect(() =>
      validateScoring("test", {
        global: 4.0, // attendu : 4.4
        fees: 3.0,
        security: 4.7,
        mica: 4.9,
        ux: 4.6,
        support: 4.2,
        catalogue: 5.0,
      }),
    ).toThrow(/global=4|drift/i);
  });

  it("tolère un drift de ±0.05 (arrondi affichage)", () => {
    expect(() =>
      validateScoring("test", {
        global: 4.45, // attendu : 4.4 (drift = 0.05)
        fees: 3.0,
        security: 4.7,
        mica: 4.9,
        ux: 4.6,
        support: 4.2,
        catalogue: 5.0,
      }),
    ).not.toThrow();
  });
});

describe("MULTI_ASSET_BROKER_IDS", () => {
  it("contient les 4 brokers connus (Bitpanda, Trade Republic, Revolut, Swissborg)", () => {
    expect(MULTI_ASSET_BROKER_IDS.has("bitpanda")).toBe(true);
    expect(MULTI_ASSET_BROKER_IDS.has("trade-republic")).toBe(true);
    expect(MULTI_ASSET_BROKER_IDS.has("revolut")).toBe(true);
    expect(MULTI_ASSET_BROKER_IDS.has("swissborg")).toBe(true);
  });

  it("ne contient PAS les exchanges spot pure (Binance, Coinbase, etc.)", () => {
    expect(MULTI_ASSET_BROKER_IDS.has("binance")).toBe(false);
    expect(MULTI_ASSET_BROKER_IDS.has("coinbase")).toBe(false);
    expect(MULTI_ASSET_BROKER_IDS.has("kraken")).toBe(false);
    expect(MULTI_ASSET_BROKER_IDS.has("bybit")).toBe(false);
  });
});

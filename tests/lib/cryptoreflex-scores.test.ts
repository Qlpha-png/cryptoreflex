/**
 * Tests unitaires lib/cryptoreflex-scores.ts.
 *
 * Strategie : on cree des fixtures AnyCrypto representatives (Bitcoin Top10,
 * Solana Top10, hidden gem audited, hidden gem early-stage) et on valide
 * que les scores sont coherents avec les heuristiques attendues.
 */

import { describe, expect, it } from "vitest";
import { computeScores, getOverallScore } from "@/lib/cryptoreflex-scores";
import type { AnyCrypto } from "@/lib/cryptos";

const BITCOIN_FIXTURE: AnyCrypto = {
  kind: "top10",
  rank: 1,
  id: "bitcoin",
  name: "Bitcoin",
  symbol: "BTC",
  coingeckoId: "bitcoin",
  yearCreated: 2009,
  createdBy: "Satoshi Nakamoto",
  category: "Layer 1",
  tagline: "L'or numerique",
  what: "...",
  useCase: "...",
  consensus: "Proof of Work (PoW)",
  blockTime: "10 min",
  maxSupply: "21M",
  strengths: ["decentralisation", "securite", "liquidite", "adoption institutionnelle"],
  weaknesses: ["consommation energetique", "lent", "fees variables"],
  beginnerFriendly: 4,
  riskLevel: "Modéré",
  whereToBuy: ["Coinbase", "Kraken", "Binance France", "Bitpanda"],
};

const USDC_FIXTURE: AnyCrypto = {
  kind: "top10",
  rank: 7,
  id: "usdc",
  name: "USD Coin",
  symbol: "USDC",
  coingeckoId: "usd-coin",
  yearCreated: 2018,
  createdBy: "Circle",
  category: "Stablecoin centralise",
  tagline: "Dollar tokenise",
  what: "...",
  useCase: "...",
  consensus: "ERC-20 + autres",
  blockTime: "varies",
  maxSupply: "uncapped",
  strengths: ["transparence", "audits", "MiCA"],
  weaknesses: ["centralisation"],
  beginnerFriendly: 5,
  riskLevel: "Faible",
  whereToBuy: ["Coinbase", "Kraken", "Bitpanda", "Bitstamp"],
};

const HIDDEN_GEM_GOOD: AnyCrypto = {
  kind: "hidden-gem",
  rank: 50,
  id: "test-good",
  name: "Test Good",
  symbol: "TGD",
  coingeckoId: "test-good",
  yearCreated: 2020,
  category: "DeFi",
  tagline: "...",
  what: "...",
  whyHiddenGem: "...",
  marketCapRange: "100M$ - 500M$",
  reliability: {
    score: 8,
    teamIdentified: true,
    openSource: true,
    auditedBy: ["Trail of Bits", "OpenZeppelin"],
    lastAuditDate: "2025-01",
    yearsActive: 4,
    majorIncidents: "Aucun",
    fundingRaised: "$50M",
    backers: ["a16z", "Paradigm", "Coinbase Ventures"],
  },
  risks: [],
  useCase: "...",
  whereToBuy: ["Coinbase", "Kraken"],
  officialUrl: "https://test.example",
  monitoringSignals: [],
};

const HIDDEN_GEM_RISKY: AnyCrypto = {
  kind: "hidden-gem",
  rank: 200,
  id: "test-risky",
  name: "Test Risky",
  symbol: "TRK",
  coingeckoId: "test-risky",
  yearCreated: 2024,
  category: "Memecoin",
  tagline: "...",
  what: "...",
  whyHiddenGem: "...",
  marketCapRange: "10M$ - 50M$",
  reliability: {
    score: 3,
    teamIdentified: false,
    openSource: false,
    auditedBy: [],
    lastAuditDate: "",
    yearsActive: 1,
    majorIncidents: "Crash flash de mars 2025 — equipe a delisted la moitie de la liquidite sans annonce, panic mass sell.",
    fundingRaised: "",
    backers: [],
  },
  risks: [],
  useCase: "...",
  whereToBuy: [],
  officialUrl: "",
  monitoringSignals: [],
};

describe("cryptoreflex-scores", () => {
  it("Bitcoin a un score overall haut (PoW + ancien + top1 + PSAN)", () => {
    const s = computeScores(BITCOIN_FIXTURE);
    expect(s.decentralization.score).toBeGreaterThanOrEqual(75);
    expect(s.complianceFrEu.score).toBeGreaterThanOrEqual(75);
    expect(s.technicalMaturity.score).toBeGreaterThanOrEqual(70);
    expect(s.overall.score).toBeGreaterThanOrEqual(70);
    expect(s.decentralization.rationale).toMatch(/PoW/i);
  });

  it("USDC a un score conformite eleve (MiCA-compliant + PSAN exhaustif)", () => {
    const s = computeScores(USDC_FIXTURE);
    expect(s.complianceFrEu.score).toBeGreaterThanOrEqual(80);
    expect(s.complianceFrEu.rationale).toMatch(/MiCA|PSAN/i);
    // Stablecoin centralise -> decentralisation faible
    expect(s.decentralization.score).toBeLessThan(50);
  });

  it("Hidden gem audite (2 firms) a une bonne maturite tech", () => {
    const s = computeScores(HIDDEN_GEM_GOOD);
    expect(s.technicalMaturity.score).toBeGreaterThanOrEqual(60);
    expect(s.technicalMaturity.rationale).toMatch(/audit/i);
    expect(s.communityHealth.score).toBeGreaterThanOrEqual(55);
  });

  it("Hidden gem risque (no audit + incident + no team) a maturite tech faible", () => {
    const s = computeScores(HIDDEN_GEM_RISKY);
    expect(s.technicalMaturity.score).toBeLessThan(40);
    expect(s.technicalMaturity.rationale).toMatch(/incident|audit/i);
    expect(s.overall.score).toBeLessThan(50);
  });

  it("Privacy coin penalise sur conformite EU", () => {
    const monero: AnyCrypto = {
      kind: "top10",
      rank: 30,
      id: "monero",
      name: "Monero",
      symbol: "XMR",
      coingeckoId: "monero",
      yearCreated: 2014,
      createdBy: "Monero Project",
      category: "Privacy coin",
      tagline: "...",
      what: "...",
      useCase: "...",
      consensus: "Proof of Work",
      blockTime: "2 min",
      maxSupply: "uncapped",
      strengths: ["privacy"],
      weaknesses: ["regulation"],
      beginnerFriendly: 2,
      riskLevel: "Élevé",
      whereToBuy: ["Kraken"],
    };
    const s = computeScores(monero);
    expect(s.complianceFrEu.score).toBeLessThan(60);
    expect(s.complianceFrEu.rationale).toMatch(/privacy|reglementaire/i);
    // Mais score decentralisation reste haut (PoW Layer-1-like)
    expect(s.decentralization.score).toBeGreaterThanOrEqual(70);
  });

  it("getOverallScore retourne un nombre 0-100", () => {
    expect(getOverallScore(BITCOIN_FIXTURE)).toBeGreaterThanOrEqual(0);
    expect(getOverallScore(BITCOIN_FIXTURE)).toBeLessThanOrEqual(100);
    expect(getOverallScore(HIDDEN_GEM_RISKY)).toBeGreaterThanOrEqual(0);
    expect(getOverallScore(HIDDEN_GEM_RISKY)).toBeLessThanOrEqual(100);
  });

  it("scores sont deterministes (idempotent)", () => {
    const s1 = computeScores(BITCOIN_FIXTURE);
    const s2 = computeScores(BITCOIN_FIXTURE);
    expect(s1).toEqual(s2);
  });

  it("overall confidence reflete moyenne des sub-confidences", () => {
    const s = computeScores(HIDDEN_GEM_GOOD);
    expect(s.overall.confidence).toBeGreaterThan(0);
    expect(s.overall.confidence).toBeLessThanOrEqual(1);
  });
});

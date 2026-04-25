/**
 * lib/cryptos.ts — Source de vérité unifiée pour les fiches crypto.
 *
 * Merge des deux datasets éditoriaux du site :
 *   - data/top-cryptos.json   (Top 10 par capitalisation, profil grand public)
 *   - data/hidden-gems.json   (10 pépites de cap moyenne avec scoring fiabilité)
 *
 * Toutes les fonctions ci-dessous sont synchrones et SSR-friendly :
 * elles ne dépendent ni de fetch() ni de runtime Node spécifique.
 */

import topCryptosData from "@/data/top-cryptos.json";
import hiddenGemsData from "@/data/hidden-gems.json";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type CryptoKind = "top10" | "hidden-gem";
export type RiskLevel = "Très faible" | "Faible" | "Modéré" | "Élevé" | "Très élevé";

export interface TopCrypto {
  rank: number;
  id: string;
  name: string;
  symbol: string;
  coingeckoId: string;
  yearCreated: number;
  createdBy: string;
  category: string;
  tagline: string;
  what: string;
  useCase: string;
  consensus: string;
  blockTime: string;
  maxSupply: string;
  strengths: string[];
  weaknesses: string[];
  beginnerFriendly: number; // 1..5
  riskLevel: RiskLevel;
  whereToBuy: string[];
}

export interface HiddenGemReliability {
  score: number; // 0..10
  teamIdentified: boolean;
  openSource: boolean;
  auditedBy: string[];
  lastAuditDate: string;
  yearsActive: number;
  majorIncidents: string;
  fundingRaised: string;
  backers: string[];
}

export interface HiddenGem {
  rank: number;
  id: string;
  name: string;
  symbol: string;
  coingeckoId: string;
  marketCapRange: string;
  yearCreated: number;
  category: string;
  tagline: string;
  what: string;
  whyHiddenGem: string;
  reliability: HiddenGemReliability;
  risks: string[];
  useCase: string;
  whereToBuy: string[];
  officialUrl: string;
  monitoringSignals: string[];
}

/**
 * Type unifié exposé aux pages : on conserve les données natives + un flag `kind`
 * pour brancher rendu conditionnel sans avoir à muter la structure source.
 */
export type AnyCrypto =
  | ({ kind: "top10" } & TopCrypto)
  | ({ kind: "hidden-gem" } & HiddenGem);

/* -------------------------------------------------------------------------- */
/*  Datasets typés (cast unique pour silence TS)                              */
/* -------------------------------------------------------------------------- */

const TOP: TopCrypto[] = topCryptosData.topCryptos as TopCrypto[];
const GEMS: HiddenGem[] = hiddenGemsData.hiddenGems as HiddenGem[];

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/** Retourne toutes les cryptos (top 10 + hidden gems) avec leur `kind`. */
export function getAllCryptos(): AnyCrypto[] {
  const top: AnyCrypto[] = TOP.map((c) => ({ kind: "top10", ...c }));
  const gems: AnyCrypto[] = GEMS.map((g) => ({ kind: "hidden-gem", ...g }));
  return [...top, ...gems];
}

export function getTopCryptos(): AnyCrypto[] {
  return TOP.map((c) => ({ kind: "top10", ...c }));
}

export function getHiddenGems(): AnyCrypto[] {
  return GEMS.map((g) => ({ kind: "hidden-gem", ...g }));
}

/** Récupère une crypto (top10 OU hidden gem) par son slug = `id`. */
export function getCryptoBySlug(slug: string): AnyCrypto | undefined {
  return getAllCryptos().find((c) => c.id === slug);
}

/** Liste les slugs pour `generateStaticParams`. Ordre stable. */
export function getCryptoSlugs(): string[] {
  return getAllCryptos().map((c) => c.id);
}

/** Helper pratique pour récupérer le coingeckoId associé à un slug. */
export function getCoingeckoId(slug: string): string | undefined {
  return getCryptoBySlug(slug)?.coingeckoId;
}

/** Sélection de cryptos "connexes" pour la section maillage interne. */
export function getRelatedCryptos(slug: string, limit = 4): AnyCrypto[] {
  const me = getCryptoBySlug(slug);
  if (!me) return [];
  const all = getAllCryptos().filter((c) => c.id !== slug);

  // Priorité : même kind + même catégorie, puis même kind, puis le reste.
  const sameCatSameKind = all.filter(
    (c) => c.kind === me.kind && c.category === me.category
  );
  const sameKind = all.filter((c) => c.kind === me.kind && !sameCatSameKind.includes(c));
  const rest = all.filter((c) => !sameCatSameKind.includes(c) && !sameKind.includes(c));

  return [...sameCatSameKind, ...sameKind, ...rest].slice(0, limit);
}

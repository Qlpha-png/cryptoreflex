/**
 * lib/cryptoreflex-scores.ts — Calcul des 5 scores propriétaires Cryptoreflex.
 *
 * Pourquoi cette lib :
 *  - 5 scores cités, mémorisables, partageables → différenciation éditoriale
 *  - Calcul déterministe, transparent (chaque score expose sa rationale)
 *  - Fonctionne avec les data existantes (lib/cryptos.ts AnyCrypto)
 *  - Refinable plus tard quand le LLM pipeline alimentera les T2/T3 en DB
 *
 * 5 scores (0-100) :
 *  1. decentralization     — Niveau de décentralisation (consensus, distribution)
 *  2. complianceFrEu       — Conformité FR/EU (PSAN, MiCA, exchanges)
 *  3. technicalMaturity    — Maturité tech (audits, age, incidents)
 *  4. communityHealth      — Santé communauté (strengths/weaknesses signals)
 *  5. overall              — Composite pondéré (moyenne weighted)
 *
 * Usage :
 *   import { computeScores } from "@/lib/cryptoreflex-scores";
 *   const scores = computeScores(crypto); // { decentralization: { score, rationale }, ... }
 */

import type { AnyCrypto } from "@/lib/cryptos";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ScoreEntry {
  /** Score 0-100. */
  score: number;
  /** Rationale texte affichable user-facing. */
  rationale: string;
  /** Confidence 0-1 : 1 = data complète, 0.5 = partielle, 0.2 = mostly heuristic. */
  confidence: number;
}

export interface CryptoreflexScores {
  decentralization: ScoreEntry;
  complianceFrEu: ScoreEntry;
  technicalMaturity: ScoreEntry;
  communityHealth: ScoreEntry;
  overall: ScoreEntry;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Exchanges PSAN enregistrés AMF (liste partielle des principaux).
 * Source : registre AMF (PSAN). À synchroniser périodiquement.
 *
 * Heuristique : si une crypto est listée sur ≥1 PSAN majeur, score conformité+50.
 */
const PSAN_EXCHANGES_MAJOR = new Set([
  "Coinbase", "Kraken", "Bitpanda", "Bitstamp", "Binance France", "Crypto.com",
  "Coinhouse", "Paymium", "Bitvavo",
]);

/** Clamp util. */
const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Math.round(n)));

/* -------------------------------------------------------------------------- */
/*  Score #1 — Décentralisation                                               */
/* -------------------------------------------------------------------------- */

function scoreDecentralization(crypto: AnyCrypto): ScoreEntry {
  let score = 50; // base
  const reasons: string[] = [];

  // Pour les top10, on a `consensus` field
  if (crypto.kind === "top10") {
    const consensus = (crypto.consensus ?? "").toLowerCase();
    if (consensus.includes("proof of work") || consensus.includes("pow")) {
      score += 25;
      reasons.push("consensus PoW (ASIC distribués)");
    } else if (consensus.includes("proof of stake") || consensus.includes("pos")) {
      score += 15;
      reasons.push("consensus PoS (validators publics)");
    } else if (consensus.includes("dpos") || consensus.includes("delegated")) {
      score += 5;
      reasons.push("consensus délégué (centralisation modérée)");
    }
  }

  // Catégorie : "Layer 1" = base décentralisation, "Stablecoin centralisé" = -30
  const category = crypto.category?.toLowerCase() ?? "";
  if (category.includes("stablecoin") && !category.includes("decentralis")) {
    score -= 25;
    reasons.push("stablecoin centralisé (émetteur unique)");
  }
  if (category.includes("cex") || category.includes("exchange token")) {
    score -= 20;
    reasons.push("token natif d'exchange centralisé");
  }
  if (category.includes("layer 1") || category.includes("l1")) {
    score += 10;
    reasons.push("Layer 1 indépendant");
  }

  // Pour hidden gems : reliability.openSource = +10
  if (crypto.kind === "hidden-gem" && crypto.reliability?.openSource) {
    score += 10;
    reasons.push("code open source");
  }

  return {
    score: clamp(score),
    rationale: reasons.length > 0 ? reasons.join(", ") : "score base par défaut",
    confidence: crypto.kind === "top10" ? 0.7 : 0.5,
  };
}

/* -------------------------------------------------------------------------- */
/*  Score #2 — Conformité FR/EU                                               */
/* -------------------------------------------------------------------------- */

function scoreComplianceFrEu(crypto: AnyCrypto): ScoreEntry {
  let score = 30; // base : disponible n'importe où ne suffit pas
  const reasons: string[] = [];

  // Listings sur exchanges PSAN majeurs
  const whereToBuy = crypto.whereToBuy ?? [];
  const psanCount = whereToBuy.filter((ex) =>
    Array.from(PSAN_EXCHANGES_MAJOR).some((psan) =>
      ex.toLowerCase().includes(psan.toLowerCase()),
    ),
  ).length;

  if (psanCount >= 3) {
    score += 50;
    reasons.push(`disponible sur ${psanCount} exchanges PSAN majeurs`);
  } else if (psanCount >= 1) {
    score += 30;
    reasons.push(`disponible sur ${psanCount} exchange(s) PSAN`);
  } else {
    score -= 10;
    reasons.push("pas de listing PSAN détecté dans whereToBuy");
  }

  // Stablecoins : MiCA-compliant ou non ?
  const category = crypto.category?.toLowerCase() ?? "";
  if (category.includes("stablecoin")) {
    // Heuristique : USDC = oui, USDT = pas encore, EURT = oui
    if (crypto.symbol === "USDC" || crypto.symbol === "EURC" || crypto.symbol === "EURT") {
      score += 20;
      reasons.push("stablecoin MiCA-compliant");
    } else if (crypto.symbol === "USDT") {
      score -= 15;
      reasons.push("Tether USDT : conformité MiCA en cours");
    }
  }

  // Privacy coins : risque de delisting réglementaire
  if (category.includes("privacy") || crypto.symbol === "XMR" || crypto.symbol === "ZEC") {
    score -= 30;
    reasons.push("privacy coin : risque réglementaire EU");
  }

  return {
    score: clamp(score),
    rationale: reasons.join(", "),
    confidence: 0.6,
  };
}

/* -------------------------------------------------------------------------- */
/*  Score #3 — Maturité technique                                             */
/* -------------------------------------------------------------------------- */

function scoreTechnicalMaturity(crypto: AnyCrypto): ScoreEntry {
  let score = 40;
  const reasons: string[] = [];
  const currentYear = new Date().getUTCFullYear();
  const age = currentYear - (crypto.yearCreated ?? currentYear);

  // Age du projet
  if (age >= 10) {
    score += 25;
    reasons.push(`${age} ans d'existence`);
  } else if (age >= 5) {
    score += 15;
    reasons.push(`${age} ans d'existence`);
  } else if (age >= 2) {
    score += 5;
    reasons.push(`${age} ans d'existence`);
  } else {
    score -= 10;
    reasons.push("projet très récent (< 2 ans)");
  }

  // Hidden gems : reliability fields detaillés
  if (crypto.kind === "hidden-gem" && crypto.reliability) {
    const r = crypto.reliability;
    if ((r.auditedBy?.length ?? 0) >= 2) {
      score += 15;
      reasons.push(`audité par ${r.auditedBy.length} firmes`);
    } else if ((r.auditedBy?.length ?? 0) >= 1) {
      score += 8;
      reasons.push(`audité par ${r.auditedBy[0]}`);
    } else {
      score -= 10;
      reasons.push("pas d'audit identifié");
    }

    if (r.openSource) {
      score += 5;
    }

    // Major incidents = pénalité forte
    if (r.majorIncidents && r.majorIncidents !== "Aucun" && r.majorIncidents.length > 30) {
      score -= 20;
      reasons.push("incident majeur historique");
    }

    if (r.teamIdentified) {
      score += 5;
      reasons.push("équipe identifiée publiquement");
    }
  }

  // Top 10 : maturité par défaut élevée si rank ≤ 10
  if (crypto.kind === "top10" && crypto.rank <= 5) {
    score += 10;
    reasons.push(`top ${crypto.rank} mondial`);
  }

  return {
    score: clamp(score),
    rationale: reasons.join(", "),
    confidence: crypto.kind === "hidden-gem" ? 0.8 : 0.6,
  };
}

/* -------------------------------------------------------------------------- */
/*  Score #4 — Santé communauté                                               */
/* -------------------------------------------------------------------------- */

function scoreCommunityHealth(crypto: AnyCrypto): ScoreEntry {
  let score = 50;
  const reasons: string[] = [];

  // Top 10 : strengths/weaknesses comme proxy
  if (crypto.kind === "top10") {
    const strengths = crypto.strengths?.length ?? 0;
    const weaknesses = crypto.weaknesses?.length ?? 0;
    if (strengths > weaknesses) {
      score += (strengths - weaknesses) * 5;
      reasons.push(`${strengths} forces vs ${weaknesses} faiblesses`);
    } else if (weaknesses > strengths) {
      score -= (weaknesses - strengths) * 5;
      reasons.push(`${weaknesses} faiblesses vs ${strengths} forces`);
    }

    // Beginner-friendly = bon proxy d'adoption
    if (crypto.beginnerFriendly >= 4) {
      score += 10;
      reasons.push("très accessible aux débutants");
    } else if (crypto.beginnerFriendly <= 2) {
      score -= 5;
      reasons.push("complexe pour débutants");
    }

    // Top 5 = gros community network effect
    if (crypto.rank <= 5) {
      score += 15;
      reasons.push("network effect top 5");
    }
  }

  // Hidden gems : backers + funding sont des proxies
  if (crypto.kind === "hidden-gem" && crypto.reliability) {
    const backers = crypto.reliability.backers?.length ?? 0;
    if (backers >= 3) {
      score += 10;
      reasons.push(`${backers} backers institutionnels`);
    } else if (backers >= 1) {
      score += 5;
    }

    const funding = crypto.reliability.fundingRaised ?? "";
    if (funding && /\d+M/.test(funding)) {
      score += 5;
      reasons.push(`funding ${funding}`);
    }
  }

  return {
    score: clamp(score),
    rationale: reasons.length > 0 ? reasons.join(", ") : "données limitées",
    confidence: crypto.kind === "top10" ? 0.5 : 0.4,
  };
}

/* -------------------------------------------------------------------------- */
/*  Score composite                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Score overall = moyenne pondérée des 4 scores.
 *
 * Pondération :
 *   - Maturité technique : 30% (fondamental — un projet immature = risque max)
 *   - Décentralisation   : 25% (ethos crypto core)
 *   - Conformité FR/EU   : 25% (audience FR)
 *   - Santé communauté   : 20% (signal d'adoption)
 *
 * La pondération est exposée pour transparence éditoriale.
 */
const WEIGHTS = {
  technicalMaturity: 0.3,
  decentralization: 0.25,
  complianceFrEu: 0.25,
  communityHealth: 0.2,
} as const;

function scoreOverall(scores: Omit<CryptoreflexScores, "overall">): ScoreEntry {
  const weighted =
    scores.technicalMaturity.score * WEIGHTS.technicalMaturity +
    scores.decentralization.score * WEIGHTS.decentralization +
    scores.complianceFrEu.score * WEIGHTS.complianceFrEu +
    scores.communityHealth.score * WEIGHTS.communityHealth;

  const avgConfidence =
    (scores.technicalMaturity.confidence +
      scores.decentralization.confidence +
      scores.complianceFrEu.confidence +
      scores.communityHealth.confidence) /
    4;

  // Niveau qualitatif lisible humain
  const value = Math.round(weighted);
  let label = "Faible";
  if (value >= 80) label = "Excellent";
  else if (value >= 65) label = "Bon";
  else if (value >= 50) label = "Moyen";
  else if (value >= 35) label = "Faible";
  else label = "Critique";

  return {
    score: value,
    rationale: `Composite pondéré (tech 30%, décent 25%, conformité 25%, communauté 20%) — ${label}`,
    confidence: Math.round(avgConfidence * 100) / 100,
  };
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Calcule les 5 scores Cryptoreflex pour une crypto donnée.
 * Déterministe : appelé avec la même crypto, retourne toujours les mêmes valeurs.
 */
export function computeScores(crypto: AnyCrypto): CryptoreflexScores {
  const decentralization = scoreDecentralization(crypto);
  const complianceFrEu = scoreComplianceFrEu(crypto);
  const technicalMaturity = scoreTechnicalMaturity(crypto);
  const communityHealth = scoreCommunityHealth(crypto);
  const overall = scoreOverall({
    decentralization,
    complianceFrEu,
    technicalMaturity,
    communityHealth,
  });

  return {
    decentralization,
    complianceFrEu,
    technicalMaturity,
    communityHealth,
    overall,
  };
}

/**
 * Helper : retourne juste le score overall (utile pour sort lists).
 */
export function getOverallScore(crypto: AnyCrypto): number {
  return computeScores(crypto).overall.score;
}

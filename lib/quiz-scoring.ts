/**
 * lib/quiz-scoring.ts — Scoring pur du quiz "Trouve ton exchange en 60 sec".
 *
 * Pure functions, zero dépendance React, 100 % testables. Toute l'UI vit
 * dans `components/QuizExchange.tsx` ; ce module ne fait QUE de la logique.
 *
 * Pourquoi un module séparé ?
 *  - Permet de raffiner la matrice de scoring (Q1..Q6 → bonus/malus) sans
 *    toucher au composant client (et donc sans casser l'a11y / les anims).
 *  - Tests unitaires simples : on injecte les 6 réponses, on vérifie le top 3.
 *  - Réutilisable côté server (ex : page perso `/quiz/result?id=xxx`).
 *
 * Pondérations (synthèse, voir `scorePlatform` pour le détail) :
 *
 *  ┌─────┬────────────────────────────┬──────────────────────────────────────┐
 *  │ Q   │ Réponse                    │ Effet                                │
 *  ├─────┼────────────────────────────┼──────────────────────────────────────┤
 *  │ Q1  │ tiny  (<100€)              │ EXCLUS si deposit.minEur > 25        │
 *  │ Q1  │ large (>10000€)            │ +10 si security>=4 ; +6 si insurance │
 *  │ Q2  │ trader                     │ +18 si spotTaker<0.15 ; +10 si <0.3  │
 *  │ Q2  │ dca                        │ +10 si instantBuy<1                  │
 *  │ Q2  │ hodl                       │ +6 si security>=4.5                  │
 *  │ Q3  │ beginner                   │ +12 si ux>=4.5                       │
 *  │ Q3  │ advanced                   │ +12 si fees>=4.5                     │
 *  │ Q4  │ security                   │ +14 si security>=4.5 ; +8 si >=4     │
 *  │ Q4  │ fees                       │ +14 si fees>=4.5    ; +8 si >=4      │
 *  │ Q4  │ ux                         │ +14 si ux>=4.5      ; +8 si >=4      │
 *  │ Q4  │ catalog                    │ +12 si totalCount>=300 ; +6 si >=200 │
 *  │ Q5  │ yes                        │ +12 si stakingAvailable ; -10 sinon  │
 *  │ Q5  │ optional                   │ +4  si stakingAvailable              │
 *  │ Q5  │ no_trader                  │ +6  si fees>=4.5 (privilégie traders)│
 *  │ Q6  │ must                       │ +20 wallet hardware ; -8 broker NC   │
 *  │ Q6  │ optional                   │ +6 wallet hardware                   │
 *  │ Q6  │ never                      │ EXCLUS catégorie wallet              │
 *  └─────┴────────────────────────────┴──────────────────────────────────────┘
 *
 * Auditabilité volontaire : pas d'IA, pas de modèle ML — la matrice est
 * lisible en 30 secondes. Si un user nous demande "pourquoi ce score ?",
 * on peut répondre par les bonus appliqués (champ `breakdown`).
 */

import type { Platform } from "@/lib/platforms";

/* -------------------------------------------------------------------------- */
/*  Types publics                                                              */
/* -------------------------------------------------------------------------- */

export type QuizAnswerKey =
  | "amount"
  | "frequency"
  | "level"
  | "priority"
  | "staking"
  | "withdrawal";

/** Réponses possibles par question (string union pour autocomplete IDE). */
export type QuizAnswers = {
  amount?: "tiny" | "small" | "medium" | "large";
  frequency?: "hodl" | "dca" | "occasional" | "trader";
  level?: "beginner" | "novice" | "intermediate" | "advanced";
  priority?: "security" | "fees" | "ux" | "catalog";
  staking?: "yes" | "optional" | "no_hodl" | "no_trader";
  withdrawal?: "must" | "optional" | "never";
};

export interface ScoreBreakdown {
  /** Score de base = scoring.global × 20 (note /5 → /100). */
  base: number;
  /** Somme des bonus/malus métier appliqués. */
  bonuses: number;
  /** Score final = base + bonuses (ou -1 si exclusion dure). */
  total: number;
  /** Raison d'exclusion si la plateforme n'est pas recommandable. */
  excluded?: string;
  /** Liste lisible des règles déclenchées (debug + transparence UI). */
  reasons: string[];
}

export interface ScoredPlatform {
  platform: Platform;
  score: ScoreBreakdown;
  /** Phrase de justification (1 ligne) pour l'affichage carte résultat. */
  rationale: string;
}

export interface QuizResult {
  /** Top 3 plateformes recommandées, triées par score décroissant. */
  top3: ScoredPlatform[];
  /** Profil utilisateur déduit des réponses (pour la card gold gradient). */
  profile: UserProfile;
  /** Plateformes exclues ou jugées peu pertinentes (section "pourquoi pas"). */
  rejected: { platform: Platform; reason: string }[];
}

export interface UserProfile {
  /** Identifiant kebab-case (utilisable comme prop tracking Plausible). */
  id: string;
  /** Label court affiché en haut de la card résultat. */
  label: string;
  /** Une ligne de description (ce que ce profil cherche / évite). */
  summary: string;
}

/* -------------------------------------------------------------------------- */
/*  Détection du profil utilisateur                                            */
/* -------------------------------------------------------------------------- */

/**
 * Mappe les 6 réponses à un profil "humain". Ordre de priorité :
 * 1. Trader actif (Q2=trader)
 * 2. Auto-custody priority (Q6=must) → "Souverain bitcoiner"
 * 3. Sécurité maximale + capital élevé → "Long-termiste sécuritaire"
 * 4. DCA mensuel + débutant → "DCA HODLer"
 * 5. Débutant + petit ticket → "Débutant prudent"
 * 6. Sinon → "Investisseur équilibré"
 *
 * Volontairement simple : on évite les profils trop fins qui diluent
 * la valeur perçue de la reco.
 */
export function detectProfile(answers: QuizAnswers): UserProfile {
  const { amount, frequency, level, priority, withdrawal } = answers;

  if (frequency === "trader") {
    return {
      id: "trader-actif",
      label: "Trader actif",
      summary:
        "Tu fais plusieurs trades par semaine — tu cherches frais bas, liquidité et profondeur de carnet.",
    };
  }

  if (withdrawal === "must" && (amount === "medium" || amount === "large")) {
    return {
      id: "souverain-bitcoiner",
      label: "Souverain auto-custody",
      summary:
        "Tu veux retirer tes crypto vers ton wallet personnel — la plateforme est juste un guichet d'achat.",
    };
  }

  if (priority === "security" && (amount === "large" || amount === "medium")) {
    return {
      id: "long-termiste-securitaire",
      label: "Long-termiste sécuritaire",
      summary:
        "Capital conséquent, horizon long terme — tu veux régulation MiCA, cold storage et assurance.",
    };
  }

  if (frequency === "dca" && (level === "beginner" || level === "novice")) {
    return {
      id: "dca-hodler",
      label: "DCA HODLer",
      summary:
        "Tu veux automatiser un achat mensuel et oublier — UX simple et frais réguliers maîtrisés.",
    };
  }

  if (
    (level === "beginner" || level === "novice") &&
    (amount === "tiny" || amount === "small")
  ) {
    return {
      id: "debutant-prudent",
      label: "Débutant prudent",
      summary:
        "Tu démarres avec un petit ticket pour tester — interface simple et plateforme régulée en priorité.",
    };
  }

  return {
    id: "investisseur-equilibre",
    label: "Investisseur équilibré",
    summary:
      "Tu cherches un bon compromis entre frais, sécurité et catalogue — sans extrême.",
  };
}

/* -------------------------------------------------------------------------- */
/*  Scoring d'une plateforme                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Calcule le score d'une plateforme pour un set de réponses donné.
 * Pure function : aucun side-effect, déterministe.
 */
export function scorePlatform(
  p: Platform,
  answers: QuizAnswers
): ScoreBreakdown {
  const base = p.scoring.global * 20;
  let bonuses = 0;
  let excluded: string | undefined;
  const reasons: string[] = [];

  /* ----------------------------- EXCLUSIONS ----------------------------- */

  // Q1 : ticket très petit + dépôt min trop élevé
  if (answers.amount === "tiny" && p.deposit.minEur > 25) {
    excluded = `Dépôt minimum ${p.deposit.minEur}€ trop élevé pour < 100€`;
  }

  // Q6 : pas d'auto-custody souhaitée → on retire les hardware wallets
  if (answers.withdrawal === "never" && p.category === "wallet") {
    excluded = "Hardware wallet — incompatible avec stockage sur plateforme";
  }

  // Hardware wallets : n'ont pas de sens dans la liste des "exchanges"
  // sauf si l'utilisateur veut explicitement de l'auto-custody (Q6=must)
  if (p.category === "wallet" && answers.withdrawal !== "must") {
    excluded = "Hardware wallet — pas une plateforme d'achat directe";
  }

  /* ----------------------------- BONUS Q1 (montant) --------------------- */

  if (answers.amount === "large") {
    if (p.scoring.security >= 4) {
      bonuses += 10;
      reasons.push("Sécurité solide (>4/5) pour un capital élevé");
    }
    if (p.security.insurance) {
      bonuses += 6;
      reasons.push("Couverture assurance des fonds");
    }
  }
  if (answers.amount === "medium" && p.scoring.security >= 4.5) {
    bonuses += 6;
    reasons.push("Sécurité maximale pour un investissement long terme");
  }

  /* ----------------------------- BONUS Q2 (fréquence) ------------------- */

  if (answers.frequency === "trader") {
    if (p.fees.spotTaker < 0.15) {
      bonuses += 18;
      reasons.push("Frais spot taker ultra-bas (<0.15%) pour le trading actif");
    } else if (p.fees.spotTaker < 0.3) {
      bonuses += 10;
      reasons.push("Frais spot compétitifs (<0.3%)");
    }
  }
  if (answers.frequency === "dca" && p.fees.instantBuy < 1) {
    bonuses += 10;
    reasons.push("Frais d'achat instantané faibles, idéal pour le DCA mensuel");
  }
  if (answers.frequency === "hodl" && p.scoring.security >= 4.5) {
    bonuses += 6;
    reasons.push("Sécurité maximale, parfait pour du HODL long terme");
  }

  /* ----------------------------- BONUS Q3 (niveau) ---------------------- */

  if (
    (answers.level === "beginner" || answers.level === "novice") &&
    p.scoring.ux >= 4.5
  ) {
    bonuses += 12;
    reasons.push("Interface simple, adaptée aux débutants");
  }
  if (answers.level === "advanced" && p.scoring.fees >= 4.5) {
    bonuses += 12;
    reasons.push("Frais et outils pros adaptés aux utilisateurs avancés");
  }

  /* ----------------------------- BONUS Q4 (priorité) -------------------- */

  if (answers.priority === "security") {
    if (p.scoring.security >= 4.5) {
      bonuses += 14;
      reasons.push("Sécurité au top du marché");
    } else if (p.scoring.security >= 4) {
      bonuses += 8;
      reasons.push("Bonne sécurité globale");
    }
  }
  if (answers.priority === "fees") {
    if (p.scoring.fees >= 4.5) {
      bonuses += 14;
      reasons.push("Parmi les frais les plus bas du marché");
    } else if (p.scoring.fees >= 4) {
      bonuses += 8;
      reasons.push("Frais corrects");
    }
  }
  if (answers.priority === "ux") {
    if (p.scoring.ux >= 4.5) {
      bonuses += 14;
      reasons.push("Interface ultra simple");
    } else if (p.scoring.ux >= 4) {
      bonuses += 8;
      reasons.push("UX fluide");
    }
  }
  if (answers.priority === "catalog") {
    if (p.cryptos.totalCount >= 300) {
      bonuses += 12;
      reasons.push(`Catalogue très large (${p.cryptos.totalCount} crypto)`);
    } else if (p.cryptos.totalCount >= 200) {
      bonuses += 6;
      reasons.push(`Bon catalogue (${p.cryptos.totalCount} crypto)`);
    }
  }

  /* ----------------------------- BONUS Q5 (staking) --------------------- */

  if (answers.staking === "yes") {
    if (p.cryptos.stakingAvailable) {
      bonuses += 12;
      reasons.push("Staking natif disponible (rendements passifs)");
    } else {
      bonuses -= 10;
      reasons.push("Pas de staking natif — limitant pour ton objectif");
    }
  }
  if (answers.staking === "optional" && p.cryptos.stakingAvailable) {
    bonuses += 4;
    reasons.push("Staking dispo en option");
  }
  if (answers.staking === "no_trader" && p.scoring.fees >= 4.5) {
    bonuses += 6;
    reasons.push("Optimisé trading sans contrainte staking");
  }

  /* ----------------------------- BONUS Q6 (auto-custody) ---------------- */

  if (answers.withdrawal === "must" && p.category === "wallet") {
    bonuses += 20;
    reasons.push("Hardware wallet : auto-custody totale, tes clés tes crypto");
  }
  if (answers.withdrawal === "optional" && p.category === "wallet") {
    bonuses += 6;
    reasons.push("Option auto-custody disponible");
  }

  return {
    base,
    bonuses,
    total: excluded ? -1 : base + bonuses,
    excluded,
    reasons,
  };
}

/* -------------------------------------------------------------------------- */
/*  Génération de la rationale (1 phrase par carte résultat)                   */
/* -------------------------------------------------------------------------- */

/**
 * Génère une justification courte et lisible pour la card résultat.
 * On combine les 1-2 raisons les plus impactantes + l'idealFor de la
 * plateforme pour donner du contexte au user.
 */
function generateRationale(
  p: Platform,
  score: ScoreBreakdown,
  rank: number
): string {
  if (score.excluded) return score.excluded;

  // Premier choix : on vend fort la fit
  if (rank === 0) {
    const top = score.reasons.slice(0, 2).join(" + ");
    return top
      ? `${top}. ${p.tagline.replace(/^Pour qui c'est\s*:\s*/i, "Idéal pour ")}.`
      : p.idealFor;
  }

  // Plan B / Plan C : on est plus court
  const r = score.reasons[0];
  return r
    ? `${r} — alternative solide si ${p.name} te parle plus.`
    : p.idealFor;
}

/* -------------------------------------------------------------------------- */
/*  API publique : compute du résultat complet                                 */
/* -------------------------------------------------------------------------- */

/**
 * Calcule le résultat complet du quiz : top 3 + profil + rejets.
 *
 * @param platforms toutes les plateformes (cf. `getAllPlatforms()`)
 * @param answers   réponses du user (les 6 questions)
 * @returns         résultat structuré prêt à afficher
 *
 * Pure function — testable unitairement, déterministe.
 */
export function computeQuizResult(
  platforms: Platform[],
  answers: QuizAnswers
): QuizResult {
  const scored = platforms
    .map((p) => ({ platform: p, score: scorePlatform(p, answers) }))
    .sort((a, b) => b.score.total - a.score.total);

  const eligible = scored.filter((s) => !s.score.excluded);
  const rejected = scored
    .filter((s) => s.score.excluded)
    .map((s) => ({
      platform: s.platform,
      reason: s.score.excluded ?? "Score trop faible pour ton profil",
    }));

  const top3 = eligible.slice(0, 3).map((s, idx) => ({
    platform: s.platform,
    score: s.score,
    rationale: generateRationale(s.platform, s.score, idx),
  }));

  const profile = detectProfile(answers);

  return { top3, profile, rejected };
}

/* -------------------------------------------------------------------------- */
/*  Util : vérifier qu'on a bien 6 réponses                                    */
/* -------------------------------------------------------------------------- */

export function isComplete(answers: QuizAnswers): boolean {
  return (
    !!answers.amount &&
    !!answers.frequency &&
    !!answers.level &&
    !!answers.priority &&
    !!answers.staking &&
    !!answers.withdrawal
  );
}

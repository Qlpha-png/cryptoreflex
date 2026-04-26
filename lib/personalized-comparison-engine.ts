/**
 * personalized-comparison-engine.ts — Moteur de scoring du Comparateur Personnalisé.
 *
 * On NE pondère PAS aveuglément les scoring globaux platforms.json : on construit
 * un score CONTEXTUEL en fonction de 5 axes (prix, UX, sécurité, intent d'achat,
 * expérience). Chaque plateforme reçoit une note 1-10 par axe, multipliée par
 * le poids du profil utilisateur.
 *
 * Sources des notes : audit interne Cryptoreflex Q1 2026 (cf. /comparatif et
 * /avis). Notes mises à jour à chaque audit trimestriel.
 */

export type Experience = "debutant" | "intermediaire" | "avance";
export type IntentType = "dca" | "swing" | "hold" | "daytrading";
export type Priority = "prix" | "ux" | "securite";

export interface QuizAnswers {
  /** Montant mensuel approximatif en EUR. */
  monthlyAmountEur: number;
  /** Fréquence d'achat envisagée. */
  frequency: "ponctuel" | "mensuel" | "hebdo";
  /** Niveau d'expérience. */
  experience: Experience;
  /** Priorité principale de l'utilisateur. */
  priority: Priority;
  /** Type d'usage prévu. */
  intent: IntentType;
}

export interface PlatformScores {
  id: string;
  name: string;
  logo?: string;
  /** Note 1-10 par axe (audit interne, cohérent avec /comparatif). */
  scores: {
    prix: number;
    ux: number;
    securite: number;
    /** Adapté DCA récurrent ? */
    dca: number;
    /** Adapté swing/short term ? */
    swing: number;
    /** Adapté hold long terme ? */
    hold: number;
    /** Adapté day trading actif ? */
    daytrading: number;
    /** Adapté débutant ? */
    debutant: number;
    /** Adapté avancé (futures, marges, paires multiples) ? */
    avance: number;
  };
  /** Texte court à afficher sous la reco. */
  reasonShort: string;
  /** Slug interne pour le lien /avis. */
  reviewSlug: string;
}

/**
 * Tableau des 6 plateformes éligibles à la reco personnalisée.
 * NB : on liste UNIQUEMENT les plateformes que Cryptoreflex monétise et
 * recommande activement. Pas d'inclusion d'exchanges sans partenariat.
 */
export const PLATFORM_SCORES: PlatformScores[] = [
  {
    id: "bitstack",
    name: "Bitstack",
    reviewSlug: "bitstack",
    scores: { prix: 6, ux: 9, securite: 8, dca: 10, swing: 4, hold: 9, daytrading: 2, debutant: 10, avance: 5 },
    reasonShort: "Application française, DCA Bitcoin auto dès 1 €/jour, conforme MiCA.",
  },
  {
    id: "bitpanda",
    name: "Bitpanda",
    reviewSlug: "bitpanda",
    scores: { prix: 8, ux: 8, securite: 8, dca: 8, swing: 6, hold: 8, daytrading: 5, debutant: 8, avance: 6 },
    reasonShort: "Plateforme européenne, frais bas en spot, large catalogue (350+ cryptos).",
  },
  {
    id: "binance",
    name: "Binance",
    reviewSlug: "binance",
    scores: { prix: 9, ux: 6, securite: 7, dca: 7, swing: 9, hold: 8, daytrading: 10, debutant: 5, avance: 10 },
    reasonShort: "Frais les plus bas du marché, liquidité massive, idéal trader actif.",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    reviewSlug: "coinbase",
    scores: { prix: 5, ux: 9, securite: 9, dca: 7, swing: 6, hold: 9, daytrading: 5, debutant: 9, avance: 6 },
    reasonShort: "Sécurité institutionnelle, interface simple, idéal premier achat.",
  },
  {
    id: "kraken",
    name: "Kraken",
    reviewSlug: "kraken",
    scores: { prix: 7, ux: 7, securite: 9, dca: 6, swing: 8, hold: 9, daytrading: 8, debutant: 6, avance: 9 },
    reasonShort: "Vétéran réputé pour la sécurité, support OTC, paires fiat variées.",
  },
  {
    id: "swissborg",
    name: "SwissBorg",
    reviewSlug: "swissborg",
    scores: { prix: 7, ux: 9, securite: 8, dca: 7, swing: 5, hold: 8, daytrading: 3, debutant: 8, avance: 5 },
    reasonShort: "Application suisse premium, smart yield (staking), Premium gratuit avec BORG.",
  },
];

export interface PlatformRecommendation {
  platform: PlatformScores;
  /** Score final 0-100 sur les axes pondérés du profil. */
  finalScore: number;
  /** Détail des sous-scores affichables. */
  breakdown: {
    prix: number;
    ux: number;
    securite: number;
    intent: number;
    experience: number;
  };
}

/**
 * Calcule les recommandations pour les réponses fournies.
 * Retourne le tableau trié par finalScore décroissant.
 */
export function computeRecommendations(answers: QuizAnswers): PlatformRecommendation[] {
  // Poids dynamiques selon la priorité principale (boost x2 sur l'axe choisi).
  const priorityWeight: Record<Priority, number> = {
    prix: answers.priority === "prix" ? 2 : 1,
    ux: answers.priority === "ux" ? 2 : 1,
    securite: answers.priority === "securite" ? 2 : 1,
  };

  return PLATFORM_SCORES
    .map((platform) => {
      const sPrix = platform.scores.prix * priorityWeight.prix;
      const sUx = platform.scores.ux * priorityWeight.ux;
      const sSecu = platform.scores.securite * priorityWeight.securite;
      const sIntent = platform.scores[answers.intent] ?? 5;
      // "intermediaire" n'a pas d'axe dédié dans les scores plateforme :
      // on prend la moyenne entre debutant et avance (profil mixte).
      const sExp =
        answers.experience === "intermediaire"
          ? Math.round((platform.scores.debutant + platform.scores.avance) / 2)
          : platform.scores[answers.experience];

      // Bonus volume : un gros DCA mensuel (> 500€) tire vers les plateformes
      // à frais bas (Binance, Bitpanda) — un petit DCA (< 50€) tire vers
      // Bitstack qui accepte les micro-montants.
      let volumeBonus = 0;
      if (answers.monthlyAmountEur >= 500 && platform.scores.prix >= 8) volumeBonus = 3;
      if (answers.monthlyAmountEur < 50 && platform.id === "bitstack") volumeBonus = 4;

      // Échelle finale 0-100. Max théorique brut = 10*2 + 10*2 + 10*2 + 10 + 10 = 80.
      const raw = sPrix + sUx + sSecu + sIntent + sExp + volumeBonus;
      const finalScore = Math.round((raw / 80) * 100);

      return {
        platform,
        finalScore: Math.min(100, finalScore),
        breakdown: {
          prix: platform.scores.prix,
          ux: platform.scores.ux,
          securite: platform.scores.securite,
          intent: sIntent,
          experience: sExp,
        },
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

/** Top 3 du tri ci-dessus, avec libellés humains pour le rendu. */
export function getTop3(answers: QuizAnswers): PlatformRecommendation[] {
  return computeRecommendations(answers).slice(0, 3);
}

export const QUIZ_QUESTIONS = [
  {
    id: "monthlyAmount",
    label: "Quel montant mensuel envisages-tu d'investir en crypto ?",
    options: [
      { value: 25, label: "Moins de 50 € / mois" },
      { value: 100, label: "50 - 200 € / mois" },
      { value: 350, label: "200 - 500 € / mois" },
      { value: 800, label: "Plus de 500 € / mois" },
    ],
  },
  {
    id: "frequency",
    label: "À quelle fréquence comptes-tu acheter ?",
    options: [
      { value: "ponctuel", label: "Achat unique ou ponctuel" },
      { value: "mensuel", label: "Une fois par mois (DCA)" },
      { value: "hebdo", label: "Plusieurs fois par mois" },
    ],
  },
  {
    id: "experience",
    label: "Quel est ton niveau d'expérience crypto ?",
    options: [
      { value: "debutant", label: "Débutant — premier achat ou presque" },
      { value: "intermediaire", label: "Intermédiaire — quelques mois/années" },
      { value: "avance", label: "Avancé — futures, on-chain, DeFi" },
    ],
  },
  {
    id: "priority",
    label: "Quelle est ta priorité numéro 1 ?",
    options: [
      { value: "prix", label: "Frais les plus bas possible" },
      { value: "ux", label: "Application simple et agréable" },
      { value: "securite", label: "Sécurité maximale (assurance, cold storage)" },
    ],
  },
  {
    id: "intent",
    label: "Comment vas-tu utiliser tes cryptos ?",
    options: [
      { value: "dca", label: "DCA régulier (achat auto)" },
      { value: "hold", label: "Hold long terme (3-5 ans+)" },
      { value: "swing", label: "Swing trading (semaines/mois)" },
      { value: "daytrading", label: "Day trading actif (intraday)" },
    ],
  },
] as const;

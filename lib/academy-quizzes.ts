/**
 * lib/academy-quizzes.ts — Quiz de validation par track (5 questions chacun).
 *
 * Hardcodé volontairement (pas de CMS) pour que le contenu pédagogique reste
 * versionné dans Git et auditable. Chaque quiz est validé si l'utilisateur
 * a >= 4/5 bonnes réponses, ce qui débloque le certificat téléchargeable.
 */

import type { TrackId } from "./academy-tracks";

export interface QuizQuestion {
  /** Identifiant stable (utilisé en key React + analytics). */
  id: string;
  /** Énoncé de la question. */
  question: string;
  /** Choix possibles (4 options, single-answer). */
  choices: string[];
  /** Index 0-based de la bonne réponse dans `choices`. */
  correctIndex: number;
  /** Justification pédagogique courte (affichée après réponse). */
  explanation: string;
}

/** Score minimum pour considérer le quiz validé. */
export const PASSING_SCORE = 4;

const QUIZ_DEBUTANT: QuizQuestion[] = [
  {
    id: "deb-q1-blockchain",
    question:
      "Qu'est-ce qu'une blockchain en une phrase ?",
    choices: [
      "Un grand livre comptable partagé entre des milliers d'ordinateurs, où personne ne peut tricher.",
      "Une base de données privée hébergée par Bitcoin Inc.",
      "Un compte bancaire en ligne anonyme.",
      "Un coffre-fort numérique sur ton ordinateur.",
    ],
    correctIndex: 0,
    explanation:
      "La blockchain est un registre distribué et immuable répliqué sur de nombreux nœuds — pas une base centralisée et pas un wallet personnel.",
  },
  {
    id: "deb-q2-mica",
    question:
      "À partir du 1er juillet 2026, quelles plateformes peuvent légalement opérer en France ?",
    choices: [
      "Toutes les plateformes mondiales sans restriction.",
      "Uniquement les plateformes agréées CASP-MiCA dans un pays de l'UE.",
      "Uniquement les plateformes basées physiquement à Paris.",
      "Aucune, le crypto est interdit en France.",
    ],
    correctIndex: 1,
    explanation:
      "MiCA Phase 2 ferme le grandfathering PSAN au 30 juin 2026. Seules les plateformes ayant obtenu l'agrément CASP-MiCA dans un État membre de l'UE peuvent passeporter leurs services en France.",
  },
  {
    id: "deb-q3-2fa",
    question:
      "Quelle est la méthode 2FA la PLUS sûre pour ton exchange crypto ?",
    choices: [
      "Le SMS — c'est la plus simple.",
      "Une app TOTP (Google Authenticator, Aegis) ou une clé physique (YubiKey).",
      "Aucune 2FA, le mot de passe suffit.",
      "Recevoir un email à chaque connexion.",
    ],
    correctIndex: 1,
    explanation:
      "Les SMS sont vulnérables au SIM-swap. TOTP (en local) ou les clés FIDO2/U2F sont l'état de l'art en 2026.",
  },
  {
    id: "deb-q4-fiscalite",
    question:
      "Quel est le taux du Prélèvement Forfaitaire Unique (PFU) sur les plus-values crypto pour un particulier en France en 2026 ?",
    choices: [
      "0 % si tu ne vends pas en euros.",
      "12,8 % d'IR + 17,2 % de prélèvements sociaux = 30 %.",
      "45 % automatique.",
      "Seulement 17,2 % de prélèvements sociaux.",
    ],
    correctIndex: 1,
    explanation:
      "Le PFU (flat tax) est de 30 % toutes-taxes-comprises : 12,8 % d'IR + 17,2 % de prélèvements sociaux. Une option pour le barème progressif (case 2OP) peut être plus avantageuse selon ton TMI.",
  },
  {
    id: "deb-q5-cold-vs-hot",
    question:
      "Tu détiens 5 000 € de Bitcoin que tu ne comptes pas trader. Quelle option est la plus sécurisée ?",
    choices: [
      "Tout laisser sur l'exchange où tu as acheté.",
      "Tout sur une app mobile type MetaMask connectée à Internet.",
      "Transférer la majorité sur un cold wallet (hardware) et garder un petit fonds liquide pour DCA / arbitrage.",
      "Imprimer une capture d'écran de la seed phrase et la stocker dans le cloud.",
    ],
    correctIndex: 2,
    explanation:
      "La règle 80/20 : la majorité de ton stack en cold storage (Ledger/Trezor) protège du hack d'exchange et des malwares. Garder un petit montant en hot wallet/exchange permet de rester opérationnel sans risquer le bag entier.",
  },
];

const QUIZ_INTERMEDIAIRE: QuizQuestion[] = [
  {
    id: "int-q1-dca",
    question:
      "Le DCA (Dollar-Cost Averaging) consiste à :",
    choices: [
      "Acheter tout son budget d'un coup au plus bas du marché.",
      "Investir le même montant à intervalles réguliers, peu importe le prix.",
      "Vendre dès que la crypto monte de 5 %.",
      "Suivre les conseils d'influenceurs Twitter.",
    ],
    correctIndex: 1,
    explanation:
      "Le DCA lisse le prix d'achat moyen sur la durée et neutralise le timing. C'est l'approche la plus rationnelle pour qui n'est pas trader pro.",
  },
  {
    id: "int-q2-pos-pow",
    question:
      "Quelle blockchain utilise encore le Proof of Work (PoW) en 2026 ?",
    choices: [
      "Ethereum",
      "Solana",
      "Bitcoin",
      "Cardano",
    ],
    correctIndex: 2,
    explanation:
      "Bitcoin reste en PoW. Ethereum est passé au PoS depuis The Merge (sept. 2022). Solana et Cardano sont nativement PoS.",
  },
  {
    id: "int-q3-l2",
    question:
      "Pourquoi utiliser un Layer 2 Ethereum (Arbitrum, Optimism, Base) ?",
    choices: [
      "Pour contourner MiCA.",
      "Pour bénéficier de transactions beaucoup moins chères tout en héritant de la sécurité d'Ethereum.",
      "Pour anonymiser ses transactions.",
      "Pour gagner automatiquement de l'argent.",
    ],
    correctIndex: 1,
    explanation:
      "Les L2 exécutent les transactions hors-chaîne puis les compriment vers Ethereum. Les frais sont divisés par 10 à 100, sans sacrifier la finalité L1.",
  },
  {
    id: "int-q4-seed",
    question:
      "Quelle pratique de backup de seed phrase est ACCEPTABLE ?",
    choices: [
      "La photographier avec son téléphone.",
      "L'enregistrer dans un Google Doc.",
      "La graver sur une plaque acier stockée dans un coffre, avec une copie chez un proche de confiance.",
      "L'envoyer par email à soi-même.",
    ],
    correctIndex: 2,
    explanation:
      "La seed ne doit JAMAIS toucher un appareil connecté. Acier (résistant au feu/eau) + split géographique = standard pour un patrimoine sérieux.",
  },
  {
    id: "int-q5-stablecoin",
    question:
      "En 2026, quel stablecoin est officiellement conforme MiCA en Europe ?",
    choices: [
      "USDT (Tether)",
      "USDC (Circle, agrément MiCA via filiale EU)",
      "BUSD",
      "DAI",
    ],
    correctIndex: 1,
    explanation:
      "Circle a obtenu l'agrément EMI nécessaire pour USDC en Europe. Tether (USDT) n'a pas la conformité MiCA, ce qui a poussé plusieurs exchanges à le délister pour les utilisateurs UE.",
  },
];

const QUIZ_AVANCE: QuizQuestion[] = [
  {
    id: "adv-q1-defi-fisca",
    question:
      "Tu fais du yield farming régulier sur Aave (lending) et Uniswap (LP). Quelle qualification fiscale est la plus probable en France ?",
    choices: [
      "Plus-values mobilières (PFU 30%).",
      "BNC (bénéfices non commerciaux) en activité non professionnelle.",
      "Salaire imposé en traitements et salaires.",
      "Aucune — la DeFi est défiscalisée.",
    ],
    correctIndex: 1,
    explanation:
      "Pour des opérations DeFi régulières et organisées sans achat-revente d'actifs, le BNC (non pro) est la qualification la plus défendable. Si l'activité devient quasi-professionnelle, le BIC peut être imposé. La DeFi N'EST PAS défiscalisée.",
  },
  {
    id: "adv-q2-3916",
    question:
      "Tu as un compte Binance et un compte Coinbase US. Quelle est ta principale obligation déclarative supplémentaire en 2026 ?",
    choices: [
      "Aucune, l'exchange déclare pour toi.",
      "Remplir un Cerfa 3916-bis pour CHAQUE compte ouvert sur une plateforme étrangère.",
      "Envoyer un courrier recommandé à Bercy.",
      "Acheter un VPN pour t'anonymiser.",
    ],
    correctIndex: 1,
    explanation:
      "Tout compte sur plateforme crypto étrangère doit être déclaré chaque année via le 3916-bis. Sanction : 1 500 € par compte oublié (jusqu'à 10 000 € si compte dans un État non coopératif).",
  },
  {
    id: "adv-q3-staking-fait-generateur",
    question:
      "Quel est le fait générateur de l'imposition des récompenses de staking en France ?",
    choices: [
      "Le moment de l'achat initial du token.",
      "Le moment où la récompense est revendue contre euros.",
      "Le moment où la récompense est créditée sur ton wallet (selon doctrine BOFIP / qualification BNC).",
      "Jamais, c'est exonéré.",
    ],
    correctIndex: 2,
    explanation:
      "Pour le staking qualifié BNC, les récompenses sont imposables à leur valeur en € au jour de l'attribution. La revente ultérieure peut générer une plus-value distincte si le cours a varié.",
  },
  {
    id: "adv-q4-pfu-bareme",
    question:
      "Quand l'option pour le barème progressif (case 2OP) est-elle plus intéressante que le PFU 30% sur tes plus-values crypto ?",
    choices: [
      "Toujours.",
      "Quand ton TMI est à 0% ou 11% : le total avec PS reste sous 30%.",
      "Quand tu es en TMI 45%.",
      "Jamais.",
    ],
    correctIndex: 1,
    explanation:
      "À TMI 0% : 0% IR + 17,2% PS = 17,2% (vs 30%). À TMI 11% : 11% + 17,2% = 28,2% (vs 30%). Au-delà (30%, 41%, 45%), le PFU reste plus avantageux. Attention : l'option engage TOUS tes revenus mobiliers de l'année.",
  },
  {
    id: "adv-q5-mica-risque",
    question:
      "Une plateforme n'a toujours pas obtenu son agrément CASP-MiCA confirmé en juin 2026. Quelle est la bonne action ?",
    choices: [
      "Continuer à y déposer des fonds, ça va passer.",
      "Migrer ses avoirs vers une plateforme avec agrément CASP confirmé, en gardant traces des prix d'acquisition.",
      "Tout vendre dans la panique sans plan fiscal.",
      "Convertir tout en USDT.",
    ],
    correctIndex: 1,
    explanation:
      "La migration ordonnée vers une plateforme CASP confirmée (avec conservation des historiques pour le calcul des plus-values) est la stratégie qui minimise le risque opérationnel ET le coût fiscal.",
  },
];

const QUIZZES: Record<TrackId, QuizQuestion[]> = {
  debutant: QUIZ_DEBUTANT,
  intermediaire: QUIZ_INTERMEDIAIRE,
  avance: QUIZ_AVANCE,
};

export function getQuizForTrack(trackId: string): QuizQuestion[] | null {
  if (
    trackId === "debutant" ||
    trackId === "intermediaire" ||
    trackId === "avance"
  ) {
    return QUIZZES[trackId];
  }
  return null;
}

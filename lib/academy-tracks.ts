/**
 * lib/academy-tracks.ts — Pilier 3 : Académie crypto structurée v2.
 *
 * Définit 6 parcours pédagogiques qui réutilisent les articles MDX existants
 * dans `content/articles/` plutôt que de réécrire du contenu :
 *   - 3 parcours par NIVEAU      : Débutant / Intermédiaire / Avancé
 *   - 3 parcours THÉMATIQUES     : Sécurité / Fiscalité / Plateformes
 * Un même article peut apparaître dans plusieurs tracks à des positions
 * différentes (ex: "sécuriser ses cryptos" est leçon du parcours Débutant ET
 * du parcours thématique Sécurité).
 *
 * Ce module est 100% statique (aucun IO, aucun fetch) — il peut être importé
 * aussi bien depuis un Server Component que depuis un Client Component (les
 * trackers de progression localStorage l'utilisent pour calculer les bornes).
 *
 * Convention :
 *   - `articleSlug` correspond à un .mdx existant dans content/articles/.
 *     C'est `lib/academy-progress.ts` qui validera les bornes par track.
 *   - L'`order` dans une lesson est 1-indexed et unique dans son track.
 *   - `prereqs` liste des `articleSlug` recommandés AVANT cette leçon
 *     (utilisé par l'UI pour afficher un soft warning, pas un blocker).
 */

export type TrackId =
  | "debutant"
  | "intermediaire"
  | "avance"
  | "securite"
  | "fiscalite"
  | "plateformes"
  | "defi"
  | "arnaques";

export interface Lesson {
  /** Position 1-indexed dans le track (sert d'ordre d'affichage et de clé). */
  order: number;
  /** Slug de l'article MDX existant (content/articles/{slug}.mdx). */
  articleSlug: string;
  /** Titre court affiché dans la sidebar/liste — peut différer du titre MDX. */
  title: string;
  /** Durée estimée en minutes (lecture confortable + assimilation). */
  durationMin: number;
  /** Slugs des leçons recommandées avant celle-ci (peer ou autre track). */
  prereqs: string[];
}

export interface Track {
  id: TrackId;
  /** Titre humain affiché (français, accentué). */
  title: string;
  /** Sous-titre / pitch d'1-2 phrases pour la card du parcours. */
  description: string;
  /** Niveau pédagogique normalisé (sert au schema.org Course). */
  level: "Beginner" | "Intermediate" | "Advanced";
  /** Durée totale estimée du track en heures (arrondi). */
  estimatedHours: number;
  /** Couleur d'accent pour la carte (utilitaire Tailwind, theme dark+gold). */
  accentClass: string;
  /** Emoji/icone visuelle (lucide via le composant TrackCard). */
  iconKey:
    | "sprout"
    | "target"
    | "rocket"
    | "shield"
    | "landmark"
    | "scale"
    | "coins"
    | "alert";
  /** Liste ordonnée des leçons. */
  lessons: Lesson[];
}

/* -------------------------------------------------------------------------- */
/*  Définition des 3 parcours                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Track Débutant — 9 leçons, ~2h.
 *
 * Logique pédagogique : on part du concept (blockchain) → choix d'un actif
 * (BTC vs ETH) → choix d'une plateforme → premier achat → sécurisation →
 * fiscalité minimale → MiCA pour comprendre l'environnement régulatoire.
 */
const TRACK_DEBUTANT: Track = {
  id: "debutant",
  title: "Débutant",
  description:
    "Tu n'as jamais acheté de crypto. On part de zéro : c'est quoi la blockchain, comment acheter ton premier Bitcoin sereinement, comment le sécuriser et comment déclarer aux impôts.",
  level: "Beginner",
  estimatedHours: 2,
  accentClass: "from-emerald-500/30 to-teal-600/20 border-emerald-500/40",
  iconKey: "sprout",
  lessons: [
    {
      order: 1,
      articleSlug: "qu-est-ce-que-la-blockchain-guide-ultra-simple-2026",
      title: "Comprendre la blockchain en 5 minutes",
      durationMin: 11,
      prereqs: [],
    },
    {
      order: 2,
      articleSlug: "bitcoin-vs-ethereum-differences-debutant-2026",
      title: "Bitcoin vs Ethereum : les différences",
      durationMin: 12,
      prereqs: ["qu-est-ce-que-la-blockchain-guide-ultra-simple-2026"],
    },
    {
      order: 3,
      articleSlug: "meilleure-plateforme-crypto-debutant-france-2026",
      title: "Choisir sa plateforme d'achat",
      durationMin: 14,
      prereqs: [],
    },
    {
      order: 4,
      articleSlug: "premier-achat-crypto-france-2026-guide-step-by-step",
      title: "Faire son tout premier achat (step-by-step)",
      durationMin: 17,
      prereqs: ["meilleure-plateforme-crypto-debutant-france-2026"],
    },
    {
      order: 5,
      articleSlug: "comment-acheter-bitcoin-france-2026-guide-debutant",
      title: "Acheter du Bitcoin en France",
      durationMin: 16,
      prereqs: ["premier-achat-crypto-france-2026-guide-step-by-step"],
    },
    {
      order: 6,
      articleSlug: "securiser-cryptos-wallet-2fa-2026",
      title: "Sécuriser ses cryptos (2FA, wallet, anti-phishing)",
      durationMin: 9,
      prereqs: ["premier-achat-crypto-france-2026-guide-step-by-step"],
    },
    {
      order: 7,
      articleSlug: "cold-wallet-vs-hot-wallet-guide-complet-2026",
      title: "Cold wallet vs Hot wallet : que choisir",
      durationMin: 11,
      prereqs: ["securiser-cryptos-wallet-2fa-2026"],
    },
    {
      order: 8,
      articleSlug: "comment-declarer-crypto-impots-2026-guide-complet",
      title: "Déclarer ses cryptos aux impôts (bases)",
      durationMin: 18,
      prereqs: ["premier-achat-crypto-france-2026-guide-step-by-step"],
    },
    {
      order: 9,
      articleSlug: "mica-regulation-europe-2026",
      title: "MiCA expliqué simplement",
      durationMin: 8,
      prereqs: [],
    },
    {
      order: 10,
      articleSlug: "bitcoin-guide-complet-debutant-2026",
      title: "Bitcoin : le guide complet du débutant",
      durationMin: 20,
      prereqs: ["qu-est-ce-que-la-blockchain-guide-ultra-simple-2026"],
    },
    {
      order: 11,
      articleSlug: "acheter-bitcoin-100-euros-france-2026",
      title: "Acheter du Bitcoin avec 100 € (budget débutant)",
      durationMin: 12,
      prereqs: ["comment-acheter-bitcoin-france-2026-guide-debutant"],
    },
  ],
};

/**
 * Track Intermédiaire — 11 leçons, ~2h30.
 *
 * Cible : tu détiens déjà des cryptos, tu veux structurer ta démarche.
 * Stratégie d'achat (DCA/HODL/trade) → mécanique POS/POW → écosystèmes
 * (ETH, SOL, stablecoins, ETF) → setup hardware wallet → backup seed →
 * MiCA opérationnel.
 */
const TRACK_INTERMEDIAIRE: Track = {
  id: "intermediaire",
  title: "Intermédiaire",
  description:
    "Tu as déjà ton premier portefeuille. On structure : DCA vs HODL vs trade, comprendre PoS/PoW, les Layer 2, configurer un Ledger, et faire le tri sur les plateformes post-MiCA.",
  level: "Intermediate",
  estimatedHours: 2.5,
  accentClass: "from-amber-500/30 to-orange-600/20 border-amber-500/40",
  iconKey: "target",
  lessons: [
    {
      order: 1,
      articleSlug: "trader-vs-dca-vs-hodl",
      title: "Trader, DCA ou HODL : choisir sa stratégie",
      durationMin: 8,
      prereqs: [],
    },
    {
      order: 2,
      articleSlug: "proof-of-stake-vs-proof-of-work-difference-5-minutes",
      title: "PoS vs PoW : la différence en 5 minutes",
      durationMin: 9,
      prereqs: ["qu-est-ce-que-la-blockchain-guide-ultra-simple-2026"],
    },
    {
      order: 3,
      articleSlug: "layer-2-ethereum-qu-est-ce-pourquoi-crucial-2026",
      title: "Layer 2 Ethereum : Arbitrum, Optimism, Base",
      durationMin: 12,
      prereqs: ["bitcoin-vs-ethereum-differences-debutant-2026"],
    },
    {
      order: 4,
      articleSlug: "acheter-ethereum-eth-france-2026-guide",
      title: "Acheter et utiliser de l'Ethereum",
      durationMin: 15,
      prereqs: ["bitcoin-vs-ethereum-differences-debutant-2026"],
    },
    {
      order: 5,
      articleSlug: "acheter-solana-sol-france-2026-guide",
      title: "Acheter Solana (SOL) en France",
      durationMin: 14,
      prereqs: [],
    },
    {
      order: 6,
      articleSlug: "acheter-usdc-usdt-france-2026-stablecoins",
      title: "Stablecoins : USDC vs USDT",
      durationMin: 15,
      prereqs: [],
    },
    {
      order: 7,
      articleSlug: "configurer-ledger-nano-x-30-minutes-guide-pas-a-pas",
      title: "Configurer un Ledger Nano X (30 min)",
      durationMin: 12,
      prereqs: ["cold-wallet-vs-hot-wallet-guide-complet-2026"],
    },
    {
      order: 8,
      articleSlug: "backup-seed-phrase-5-methodes-ultra-sures-2026",
      title: "Backup de seed phrase : 5 méthodes sûres",
      durationMin: 13,
      prereqs: ["configurer-ledger-nano-x-30-minutes-guide-pas-a-pas"],
    },
    {
      order: 9,
      articleSlug: "stablecoins-euro-mica-compliant-comparatif-2026",
      title: "Stablecoins euro MiCA : EURC, EURI, EURØP",
      durationMin: 12,
      prereqs: ["acheter-usdc-usdt-france-2026-stablecoins"],
    },
    {
      order: 10,
      articleSlug: "etf-bitcoin-spot-europe-2026-arbitrage",
      title: "ETF Bitcoin spot Europe : arbitrage et fiscalité",
      durationMin: 12,
      prereqs: ["comment-acheter-bitcoin-france-2026-guide-debutant"],
    },
    {
      order: 11,
      articleSlug: "mica-juillet-2026-checklist-survie",
      title: "MiCA juillet 2026 : checklist de survie",
      durationMin: 11,
      prereqs: ["mica-regulation-europe-2026"],
    },
    {
      order: 12,
      articleSlug: "acheter-bnb-france-2026-guide",
      title: "Acheter du BNB en France",
      durationMin: 13,
      prereqs: ["meilleure-plateforme-crypto-debutant-france-2026"],
    },
    {
      order: 13,
      articleSlug: "acheter-cardano-ada-france-2026-guide",
      title: "Acheter du Cardano (ADA) en France",
      durationMin: 13,
      prereqs: [],
    },
    {
      order: 14,
      articleSlug: "acheter-xrp-france-2026-guide",
      title: "Acheter du XRP en France",
      durationMin: 13,
      prereqs: [],
    },
    {
      order: 15,
      articleSlug: "bitcoin-dominance-comprendre-utiliser-2026",
      title: "Bitcoin dominance : lire le marché",
      durationMin: 11,
      prereqs: [],
    },
  ],
};

/**
 * Track Avancé — 12 leçons, ~2h30.
 *
 * Cible : tu maîtrises les bases, tu veux exploiter au mieux ton capital
 * et rester légal sur les sujets pointus. Comparaisons hardware avancées →
 * staking / DeFi / NFT → fiscalité experte (BIC/BNC, NFT, comptes étrangers,
 * PFU vs barème) → cartographie MiCA des plateformes à risque.
 */
const TRACK_AVANCE: Track = {
  id: "avance",
  title: "Avancé",
  description:
    "Tu maîtrises les bases. On creuse les sujets pointus : DeFi, staking comparé, NFT, fiscalité experte (BIC/BNC, NFT, 3916-bis, PFU vs barème), et la cartographie MiCA des plateformes à risque.",
  level: "Advanced",
  estimatedHours: 2.5,
  accentClass: "from-fuchsia-500/30 to-violet-600/20 border-fuchsia-500/40",
  iconKey: "rocket",
  lessons: [
    {
      order: 1,
      articleSlug: "ledger-vs-trezor-duel-objectif-2026-par-profil",
      title: "Ledger vs Trezor : duel objectif par profil",
      durationMin: 13,
      prereqs: ["configurer-ledger-nano-x-30-minutes-guide-pas-a-pas"],
    },
    {
      order: 2,
      articleSlug: "ledger-live-tout-ce-qu-on-peut-faire-2026",
      title: "Ledger Live : tout ce qu'on peut faire",
      durationMin: 12,
      prereqs: ["configurer-ledger-nano-x-30-minutes-guide-pas-a-pas"],
    },
    {
      order: 3,
      articleSlug: "staking-eth-vs-sol-vs-ada-2026",
      title: "Staking ETH vs SOL vs ADA",
      durationMin: 13,
      prereqs: ["proof-of-stake-vs-proof-of-work-difference-5-minutes"],
    },
    {
      order: 4,
      articleSlug: "defi-pour-debutants-savoir-avant-commencer-2026",
      title: "DeFi : ce qu'il faut savoir avant de commencer",
      durationMin: 13,
      prereqs: ["acheter-ethereum-eth-france-2026-guide"],
    },
    {
      order: 5,
      articleSlug: "fiscalite-staking-eth-sol-ada-france-2026-guide-complet",
      title: "Fiscalité du staking en France",
      durationMin: 17,
      prereqs: ["staking-eth-vs-sol-vs-ada-2026"],
    },
    {
      order: 6,
      articleSlug: "fiscalite-defi-france-2026-bic-ou-bnc-guide-pratique",
      title: "Fiscalité DeFi : BIC ou BNC ?",
      durationMin: 18,
      prereqs: ["defi-pour-debutants-savoir-avant-commencer-2026"],
    },
    {
      order: 7,
      articleSlug: "fiscalite-nft-france-2026-guide-complet-creation-achat-vente",
      title: "Fiscalité NFT : création, achat, vente",
      durationMin: 16,
      prereqs: [],
    },
    {
      order: 8,
      articleSlug: "cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026",
      title: "Cerfa 3916-bis : déclarer ses comptes étrangers",
      durationMin: 15,
      prereqs: ["comment-declarer-crypto-impots-2026-guide-complet"],
    },
    {
      order: 9,
      articleSlug: "eviter-pfu-30-crypto-bareme-progressif-legalement-2026",
      title: "Éviter le PFU 31,4% : option barème progressif",
      durationMin: 16,
      prereqs: ["comment-declarer-crypto-impots-2026-guide-complet"],
    },
    {
      order: 10,
      articleSlug: "psan-vs-casp-statut-mica-plateformes-crypto",
      title: "PSAN vs CASP : statut MiCA des plateformes",
      durationMin: 13,
      prereqs: ["mica-regulation-europe-2026"],
    },
    {
      order: 11,
      articleSlug: "mica-phase-2-juillet-2026-ce-qui-change",
      title: "MiCA Phase 2 : ce qui change pour les Français",
      durationMin: 14,
      prereqs: ["mica-juillet-2026-checklist-survie"],
    },
    {
      order: 12,
      articleSlug: "plateformes-crypto-risque-mica-phase-2-alternatives",
      title: "Plateformes à risque MiCA : alternatives",
      durationMin: 14,
      prereqs: ["mica-juillet-2026-checklist-survie"],
    },
    {
      order: 13,
      articleSlug: "qu-est-ce-qu-une-dao-fonctionnement-exemples-2026",
      title: "DAO : gouvernance décentralisée expliquée",
      durationMin: 14,
      prereqs: [],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Définition des 3 parcours thématiques (transversaux aux niveaux)          */
/* -------------------------------------------------------------------------- */

/**
 * Track Sécurité — 10 leçons, ~2h.
 *
 * Cible : tu détiens déjà des cryptos et tu veux dormir tranquille. On couvre
 * toute la chaîne de l'auto-conservation : hygiène 2FA → anti-phishing → cold
 * vs hot → hardware wallet → choix Ledger → air-gap → backup seed → Shamir →
 * passphrase 25e mot → multisig. Mix d'articles existants (débutant +
 * orphelins sécurité jamais intégrés à un parcours).
 */
const TRACK_SECURITE: Track = {
  id: "securite",
  title: "Sécurité",
  description:
    "Tu détiens déjà des cryptos et tu veux dormir tranquille. De l'hygiène 2FA au multisig : protège ton patrimoine contre le hack d'exchange, le phishing et la perte de seed phrase.",
  level: "Intermediate",
  estimatedHours: 2,
  accentClass: "from-sky-500/30 to-cyan-600/20 border-sky-500/40",
  iconKey: "shield",
  lessons: [
    {
      order: 1,
      articleSlug: "securiser-cryptos-wallet-2fa-2026",
      title: "Sécuriser ses cryptos : 2FA et hygiène de base",
      durationMin: 9,
      prereqs: [],
    },
    {
      order: 2,
      articleSlug: "phishing-crypto-2026-eviter-arnaques-courantes",
      title: "Reconnaître et éviter le phishing crypto",
      durationMin: 10,
      prereqs: [],
    },
    {
      order: 3,
      articleSlug: "cold-wallet-vs-hot-wallet-guide-complet-2026",
      title: "Cold wallet vs hot wallet : que choisir",
      durationMin: 11,
      prereqs: [],
    },
    {
      order: 4,
      articleSlug: "configurer-ledger-nano-x-30-minutes-guide-pas-a-pas",
      title: "Configurer son premier hardware wallet",
      durationMin: 12,
      prereqs: ["cold-wallet-vs-hot-wallet-guide-complet-2026"],
    },
    {
      order: 5,
      articleSlug: "ledger-nano-s-plus-vs-nano-x-2026-lequel-choisir",
      title: "Ledger Nano S Plus vs Nano X",
      durationMin: 10,
      prereqs: [],
    },
    {
      order: 6,
      articleSlug: "wallet-air-gap-vs-bluetooth-securite-2026",
      title: "Air-gap vs Bluetooth : surface d'attaque",
      durationMin: 10,
      prereqs: ["configurer-ledger-nano-x-30-minutes-guide-pas-a-pas"],
    },
    {
      order: 7,
      articleSlug: "backup-seed-phrase-5-methodes-ultra-sures-2026",
      title: "Sauvegarder sa seed phrase (5 méthodes sûres)",
      durationMin: 13,
      prereqs: [],
    },
    {
      order: 8,
      articleSlug: "shamir-backup-seed-decouper-en-parts-2026",
      title: "Shamir Backup : découper sa seed en parts",
      durationMin: 12,
      prereqs: ["backup-seed-phrase-5-methodes-ultra-sures-2026"],
    },
    {
      order: 9,
      articleSlug: "passphrase-bip39-25e-mot-securite-avance-2026",
      title: "Passphrase BIP39 : le 25e mot",
      durationMin: 11,
      prereqs: ["backup-seed-phrase-5-methodes-ultra-sures-2026"],
    },
    {
      order: 10,
      articleSlug: "multi-sig-wallet-bitcoin-debutant-2026",
      title: "Multisig : supprimer le point unique de défaillance",
      durationMin: 12,
      prereqs: [],
    },
  ],
};

/**
 * Track Fiscalité — 13 leçons, ~3h.
 *
 * Cible : tu veux déclarer juste, sans payer un centime de trop ni risquer un
 * redressement. Parcours complet de la fiscalité crypto française 2026 :
 * bases → 2086 → PFU vs barème → optimisation → frais & pertes → staking →
 * DeFi → NFT → airdrops → 3916-bis → choix de l'outil fiscal.
 */
const TRACK_FISCALITE: Track = {
  id: "fiscalite",
  title: "Fiscalité",
  description:
    "Déclarer juste, sans payer un centime de trop ni risquer un redressement. Le parcours complet de la fiscalité crypto française 2026 : 2086, PFU vs barème, staking, DeFi, NFT, 3916-bis.",
  level: "Advanced",
  estimatedHours: 3,
  accentClass: "from-rose-500/30 to-red-600/20 border-rose-500/40",
  iconKey: "landmark",
  lessons: [
    {
      order: 1,
      articleSlug: "comment-declarer-crypto-impots-2026-guide-complet",
      title: "Les bases de la déclaration crypto",
      durationMin: 18,
      prereqs: [],
    },
    {
      order: 2,
      articleSlug: "declaration-crypto-cerfa-2086-tutoriel-2026",
      title: "Remplir le formulaire 2086 (plus-values)",
      durationMin: 15,
      prereqs: ["comment-declarer-crypto-impots-2026-guide-complet"],
    },
    {
      order: 3,
      articleSlug: "calcul-pfu-30-crypto-exemple-chiffre",
      title: "Calculer le PFU 31,4 % : exemple chiffré",
      durationMin: 12,
      prereqs: [],
    },
    {
      order: 4,
      articleSlug: "bareme-progressif-vs-pfu-crypto-2026",
      title: "Barème progressif vs PFU : que choisir",
      durationMin: 13,
      prereqs: ["calcul-pfu-30-crypto-exemple-chiffre"],
    },
    {
      order: 5,
      articleSlug: "eviter-pfu-30-crypto-bareme-progressif-legalement-2026",
      title: "Optimiser légalement son imposition",
      durationMin: 16,
      prereqs: ["bareme-progressif-vs-pfu-crypto-2026"],
    },
    {
      order: 6,
      articleSlug: "frais-acquisition-crypto-deductible-2026",
      title: "Déduire ses frais d'acquisition",
      durationMin: 10,
      prereqs: [],
    },
    {
      order: 7,
      articleSlug: "deduire-pertes-crypto-impot-2026",
      title: "Imputer ses moins-values",
      durationMin: 11,
      prereqs: [],
    },
    {
      order: 8,
      articleSlug: "fiscalite-staking-eth-sol-ada-france-2026-guide-complet",
      title: "Fiscalité du staking",
      durationMin: 17,
      prereqs: [],
    },
    {
      order: 9,
      articleSlug: "fiscalite-defi-france-2026-bic-ou-bnc-guide-pratique",
      title: "Fiscalité DeFi : BIC ou BNC ?",
      durationMin: 18,
      prereqs: [],
    },
    {
      order: 10,
      articleSlug:
        "fiscalite-nft-france-2026-guide-complet-creation-achat-vente",
      title: "Fiscalité des NFT",
      durationMin: 16,
      prereqs: [],
    },
    {
      order: 11,
      articleSlug: "fiscalite-airdrops-crypto-france-2026",
      title: "Fiscalité des airdrops",
      durationMin: 12,
      prereqs: [],
    },
    {
      order: 12,
      articleSlug: "cerfa-3916-bis-crypto-declarer-comptes-etrangers-2026",
      title: "Déclarer ses comptes étrangers (3916-bis)",
      durationMin: 15,
      prereqs: ["comment-declarer-crypto-impots-2026-guide-complet"],
    },
    {
      order: 13,
      articleSlug: "waltio-vs-koinly-vs-accointing-comparatif-2026",
      title: "Choisir son outil fiscal : Waltio, Koinly, Accointing",
      durationMin: 12,
      prereqs: [],
    },
  ],
};

/**
 * Track Plateformes — 11 leçons, ~2h.
 *
 * Cible : tu cherches OÙ acheter et conserver, sans te faire piéger par une
 * plateforme non conforme MiCA. Méthode de choix → revues des principaux
 * exchanges (Kraken, Coinbase, Binance, Bitget, Crypto.com, Trade Republic) →
 * lecture du risque MiCA → statuts PSAN/CASP → alternatives.
 */
const TRACK_PLATEFORMES: Track = {
  id: "plateformes",
  title: "Plateformes",
  description:
    "Où acheter et conserver sans te faire piéger par une plateforme non conforme. Méthode de choix, revues des grands exchanges et lecture du risque MiCA : PSAN, CASP, alternatives.",
  level: "Beginner",
  estimatedHours: 2,
  accentClass: "from-blue-500/30 to-indigo-600/20 border-blue-500/40",
  iconKey: "scale",
  lessons: [
    {
      order: 1,
      articleSlug: "meilleure-plateforme-crypto-debutant-france-2026",
      title: "Comment choisir sa plateforme",
      durationMin: 14,
      prereqs: [],
    },
    {
      order: 2,
      articleSlug: "kraken-avis-france-2026",
      title: "Avis Kraken",
      durationMin: 10,
      prereqs: [],
    },
    {
      order: 3,
      articleSlug: "coinbase-avis-france-2026",
      title: "Avis Coinbase",
      durationMin: 10,
      prereqs: [],
    },
    {
      order: 4,
      articleSlug: "binance-avis-france-2026",
      title: "Avis Binance",
      durationMin: 10,
      prereqs: [],
    },
    {
      order: 5,
      articleSlug: "bitget-avis-france-2026",
      title: "Avis Bitget",
      durationMin: 10,
      prereqs: [],
    },
    {
      order: 6,
      articleSlug: "crypto-com-avis-france-2026",
      title: "Avis Crypto.com",
      durationMin: 10,
      prereqs: [],
    },
    {
      order: 7,
      articleSlug: "trade-republic-crypto-avis-2026",
      title: "Avis Trade Republic (crypto)",
      durationMin: 10,
      prereqs: [],
    },
    {
      order: 8,
      articleSlug: "mica-binance-france-2026",
      title: "Binance face à MiCA en France",
      durationMin: 10,
      prereqs: ["binance-avis-france-2026"],
    },
    {
      order: 9,
      articleSlug: "alternative-binance-france-post-mica",
      title: "Alternatives à Binance post-MiCA",
      durationMin: 10,
      prereqs: ["mica-binance-france-2026"],
    },
    {
      order: 10,
      articleSlug: "psan-vs-casp-statut-mica-plateformes-crypto",
      title: "PSAN vs CASP : décoder les statuts",
      durationMin: 13,
      prereqs: [],
    },
    {
      order: 11,
      articleSlug: "plateformes-crypto-risque-mica-phase-2-alternatives",
      title: "Plateformes à risque MiCA : que faire",
      durationMin: 14,
      prereqs: ["psan-vs-casp-statut-mica-plateformes-crypto"],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Parcours thématique — DeFi en profondeur (v2 académie)                    */
/* -------------------------------------------------------------------------- */

/**
 * Track DeFi en profondeur — 6 leçons, ~1h30.
 * Cible : tu as les bases, tu veux comprendre la finance décentralisée et les
 * usages on-chain avancés (Layer 2, Lightning, staking) + leur fiscalité.
 */
const TRACK_DEFI: Track = {
  id: "defi",
  title: "DeFi en profondeur",
  description:
    "Comprendre la finance décentralisée et les usages on-chain avancés : Layer 2, Lightning, staking — et leur fiscalité française. Pour passer de simple détenteur à utilisateur averti.",
  level: "Advanced",
  estimatedHours: 1.5,
  accentClass: "from-teal-500/30 to-emerald-600/20 border-teal-500/40",
  iconKey: "coins",
  lessons: [
    { order: 1, articleSlug: "defi-pour-debutants-savoir-avant-commencer-2026", title: "DeFi : ce qu'il faut savoir avant de commencer", durationMin: 13, prereqs: [] },
    { order: 2, articleSlug: "arbitrum-optimism-base-comparatif-layer-2-2026", title: "Layer 2 comparés : Arbitrum, Optimism, Base", durationMin: 14, prereqs: [] },
    { order: 3, articleSlug: "lightning-network-bitcoin-comprendre-utiliser-2026", title: "Lightning Network : Bitcoin instantané", durationMin: 15, prereqs: [] },
    { order: 4, articleSlug: "staking-eth-vs-sol-vs-ada-2026", title: "Staking comparé : ETH vs SOL vs ADA", durationMin: 13, prereqs: [] },
    { order: 5, articleSlug: "fiscalite-staking-eth-sol-ada-france-2026-guide-complet", title: "Fiscalité du staking en France", durationMin: 17, prereqs: ["staking-eth-vs-sol-vs-ada-2026"] },
    { order: 6, articleSlug: "fiscalite-defi-france-2026-bic-ou-bnc-guide-pratique", title: "Fiscalité DeFi : BIC ou BNC ?", durationMin: 18, prereqs: ["defi-pour-debutants-savoir-avant-commencer-2026"] },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Parcours thématique — Repérer les arnaques (v2 académie, 30/05/2026)        */
/* -------------------------------------------------------------------------- */

/**
 * Track Arnaques & erreurs — 9 leçons, ~2h.
 * Cible : tout le monde. Parcours d'autodéfense complet : (1) les réflexes
 * anti-arnaque universels, (2) les 6 grandes arnaques crypto (phishing, faux
 * support/SIM-swap, drainers, rug pull, pump & dump, Ponzi, pig butchering) et
 * (3) les erreurs qu'on s'inflige soi-même. Objectif : NE PAS se faire avoir,
 * et éviter les pertes auto-infligées. Réutilise phishing (parcours Sécurité)
 * + 8 articles dédiés rédigés et fact-checkés pour ce parcours.
 */
const TRACK_ARNAQUES: Track = {
  id: "arnaques",
  title: "Arnaques & erreurs : se protéger",
  description:
    "Le parcours d'autodéfense crypto : les réflexes anti-arnaque universels, les grandes arnaques (rug pull, Ponzi, faux support, pump and dump, drainers, pig butchering) et les erreurs qu'on s'inflige soi-même. Pour protéger ton capital avant de te faire avoir.",
  level: "Beginner",
  estimatedHours: 2,
  accentClass: "from-red-500/30 to-rose-600/20 border-red-500/40",
  iconKey: "alert",
  lessons: [
    {
      order: 1,
      articleSlug: "checklist-anti-arnaque-crypto-reflexes-2026",
      title: "La checklist anti-arnaque : tes réflexes universels",
      durationMin: 9,
      prereqs: [],
    },
    {
      order: 2,
      articleSlug: "phishing-crypto-2026-eviter-arnaques-courantes",
      title: "Phishing crypto : la porte d'entrée de toutes les arnaques",
      durationMin: 10,
      prereqs: ["checklist-anti-arnaque-crypto-reflexes-2026"],
    },
    {
      order: 3,
      articleSlug: "faux-support-sim-swap-crypto-arnaque-2026",
      title: "Faux support et SIM-swap : le vol de comptes",
      durationMin: 8,
      prereqs: ["phishing-crypto-2026-eviter-arnaques-courantes"],
    },
    {
      order: 4,
      articleSlug: "faux-airdrops-wallet-drainers-crypto-2026",
      title: "Faux airdrops et wallet drainers : l'arnaque à la signature",
      durationMin: 8,
      prereqs: [],
    },
    {
      order: 5,
      articleSlug: "rug-pull-crypto-reconnaitre-eviter-2026",
      title: "Rug pull : l'arnaque à la liquidité",
      durationMin: 9,
      prereqs: [],
    },
    {
      order: 6,
      articleSlug: "pump-and-dump-crypto-comprendre-eviter-2026",
      title: "Pump and dump : la manipulation de marché",
      durationMin: 8,
      prereqs: [],
    },
    {
      order: 7,
      articleSlug: "ponzi-hyip-crypto-schemas-pyramidaux-2026",
      title: "Ponzi, HYIP et schémas pyramidaux",
      durationMin: 9,
      prereqs: [],
    },
    {
      order: 8,
      articleSlug: "pig-butchering-arnaque-romance-crypto-2026",
      title: "Pig butchering : l'arnaque sentimentale longue durée",
      durationMin: 9,
      prereqs: [],
    },
    {
      order: 9,
      articleSlug: "erreurs-debutant-crypto-eviter-2026",
      title: "Les 10 erreurs de débutant (et comment les éviter)",
      durationMin: 9,
      prereqs: [],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Export                                                                     */
/* -------------------------------------------------------------------------- */

export const TRACKS: Track[] = [
  TRACK_DEBUTANT,
  TRACK_INTERMEDIAIRE,
  TRACK_AVANCE,
  TRACK_DEFI,
  TRACK_SECURITE,
  TRACK_FISCALITE,
  TRACK_PLATEFORMES,
  TRACK_ARNAQUES,
];

/** Index O(1) par id — évite les `find()` répétés. */
const TRACK_INDEX: Record<TrackId, Track> = {
  debutant: TRACK_DEBUTANT,
  intermediaire: TRACK_INTERMEDIAIRE,
  avance: TRACK_AVANCE,
  defi: TRACK_DEFI,
  securite: TRACK_SECURITE,
  fiscalite: TRACK_FISCALITE,
  plateformes: TRACK_PLATEFORMES,
  arnaques: TRACK_ARNAQUES,
};

/** Récupère un track par son id ; renvoie `null` si inconnu. */
export function getTrack(id: string): Track | null {
  if (Object.prototype.hasOwnProperty.call(TRACK_INDEX, id)) {
    return TRACK_INDEX[id as TrackId];
  }
  return null;
}

/** Récupère une leçon par track + slug d'article ; `null` si introuvable. */
export function getLesson(trackId: string, lessonSlug: string): Lesson | null {
  const track = getTrack(trackId);
  if (!track) return null;
  return track.lessons.find((l) => l.articleSlug === lessonSlug) ?? null;
}

/** Renvoie la leçon précédente / suivante dans le track. */
export function getNeighbors(
  trackId: string,
  lessonSlug: string
): { prev: Lesson | null; next: Lesson | null } {
  const track = getTrack(trackId);
  if (!track) return { prev: null, next: null };
  const idx = track.lessons.findIndex((l) => l.articleSlug === lessonSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? track.lessons[idx - 1] : null,
    next: idx < track.lessons.length - 1 ? track.lessons[idx + 1] : null,
  };
}

/** Tous les article slugs uniques utilisés dans au moins un track. */
export function getAllAcademyArticleSlugs(): string[] {
  const set = new Set<string>();
  for (const t of TRACKS) for (const l of t.lessons) set.add(l.articleSlug);
  return Array.from(set);
}

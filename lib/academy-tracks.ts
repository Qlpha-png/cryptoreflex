/**
 * lib/academy-tracks.ts — Pilier 3 : Académie crypto structurée v2.
 *
 * Définit 3 parcours pédagogiques (Débutant / Intermédiaire / Avancé) qui
 * réutilisent les articles MDX existants dans `content/articles/` plutôt que
 * de réécrire du contenu. Un même article peut apparaître dans plusieurs
 * tracks à des positions différentes (ex: "blockchain expliquée" est leçon
 * 1 du parcours Débutant ET leçon 1 d'un éventuel rappel Intermédiaire).
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

export type TrackId = "debutant" | "intermediaire" | "avance";

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
  iconKey: "sprout" | "target" | "rocket";
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
  ],
};

/**
 * Track Intermédiaire — 9 leçons, ~2h15.
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
  ],
};

/**
 * Track Avancé — 8 leçons, ~2h.
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
      title: "Éviter le PFU 30% : option barème progressif",
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
  ],
};

/* -------------------------------------------------------------------------- */
/*  Export                                                                     */
/* -------------------------------------------------------------------------- */

export const TRACKS: Track[] = [
  TRACK_DEBUTANT,
  TRACK_INTERMEDIAIRE,
  TRACK_AVANCE,
];

/** Index O(1) par id — évite les `find()` répétés. */
const TRACK_INDEX: Record<TrackId, Track> = {
  debutant: TRACK_DEBUTANT,
  intermediaire: TRACK_INTERMEDIAIRE,
  avance: TRACK_AVANCE,
};

/** Récupère un track par son id ; renvoie `null` si inconnu. */
export function getTrack(id: string): Track | null {
  if (id === "debutant" || id === "intermediaire" || id === "avance") {
    return TRACK_INDEX[id];
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

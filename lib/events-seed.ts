/**
 * lib/events-seed.ts — Seed hardcodé d'événements crypto (pilier 4).
 *
 * Ce seed sert de fallback quand `NEXT_PUBLIC_COINMARKETCAL_KEY` n'est pas
 * configurée, ou quand l'API tierce répond en erreur. C'est aussi la base
 * mergée avec la réponse API quand celle-ci est disponible (la seed donne
 * la version éditorialisée FR, l'API enrichit avec des événements live).
 *
 * Curation :
 *  - 10 événements à venir (post 2026-04-26)
 *  - 10 événements récents (passés depuis < 12 mois) — utiles pour
 *    la vue calendrier mensuel "naviguer en arrière" et démontrer la richesse.
 *  - 10 conférences récurrentes (mix futur + passé proche).
 *
 * IMPORTANT : si tu mets à jour ce fichier, vérifie que :
 *  1. Les `id` restent uniques.
 *  2. Les dates futures sont bien postérieures à la date du jour au moment
 *     de la prochaine release (sinon l'event tombe dans "récents" tout seul).
 *  3. Les `sourceUrl` pointent vers une source officielle (annonce projet,
 *     communiqué Fed/SEC, page de conférence). Pas de scraping = on cite la
 *     page officielle, jamais un agrégateur tiers.
 */

import type { CryptoEvent } from "@/lib/events-types";

/**
 * Note méthodologique sur les dates :
 *  - FOMC : calendrier publié par la Fed (federalreserve.gov/monetarypolicy/fomccalendars.htm)
 *  - Halvings : estimés via `current_block + (target_block - current) / 144 / 365`.
 *    On marque approximatif (pas de garantie ±15j sur Bitcoin, plus pour Litecoin).
 *  - Conférences : dates officielles annoncées par les organisateurs.
 *  - ETF : deadlines SEC publiques (sec.gov/sro).
 *
 * On préfère "donnée légèrement datée mais sourcée" à "donnée fraîche scrappée".
 */

export const EVENTS_SEED: CryptoEvent[] = [
  /* ========================================================================
   * 10 ÉVÉNEMENTS À VENIR (post 2026-04-26)
   * ======================================================================== */
  {
    id: "fomc-2026-05",
    title: "Décision de taux FOMC (mai 2026)",
    date: "2026-05-06",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description:
      "Réunion du Federal Open Market Committee. Communication sur les taux directeurs et le bilan de la Fed — historiquement source de volatilité sur le BTC dans les heures qui suivent.",
    importance: 3,
  },
  {
    id: "btc-prague-2026",
    title: "BTC Prague 2026",
    date: "2026-06-19",
    crypto: "BTC",
    category: "Conference",
    source: "BTC Prague",
    sourceUrl: "https://www.btcprague.com/",
    description:
      "Plus grande conférence Bitcoin-only d'Europe. Trois jours de talks, ateliers Lightning et stands hardware wallets au Prague Congress Centre.",
    importance: 2,
  },
  {
    id: "fomc-2026-06",
    title: "Décision de taux FOMC (juin 2026)",
    date: "2026-06-17",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description:
      "Réunion FOMC avec mise à jour des projections économiques (SEP) et conférence de presse de Jerome Powell. Événement à fort impact macro.",
    importance: 3,
  },
  {
    id: "etf-sol-decision-2026",
    title: "Décision SEC sur l'ETF spot Solana",
    date: "2026-07-15",
    crypto: "SOL",
    category: "ETF",
    source: "SEC",
    sourceUrl: "https://www.sec.gov/rules-regulations/self-regulatory-organization-rulemaking",
    description:
      "Deadline finale pour la SEC sur plusieurs demandes d'ETF spot Solana (VanEck, 21Shares, Bitwise). Une approbation ouvrirait un canal d'investissement institutionnel direct.",
    importance: 3,
  },
  {
    id: "ltc-halving-2027",
    title: "Halving Litecoin (estimation)",
    date: "2027-08-04",
    crypto: "LTC",
    category: "Halving",
    source: "Litecoin Foundation",
    sourceUrl: "https://litecoin.org/",
    description:
      "Cinquième halving de Litecoin : la récompense de bloc passe de 6,25 à 3,125 LTC. Date approximative basée sur le rythme moyen ~2,5 minutes par bloc.",
    importance: 2,
  },
  {
    id: "token2049-singapore-2026",
    title: "Token2049 Singapore",
    date: "2026-10-01",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "Token2049",
    sourceUrl: "https://www.asia.token2049.com/",
    description:
      "Conférence crypto la plus influente d'Asie. Plus de 20 000 participants, fondateurs de protocoles majeurs, side-events sponsorisés dans tout Singapour.",
    importance: 3,
  },
  {
    id: "devcon-bali-2026",
    title: "Devcon 8 — Bali",
    date: "2026-11-03",
    crypto: "ETH",
    category: "Conference",
    source: "Ethereum Foundation",
    sourceUrl: "https://devcon.org/",
    description:
      "Devcon est la conférence Ethereum officielle organisée par la Fondation. Quatre jours de recherche, R&D protocole, applications et social layer.",
    importance: 3,
  },
  {
    id: "eth-pectra-followup-2026",
    title: "Mise à jour réseau Ethereum (suite Pectra)",
    date: "2026-09-15",
    crypto: "ETH",
    category: "Update",
    source: "Ethereum Foundation",
    sourceUrl: "https://ethereum.org/en/roadmap/",
    description:
      "Hard fork programmée intégrant les EIPs prévues après Pectra (verkle trees partiels, optimisations DA). Test sur Sepolia / Holesky avant déploiement mainnet.",
    importance: 2,
  },
  {
    id: "arb-token-unlock-2026-q3",
    title: "Token unlock Arbitrum (T3 2026)",
    date: "2026-09-16",
    crypto: "ARB",
    category: "Token Unlock",
    source: "Arbitrum Foundation",
    sourceUrl: "https://docs.arbitrum.foundation/concepts/circulating-supply-and-tokenomics",
    description:
      "Déblocage mensuel d'environ 92,65 millions de tokens ARB destinés à l'équipe et aux investisseurs. Diluation supply ~2 % à surveiller pour le prix.",
    importance: 2,
  },
  {
    id: "fomc-2026-09",
    title: "Décision de taux FOMC (septembre 2026)",
    date: "2026-09-16",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description:
      "Réunion FOMC avec dot plot mis à jour. Considérée comme la fenêtre clé pour orienter le narratif macro de fin d'année (rallye Q4 vs. correction).",
    importance: 3,
  },

  /* ========================================================================
   * 10 ÉVÉNEMENTS RÉCENTS (passés, depuis < 12 mois)
   * ======================================================================== */
  {
    id: "fomc-2026-03",
    title: "Décision de taux FOMC (mars 2026)",
    date: "2026-03-18",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description:
      "Réunion FOMC du premier trimestre 2026. Powell a confirmé le maintien d'une politique restrictive en attendant des signes clairs de désinflation persistante.",
    importance: 3,
  },
  {
    id: "fomc-2026-01",
    title: "Décision de taux FOMC (janvier 2026)",
    date: "2026-01-28",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description:
      "Première réunion FOMC de l'année. Statu quo sur les taux, communication prudente sur la trajectoire des cuts attendus dans le marché.",
    importance: 3,
  },
  {
    id: "pumpfun-listing-2026-q1",
    title: "Listing PUMP sur les CEX majeurs",
    date: "2026-01-15",
    crypto: "PUMP",
    category: "Listing",
    source: "Pump.fun",
    sourceUrl: "https://pump.fun/",
    description:
      "Cotation du token PUMP de la plateforme de lancement memecoin Pump.fun sur Binance, Coinbase et OKX simultanément. Volatilité extrême les 48 premières heures.",
    importance: 2,
  },
  {
    id: "btc-etf-anniv-2026",
    title: "2 ans des ETF Bitcoin spot US",
    date: "2026-01-10",
    crypto: "BTC",
    category: "ETF",
    source: "BlackRock",
    sourceUrl: "https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf",
    description:
      "Anniversaire de l'autorisation des ETF Bitcoin spot par la SEC (10 janvier 2024). Cumulés, les fonds ont attiré plus de 60 milliards USD nets sur 24 mois.",
    importance: 1,
  },
  {
    id: "paris-blockchain-week-2026",
    title: "Paris Blockchain Week 2026",
    date: "2026-04-08",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "Paris Blockchain Week",
    sourceUrl: "https://www.parisblockchainweek.com/",
    description:
      "Édition 2026 de la PBW au Carrousel du Louvre. Trois jours, plus de 10 000 participants, focus sur la régulation MiCA et la tokenisation des actifs.",
    importance: 3,
  },
  {
    id: "sol-firedancer-2026",
    title: "Activation Firedancer sur Solana mainnet",
    date: "2026-02-20",
    crypto: "SOL",
    category: "Update",
    source: "Jump Crypto",
    sourceUrl: "https://jumpcrypto.com/firedancer/",
    description:
      "Déploiement progressif du client Firedancer (développé par Jump Crypto) sur le mainnet Solana. Objectif : améliorer la résilience et le débit du réseau.",
    importance: 2,
  },
  {
    id: "eth-pectra-mainnet-2025",
    title: "Activation Ethereum Pectra (mainnet)",
    date: "2025-05-07",
    crypto: "ETH",
    category: "Update",
    source: "Ethereum Foundation",
    sourceUrl: "https://ethereum.org/en/roadmap/pectra/",
    description:
      "Hard fork Pectra activée sur mainnet : EIP-7702 (account abstraction), EIP-7251 (validator consolidation 2048 ETH), améliorations DA pour les rollups.",
    importance: 3,
  },
  {
    id: "btc-halving-2024",
    title: "Quatrième halving Bitcoin",
    date: "2024-04-19",
    crypto: "BTC",
    category: "Halving",
    source: "Bitcoin protocol",
    sourceUrl: "https://www.blockchain.com/explorer/blocks/btc/840000",
    description:
      "Halving au bloc 840 000 : récompense passée de 6,25 à 3,125 BTC. L'inflation annuelle Bitcoin est tombée sous celle de l'or pour la première fois.",
    importance: 3,
  },
  {
    id: "fomc-2025-12",
    title: "Décision de taux FOMC (décembre 2025)",
    date: "2025-12-10",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description:
      "Dernière réunion FOMC de 2025 — projections économiques de fin d'année et message sur la trajectoire 2026. Forte attention médiatique.",
    importance: 3,
  },
  {
    id: "sol-etf-deadline-2026-q1",
    title: "Première deadline SEC ETF Solana (T1 2026)",
    date: "2026-03-14",
    crypto: "SOL",
    category: "ETF",
    source: "SEC",
    sourceUrl: "https://www.sec.gov/rules-regulations/self-regulatory-organization-rulemaking",
    description:
      "Première fenêtre de décision SEC pour les S-1 ETF Solana spot. Reportée à juillet 2026 (deadline finale 240 jours).",
    importance: 2,
  },

  /* ========================================================================
   * 10 CONFÉRENCES RÉCURRENTES (mix futur + récent)
   * ======================================================================== */
  {
    id: "ethcc-2026",
    title: "EthCC[8] — Cannes",
    date: "2026-07-06",
    crypto: "ETH",
    category: "Conference",
    source: "EthCC",
    sourceUrl: "https://www.ethcc.io/",
    description:
      "Edition 2026 de la conférence Ethereum Community Conference à Cannes. Cinq jours de talks indépendants, gratuits et orientés développeurs.",
    importance: 3,
  },
  {
    id: "consensus-2026",
    title: "Consensus 2026 — Toronto",
    date: "2026-05-14",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "CoinDesk",
    sourceUrl: "https://consensus.coindesk.com/",
    description:
      "Conférence majeure organisée par CoinDesk. Toronto pour 2026, après Austin en 2025. Mix institutionnels, régulateurs et builders Web3.",
    importance: 2,
  },
  {
    id: "permissionless-2026",
    title: "Permissionless IV — Brooklyn",
    date: "2026-06-24",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "Blockworks",
    sourceUrl: "https://blockworks.co/permissionless",
    description:
      "Organisée par Blockworks et Bankless, focus DeFi, restaking, perp DEX et stablecoins. Plus axée builders qu'institutionnels.",
    importance: 2,
  },
  {
    id: "korean-blockchain-week-2026",
    title: "Korean Blockchain Week 2026",
    date: "2026-09-22",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "FactBlock",
    sourceUrl: "https://kbw.io/",
    description:
      "Plus grand rassemblement crypto de Corée du Sud. Nombreux side-events autour du marché retail asiatique très actif sur les memecoins.",
    importance: 2,
  },
  {
    id: "surreal-bitcoin-amsterdam-2026",
    title: "Bitcoin Amsterdam 2026",
    date: "2026-10-15",
    crypto: "BTC",
    category: "Conference",
    source: "Bitcoin Magazine",
    sourceUrl: "https://b.tc/conference/amsterdam",
    description:
      "Edition européenne de la conférence Bitcoin Magazine. Public mixte institutionnel et cypherpunk, gros focus sur les solutions Lightning et self-custody.",
    importance: 2,
  },
  {
    id: "mainnet-2026",
    title: "Mainnet 2026 — New York",
    date: "2026-09-23",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "Messari",
    sourceUrl: "https://mainnet.events/",
    description:
      "Conférence Messari à New York. Référence pour les institutionnels, fondateurs et investisseurs. Trois jours de talks et de réseautage privé.",
    importance: 2,
  },
  {
    id: "ethdenver-2026",
    title: "ETHDenver 2026",
    date: "2026-02-23",
    crypto: "ETH",
    category: "Conference",
    source: "ETHDenver",
    sourceUrl: "https://www.ethdenver.com/",
    description:
      "Plus grand hackathon Ethereum au monde, plus de 20 000 participants. Côte ouvert aux étudiants et builders émergents, prix significatifs.",
    importance: 2,
  },
  {
    id: "token2049-dubai-2026",
    title: "Token2049 Dubai",
    date: "2026-04-29",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "Token2049",
    sourceUrl: "https://www.dubai.token2049.com/",
    description:
      "Edition Dubai de Token2049, complémentaire de Singapour. Forte présence des fonds du Golfe et des bourses régionales (BitOasis, Rain).",
    importance: 2,
  },
  {
    id: "surfin-bitcoin-2026",
    title: "Surfin'Bitcoin 2026 — Biarritz",
    date: "2026-08-26",
    crypto: "BTC",
    category: "Conference",
    source: "Surfin Bitcoin",
    sourceUrl: "https://surfinbitcoin.com/",
    description:
      "Conférence francophone Bitcoin référence à Biarritz. Format intimiste (~1 500 personnes), public francophone, intervenants français et internationaux.",
    importance: 2,
  },
  {
    id: "wax-summit-2025",
    title: "WebX Summit 2025 — Tokyo",
    date: "2025-08-27",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "CoinPost",
    sourceUrl: "https://webx-asia.com/",
    description:
      "Edition 2025 du WebX Summit organisé par CoinPost à Tokyo. Plus de 25 000 participants, focus régulation japonaise et tokenisation des actifs.",
    importance: 1,
  },
];

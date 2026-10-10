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
import { evenementHalving, evenementsBce } from "@/lib/calendrier-officiel";

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

/**
 * 08/10/2026 (lot fraîcheur A2) : date de la dernière revue manuelle des événements hors FOMC (commit du 05/10/2026
 * « statuts MiCA et calendrier à jour »). Les réunions FOMC sont relues par scripts/refresh-fomc.mjs. À changer à la
 * main après chaque revue complète ; /calendrier signale la liste « à revérifier » au-delà de 30 jours.
 */
export const EVENTS_SEED_REVU_LE = "2026-10-05";

export const EVENTS_SEED: CryptoEvent[] = [
  /* ========================================================================
   * RÉUNIONS FOMC (Fed) — bloc AUTOMATIQUE, réécrit chaque lundi par .github/workflows/refresh-fomc.yml
   * (scripts/refresh-fomc.mjs) depuis le calendrier officiel. Décision dans les 12 derniers mois ou à venir.
   * ======================================================================== */
  /* <fomc-auto> Bloc écrit par scripts/refresh-fomc.mjs depuis le calendrier officiel de la Fed : ne pas modifier à la main. */
  /* Relevé de la page de la Fed : 2026-10-08. */
  {
    id: "fomc-2025-10",
    title: "Décision de taux FOMC (octobre 2025)",
    date: "2025-10-29",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 28 et 29 octobre 2025 ; décision sur les taux et communiqué le 29 octobre. Date tirée du calendrier officiel de la Fed.",
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
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 9 et 10 décembre 2025 ; décision sur les taux et communiqué le 10 décembre. Réunion avec projections économiques (SEP). Date tirée du calendrier officiel de la Fed.",
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
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 27 et 28 janvier 2026 ; décision sur les taux et communiqué le 28 janvier. Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2026-03",
    title: "Décision de taux FOMC (mars 2026)",
    date: "2026-03-18",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 17 et 18 mars 2026 ; décision sur les taux et communiqué le 18 mars. Réunion avec projections économiques (SEP). Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2026-04",
    title: "Décision de taux FOMC (avril 2026)",
    date: "2026-04-29",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 28 et 29 avril 2026 ; décision sur les taux et communiqué le 29 avril. Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2026-06",
    title: "Décision de taux FOMC (juin 2026)",
    date: "2026-06-17",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 16 et 17 juin 2026 ; décision sur les taux et communiqué le 17 juin. Réunion avec projections économiques (SEP). Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2026-07",
    title: "Décision de taux FOMC (juillet 2026)",
    date: "2026-07-29",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 28 et 29 juillet 2026 ; décision sur les taux et communiqué le 29 juillet. Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2026-09",
    title: "Décision de taux FOMC (septembre 2026)",
    date: "2026-09-16",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 15 et 16 septembre 2026 ; décision sur les taux et communiqué le 16 septembre. Réunion avec projections économiques (SEP). Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2026-10",
    title: "Décision de taux FOMC (octobre 2026)",
    date: "2026-10-28",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 27 et 28 octobre 2026 ; décision sur les taux et communiqué le 28 octobre. Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2026-12",
    title: "Décision de taux FOMC (décembre 2026)",
    date: "2026-12-09",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 8 et 9 décembre 2026 ; décision sur les taux et communiqué le 9 décembre. Réunion avec projections économiques (SEP). Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2027-01",
    title: "Décision de taux FOMC (janvier 2027)",
    date: "2027-01-27",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 26 et 27 janvier 2027 ; décision sur les taux et communiqué le 27 janvier. Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2027-03",
    title: "Décision de taux FOMC (mars 2027)",
    date: "2027-03-17",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 16 et 17 mars 2027 ; décision sur les taux et communiqué le 17 mars. Réunion avec projections économiques (SEP). Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2027-04",
    title: "Décision de taux FOMC (avril 2027)",
    date: "2027-04-28",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 27 et 28 avril 2027 ; décision sur les taux et communiqué le 28 avril. Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2027-06",
    title: "Décision de taux FOMC (juin 2027)",
    date: "2027-06-09",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 8 et 9 juin 2027 ; décision sur les taux et communiqué le 9 juin. Réunion avec projections économiques (SEP). Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2027-07",
    title: "Décision de taux FOMC (juillet 2027)",
    date: "2027-07-28",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 27 et 28 juillet 2027 ; décision sur les taux et communiqué le 28 juillet. Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2027-09",
    title: "Décision de taux FOMC (septembre 2027)",
    date: "2027-09-15",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 14 et 15 septembre 2027 ; décision sur les taux et communiqué le 15 septembre. Réunion avec projections économiques (SEP). Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2027-10",
    title: "Décision de taux FOMC (octobre 2027)",
    date: "2027-10-27",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 26 et 27 octobre 2027 ; décision sur les taux et communiqué le 27 octobre. Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  {
    id: "fomc-2027-12",
    title: "Décision de taux FOMC (décembre 2027)",
    date: "2027-12-08",
    crypto: "MARCHÉ",
    category: "FOMC",
    source: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    description: "Réunion du comité de politique monétaire de la Fed (FOMC) les 7 et 8 décembre 2027 ; décision sur les taux et communiqué le 8 décembre. Réunion avec projections économiques (SEP). Date tirée du calendrier officiel de la Fed.",
    importance: 3,
  },
  /* </fomc-auto> */

  /* ========================================================================
   * RÉUNIONS DE LA BCE + PROCHAIN HALVING BITCOIN — lus dans data/calendrier-officiel.json (robot R7, lot Z4) :
   * calendrier officiel du Conseil des gouverneurs de la BCE ; halving estimé en fourchette (mempool.space).
   * ======================================================================== */
  ...evenementsBce(),
  ...evenementHalving(),

  /* ========================================================================
   * 10 ÉVÉNEMENTS À VENIR (post 2026-04-26)
   * ======================================================================== */
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
    id: "ltc-halving-2027",
    title: "Halving Litecoin (estimation)",
    date: "2027-08-04",
    crypto: "LTC",
    category: "Halving",
    source: "Litecoin Foundation",
    sourceUrl: "https://litecoin.org/",
    description:
      "Quatrième halving de Litecoin : la récompense de bloc passe de 6,25 à 3,125 LTC. Date approximative basée sur le rythme moyen ~2,5 minutes par bloc.",
    importance: 2,
  },
  {
    id: "token2049-singapore-2026",
    title: "Token2049 Singapore",
    date: "2026-10-07",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "Token2049",
    sourceUrl: "https://www.asia.token2049.com/",
    description:
      "Conférence crypto la plus influente d'Asie, les 7 et 8 octobre 2026 au Marina Bay Sands. Plus de 25 000 participants attendus, fondateurs de protocoles majeurs, side-events dans tout Singapour.",
    importance: 3,
  },
  {
    id: "devcon-mumbai-2026",
    title: "Devcon 8 — Mumbai",
    date: "2026-11-03",
    crypto: "ETH",
    category: "Conference",
    source: "Ethereum Foundation",
    sourceUrl: "https://devcon.org/",
    description:
      "Devcon est la conférence Ethereum officielle organisée par la Fondation : du 3 au 6 novembre 2026 au Jio World Centre de Mumbai (Inde). Quatre jours de recherche, R&D protocole, applications et social layer.",
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

  /* ========================================================================
   * 10 ÉVÉNEMENTS RÉCENTS (passés, depuis < 12 mois)
   * ======================================================================== */
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
    // bloc 840 000 horodaté 2024-04-20T00:09:27Z (mempool.space, relu le 10/10/2026) ; avant le lot Z4 : 19/04, faux
    date: "2024-04-20",
    crypto: "BTC",
    category: "Halving",
    source: "Bitcoin protocol",
    sourceUrl: "https://www.blockchain.com/explorer/blocks/btc/840000",
    description:
      "Halving au bloc 840 000 : récompense passée de 6,25 à 3,125 BTC. L'inflation annuelle Bitcoin est tombée sous celle de l'or pour la première fois.",
    importance: 3,
  },

  /* ========================================================================
   * 10 CONFÉRENCES RÉCURRENTES (mix futur + récent)
   * ======================================================================== */
  {
    id: "ethcc-2026",
    title: "EthCC[9] — Cannes",
    date: "2026-03-30",
    crypto: "ETH",
    category: "Conference",
    source: "EthCC",
    sourceUrl: "https://www.ethcc.io/",
    description:
      "Neuvième édition de l'Ethereum Community Conference, à Cannes du 30 mars au 2 avril 2026 (Palais des Festivals). Quatre jours de talks orientés développeurs.",
    importance: 3,
  },
  {
    id: "consensus-2026",
    title: "Consensus 2026 — Miami",
    date: "2026-05-05",
    crypto: "MARCHÉ",
    category: "Conference",
    source: "CoinDesk",
    sourceUrl: "https://consensus.coindesk.com/",
    description:
      "Conférence majeure organisée par CoinDesk, à Miami Beach du 5 au 7 mai 2026 (après Toronto en 2025). Mix institutionnels, régulateurs et builders Web3.",
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
      "Édition européenne de la conférence Bitcoin Magazine. Public mixte institutionnel et cypherpunk, gros focus sur les solutions Lightning et self-custody.",
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
      "Édition 2025 du WebX Summit organisé par CoinPost à Tokyo. Plus de 25 000 participants, focus régulation japonaise et tokenisation des actifs.",
    importance: 1,
  },
];

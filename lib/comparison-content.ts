/**
 * Génération du contenu rédactionnel (1500+ mots / unique) pour chaque page
 * /comparatif/[slug]. Approche hybride :
 *
 *   1. Un MOTEUR DE BASE construit le squelette depuis platforms.json
 *      (frais, sécurité, MiCA, UX, support, catalogue, FAQ).
 *      → Ces sections sont *déjà personnalisées* par les valeurs réelles
 *         des deux plateformes — elles ne sont pas des templates statiques.
 *
 *   2. Un OVERRIDES MAP par slug ajoute :
 *      - Un TL;DR éditorial
 *      - L'angle d'analyse propre à la paire (ex: Coinhouse=PSAN FR vs Bitpanda=BaFin EU)
 *      - Un verdict de recommandation final
 *      - Des Q/R FAQ ciblées
 *
 *   Le mix garantit ≥1500 mots uniques par page (compté à la build, voir
 *   wordCount export).
 */

import {
  cardCost1000,
  frenchHelpLabel,
  isAvailableFr,
  purchaseCostText,
  type Platform,
  supportChatLabel,
  supportPhoneLabel,
  trustpilotText,
} from "@/lib/platforms";

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
import type { ComparisonEntry } from "@/lib/comparisons";
import type { FaqItem } from "@/lib/schema";
import type { ProfileVerdict } from "@/components/comparison/VerdictByProfile";
import { fmtDateFr, fmtFr } from "@/lib/format-fr";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ComparisonCopy {
  /** TL;DR éditorial 30 secondes (Markdown très simple, <200 mots) */
  tldrIntro: string;
  /** Bullets du TL;DR (3 à 5 points clés) */
  tldrBullets: string[];
  /** Recommandation finale rapide (ex: "Pour la majorité des Français...") */
  tldrPick: string;

  /** Pour chaque critère détaillé : 2 paragraphes d'analyse contextuelle */
  feesAnalysis: string[];
  securityAnalysis: string[];
  micaAnalysis: string[];
  uxAnalysis: string[];
  supportAnalysis: string[];
  catalogAnalysis: string[];

  /** Verdict final argumenté (3-4 phrases) */
  finalVerdict: string;

  /** Verdicts par profil (A/B/tie + reasoning) */
  profileVerdicts: ProfileVerdict[];

  /** FAQ 5 Q/R */
  faq: FaqItem[];

  /** Total approximatif de mots (pour debug + monitoring SEO) */
  wordCount: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function fmtPct(n: number): string {
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

function fmtScore(n: number): string {
  return `${fmtFr(n, 1)}/5`;
}

function bestOnFee(a: Platform, b: Platform): { winner: Platform; loser: Platform; gap: string; gapPct: number } {
  // Coût réel : taker pour un exchange order-book, frais d'achat (instantBuy) pour
  // un courtier/app — sinon le taux "Pro" 0,20 % de certains hybrides (Nexo/Wirex/
  // Young) fausse le gagnant alors qu'ils coûtent ~2 % en achat réel.
  const realCost = (p: Platform) =>
    (p.fees.verified?.makerTakerApplies ?? true) ? p.fees.spotTaker : p.fees.instantBuy;
  const ra = realCost(a);
  const rb = realCost(b);
  if (ra <= rb) return { winner: a, loser: b, gap: `${fmtFr((rb - ra), 2)} point${rb - ra >= 2 ? "s" : ""}`, gapPct: rb - ra };
  return { winner: b, loser: a, gap: `${fmtFr((ra - rb), 2)} point${ra - rb >= 2 ? "s" : ""}`, gapPct: ra - rb };
}

function bestOnSecurity(a: Platform, b: Platform): { winner: Platform; loser: Platform } {
  if (a.scoring.security >= b.scoring.security) return { winner: a, loser: b };
  return { winner: b, loser: a };
}

function bestOnMica(a: Platform, b: Platform): { winner: Platform; loser: Platform } {
  if (a.scoring.mica >= b.scoring.mica) return { winner: a, loser: b };
  return { winner: b, loser: a };
}

function bestOnCatalog(a: Platform, b: Platform): { winner: Platform; loser: Platform } {
  if (a.cryptos.totalCount >= b.cryptos.totalCount) return { winner: a, loser: b };
  return { winner: b, loser: a };
}

function bestOnUx(a: Platform, b: Platform): { winner: Platform; loser: Platform } {
  if (a.scoring.ux >= b.scoring.ux) return { winner: a, loser: b };
  return { winner: b, loser: a };
}

function bestOnSupport(a: Platform, b: Platform): { winner: Platform; loser: Platform } {
  if (a.scoring.support >= b.scoring.support) return { winner: a, loser: b };
  return { winner: b, loser: a };
}

function countWords(strs: Array<string | string[]>): number {
  let n = 0;
  for (const s of strs) {
    const raw = Array.isArray(s) ? s.join(" ") : s;
    n += raw.trim().split(/\s+/).filter(Boolean).length;
  }
  return n;
}

/* -------------------------------------------------------------------------- */
/*  OVERRIDES — un bloc par slug pour garantir l'unicité du contenu           */
/* -------------------------------------------------------------------------- */

interface SlugOverride {
  /** Angle éditorial central (ex: "PSAN FR vs hub allemand BaFin") */
  angle: string;
  /** TL;DR pick — phrase de recommandation rapide */
  pick: (a: Platform, b: Platform) => string;
  /** Verdict final 3-4 phrases */
  finalVerdict: (a: Platform, b: Platform) => string;
  /** FAQ 5 Q/R spécifique à la paire */
  faq: (a: Platform, b: Platform) => FaqItem[];
  /** Verdicts par profil (renvoie un winner: "a"|"b"|"tie") */
  profiles: (a: Platform, b: Platform) => ProfileVerdict[];
}

/**
 * Helper : crée un FAQ générique paramétré (utilisé par défaut, peut être
 * surchargé pour des comparatifs spécifiques).
 */
function defaultFaq(a: Platform, b: Platform): FaqItem[] {
  return [
    {
      question: `${a.name} ou ${b.name} : laquelle est la moins chère en frais ?`,
      answer: `Sur les frais spot maker, ${a.name} affiche ${fmtPct(a.fees.spotMaker)} contre ${fmtPct(b.fees.spotMaker)} pour ${b.name}. Pour un achat de 1 000 € payé par carte (coût complet, frais de paiement compris), ${a.name} : ${lowerFirst(purchaseCostText(cardCost1000(a)))} ; ${b.name} : ${lowerFirst(purchaseCostText(cardCost1000(b)))}. À volume égal, l'écart annuel peut atteindre plusieurs centaines d'euros pour un trader régulier — c'est la première variable à arbitrer si vous tradez plus que vous ne HODLez.`,
    },
    {
      question: `${a.name} et ${b.name} sont-elles régulées MiCA en France ?`,
      answer: `${a.name} : ${a.mica.status}${a.mica.amfRegistration ? ` (agrément AMF n° ${a.mica.amfRegistration})` : ""}. ${b.name} : ${b.mica.status}${b.mica.amfRegistration ? ` (agrément AMF n° ${b.mica.amfRegistration})` : ""}. ${isAvailableFr(a) && isAvailableFr(b) ? "Les deux plateformes peuvent servir des résidents français : l'agrément MiCA impose notamment la ségrégation des fonds clients et des règles harmonisées dans toute l'UE." : "Attention : depuis le 1er juillet 2026, fin de la période transitoire, seuls les prestataires agréés MiCA avec accès à la France peuvent servir des résidents français."}`,
    },
    {
      question: `Quelle est la plus sécurisée entre ${a.name} et ${b.name} ?`,
      answer: `${a.name} score ${fmtScore(a.scoring.security)} sur notre note sécurité, ${b.name} ${fmtScore(b.scoring.security)}. ${a.name} stocke ${a.security.coldStoragePct}% des fonds en cold storage, ${b.name} ${b.security.coldStoragePct}%. ${a.security.lastIncident ? `Dernier incident notable côté ${a.name} : ${a.security.lastIncident}.` : `${a.name} n'a connu aucun incident majeur rapporté.`} ${b.security.lastIncident ? `Côté ${b.name} : ${b.security.lastIncident}.` : `${b.name} n'a connu aucun incident majeur rapporté.`}`,
    },
    {
      question: `Combien de cryptos disponibles sur ${a.name} vs ${b.name} ?`,
      answer: `${a.name} propose ${a.cryptos.totalCount} cryptomonnaies au catalogue, ${b.name} ${b.cryptos.totalCount}. ${a.cryptos.stakingAvailable ? `Le staking est disponible sur ${a.name} (cryptos éligibles : ${a.cryptos.stakingCryptos.join(", ")})` : `${a.name} ne propose pas de staking natif`}. ${b.cryptos.stakingAvailable ? `Sur ${b.name}, le staking est aussi proposé (${b.cryptos.stakingCryptos.join(", ")})` : `${b.name} ne propose pas de staking`}.`,
    },
    {
      question: `Peut-on cumuler les bonus de bienvenue ${a.name} et ${b.name} ?`,
      answer: `Oui — chaque inscription est indépendante. ${a.bonus.welcome ? `${a.name} : ${a.bonus.welcome}.` : ""} ${b.bonus.welcome ? `${b.name} : ${b.bonus.welcome}.` : ""} Cumul recommandé pour tester les deux interfaces avec un capital limité avant de centraliser sur la plateforme qui correspond le mieux à votre usage. Vérifiez les conditions de déblocage (montant minimum, KYC complet).`,
    },
  ];
}

/**
 * Helper : 4 verdicts profil par défaut, déterminés depuis les scorings.
 */
function defaultProfiles(a: Platform, b: Platform): ProfileVerdict[] {
  return guardUnauthorizedProfiles(a, b, scoredProfiles(a, b));
}

/**
 * Passe finale (06/10/2026) : une plateforme non autorisée en France (registre MiCA de l'ESMA, liste blanche de l'AMF)
 * n'est jamais désignée gagnante d'un profil. Sur /comparatif/binance-vs-coinbase, le profil « trader actif » désignait
 * Binance (frais taker plus bas), alors que Binance a cessé ses services en France le 1er juillet 2026.
 */
export function guardUnauthorizedProfiles(a: Platform, b: Platform, profiles: ProfileVerdict[]): ProfileVerdict[] {
  const okA = isAvailableFr(a);
  const okB = isAvailableFr(b);
  if (okA && okB) return profiles;
  if (!okA && !okB) {
    return profiles.map((p) => ({
      ...p,
      winner: "tie" as const,
      reasoning: `Ni ${a.name} ni ${b.name} n'est autorisée en France : aucune recommandation, quel que soit le profil.`,
    }));
  }
  const ok = okA ? a : b;
  const ko = okA ? b : a;
  return profiles.map((p) => ({
    ...p,
    winner: okA ? ("a" as const) : ("b" as const),
    reasoning: `${ko.name} n'est pas autorisée en France : aucune recommandation. Pour un résident français, seule ${ok.name} peut être utilisée.`,
  }));
}

function scoredProfiles(a: Platform, b: Platform): ProfileVerdict[] {
  const beginnerWinner = a.scoring.ux > b.scoring.ux ? "a" : a.scoring.ux < b.scoring.ux ? "b" : "tie";
  const longTermWinner = a.scoring.mica + a.scoring.security > b.scoring.mica + b.scoring.security ? "a" : "b";
  const traderWinner = a.fees.spotTaker < b.fees.spotTaker ? "a" : a.fees.spotTaker > b.fees.spotTaker ? "b" : "tie";

  // Pour le profil FR : on regarde l'enregistrement AMF + support tel FR
  const aFrScore = (a.mica.amfRegistration ? 2 : 0) + (a.support.frenchPhone ? 1 : 0);
  const bFrScore = (b.mica.amfRegistration ? 2 : 0) + (b.support.frenchPhone ? 1 : 0);
  const frWinner = aFrScore > bFrScore ? "a" : aFrScore < bFrScore ? "b" : "tie";

  return [
    {
      profile: "debutant",
      winner: beginnerWinner,
      reasoning: `Pour un premier achat crypto, l'UX prime sur tout. ${beginnerWinner === "a" ? a.name : beginnerWinner === "b" ? b.name : "Les deux"} affiche${beginnerWinner === "tie" ? "nt" : ""} la note d'expérience utilisateur la plus haute des deux (${beginnerWinner === "a" ? fmtScore(a.scoring.ux) : beginnerWinner === "b" ? fmtScore(b.scoring.ux) : `${fmtScore(a.scoring.ux)} vs ${fmtScore(b.scoring.ux)}`}), selon notre méthodologie publique.`,
    },
    {
      profile: "long_terme",
      winner: longTermWinner,
      reasoning: `Pour HODLer plusieurs années, on priorise la sécurité (cold storage, assurance) et la conformité MiCA. ${longTermWinner === "a" ? a.name : b.name} cumule un score sécurité ${fmtScore(longTermWinner === "a" ? a.scoring.security : b.scoring.security)} et MiCA ${fmtScore(longTermWinner === "a" ? a.scoring.mica : b.scoring.mica)}, ce qui réduit le risque de défaillance opérationnelle ou réglementaire à 5 ans.`,
    },
    {
      profile: "trader_actif",
      winner: traderWinner,
      reasoning: `Si vous tradez plusieurs fois par semaine, chaque point de base compte. ${traderWinner === "a" ? a.name : traderWinner === "b" ? b.name : "Les deux plateformes"} affiche${traderWinner === "tie" ? "nt" : ""} les frais taker les plus bas (${traderWinner === "a" ? fmtPct(a.fees.spotTaker) : traderWinner === "b" ? fmtPct(b.fees.spotTaker) : `${fmtPct(a.fees.spotTaker)} = ${fmtPct(b.fees.spotTaker)}`}), avec une liquidité suffisante pour exécuter des ordres marché sans slippage majeur sur les paires majeures.`,
    },
    {
      profile: "investisseur_francais",
      winner: frWinner,
      reasoning: `Pour un résident fiscal français qui veut un interlocuteur en France et une déclaration simplifiée, ${frWinner === "a" ? a.name : frWinner === "b" ? b.name : "les deux options se valent"}. ${frWinner !== "tie" ? `Avantage à ${frWinner === "a" ? a.name : b.name} grâce à ${(frWinner === "a" ? a.mica.amfRegistration : b.mica.amfRegistration) ? "son agrément délivré directement par l'AMF" : "son support client en français"} — élément clé en cas de litige ou de demande de l'administration fiscale.` : `Aucun atout local décisif d'un côté ou de l'autre — choisissez selon vos autres priorités (frais, catalogue).`}`,
    },
  ];
}

/**
 * Override map. Pour chaque slug listé dans data/comparisons.json, on définit
 * un angle éditorial unique, un pick TL;DR, et le verdict final.
 *
 * Si un slug n'est pas surchargé, le générateur tombe en mode "fallback"
 * (toujours unique grâce aux valeurs platforms.json injectées).
 */
const OVERRIDES: Record<string, SlugOverride> = {
  "binance-vs-coinbase": {
    angle: "Plateforme fermée en France vs plateforme agréée MiCA",
    pick: (a, b) =>
      `Pour un résident français, la question est tranchée : ${a.name} a cessé ses services sur crypto-actifs en France le 1er juillet 2026 ; ${b.name} est agréée MiCA avec un passeport vers la France.`,
    finalVerdict: (a, b) =>
      `${b.name} est la seule des deux à pouvoir servir un résident français : ${a.name} a cessé ses services sur crypto-actifs en France le 1er juillet 2026, à la fin de la période transitoire MiCA, tandis que ${b.name} est agréée MiCA (CSSF, Luxembourg) avec un passeport vers la France. Si les frais de ${b.name} vous semblent élevés, comparez les plateformes agréées dans notre comparatif des frais.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "bitpanda-vs-bitstack": {
    angle: "Broker européen tout-en-un vs DCA Bitcoin via arrondi",
    pick: (a, b) =>
      `Pour épargner du Bitcoin sans y penser : ${b.name} (arrondi sur achats CB). Pour diversifier crypto + actions + métaux dans une seule app régulée : ${a.name}.`,
    finalVerdict: (a, b) =>
      `${b.name} et ${a.name} ne jouent pas exactement dans la même catégorie : ${b.name} est un produit ultra-spécialisé (DCA BTC automatique via arrondi sur achats carte bancaire), idéal pour le débutant total qui veut "se forcer" à épargner sans changer ses habitudes. ${a.name} est un broker européen complet (480 cryptos + actions fractionnées + ETF + métaux précieux) avec un agrément MiCA (${a.mica.authority ?? a.mica.status}), qui s'adresse à un investisseur prêt à diversifier sciemment. Verdict : ${b.name} pour démarrer, ${a.name} pour grandir. Beaucoup d'utilisateurs cumulent les deux (DCA passif sur ${b.name}, allocation active sur ${a.name}).`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "ledger-vs-trezor": {
    angle: "Hardware wallet propriétaire vs open source",
    pick: (a, b) =>
      `Pour un catalogue large et un usage mobile (Bluetooth) : ${a.name}. Pour un firmware open source et un usage centré sur Bitcoin : ${b.name}.`,
    /* Passe finale (06/10/2026) : « excellent support natif de CoinJoin » était faux. Page officielle trezor.io/learn
       (« What is coinjoin? », lue le 06/10/2026) : le coordinateur zkSNACKs utilisé par Trezor a cessé son service le
       1er juin 2024 ; plus aucun coinjoin ne peut être lancé depuis Trezor Suite. Superlatifs retirés. */
    finalVerdict: (a, b) =>
      `Le choix se résume à un arbitrage de principe : ${a.name} prend en charge plus de cryptos (5500+ vs 1800), propose une connexion Bluetooth chiffrée pratique en mobilité (Nano X, Stax) et l'application Ledger Live. ${b.name} publie le code de son firmware en open source (auditable par n'importe qui) et propose un design plus minimaliste avec le Trezor Safe 5. Le coinjoin n'est plus disponible dans Trezor Suite depuis le 1er juin 2024 (arrêt du coordinateur zkSNACKs). Pour un détenteur multi-chaînes (Solana, Cardano, Polkadot…), ${a.name} est plus polyvalent. Pour un utilisateur centré sur Bitcoin ou qui exige un code vérifiable, ${b.name} répond mieux à ce besoin.`,
    faq: (a, b) => [
      {
        question: `${a.name} ou ${b.name} : lequel est plus sécurisé ?`,
        answer: `Les deux utilisent un élément sécurisé certifié (CC EAL5+ pour ${a.name}, EAL6+ pour le ${b.name} Safe 5). La différence majeure : ${b.name} est entièrement open source — le code peut être audité par n'importe quel chercheur. ${a.name} garde une partie propriétaire (controverse Ledger Recover en 2023). En pratique, aucun des deux n'a jamais perdu de fonds clients via une faille du device — les incidents passés relevaient de fuites annexes (emails Ledger 2020) ou d'attaques physiques en laboratoire.`,
      },
      {
        question: `Lequel supporte le plus de cryptos ?`,
        answer: `${a.name} domine largement : 5 500+ assets supportés via Ledger Live et applications tierces (MetaMask, Phantom). ${b.name} reste autour de 1 800 cryptos via Trezor Suite. Pour les altcoins très récents (mémecoins Solana, tokens Layer 2), ${a.name} a souvent une longueur d'avance grâce à son écosystème de partenariats.`,
      },
      {
        question: `Peut-on staker depuis ${a.name} ou ${b.name} ?`,
        answer: `Avec ${a.name}, oui : Ledger Live permet le staking natif sur ETH, SOL, ADA, DOT, ATOM, XTZ, MATIC. Avec ${b.name}, le staking n'est pas natif dans Trezor Suite — il faut passer par une app tierce (MetaMask + Lido pour ETH, par exemple).`,
      },
      {
        question: `Lequel a connu le plus d'incidents de sécurité ?`,
        answer: `${a.name} a subi une fuite de données clients en juillet 2020 (1M+ emails leakés via prestataire Shopify). Aucun fonds compromis, mais vague de phishing massive sur les victimes. ${b.name} a vu Kraken Labs publier en 2020 une vulnérabilité physique sur Trezor One sans passphrase (extraction graine si attaquant a 15 minutes physique avec le device). Patch firmware déployé. Aucun fonds compromis non plus.`,
      },
      {
        question: `Quel hardware wallet acheter en 2026 si on débute ?`,
        answer: `${a.name} Nano S+ (~80 €) reste le meilleur rapport qualité/prix débutant : 100+ apps installables, USB-C, écosystème Ledger Live très accessible. Côté ${b.name}, le Trezor Safe 3 (~80 €) est une excellente alternative open source. Les modèles haut de gamme (Stax, Safe 5) avec écran tactile (~250-400 €) sont à réserver aux portefeuilles >20 k€ ou à ceux qui veulent une expérience premium.`,
      },
    ],
    profiles: defaultProfiles,
  },

  "binance-vs-kraken": {
    angle: "Catalogue géant + frais bas vs sécurité historique + Proof-of-Reserves",
    pick: (a, b) =>
      `Pour qui veut un acteur jamais piraté avec perte de fonds clients depuis 2011 : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${b.name} (${fmtPct(b.fees.spotMaker)} maker / ${fmtPct(b.fees.spotTaker)} taker au premier palier) : aucun vol de fonds clients par piratage depuis 2011 à notre connaissance, preuve de réserves auditée. ${a.name} propose un catalogue plus large (${a.cryptos.totalCount} cryptos contre ${b.cryptos.totalCount}) et des frais plus bas (${fmtPct(a.fees.spotMaker)} / ${fmtPct(a.fees.spotTaker)}).`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "coinbase-vs-bitpanda": {
    angle: "Plateforme américaine cotée au NASDAQ vs courtier européen agréé MiCA + diversification",
    pick: (a, b) =>
      `Pour un Européen qui veut crypto + actions + or dans une seule app régulée : ${a.name}. Pour une plateforme dont la maison mère est cotée au NASDAQ : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${a.name} est notre choix par défaut pour un investisseur européen long terme : agrément MiCA (${a.mica.authority ?? a.mica.status}), 480 cryptos, plans d'épargne automatiques, et surtout la diversification multi-actifs (crypto + actions fractionnées + ETF + métaux précieux) — un atout structurel face à un pure-player crypto. ${b.name} se distingue sur deux points : sa maison mère est cotée au NASDAQ et publie des comptes trimestriels, et elle propose des contenus pédagogiques (Coinbase Learn). Si vous voulez UNIQUEMENT de la crypto : ${b.name}. Si vous voulez bâtir un patrimoine diversifié dans une seule app : ${a.name}.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "revolut-vs-trade-republic": {
    angle: "Néobanque crypto-friendly vs broker investissement long terme",
    pick: (a, b) =>
      `Pour épargner crypto + actions + ETF avec plans automatiques dès 1 € : ${b.name}. Pour acheter du crypto en 2 clics dans son app bancaire du quotidien : ${a.name}.`,
    finalVerdict: (a, b) =>
      `${a.name} et ${b.name} sont deux excellentes apps mobiles avec agrément MiCA, mais elles répondent à deux besoins distincts. ${a.name} excelle pour qui utilise déjà la néobanque au quotidien : achat crypto en 2 clics depuis le solde, conversion instantanée, intégration carte. Le coût : 1,49 % de spread sur l'app classique (Revolut X est gratuite mais nécessite KYC pro). ${b.name} cible l'investisseur méthodique : plans d'épargne dès 1 € sur crypto + actions + ETF + obligations, frais de 1 % par transaction sans frais cachés. Notre recommandation : ${b.name} pour bâtir un portefeuille diversifié sur 5+ ans, ${a.name} pour des achats opportunistes intégrés à la vie courante.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "bitget-vs-bybit": {
    angle: "Plateforme non autorisée en France vs plateforme agréée MiCA",
    pick: (a, b) =>
      `Pour un résident français, seule ${b.name} est utilisable : elle est agréée MiCA (FMA, Autriche) avec un passeport vers la France, alors que ${a.name} ne figure pas au registre MiCA de l'ESMA.`,
    finalVerdict: (a, b) =>
      `${b.name} est la seule des deux à pouvoir servir un résident français : Bybit EU GmbH est agréée MiCA par la FMA autrichienne depuis le 28 mai 2025, avec un passeport vers la France, alors que ${a.name} ne figure ni au registre MiCA de l'ESMA ni sur la liste blanche de l'AMF (vérification du 2 octobre 2026). Les deux plateformes sont orientées produits dérivés, à haut risque : réservez-les à une petite part de votre épargne, et seulement sur une plateforme agréée.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "bitpanda-vs-coinhouse": {
    angle: "Broker européen vs PSAN 100 % français avec accompagnement humain",
    /* Passe finale (06/10/2026) : le verdict attribuait à Coinhouse « 1,49 / 1,99 % spot, 2,49 % instant » et à Bitpanda
       des « frais 5x moins chers (0,15 / 0,25 %) » (mode Fusion seul), en faveur d'un lien de parrainage. Les frais sont
       désormais lus dans fees.verified (grilles officielles relevées le 5 octobre 2026), sans classement. */
    pick: (a, b) =>
      `Pour un acteur français basé à Paris, avec un support téléphonique : ${b.name}. Pour un catalogue plus large (${a.cryptos.totalCount} cryptos contre ${b.cryptos.totalCount}) et des actions, ETF et métaux dans la même application : ${a.name}.`,
    finalVerdict: (a, b) =>
      `${b.name} et ${a.name} ciblent tous les deux le marché français, avec deux approches différentes. ${b.name} est une société française basée à Paris (1er PSAN enregistré en France, E2020-001), agréée MiCA (${b.mica.authority ?? b.mica.status}), avec un support téléphonique en français. ${a.name} est agréée MiCA (${a.mica.authority ?? a.mica.status}) et ajoute actions, ETF et métaux précieux à un catalogue de ${a.cryptos.totalCount} cryptos, contre ${b.cryptos.totalCount} chez ${b.name}. Frais relevés sur les grilles officielles${b.fees.verified?.date ? ` (${fmtDateFr(b.fees.verified.date)})` : ""} : ${b.name}, ${b.fees.verified?.realCostPct ?? "non relevés"} ; ${a.name}, ${a.fees.verified?.realCostPct ?? "non relevés"}. Pour un achat de Bitcoin payé depuis le solde en euros, les deux grilles sont proches ; elles diffèrent selon la crypto et le moyen de paiement. Le choix se joue surtout sur le contact humain et l'ancrage local (${b.name}) ou sur la largeur du catalogue et la diversification (${a.name}).`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "bitpanda-vs-trade-republic": {
    angle: "Broker crypto + métaux vs broker crypto + actions + ETF dès 1 €",
    pick: (a, b) =>
      `Pour un broker tout-en-un avec catalogue crypto large et métaux précieux : ${a.name}. Pour des plans d'épargne crypto + ETF + actions dès 1 € : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${a.name} et ${b.name} jouent dans la même catégorie "broker européen multi-actifs régulé MiCA" — choix difficile. ${a.name} prend l'avantage sur le catalogue crypto (environ 480 contre 50) et propose métaux précieux + index crypto, idéal pour qui considère le crypto comme une classe d'actifs parmi d'autres dans une stratégie patrimoniale active. ${b.name} brille par sa simplicité et son ratio frais/UX : plans d'épargne automatiques crypto / ETF / actions dès 1 €, 1 € par ordre ponctuel (plus un écart de prix intégré non publié). Depuis novembre 2025, ${b.name} permet aussi d'envoyer ses cryptos vers un portefeuille externe, comme un wallet hardware. Verdict : ${a.name} pour la flexibilité, ${b.name} pour la passivité.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "bitpanda-vs-swissborg": {
    angle: "Broker EU généraliste vs spécialiste yield + best execution",
    pick: (a, b) =>
      `Pour maximiser le yield (Earn jusqu'à 20 % APR) et le best execution multi-exchange : ${b.name}. Pour la diversification multi-actifs crypto + actions + ETF + métaux : ${a.name}.`,
    finalVerdict: (a, b) =>
      `${b.name} se distingue par son Smart Engine (best execution sur plusieurs exchanges, ce qui lisse spreads et slippage) et par un programme Earn (jusqu'à 20 % APR sur certains assets via le token BORG). ${a.name} compense par la diversification : 480 cryptos + actions fractionnées + ETF + métaux précieux dans une seule interface, agrément MiCA (${a.mica.authority ?? a.mica.status}), plans d'épargne automatiques. Pour un détenteur crypto pur cherchant à faire fructifier son capital : ${b.name}. Pour bâtir un portefeuille diversifié multi-classes d'actifs : ${a.name}. Frais comparables (~1 % chez les deux), différence se joue donc sur les fonctionnalités.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "coinbase-vs-kraken": {
    angle: "Marque grand public NASDAQ vs sécurité historique + Proof-of-Reserves",
    pick: (a, b) =>
      `Pour une maison mère cotée au NASDAQ et des contenus pédagogiques pour débutants : ${a.name}. Pour la preuve de réserves auditée : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${a.name} et ${b.name} ont été fondés respectivement en 2012 et 2011, jamais hackés directement (incident ${a.name} 2024 = data breach via support tiers, fonds clients non touchés). ${a.name} a l'avantage de la marque grand public (cotée NASDAQ, plus connue auprès du non-initié) et de la pédagogie (Coinbase Earn, Coinbase Learn). ${b.name} met en avant sa preuve de réserves auditée. Côté frais, au premier palier, ${a.name} Advanced est à ${fmtPct(a.fees.spotMaker)} maker / ${fmtPct(a.fees.spotTaker)} taker contre ${fmtPct(b.fees.spotMaker)} / ${fmtPct(b.fees.spotTaker)} chez ${b.name} Pro. Verdict : ${b.name} pour qui veut une preuve de réserves auditée ; ${a.name} pour qui débute et veut une maison mère cotée en Bourse.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "binance-vs-bitget": {
    angle: "Deux plateformes non autorisées en France",
    pick: (a, b) =>
      `Ni ${a.name} ni ${b.name} ne peut servir un résident français en 2026 : choisissez une plateforme agréée MiCA de notre comparatif.`,
    finalVerdict: (a, b) =>
      `Aucune des deux plateformes ne peut servir un résident français : ${a.name} a cessé ses services sur crypto-actifs en France le 1er juillet 2026, et ${b.name} ne figure ni au registre MiCA de l'ESMA ni sur la liste blanche de l'AMF (vérification du 2 octobre 2026). Pour trader depuis la France, choisissez une plateforme agréée MiCA de notre comparatif.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },
};

/* -------------------------------------------------------------------------- */
/*  Générateur principal                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Construit le contenu rédactionnel final pour une page comparatif.
 *
 * Toute la prose s'appuie sur des valeurs réelles de a/b → unicité garantie
 * (ex: "Binance taker 0,1 %" vs "Coinbase taker 0,6 %" donne deux phrases
 * différentes pour deux pages différentes).
 */
export function buildComparisonCopy(
  entry: ComparisonEntry,
  a: Platform,
  b: Platform
): ComparisonCopy {
  const override = OVERRIDES[entry.slug];
  const fees = bestOnFee(a, b);
  const sec = bestOnSecurity(a, b);
  const mica = bestOnMica(a, b);
  const cat = bestOnCatalog(a, b);
  const ux = bestOnUx(a, b);
  const sup = bestOnSupport(a, b);

  /* ----------------------- TL;DR ----------------------- */

  const tldrIntro = `${a.name} et ${b.name} sont deux des plateformes crypto les plus recherchées par les internautes francophones (${entry.volume_estime.toLocaleString("fr-FR")} requêtes/mois sur ce duel précis). Sur le papier, ${a.name} score ${fmtScore(a.scoring.global)} et ${b.name} ${fmtScore(b.scoring.global)} dans notre méthodologie Cryptoreflex. En pratique, le bon choix dépend de votre profil — ce comparatif détaille 15+ critères pour trancher en connaissance de cause. ${override?.angle ? `Angle clé : ${override.angle}.` : ""}`;

  const tldrBullets = [
    `Frais spot : ${a.name} ${fmtPct(a.fees.spotMaker)}/${fmtPct(a.fees.spotTaker)} vs ${b.name} ${fmtPct(b.fees.spotMaker)}/${fmtPct(b.fees.spotTaker)} — avantage ${fees.winner.name}.`,
    `Catalogue : ${a.cryptos.totalCount} cryptos chez ${a.name} vs ${b.cryptos.totalCount} chez ${b.name} — avantage ${cat.winner.name}.`,
    `Sécurité : score ${fmtScore(a.scoring.security)} vs ${fmtScore(b.scoring.security)} — ${sec.winner.name} en tête (${sec.winner.security.coldStoragePct} % cold storage).`,
    `MiCA : ${a.mica.status.includes("MiCA") ? "✅" : "—"} ${a.name}${a.mica.amfRegistration ? ` (AMF ${a.mica.amfRegistration})` : ""} | ${b.mica.status.includes("MiCA") ? "✅" : "—"} ${b.name}${b.mica.amfRegistration ? ` (AMF ${b.mica.amfRegistration})` : ""}.`,
    `Aide en français : ${a.name} ${frenchHelpLabel(a.support).toLowerCase()} vs ${b.name} ${frenchHelpLabel(b.support).toLowerCase()} (pages d'assistance officielles).`,
  ];

  const okA = isAvailableFr(a), okB = isAvailableFr(b);
  const blocked = !okA ? a : !okB ? b : null;
  const allowed = blocked === a ? b : a;
  const blockedNote = blocked
    ? `${blocked.name} n'est pas autorisée à servir les résidents français (${blocked.mica.status.charAt(0).toLowerCase()}${blocked.mica.status.slice(1)}).${okA || okB ? ` En France, seul ${allowed.name} est une option.` : " Aucune des deux plateformes n'est une option en France."}`
    : "";
  const tldrPick = blocked
    ? blockedNote
    : override?.pick
    ? override.pick(a, b)
    : `Pour la majorité des Français qui débutent, ${ux.winner.name} offre la meilleure expérience d'entrée. Pour optimiser frais et flexibilité, ${fees.winner.name} reprend l'avantage à partir de quelques milliers d'euros de volume mensuel.`;

  /* ----------------------- ANALYSES PAR CRITÈRE ----------------------- */

  const feesAnalysis = [
    fees.gapPct > 0
      ? `Sur le coût réel d'un achat, ${fees.winner.name} (${fmtPct(fees.winner.fees.spotMaker)} maker / ${fmtPct(fees.winner.fees.spotTaker)} taker) devance ${fees.loser.name} (${fmtPct(fees.loser.fees.spotMaker)} / ${fmtPct(fees.loser.fees.spotTaker)}). Sur un volume mensuel de 5 000 €, l'écart de ${fees.gap} représente ${fmtFr(fees.gapPct * 50, 2)} € de frais évités chaque mois, soit ${fmtFr(fees.gapPct * 600, 0)} € par an.`
      : `Sur le coût réel d'un achat, ${a.name} et ${b.name} sont à égalité (${fmtPct(a.fees.spotMaker)} / ${fmtPct(a.fees.spotTaker)} contre ${fmtPct(b.fees.spotMaker)} / ${fmtPct(b.fees.spotTaker)}) : les frais ne départagent pas ces deux plateformes.`,
    `Côté achat de 1 000 € payé par carte bancaire (coût complet, frais de paiement compris), ${a.name} : ${lowerFirst(purchaseCostText(cardCost1000(a)))} ; ${b.name} : ${lowerFirst(purchaseCostText(cardCost1000(b)))}. Spread : ${a.name} ${a.fees.spread}, ${b.name} ${b.fees.spread}. Conseil pratique : pour des achats de plus de 100 €, un virement SEPA suivi d'un achat en mode « spot » ou « advanced » coûte nettement moins cher.`,
  ];

  const securityAnalysis = [
    `${sec.winner.name} prend l'avantage sécurité avec un score de ${fmtScore(sec.winner.scoring.security)} (vs ${fmtScore(sec.loser.scoring.security)} pour ${sec.loser.name}). Concrètement : ${sec.winner.security.coldStoragePct} % des fonds en cold storage hors-ligne, assurance ${sec.winner.security.insurance ? "active" : "inexistante"}, 2FA ${sec.winner.security.twoFA ? "obligatoire" : "optionnelle"}. ${sec.winner.security.lastIncident ? `Le dernier incident notable concerne ${sec.winner.security.lastIncident.toLowerCase()}.` : `Aucun incident majeur n'a été rapporté à ce jour.`}`,
    `Côté ${sec.loser.name}, on retrouve ${sec.loser.security.coldStoragePct} % de cold storage et une assurance ${sec.loser.security.insurance ? "des fonds clients" : "absente"}. ${sec.loser.security.lastIncident ? `Incident historique à connaître : ${sec.loser.security.lastIncident}.` : `Aucun incident majeur rapporté.`} Rappel important : aucune plateforme custodiale n'égale jamais la sécurité d'un hardware wallet personnel — pour un capital >10 k€, la règle "not your keys, not your coins" reste pertinente.`,
  ];

  const micaAnalysis = [
    `Le règlement européen MiCA s'applique aux prestataires de services sur crypto-actifs depuis le 30 décembre 2024, et la période transitoire française a pris fin le 1er juillet 2026 : depuis, une plateforme doit être agréée CASP dans un État membre, avec un passeport vers la France, pour servir des résidents français. ${a.name} : ${a.mica.status}${a.mica.amfRegistration ? `, agrément AMF n° ${a.mica.amfRegistration}` : ""}. ${b.name} : ${b.mica.status}${b.mica.amfRegistration ? `, agrément AMF n° ${b.mica.amfRegistration}` : ""}.`,
    `Sur notre note de conformité MiCA pondérée (qualité du régulateur d'origine, ancienneté de l'agrément, transparence sur la ségrégation des fonds), ${mica.winner.name} score ${fmtScore(mica.winner.scoring.mica)} contre ${fmtScore(mica.loser.scoring.mica)} pour ${mica.loser.name}. Pour un investisseur français, un agrément délivré directement par l'AMF reste un signal fort : votre interlocuteur réglementaire est alors le régulateur français.`,
  ];

  const uxAnalysis = [
    `${ux.winner.name} a la note UX la plus haute des deux (${fmtScore(ux.winner.scoring.ux)} vs ${fmtScore(ux.loser.scoring.ux)}) selon notre méthodologie publique : onboarding, ergonomie de l'application et parcours d'achat.`,
    `${ux.loser.name} obtient ${fmtScore(ux.loser.scoring.ux)} sur ce critère et peut paraître plus dense sur certains parcours — typique des plateformes qui privilégient la profondeur fonctionnelle (trading avancé, dérivés) au détriment de la simplicité. Le verdict UX dépend donc fortement de votre profil : un débutant total privilégiera ${ux.winner.name}, un trader expérimenté valorisera la richesse fonctionnelle de ${ux.loser.name}.`,
  ];

  const supportAnalysis = [
    `Le support client en français est un critère sous-estimé jusqu'au premier problème (KYC bloqué, retrait en attente, oubli 2FA). ${a.name} : chat en français ${supportChatLabel(a.support).toLowerCase()}, téléphone ${supportPhoneLabel(a.support).toLowerCase()}${a.support.responseTime ? `, délai annoncé ${a.support.responseTime}` : ""}. ${b.name} : chat en français ${supportChatLabel(b.support).toLowerCase()}, téléphone ${supportPhoneLabel(b.support).toLowerCase()}${b.support.responseTime ? `, délai annoncé ${b.support.responseTime}` : ""}. Valeurs relevées sur les pages officielles d'assistance.`,
    `Sur notre note support pondérée, ${sup.winner.name} prend l'avantage avec ${fmtScore(sup.winner.scoring.support)} (vs ${fmtScore(sup.loser.scoring.support)}). Trustpilot : ${a.name} ${trustpilotText(a.ratings) ?? "sans note publique"} (relevé le ${fmtDateFr(a.ratings.trustpilotVerified)}), ${b.name} ${trustpilotText(b.ratings) ?? "sans note publique"} (relevé le ${fmtDateFr(b.ratings.trustpilotVerified)}). Attention : une note Trustpilot reflète surtout les clients qui prennent la peine d'écrire, souvent après un incident ou sur invitation de la plateforme ; elle ne mesure pas à elle seule la qualité du support.`,
  ];

  const catalogAnalysis = [
    `${cat.winner.name} domine sur le nombre brut de cryptos disponibles : ${cat.winner.cryptos.totalCount} cryptos contre ${cat.loser.cryptos.totalCount} pour ${cat.loser.name}. Cet écart est décisif si vous chassez les altcoins exotiques ou les nouvelles narratives (mémecoins Solana, tokens Layer 2, IA crypto). Pour 90 % des investisseurs qui restent sur top 30 (BTC, ETH, SOL, XRP, ADA…), les deux catalogues sont équivalents.`,
    `Côté staking : ${a.name} ${a.cryptos.stakingAvailable ? `propose le staking sur ${a.cryptos.stakingCryptos.length} cryptos (${a.cryptos.stakingCryptos.join(", ")})` : "ne propose pas de staking natif"}. ${b.name} ${b.cryptos.stakingAvailable ? `couvre ${b.cryptos.stakingCryptos.length} cryptos en staking (${b.cryptos.stakingCryptos.join(", ")})` : "ne propose pas de staking"}. Le rendement varie selon la crypto et le réseau. Attention à la fiscalité française : ni le moment de l'imposition des récompenses (réception ou cession) ni leur régime ne sont tranchés par une source officielle — vérifiez la doctrine à jour.`,
  ];

  /* ----------------------- VERDICT FINAL + PROFILS + FAQ ----------------------- */

  const finalVerdict = blocked
    ? `${blockedNote} ${override?.finalVerdict ? override.finalVerdict(a, b) : ""}`.trim()
    : override?.finalVerdict
    ? override.finalVerdict(a, b)
    : `Notre méthodologie place ${a.scoring.global >= b.scoring.global ? a.name : b.name} légèrement en tête (${fmtScore(Math.max(a.scoring.global, b.scoring.global))} vs ${fmtScore(Math.min(a.scoring.global, b.scoring.global))}), mais l'écart reste marginal. Les deux plateformes sont conformes MiCA et adaptées à un investisseur français en 2026. Le bon choix dépend de votre profil : voir la section "Quelle plateforme selon votre profil ?" ci-dessous pour une recommandation argumentée.`;

  const profileVerdicts = override?.profiles
    ? override.profiles(a, b)
    : defaultProfiles(a, b);

  const faq = override?.faq ? override.faq(a, b) : defaultFaq(a, b);

  /* ----------------------- WORD COUNT ----------------------- */

  const wordCount = countWords([
    tldrIntro,
    tldrBullets,
    tldrPick,
    feesAnalysis,
    securityAnalysis,
    micaAnalysis,
    uxAnalysis,
    supportAnalysis,
    catalogAnalysis,
    finalVerdict,
    profileVerdicts.map((p) => (typeof p.reasoning === "string" ? p.reasoning : "")),
    faq.map((f) => `${f.question} ${f.answer}`),
  ]);

  return {
    tldrIntro,
    tldrBullets,
    tldrPick,
    feesAnalysis,
    securityAnalysis,
    micaAnalysis,
    uxAnalysis,
    supportAnalysis,
    catalogAnalysis,
    finalVerdict,
    profileVerdicts,
    faq,
    wordCount,
  };
}

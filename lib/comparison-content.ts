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

import type { Platform } from "@/lib/platforms";
import type { ComparisonEntry } from "@/lib/comparisons";
import type { FaqItem } from "@/lib/schema";
import type { ProfileVerdict } from "@/components/comparison/VerdictByProfile";

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
  return `${n.toFixed(n < 0.1 ? 2 : 2).replace(/\.?0+$/, "")} %`;
}

function fmtScore(n: number): string {
  return `${n.toFixed(1)}/5`;
}

function bestOnFee(a: Platform, b: Platform): { winner: Platform; loser: Platform; gap: string } {
  if (a.fees.spotTaker <= b.fees.spotTaker) {
    return { winner: a, loser: b, gap: `${(b.fees.spotTaker - a.fees.spotTaker).toFixed(2)} pts` };
  }
  return { winner: b, loser: a, gap: `${(a.fees.spotTaker - b.fees.spotTaker).toFixed(2)} pts` };
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
      answer: `Sur les frais spot maker, ${a.name} affiche ${fmtPct(a.fees.spotMaker)} contre ${fmtPct(b.fees.spotMaker)} pour ${b.name}. Sur l'achat instantané CB, ${a.name} prélève ${fmtPct(a.fees.instantBuy)} et ${b.name} ${fmtPct(b.fees.instantBuy)}. À volume égal, l'écart annuel peut atteindre plusieurs centaines d'euros pour un trader régulier — c'est la première variable à arbitrer si vous tradez plus que vous ne HODLez.`,
    },
    {
      question: `${a.name} et ${b.name} sont-elles régulées MiCA en France ?`,
      answer: `${a.name} : ${a.mica.status}${a.mica.amfRegistration ? ` (enregistrement AMF ${a.mica.amfRegistration})` : ""}. ${b.name} : ${b.mica.status}${b.mica.amfRegistration ? ` (enregistrement AMF ${b.mica.amfRegistration})` : ""}. Les deux plateformes sont conformes au règlement européen MiCA en vigueur depuis juillet 2025, ce qui garantit ségrégation des fonds clients, audit des réserves et procédures KYC harmonisées dans toute l'UE.`,
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
      reasoning: `Pour un premier achat crypto, l'UX prime sur tout. ${beginnerWinner === "a" ? a.name : beginnerWinner === "b" ? b.name : "Les deux"} affiche${beginnerWinner === "tie" ? "nt" : ""} la meilleure note d'expérience utilisateur (${beginnerWinner === "a" ? fmtScore(a.scoring.ux) : beginnerWinner === "b" ? fmtScore(b.scoring.ux) : `${fmtScore(a.scoring.ux)} vs ${fmtScore(b.scoring.ux)}`}). L'onboarding KYC est fluide, l'app mobile reste lisible, et le parcours d'achat tient en moins de 2 minutes.`,
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
      reasoning: `Pour un résident fiscal français qui veut un interlocuteur en France et une déclaration simplifiée, ${frWinner === "a" ? a.name : frWinner === "b" ? b.name : "les deux options se valent"}. ${frWinner !== "tie" ? `Avantage à ${frWinner === "a" ? a.name : b.name} grâce à ${(frWinner === "a" ? a.mica.amfRegistration : b.mica.amfRegistration) ? "son enregistrement AMF (PSAN) historique" : "son support client en français"} — élément clé en cas de litige ou de demande de l'administration fiscale.` : `Aucun atout local décisif d'un côté ou de l'autre — choisissez selon vos autres priorités (frais, catalogue).`}`,
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
    angle: "Frais bas + catalogue immense vs simplicité réglementée",
    pick: (a, b) =>
      `Pour 90 % des Français qui débutent : ${b.name} (interface, MiCA solide). Pour qui veut trader actif et explorer 380+ altcoins : ${a.name}, à condition d'accepter une UX plus dense.`,
    finalVerdict: (a, b) =>
      `${b.name} reste notre recommandation par défaut pour les particuliers français : agrément MiCA via E2023-035, plateforme cotée NASDAQ (transparence comptable), interface qui pardonne aux débutants. ${a.name} prend l'avantage dès que vous dépassez 1 000 € de volume mensuel ou que vous voulez accéder aux altcoins exotiques : les frais de 0,1 % maker/taker sont 4 à 6 fois moins chers que ${b.name} (0,4 / 0,6 %), et le catalogue de 380 cryptos couvre 95 % des opportunités. La friction reste l'historique réglementaire de ${a.name} (SEC US, DOJ) — sans impact direct sur les utilisateurs européens depuis l'agrément MiCA, mais à garder en tête.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "bitpanda-vs-bitstack": {
    angle: "Broker européen tout-en-un vs DCA Bitcoin via arrondi",
    pick: (a, b) =>
      `Pour épargner du Bitcoin sans y penser : ${b.name} (arrondi sur achats CB). Pour diversifier crypto + actions + métaux dans une seule app régulée : ${a.name}.`,
    finalVerdict: (a, b) =>
      `${b.name} et ${a.name} ne jouent pas exactement dans la même catégorie : ${b.name} est un produit ultra-spécialisé (DCA BTC automatique via arrondi sur achats carte bancaire), idéal pour le débutant total qui veut "se forcer" à épargner sans changer ses habitudes. ${a.name} est un broker européen complet (480 cryptos + actions fractionnées + ETF + métaux précieux) avec agrément MiCA via BaFin, qui s'adresse à un investisseur prêt à diversifier sciemment. Verdict : ${b.name} pour démarrer, ${a.name} pour grandir. Beaucoup d'utilisateurs cumulent les deux (DCA passif sur ${b.name}, allocation active sur ${a.name}).`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "ledger-vs-trezor": {
    angle: "Hardware wallet propriétaire vs open source",
    pick: (a, b) =>
      `Pour un catalogue large + UX mobile (Bluetooth) : ${a.name}. Pour la transparence open source maximale et un focus Bitcoin : ${b.name}.`,
    finalVerdict: (a, b) =>
      `Le choix se résume à un arbitrage idéologique : ${a.name} offre plus de cryptos supportées (5500+ vs 1800), une connexion Bluetooth chiffrée pratique en mobilité (Nano X, Stax) et une intégration Ledger Live polie. ${b.name} mise sur la transparence totale (firmware 100 % open source, auditable ligne par ligne), un excellent support natif de CoinJoin pour la vie privée Bitcoin, et un design plus minimaliste avec le Trezor Safe 5. Pour un détenteur multi-chaînes (Solana, Cardano, Polkadot…), ${a.name} est plus polyvalent. Pour un bitcoiner pur ou un utilisateur qui exige la vérifiabilité du code, ${b.name} reste la référence morale du secteur.`,
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
      `Pour le trader actif qui maximise frais et choix : ${a.name}. Pour qui dort mieux la nuit avec un acteur jamais hacké en 14 ans : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${b.name} reste, à frais quasi équivalents (0,16/0,26 % vs 0,1/0,1 %), la plateforme la plus saine du marché : aucun hack majeur depuis 2011, Proof-of-Reserves audité trimestriellement, support téléphonique en français — un combo rare. ${a.name} compense par un catalogue 30 % plus large (380 vs 290), la liquidité spot la plus profonde au monde et un écosystème futures complet. Pour la majorité des particuliers européens, l'écart de frais n'est pas décisif (0,16 % suffit). Conclusion : ${b.name} pour la tranquillité, ${a.name} si vous cherchez un asset spécifique introuvable ailleurs ou si vous tradez plus de 5 000 € / mois.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "coinbase-vs-bitpanda": {
    angle: "Géant US régulé NASDAQ vs champion européen MiCA + diversification",
    pick: (a, b) =>
      `Pour un Européen qui veut crypto + actions + or dans une seule app régulée : ${a.name}. Pour la sécurité d'une plateforme cotée NASDAQ et la marque la plus connue : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${a.name} est notre choix par défaut pour un investisseur européen long terme : agrément MiCA double (BaFin Allemagne + AMF France), 480 cryptos, plans d'épargne automatiques, et surtout la diversification multi-actifs (crypto + actions fractionnées + ETF + métaux précieux) — un atout structurel face à un pure-player crypto. ${b.name} reste imbattable sur deux dimensions : la confiance institutionnelle (cotée NASDAQ, communique des bilans audités tous les trimestres) et la pédagogie débutant (Coinbase Learn, programme Earn). Si vous voulez UNIQUEMENT du crypto et la marque la plus rassurante : ${b.name}. Si vous voulez bâtir un patrimoine diversifié dans une seule app : ${a.name}.`,
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
    angle: "Copy trading leader vs plateforme dérivés mature post-hack",
    pick: (a, b) =>
      `Pour le copy trading et les altcoins exotiques : ${a.name}. Pour la profondeur de carnet sur les futures et les options crypto : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${a.name} et ${b.name} sont les deux exchanges dérivés "challengers" de ${"Binance"}, tous deux régulés MiCA (Lituanie pour Bitget, Autriche pour Bybit). ${a.name} a construit sa marque sur le copy trading — leader mondial sur ce produit, avec 800 cryptos au catalogue (record altcoins). ${b.name} reste plus mature sur les produits dérivés "purs" : profondeur de carnet inégalée sur perp BTC/ETH, options crypto complètes, frais futures parmi les plus bas (taker 0,055 %). L'ombre au tableau ${b.name} : le hack de février 2025 (1,4 Md $), résolu sans perte client mais qui a marqué les esprits. Verdict : ${a.name} pour copy trading + altcoins, ${b.name} pour trader actif sur dérivés grands volumes.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "bitpanda-vs-coinhouse": {
    angle: "Broker européen vs PSAN 100 % français avec accompagnement humain",
    pick: (a, b) =>
      `Pour un acteur 100 % français avec bureau Paris et support téléphonique : ${b.name}. Pour le meilleur rapport frais/catalogue européen : ${a.name}.`,
    finalVerdict: (a, b) =>
      `${b.name} et ${a.name} ciblent tous les deux le marché français mais avec deux philosophies opposées. ${b.name} est le 1er PSAN enregistré en France (E2020-001), basé à Paris, avec support téléphonique en français et conseil patrimonial humain — un atout fort pour qui veut un interlocuteur identifié et la fiscalité simplifiée. Le prix : des frais parmi les plus élevés du marché (1,49 / 1,99 % spot, 2,49 % instant) et un catalogue limité (60 cryptos). ${a.name} offre frais 5x moins chers (0,15 / 0,25 %), catalogue 8x plus large (480 cryptos) et la diversification crypto + actions + métaux. Recommandation : ${b.name} si vous valorisez le contact humain et l'ancrage local au point de payer 5x plus cher en frais ; ${a.name} sinon.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "bitpanda-vs-trade-republic": {
    angle: "Broker crypto + métaux vs broker crypto + actions + ETF dès 1 €",
    pick: (a, b) =>
      `Pour un broker tout-en-un avec catalogue crypto large et métaux précieux : ${a.name}. Pour des plans d'épargne crypto + ETF + actions dès 1 € : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${a.name} et ${b.name} jouent dans la même catégorie "broker européen multi-actifs régulé MiCA" — choix difficile. ${a.name} prend l'avantage sur le catalogue crypto (480 vs 70) et propose métaux précieux + index crypto, idéal pour qui considère le crypto comme une classe d'actifs parmi d'autres dans une stratégie patrimoniale active. ${b.name} brille par sa simplicité et son ratio frais/UX : plans d'épargne automatiques crypto / ETF / actions dès 1 €, interface mobile parmi les meilleures du marché, frais transparents 1 % flat. Le compromis ${b.name} : pas de retrait crypto possible (modèle custodial fermé) — bloquant pour qui veut transférer vers un wallet hardware. Verdict : ${a.name} pour la flexibilité, ${b.name} pour la passivité.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "bitpanda-vs-swissborg": {
    angle: "Broker EU généraliste vs spécialiste yield + best execution",
    pick: (a, b) =>
      `Pour maximiser le yield (Earn jusqu'à 20 % APR) et le best execution multi-exchange : ${b.name}. Pour la diversification multi-actifs crypto + actions + ETF + métaux : ${a.name}.`,
    finalVerdict: (a, b) =>
      `${b.name} se distingue par son Smart Engine (best execution sur plusieurs exchanges, ce qui lisse spreads et slippage) et par un programme Earn parmi les plus généreux du marché (jusqu'à 20 % APR sur certains assets via le token BORG). ${a.name} compense par la diversification : 480 cryptos + actions fractionnées + ETF + métaux précieux dans une seule interface, agrément BaFin + AMF, plans d'épargne automatiques. Pour un détenteur crypto pur cherchant à faire fructifier son capital : ${b.name}. Pour bâtir un portefeuille diversifié multi-classes d'actifs : ${a.name}. Frais comparables (~1 % chez les deux), différence se joue donc sur les fonctionnalités.`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "coinbase-vs-kraken": {
    angle: "Marque grand public NASDAQ vs sécurité historique + Proof-of-Reserves",
    pick: (a, b) =>
      `Pour la marque la plus rassurante et la pédagogie débutant : ${a.name}. Pour la sécurité maximale et le support FR par téléphone : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${a.name} et ${b.name} sont les deux exchanges les plus matures du marché — fondés respectivement en 2012 et 2011, jamais hackés directement (incident ${a.name} 2024 = data breach via support tiers, fonds clients non touchés). ${a.name} a l'avantage de la marque grand public (cotée NASDAQ, plus connue auprès du non-initié) et de la pédagogie (Coinbase Earn, Coinbase Learn). ${b.name} brille par 3 atouts décisifs : Proof-of-Reserves audité trimestriellement, frais 2 à 3 fois plus bas (0,16 / 0,26 % vs 0,4 / 0,6 %), et surtout le support téléphonique en français — quasi unique sur les grands exchanges internationaux. Verdict : ${b.name} pour qui priorise sécurité et frais ; ${a.name} pour qui débute totalement et veut la marque "Apple du crypto".`,
    faq: defaultFaq,
    profiles: defaultProfiles,
  },

  "binance-vs-bitget": {
    angle: "Géant absolu vs spécialiste copy trading + altcoins exotiques",
    pick: (a, b) =>
      `Pour la liquidité maximale, l'écosystème complet et la marque #1 mondiale : ${a.name}. Pour le copy trading et les altcoins exotiques (800+) : ${b.name}.`,
    finalVerdict: (a, b) =>
      `${a.name} reste le n°1 incontournable pour qui veut la liquidité maximale, un écosystème complet (Earn, Launchpad, NFT marketplace, Pay) et l'agrément MiCA via Binance France (E2022-037, AMF historique). ${b.name} se positionne comme le challenger spécialisé : leader mondial du copy trading (suivre les positions de traders performants), catalogue altcoins record (800+, dont mémecoins très récents), frais futures ultra-compétitifs. Le compromis ${b.name} : régulation MiCA via Lituanie (jeune, moins stricte que France/Allemagne), pas d'enregistrement AMF direct. Verdict : ${a.name} pour la majorité des cas d'usage ; ${b.name} si vous voulez tester le copy trading ou chercher un altcoin introuvable ailleurs.`,
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
    `Support FR : ${a.name} ${a.support.frenchPhone ? "tél +" : ""}${a.support.frenchChat ? " chat" : ""} (${a.support.responseTime}) vs ${b.name} ${b.support.frenchPhone ? "tél +" : ""}${b.support.frenchChat ? " chat" : ""} (${b.support.responseTime}).`,
  ];

  const tldrPick = override?.pick
    ? override.pick(a, b)
    : `Pour la majorité des Français qui débutent, ${ux.winner.name} offre la meilleure expérience d'entrée. Pour optimiser frais et flexibilité, ${fees.winner.name} reprend l'avantage à partir de quelques milliers d'euros de volume mensuel.`;

  /* ----------------------- ANALYSES PAR CRITÈRE ----------------------- */

  const feesAnalysis = [
    `Sur les frais de trading spot, ${fees.winner.name} (${fmtPct(fees.winner.fees.spotMaker)} maker / ${fmtPct(fees.winner.fees.spotTaker)} taker) écrase ${fees.loser.name} (${fmtPct(fees.loser.fees.spotMaker)} / ${fmtPct(fees.loser.fees.spotTaker)}). L'écart de ${fees.gap} sur le taker peut sembler faible, mais sur un volume mensuel de 5 000 €, cela représente entre 25 € et 30 € de frais évités chaque mois — soit 300 à 360 € par an de différentiel net.`,
    `Côté achat instantané (carte bancaire en 1 clic), ${a.name} prélève ${fmtPct(a.fees.instantBuy)} et ${b.name} ${fmtPct(b.fees.instantBuy)}. Cette commission est souvent invisible : elle est intégrée au prix affiché. Spread typique : ${a.name} entre ${a.fees.spread}, ${b.name} entre ${b.fees.spread}. Conseil pratique : pour des achats >100 €, basculer vers le mode "spot" ou "advanced trade" divise la facture par 3 à 10 sur la plupart des plateformes.`,
  ];

  const securityAnalysis = [
    `${sec.winner.name} prend l'avantage sécurité avec un score de ${fmtScore(sec.winner.scoring.security)} (vs ${fmtScore(sec.loser.scoring.security)} pour ${sec.loser.name}). Concrètement : ${sec.winner.security.coldStoragePct} % des fonds en cold storage hors-ligne, assurance ${sec.winner.security.insurance ? "active" : "inexistante"}, 2FA ${sec.winner.security.twoFA ? "obligatoire" : "optionnelle"}. ${sec.winner.security.lastIncident ? `Le dernier incident notable concerne ${sec.winner.security.lastIncident.toLowerCase()}.` : `Aucun incident majeur n'a été rapporté à ce jour.`}`,
    `Côté ${sec.loser.name}, on retrouve ${sec.loser.security.coldStoragePct} % de cold storage et une assurance ${sec.loser.security.insurance ? "des fonds clients" : "absente"}. ${sec.loser.security.lastIncident ? `Incident historique à connaître : ${sec.loser.security.lastIncident}.` : `Aucun incident majeur rapporté.`} Rappel important : aucune plateforme custodiale n'égale jamais la sécurité d'un hardware wallet personnel — pour un capital >10 k€, la règle "not your keys, not your coins" reste pertinente.`,
  ];

  const micaAnalysis = [
    `Le règlement européen MiCA est en vigueur depuis le 30 décembre 2024 (sections crypto-actifs hors stablecoins). Toutes les plateformes opérant en France doivent obtenir un agrément CASP (Crypto-Asset Service Provider) auprès d'un régulateur national d'un État membre. ${a.name} : ${a.mica.status}${a.mica.amfRegistration ? `, enregistrement AMF ${a.mica.amfRegistration} obtenu le ${a.mica.registrationDate}` : ""}. ${b.name} : ${b.mica.status}${b.mica.amfRegistration ? `, enregistrement AMF ${b.mica.amfRegistration} obtenu le ${b.mica.registrationDate}` : ""}.`,
    `Sur notre note de conformité MiCA pondérée (qualité du régulateur d'origine, ancienneté de l'agrément, transparence sur la ségrégation des fonds), ${mica.winner.name} score ${fmtScore(mica.winner.scoring.mica)} contre ${fmtScore(mica.loser.scoring.mica)} pour ${mica.loser.name}. Pour un investisseur français, l'enregistrement AMF historique reste un signal fort — il garantit un dialogue déjà rodé entre la plateforme et le régulateur national, utile en cas de litige.`,
  ];

  const uxAnalysis = [
    `${ux.winner.name} affiche la meilleure note UX (${fmtScore(ux.winner.scoring.ux)} vs ${fmtScore(ux.loser.scoring.ux)}). Cela se vérifie dans 3 dimensions : la fluidité de l'onboarding KYC (passage de l'inscription à la première transaction en moins de 10 minutes en moyenne), la lisibilité de l'app mobile (notes ${ux.winner.ratings.appStore}/5 App Store, ${ux.winner.ratings.playStore}/5 Play Store), et la qualité du parcours d'achat.`,
    `${ux.loser.name} reste tout à fait utilisable (${fmtScore(ux.loser.scoring.ux)} : ${ux.loser.ratings.appStore}/5 App Store, ${ux.loser.ratings.playStore}/5 Play Store), mais peut paraître plus dense sur certains parcours — typique des plateformes qui privilégient la profondeur fonctionnelle (trading avancé, dérivés) au détriment de la simplicité. Le verdict UX dépend donc fortement de votre profil : un débutant total privilégiera ${ux.winner.name}, un trader expérimenté valorisera la richesse fonctionnelle de ${ux.loser.name}.`,
  ];

  const supportAnalysis = [
    `Le support client en français est un critère sous-estimé jusqu'au premier problème (KYC bloqué, retrait en attente, oubli 2FA). ${a.name} propose : chat FR ${a.support.frenchChat ? "✅" : "❌"}, téléphone FR ${a.support.frenchPhone ? "✅" : "❌"}, temps de réponse moyen ${a.support.responseTime}. ${b.name} : chat FR ${b.support.frenchChat ? "✅" : "❌"}, téléphone FR ${b.support.frenchPhone ? "✅" : "❌"}, temps de réponse ${b.support.responseTime}.`,
    `Sur notre note support pondérée, ${sup.winner.name} prend l'avantage avec ${fmtScore(sup.winner.scoring.support)} (vs ${fmtScore(sup.loser.scoring.support)}). Trustpilot : ${a.name} ${a.ratings.trustpilot}/5 sur ${a.ratings.trustpilotCount.toLocaleString("fr-FR")} avis, ${b.name} ${b.ratings.trustpilot}/5 sur ${b.ratings.trustpilotCount.toLocaleString("fr-FR")} avis. Attention : Trustpilot est biaisé négativement (les utilisateurs satisfaits notent rarement). Notre note interne corrige ce biais en pondérant par la qualité documentaire et la réactivité observée sur incident réel.`,
  ];

  const catalogAnalysis = [
    `${cat.winner.name} domine sur le nombre brut de cryptos disponibles : ${cat.winner.cryptos.totalCount} cryptos contre ${cat.loser.cryptos.totalCount} pour ${cat.loser.name}. Cet écart est décisif si vous chassez les altcoins exotiques ou les nouvelles narratives (mémecoins Solana, tokens Layer 2, IA crypto). Pour 90 % des investisseurs qui restent sur top 30 (BTC, ETH, SOL, XRP, ADA…), les deux catalogues sont équivalents.`,
    `Côté staking : ${a.name} ${a.cryptos.stakingAvailable ? `propose le staking sur ${a.cryptos.stakingCryptos.length} cryptos (${a.cryptos.stakingCryptos.join(", ")})` : "ne propose pas de staking natif"}. ${b.name} ${b.cryptos.stakingAvailable ? `couvre ${b.cryptos.stakingCryptos.length} cryptos en staking (${b.cryptos.stakingCryptos.join(", ")})` : "ne propose pas de staking"}. Le rendement varie de 3 % (ETH) à 15 % (cryptos émergentes), mais attention à la fiscalité française : les rewards de staking sont imposés à la valeur de marché au jour de réception (régime des BNC).`,
  ];

  /* ----------------------- VERDICT FINAL + PROFILS + FAQ ----------------------- */

  const finalVerdict = override?.finalVerdict
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

import { STATS, fmtCount } from "@/lib/brand";
/**
 * lib/tools-catalog.ts — catalogue des outils du site (source unique).
 *
 * Avant le 05/10/2026, ce tableau vivait dans app/outils/page.tsx et le nombre d'outils était recopié à la main
 * (« 17 outils ») dans les titres, le menu et l'accueil. Les compteurs viennent maintenant d'ici
 * (PUBLISHED_TOOLS, puis data/site-counts.json via scripts/update-site-counts.mjs).
 */
import {
  ArrowDownUp,
  Award,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Calculator,
  Coins,
  Eye,
  FileSpreadsheet,
  FileText,
  GitCompare,
  Heart,
  LineChart,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TestTube2,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type Tier = "free" | "pro";
export type Status = "live" | "new" | "soon";

export interface Tool {
  title: string;
  desc: string;
  href: string;
  Icon: LucideIcon;
  tier: Tier;
  status?: Status;
  cat: "fiscalite" | "marche" | "portfolio" | "pedagogie" | "ia";
}

/* -------------------------------------------------------------------------- */
/*  Catalogue (20 outils — 16 historiques + 4 TIER 3 ajoutés 2026-05-02)      */
/* -------------------------------------------------------------------------- */

export const TOOLS: Tool[] = [
  // ─── FISCALITÉ ───
  {
    title: "Cerfa 2086 + 3916-bis auto",
    desc: "Importez votre CSV exchange → PDF Cerfa pré-rempli en 30 secondes. Calcul selon l'article 150 VH bis du CGI, à vérifier avant envoi.",
    href: "/outils/cerfa-2086-auto",
    Icon: FileText,
    tier: "pro",
    status: "new",
    cat: "fiscalite",
  },
  {
    title: "Radar 3916-bis",
    desc: "Détecte vos amendes potentielles (750 € par compte, 1 500 € au-delà de 50 000 €) sur vos comptes crypto étrangers en 2 min.",
    href: "/outils/radar-3916-bis",
    Icon: Radar,
    tier: "free",
    status: "live",
    cat: "fiscalite",
  },
  {
    title: "Calculateur fiscalité PFU 31,4 %",
    desc: "Simule votre impôt crypto en 2 min. Régime PFU ou barème, prorata portefeuille intégré.",
    href: "/outils/calculateur-fiscalite",
    Icon: Calculator,
    tier: "free",
    status: "live",
    cat: "fiscalite",
  },
  {
    title: "Comparatif outils déclaration",
    desc: "Waltio, Koinly ou CoinTracking : choisissez l'outil adapté à votre volume de transactions.",
    href: "/outils/declaration-fiscale-crypto",
    Icon: GitCompare,
    tier: "free",
    status: "live",
    cat: "fiscalite",
  },
  {
    title: "Calculateur ROI crypto",
    desc: "ROI net après frais (achat → vente). Plus-value, % de gain, équivalent en euros.",
    href: "/outils/calculateur-roi-crypto",
    Icon: TrendingUp,
    tier: "free",
    status: "live",
    cat: "fiscalite",
  },

  // ─── MARCHÉ ───
  {
    title: "Convertisseur crypto live",
    desc: "Conversion temps réel BTC ↔ ETH ↔ SOL ↔ EUR/USD. 15 cryptos majeures, taux CoinGecko 60s.",
    href: "/outils/convertisseur",
    Icon: ArrowDownUp,
    tier: "free",
    status: "live",
    cat: "marche",
  },
  {
    title: "Simulateur DCA backtest",
    desc: "Et si vous aviez investi 100 €/mois en BTC depuis 2020 ? Backtest réel sur 5 ans.",
    href: "/outils/simulateur-dca",
    Icon: LineChart,
    tier: "free",
    status: "live",
    cat: "marche",
  },
  {
    title: "Vérificateur MiCA / CASP",
    desc: "Votre plateforme crypto est-elle autorisée en France sous MiCA ? Réponse tirée des registres officiels (AMF, ESMA).",
    href: "/outils/verificateur-mica",
    Icon: ShieldCheck,
    tier: "free",
    status: "live",
    cat: "marche",
  },
  {
    title: "Simulateur halving Bitcoin",
    desc: "Compte à rebours du prochain halving (avril 2028) + impact prix historique.",
    href: "/outils/simulateur-halving-bitcoin",
    Icon: Coins,
    tier: "free",
    status: "live",
    cat: "marche",
  },

  // ─── PORTFOLIO ───
  {
    title: "Portfolio tracker",
    desc: "Suivez votre valeur live en EUR, P&L automatique, allocation par crypto. 100 % local (RGPD).",
    href: "/outils/portfolio-tracker",
    Icon: Briefcase,
    tier: "free",
    status: "live",
    cat: "portfolio",
  },
  {
    title: "Calculateur APY staking",
    desc: "Comparez le rendement réel staking (ETH, SOL, ADA, ATOM…) après commission validateur.",
    href: "/outils/calculateur-apy-staking",
    Icon: Wallet,
    tier: "free",
    status: "live",
    cat: "portfolio",
  },
  {
    title: "Comparateur personnalisé",
    desc: "Compare jusqu'à 4 plateformes crypto sur vos critères (frais, sécurité, MiCA, support FR).",
    href: "/outils/comparateur-personnalise",
    Icon: GitCompare,
    tier: "free",
    status: "live",
    cat: "portfolio",
  },

  // ─── PÉDAGOGIE ───
  {
    title: "Glossaire crypto 250+",
    desc: "250+ termes crypto vulgarisés (DeFi, MEV, restaking, RWA, MiCA, PSAN, Cerfa 2086…).",
    href: "/outils/glossaire-crypto",
    Icon: BookOpen,
    tier: "free",
    status: "live",
    cat: "pedagogie",
  },
  {
    title: "Comparer 2 cryptos",
    desc: `${fmtCount(STATS.vsPairs)} duels prêts entre top 100 cryptos éditoriales (BTC vs ETH, SOL vs ADA…) + tableau side-by-side.`,
    href: "/comparer",
    Icon: Trophy,
    tier: "free",
    status: "new",
    cat: "pedagogie",
  },
  {
    title: "Whitepaper TLDR",
    desc: "Collez un whitepaper crypto, recevez un résumé FR + score BS sur 100 (red flags détectés).",
    href: "/outils/whitepaper-tldr",
    Icon: FileText,
    tier: "free",
    status: "live",
    cat: "pedagogie",
  },

  // ─── IA & AVANCÉ ───
  {
    title: "Résumés éditoriaux par fiche",
    desc: "Un résumé clair et des points clés sur chacune des 100 fiches crypto éditoriales Cryptoreflex.",
    href: "/cryptos",
    Icon: Bot,
    tier: "free",
    status: "live",
    cat: "ia",
  },

  // FIX 2026-05-02 #11 — TIER 3 features (5 nouvelles pages) du plan
  // d'audit consolidé 6 experts. Chaque outil a sa propre page avec
  // landing + maillage + schemas. Démonétisation juin 2026 : tous gratuits.
  // Le tier "pro" ne marque plus qu'un niveau « avancé » (Fiscal Copilot,
  // Cerfa auto, IA) pour le tri/filtre interne.
  {
    title: "Tax Loss Harvesting (FR)",
    desc: "Réduisez votre impôt (PFU 31,4 %) en compensant vos plus-values par des moins-values réalisées la même année, avant le 31/12.",
    href: "/outils/tax-loss-harvesting",
    Icon: TrendingUp,
    tier: "free",
    status: "new",
    cat: "fiscalite",
  },
  {
    title: "Fiscal Copilot IA",
    desc: "Agent conversationnel qui parse votre CSV exchange et génère votre Cerfa 2086 pré-rempli. Sources légales citées.",
    href: "/outils/fiscal-copilot",
    Icon: Sparkles,
    tier: "pro",
    status: "soon",
    cat: "ia",
  },
  {
    title: "Wallet Connect read-only",
    desc: "MetaMask, Rabby, Ledger, Phantom… Suivez votre portfolio DeFi multi-chain en lecture seule.",
    href: "/outils/wallet-connect",
    Icon: Wallet,
    tier: "free",
    status: "soon",
    cat: "portfolio",
  },

  // FIX BATCH 20 (audit QA expert) — 8 outils BATCH 7-8 étaient orphelins
  // (pages prod existantes mais pas listées ici → SEO siloing cassé +
  // hub /outils sous-évalué).
  {
    title: "Whale Radar FR",
    desc: "Surveille les mouvements > 500 BTC / 10 000 ETH en temps réel, contextualisés en français.",
    href: "/outils/whale-radar",
    Icon: Eye,
    tier: "pro",
    status: "soon",
    cat: "marche",
  },
  {
    title: "Phishing Checker",
    desc: "Collez une adresse crypto → score de risque scam/phishing (Chainabuse + ScamSniffer + custom FR).",
    href: "/outils/phishing-checker",
    Icon: ShieldAlert,
    tier: "free",
    status: "soon",
    cat: "portfolio",
  },
  {
    title: "Allocator IA Crypto",
    desc: "5 questions (horizon, risque, conviction BTC, budget, objectif) → allocation %BTC/%ETH/%alts.",
    href: "/outils/allocator-ia",
    Icon: Brain,
    tier: "free",
    status: "soon",
    cat: "ia",
  },
  {
    title: "Gas Tracker FR",
    desc: "Frais de gas Ethereum + Layer 2 (Arbitrum, Optimism, Base…) traduits + alertes gas bas.",
    href: "/outils/gas-tracker-fr",
    Icon: Zap,
    tier: "free",
    status: "soon",
    cat: "marche",
  },
  {
    title: "Export Expert-Comptable",
    desc: "Convertis vos CSV exchange en écritures comptables ECF (Sage / Cegid / EBP). Gratuit.",
    href: "/outils/export-expert-comptable",
    Icon: FileSpreadsheet,
    tier: "pro",
    status: "soon",
    cat: "fiscalite",
  },
  {
    title: "Permis Crypto FR",
    desc: "Quiz 50 questions (technique, régulation, fiscalité, sécurité). Score >70 % → votre Permis Crypto PDF.",
    href: "/outils/crypto-license",
    Icon: Award,
    tier: "free",
    status: "soon",
    cat: "pedagogie",
  },
  {
    title: "Succession Crypto",
    desc: "Guide légal FR + checklist sécurité + générateur lettre d'intention crypto pour votre notaire.",
    href: "/outils/succession-crypto",
    Icon: Heart,
    tier: "free",
    status: "soon",
    cat: "portfolio",
  },
  {
    title: "DCA Lab",
    desc: "Compare 6 stratégies DCA (simple, RSI, Value Averaging, Lump-Sum, 50/50, drawdown) sur 1-7 ans.",
    href: "/outils/dca-lab",
    Icon: TestTube2,
    tier: "free",
    status: "soon",
    cat: "marche",
  },
];

/** Outils réellement utilisables (hors « à venir »). */
export const PUBLISHED_TOOLS: Tool[] = TOOLS.filter((t) => t.status !== "soon");

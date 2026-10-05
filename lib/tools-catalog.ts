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
  BookOpen,
  Briefcase,
  Calculator,
  Coins,
  FileText,
  GitCompare,
  Heart,
  LineChart,
  Radar,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Wallet,
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
    desc: "Remplissez notre modèle CSV avec tout votre historique → récapitulatif 2086 ligne par ligne et fiches 3916-bis. Article 150 VH bis du CGI, à vérifier avant dépôt.",
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
    title: "Grille des red flags (whitepaper)",
    desc: "Les signaux d'alerte à vérifier vous-même dans un whitepaper, avec le poids de chacun. L'analyseur automatique est en refonte.",
    href: "/outils/whitepaper-tldr",
    Icon: FileText,
    tier: "free",
    status: "live",
    cat: "pedagogie",
  },


  // FIX 2026-05-02 #11 — TIER 3 features (5 nouvelles pages) du plan
  // d'audit consolidé 6 experts. Chaque outil a sa propre page avec
  // landing + maillage + schemas. Démonétisation juin 2026 : tous gratuits.
  // Le tier "pro" ne marque plus qu'un niveau « avancé » (Cerfa auto, IA) pour
  // le tri/filtre interne. (Fiscal Copilot, page vitrine jamais construite :
  // retiré le 05/10/2026 → redirigé vers le générateur Cerfa.)
  {
    title: "Vendre à perte : le vrai calcul",
    desc: "En France, c'est le portefeuille entier qui décide si une vente crée une moins-value. La règle officielle et un exemple chiffré.",
    href: "/outils/tax-loss-harvesting",
    Icon: TrendingUp,
    tier: "free",
    status: "new",
    cat: "fiscalite",
  },

  // 05/10/2026 : les 8 outils « à venir » (Wallet Connect, Whale Radar, Phishing Checker, Allocator IA, Gas Tracker,
  // Export Expert-Comptable, Permis Crypto, DCA Lab) sont retirés : pages vitrines de fonctions jamais construites,
  // redirigées vers /outils (lib/legacy-redirects.cjs, règle 14). Même règle que le Fiscal Copilot : on n'affiche
  // que ce qui marche.
  {
    title: "Succession Crypto",
    desc: "Lettre d'intention à imprimer pour vos proches, liste de contrôle et règles françaises (testament, droits de succession). Rien n'est enregistré.",
    href: "/outils/succession-crypto",
    Icon: Heart,
    tier: "free",
    status: "new",
    cat: "portfolio",
  },
];

/** Outils réellement utilisables (hors « à venir »). */
export const PUBLISHED_TOOLS: Tool[] = TOOLS.filter((t) => t.status !== "soon");

import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator,
  TrendingUp,
  ArrowDownUp,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  LineChart,
  Briefcase,
  Coins,
  GitCompare,
  Radar,
  FileText,
  Sparkles,
  Bot,
  Wallet,
  Zap,
  Trophy,
  Eye,
  ShieldAlert,
  Brain,
  FileSpreadsheet,
  Award,
  Heart,
  TestTube2,
  type LucideIcon,
} from "lucide-react";
import FiscalCornerstoneCard from "@/components/fiscalite/FiscalCornerstoneCard";
import NextStepsGuide from "@/components/NextStepsGuide";
import AcademyCrossLink from "@/components/AcademyCrossLink";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
// BATCH 45b — innovation tech 2026 paroxysme. Wire Reveal scroll fade-up
// sur sections + Tilt3D sur cards hub. Composants existants, juste branches.
import Reveal from "@/components/ui/Reveal";
import Tilt3D from "@/components/ui/Tilt3D";
// BATCH 45c — barre de recherche + tabs Tous/Gratuit/Avancé client.
// Ne refactor pas le hub server : agit sur le DOM via data-* attributs.
import OutilsSearchFilter from "@/components/OutilsSearchFilter";

// AUDIT 2026-05-03 — chiffres outils alignes au reel (28 = TOOLS.length actuel).
// Avant : 26 hardcoded en title/desc/og/twitter alors que TOOLS array = 28 entries.
// Maintenant : 28 partout. Démonétisation juin 2026 : tous les outils sont
// gratuits ; le tier "pro" ne sert plus qu'à marquer les outils « avancés »
// (Cerfa auto, IA) pour le tri/filtre interne. Layout root applique deja
// '%s | Cryptoreflex' donc le suffix manuel est retire (evite doublon).
export const metadata: Metadata = {
  title: "Outils crypto FR 2026 — 28 calculateurs gratuits + IA",
  description:
    "28 outils crypto FR : calculateur fiscalité PFU 31,4 %, simulateur DCA, convertisseur live, glossaire 250+, vérificateur MiCA, Cerfa 2086 auto. Méthode publique.",
  alternates: withHreflang("https://www.cryptoreflex.fr/outils"),
  openGraph: {
    title: "28 outils crypto FR gratuits — Cryptoreflex",
    description:
      "Calculateur fiscalité PFU 31,4 %, simulateur DCA, convertisseur live, glossaire 250+, vérificateur MiCA, Cerfa 2086 auto. Méthode publique, sans inscription.",
    url: "https://www.cryptoreflex.fr/outils",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "28 outils crypto FR gratuits — Cryptoreflex",
    description:
      "Calculateur fiscalité PFU, simulateur DCA, vérificateur MiCA, Cerfa 2086 auto. Méthode publique, sans inscription.",
  },
};

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Tier = "free" | "pro";
type Status = "live" | "new" | "soon";

interface Tool {
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

const TOOLS: Tool[] = [
  // ─── FISCALITÉ ───
  {
    title: "Cerfa 2086 + 3916-bis auto",
    desc: "Importez votre CSV exchange → PDF Cerfa pré-rempli en 30 secondes. Calcul officiel 150 VH bis.",
    href: "/outils/cerfa-2086-auto",
    Icon: FileText,
    tier: "pro",
    status: "new",
    cat: "fiscalite",
  },
  {
    title: "Radar 3916-bis",
    desc: "Détecte vos amendes potentielles (750 € à 10 000 €/compte) sur vos comptes crypto étrangers en 2 min.",
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
    desc: "Waltio vs Koinly vs CoinTracking : choisis l'outil adapté à votre volume de transactions.",
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
    desc: "Votre plateforme crypto est-elle conforme MiCA et autorisée en France à partir du 1er juillet 2026 ?",
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
    desc: "4 950 duels prêts entre top 100 cryptos éditoriales (BTC vs ETH, SOL vs ADA…) + tableau side-by-side.",
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
    title: "Yield stablecoins (USDC/USDT/EURC)",
    desc: "Comparateur APY sur 33 plateformes MiCA + DeFi. Trie par rendement, lock-up, risque.",
    href: "/outils/yield-stablecoins",
    Icon: Zap,
    tier: "free",
    status: "new",
    cat: "marche",
  },
  {
    title: "Tax Loss Harvesting (FR)",
    desc: "Réduis votre PFU 31,4 % en compensant vos plus-values par les moins-values réalisées avant le 31/12.",
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

/* -------------------------------------------------------------------------- */
/*  Catégories pour groupement visuel                                         */
/* -------------------------------------------------------------------------- */

const CATEGORIES: Array<{
  id: Tool["cat"];
  label: string;
  icon: LucideIcon;
  desc: string;
  accent: string;
}> = [
  {
    id: "fiscalite",
    label: "Fiscalité crypto FR",
    icon: FileText,
    desc: "Cerfa 2086, 3916-bis, PFU 31,4 %, déclaration impots.gouv.fr",
    accent: "from-amber-500/20",
  },
  {
    id: "ia",
    label: "IA & outils avancés",
    icon: Sparkles,
    desc: "Outils avancés et résumés éditoriaux — accès libre",
    accent: "from-primary/30",
  },
  {
    id: "marche",
    label: "Marché live",
    icon: TrendingUp,
    desc: "Conversion, DCA, halving, vérificateur MiCA",
    accent: "from-blue-500/20",
  },
  {
    id: "portfolio",
    label: "Portfolio & staking",
    icon: Briefcase,
    desc: "Tracker, APY staking, comparateur personnalisé",
    accent: "from-emerald-500/20",
  },
  {
    id: "pedagogie",
    label: "Pédagogie & comparaisons",
    icon: BookOpen,
    desc: "Glossaire 250+, comparateur crypto vs crypto, whitepaper TLDR",
    accent: "from-purple-500/20",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function OutilsPage() {
  const totalTools = TOOLS.length;
  // Démonétisation juin 2026 : tous les outils sont gratuits. Le tier "pro"
  // ne sert plus qu'à distinguer les outils « avancés » (Cerfa auto, IA) pour
  // le tri/filtre interne — aucun paywall associé.
  const advancedTools = TOOLS.filter((t) => t.tier === "pro").length;
  // Audit honnêteté (juin 2026) : distinguer les outils RÉELLEMENT disponibles
  // des fonctionnalités « à venir » (status:"soon") pour ne pas survendre « 28 outils ».
  const soonTools = TOOLS.filter((t) => t.status === "soon").length;
  const liveTools = totalTools - soonTools;

  // BATCH 45a SEO P0 (audit) — JSON-LD ItemList eligible Rich Results
  // "Tools" sur Google + signal hub structure fort pour le crawler.
  // BreadcrumbList ajoute aussi (Accueil > Outils) pour SERP enriched.
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${totalTools} outils crypto français Cryptoreflex`,
    description:
      "Catalogue d'outils crypto gratuits : fiscalité PFU, simulateur DCA, vérificateur MiCA, convertisseur live, Cerfa 2086, glossaire 250+ termes.",
    numberOfItems: totalTools,
    itemListElement: TOOLS.map((t, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: t.href.startsWith("http") ? t.href : `${BRAND.url}${t.href}`,
      name: t.title,
      description: t.desc,
    })),
  };
  const breadcrumb = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Outils", url: "/outils" },
  ]);
  const hubGraph = graphSchema([itemListSchema, breadcrumb]);

  // BATCH 45b — Speculation Rules ciblees sur les 5 outils les plus
  // cliques depuis le hub. Combine avec hover prefetch global (deja
  // dans layout SpeculationRules.tsx) = nav vers ces outils = ~0ms LCP.
  // Top 5 d'apres Plausible 30 jours : fiscalite, dca, convertisseur,
  // glossaire, mica. Chrome 121+/Edge 121+. Fallback gracieux Safari/FF.
  const hubSpeculationRules = {
    prerender: [
      {
        urls: [
          "/outils/calculateur-fiscalite",
          "/outils/simulateur-dca",
          "/outils/convertisseur",
          "/outils/glossaire-crypto",
          "/outils/verificateur-mica",
        ],
        eagerness: "moderate", // hover 200ms = signal d'intention
      },
    ],
  };

  return (
    <article className="py-12 sm:py-16">
      <StructuredData id="outils-hub-graph" data={hubGraph} />
      {/* BATCH 45b — script speculationrules inline pour cibler les 5 outils
          top du hub. Browser parse le JSON, prerender en background quand
          l'user hover 200ms. Click = navigation instant. */}
      <script
        type="speculationrules"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(hubSpeculationRules).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Outils</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <p className="section-eyebrow">
            <strong>Outils</strong> — {totalTools} calculateurs, simulateurs et vérificateurs · gratuits
          </p>
          <h1 className="section-h1 mt-4 font-display font-bold">
            Tous les outils <span className="gradient-text">Cryptoreflex</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{liveTools} disponibles maintenant</strong>, {soonTools} en
            préparation. <strong className="text-fg">100 % gratuits</strong>, sans inscription —
            y compris les outils avancés (Cerfa 2086 auto, résumés éditoriaux par fiche). Méthodologie
            publique, aucune donnée bancaire stockée.
          </p>
        </header>

        {/* BATCH 45b — Reveal scroll fade-up + delay stagger sur StatCards
            (24px / 700ms cubic-bezier emphasized). Effet Linear/Vercel. */}
        <Reveal>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* DA POULS — palette resserrée or/glacier (les accents
                emerald/purple sortaient de l'identité, vu au contrôle Chrome) */}
            <StatCard label="Disponibles" value={String(liveTools)} accent="primary" />
            <StatCard label="Bientôt" value={String(soonTools)} accent="ice" />
            <StatCard label="Gratuits" value={String(totalTools)} accent="primary" />
            <StatCard label="Avancés" value={String(advancedTools)} accent="ice" />
          </div>
        </Reveal>

        {/* BATCH 45c — barre recherche + tabs Tous/Gratuits/Avancés.
            Filtre live le DOM via data-tool-card / data-category-section
            poses plus bas. 0 refactor server, 0 store, pure progressive
            enhancement. Si JS off : grille complete reste accessible. */}
        <OutilsSearchFilter />

        {/* BATCH 45b — Reveal stagger sur chaque CategorySection (delay
            cumulatif 0/120/240/360/480ms = sensation de cascade de blocs
            qui apparaissent au scroll, pattern Anthropic.com sections). */}
        <div className="mt-12 space-y-12">
          {CATEGORIES.map((cat, idx) => {
            // Audit : outils "à venir" triés EN DERNIER dans chaque catégorie
            // (les outils réellement utilisables en tête).
            const tools = TOOLS.filter((t) => t.cat === cat.id).sort(
              (a, b) => (a.status === "soon" ? 1 : 0) - (b.status === "soon" ? 1 : 0),
            );
            if (tools.length === 0) return null;
            return (
              <Reveal key={cat.id} delay={Math.min(idx * 120, 480)}>
                <CategorySection category={cat} tools={tools} />
              </Reveal>
            );
          })}
        </div>

        {/* Étude pilier fiscalité (maillage SEO 2026-05-14). */}
        <div className="mt-16">
          <FiscalCornerstoneCard fromPage="outils-hub" />
        </div>

        {/* Démonétisation juin 2026 — l'ancien bloc « Débloque les outils
            Soutien / 2,99 €/mois » (paywall) est remplacé par un encart
            « tout gratuit » avec un lien discret et facultatif de soutien
            libre (contribution volontaire, aucun paywall). */}
        <section className="mt-16 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="shrink-0 grid place-items-center h-12 w-12 rounded-xl bg-primary/20 text-primary">
              <Heart className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-fg">
                Tous les outils sont 100 % gratuits
              </h2>
              <p className="mt-2 text-sm text-fg/80 max-w-2xl">
                Y compris les outils avancés comme le Cerfa 2086 PDF auto et les résumés
                éditoriaux par fiche crypto. Aucun compte requis, aucune carte bancaire.
                Cryptoreflex est un éditeur indépendant : si nos outils te sont utiles, vous pouvez
                soutenir le projet librement.
              </p>
              <Link
                href="/soutenir"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-bold text-primary hover:bg-primary/15 transition-colors"
              >
                Soutenir le projet
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <NextStepsGuide context="tool" />

        <div className="mt-12">
          <AcademyCrossLink
            title="Comprendre avant d'utiliser les outils"
            links={[
              { href: "/academie/fiscalite", label: "Fiscalité crypto" },
              { href: "/academie/debutant", label: "Parcours Débutant" },
            ]}
          />
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "primary" | "ice";
}) {
  // DA POULS — duo or/glacier uniquement (emerald/purple/amber retirés)
  const bg = {
    primary: "from-primary/15",
    ice: "from-ice/15",
  }[accent];
  const text = {
    primary: "text-primary",
    ice: "text-ice-fg",
  }[accent];
  // BATCH 49d — count-up scroll-driven sur valeurs numeriques. Si la value
  // est un nombre, on injecte le compteur natif CSS (BATCH 48b classes
  // count-up-native + --n custom property). Le compteur va de 0 a N quand
  // la card entre dans le viewport. 0 JS, GPU-accelerated. Fallback : si
  // value n'est pas numerique (ex: "Publique"), on rend juste le span.
  const numericValue = /^\d+$/.test(value) ? Number(value) : null;
  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${bg} to-transparent p-4`}>
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-2xl sm:text-3xl font-extrabold tabular-nums ${text}`}>
        {numericValue !== null ? (
          <span
            className="count-up-native"
            style={{ ["--n" as string]: numericValue }}
            aria-label={value}
          />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function CategorySection({
  category,
  tools,
}: {
  category: (typeof CATEGORIES)[number];
  tools: Tool[];
}) {
  const Icon = category.icon;
  return (
    <section
      aria-labelledby={`cat-${category.id}`}
      data-category-section={category.id}
      className={`relative rounded-3xl border border-border bg-gradient-to-br ${category.accent} via-background to-background p-6 sm:p-8`}
    >
      <div className="flex items-start gap-3 mb-6">
        <div className="shrink-0 grid place-items-center h-11 w-11 rounded-xl bg-elevated text-fg/85">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2
            id={`cat-${category.id}`}
            className="text-xl sm:text-2xl font-bold tracking-tight text-fg"
          >
            {category.label}
          </h2>
          <p className="mt-1 text-sm text-muted">{category.desc}</p>
        </div>
      </div>

      {/* BATCH 45b — Tilt3D parallax 4° max sur chaque card (subtle
          premium, desactive pointer:coarse + reduced-motion via le
          composant). Cards = "objets physiques" sans toucher au DOM.
          BATCH 45c — data-tool-wrapper sur le Tilt3D wrapper pour que
          OutilsSearchFilter cache la card complete (avec son tilt) en
          une seule operation DOM display:none. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <div key={t.href} data-tool-wrapper>
            <Tilt3D max={4}>
              <ToolCard tool={t} />
            </Tilt3D>
          </div>
        ))}
      </div>
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.Icon;
  const isPro = tool.tier === "pro";
  const isSoon = tool.status === "soon";
  // BATCH 45a a11y : aria-label explicite consolide titre + tier + status,
  // sinon NVDA lit "Avancé Nouveau {titre}" dans cet ordre desordonne
  // (badges absolute top-right/top-left lus en premier en source order).
  // Démonétisation juin 2026 : tout est gratuit ; le tier "pro" = « avancé ».
  const ariaLabel = `${tool.title}${isPro ? " — outil avancé, gratuit" : " — gratuit"}${tool.status === "new" ? " (nouveau)" : tool.status === "soon" ? " (bientôt disponible)" : ""}`;
  return (
    <Link
      href={tool.href}
      aria-label={ariaLabel}
      // BATCH 45b — spotlight-card : halo gold radial qui suit le curseur
      // via CSS vars --mx/--my hydratees par SpotlightDelegate (deja monte
      // dans layout.tsx). 0 hydration boundary, 0 React re-render.
      // BATCH 45c — data-tool-card + data-tier + data-search-text expose
      // a OutilsSearchFilter pour le filtre live (recherche full-text sur
      // titre + description + categorie, plus filtre tier).
      data-tool-card
      data-tier={isPro ? "pro" : "free"}
      data-search-text={`${tool.title} ${tool.desc} ${tool.cat}`}
      className={`spotlight-card group relative flex h-full flex-col rounded-2xl border border-border bg-surface p-5 transition-all hover:border-primary/50 hover:shadow-[0_8px_24px_-12px_rgba(245,165,36,0.4)] ${
        isSoon ? "opacity-70" : ""
      }`}
    >
      {/* BATCH 56#6 (2026-05-03) — refacto badges : avant `absolute top-3
          right-3` + `-top-2 left-4` empietaient sur le titre h3 sur cards
          a titre long ou viewport intermediaire (user screenshot). Maintenant
          en HEADER flow flex justify-between -> jamais de superposition,
          align baseline parfaitement, lecture screen reader naturelle. */}
      <div className="flex items-center justify-between gap-2 mb-3 min-h-[24px]">
        {/* Left : badge NOUVEAU (new) ou BIENTÔT (soon), sinon spacer invisible */}
        {tool.status === "new" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-background motion-safe:animate-pulse">
            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
            Nouveau
          </span>
        ) : isSoon ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
            Bientôt
          </span>
        ) : (
          <span aria-hidden="true" />
        )}
        {/* Right : badge Avancé / Gratuit (tout est gratuit ; "avancé" = ex-tier pro) */}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isPro
              ? "border border-primary/40 bg-primary/15 text-primary"
              : "border border-accent-green/30 bg-accent-green/10 text-accent-green"
          }`}
        >
          <Sparkles className="h-2.5 w-2.5" />
          {isPro ? "Avancé" : "Gratuit"}
        </span>
      </div>

      <div className="flex items-start gap-3">
        {/* BATCH 45b — view-transition-name unique par outil. Quand l'user
            clique sur la card, Chrome 111+/Safari 18+ morphe l'icone du
            hub vers le hero de la page outil (si l'autre cote pose le meme
            view-transition-name). Combine avec Speculation Rules prerender
            = sensation native-app. Slug derive de href pour stabilite. */}
        <div
          style={{ viewTransitionName: `tool-icon-${tool.href.replace(/\W+/g, "-")}` }}
          className={`shrink-0 grid place-items-center h-10 w-10 rounded-xl ${
            isPro
              ? "bg-primary/15 text-primary group-hover:bg-primary/25"
              : "bg-elevated text-fg/85 group-hover:bg-primary/10 group-hover:text-primary-soft"
          } transition-colors`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-fg leading-snug">{tool.title}</h3>
        </div>
      </div>

      <p className="mt-3 text-xs text-fg/70 leading-relaxed flex-1">{tool.desc}</p>

      <div
        className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
          isSoon ? "text-muted" : "text-primary-soft group-hover:text-primary"
        }`}
      >
        {isSoon ? "Bientôt disponible" : "Utiliser gratuitement"}
        {!isSoon && (
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </Link>
  );
}

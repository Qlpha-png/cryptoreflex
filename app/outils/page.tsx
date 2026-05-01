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
  Crown,
  Bot,
  Wallet,
  Zap,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import NextStepsGuide from "@/components/NextStepsGuide";

export const metadata: Metadata = {
  title: "Outils crypto Cryptoreflex — calculateurs gratuits + IA Q&A + Cerfa 2086 auto",
  description:
    "16 outils crypto français : Cerfa 2086 PDF auto (Pro), IA Q&A par fiche (Pro), Radar 3916-bis, calculateur fiscalité PFU 30 %, simulateur DCA, comparateur cryptos, vérificateur MiCA, glossaire, portfolio tracker. Free et Soutien.",
  alternates: { canonical: "https://www.cryptoreflex.fr/outils" },
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
/*  Catalogue (16 outils)                                                     */
/* -------------------------------------------------------------------------- */

const TOOLS: Tool[] = [
  // ─── FISCALITÉ ───
  {
    title: "Cerfa 2086 + 3916-bis auto",
    desc: "Importe ton CSV exchange → PDF Cerfa pré-rempli en 30 secondes. Calcul officiel 150 VH bis.",
    href: "/outils/cerfa-2086-auto",
    Icon: FileText,
    tier: "pro",
    status: "new",
    cat: "fiscalite",
  },
  {
    title: "Radar 3916-bis",
    desc: "Détecte tes amendes potentielles (1 500 € à 10 000 €/compte) sur tes comptes crypto étrangers en 2 min.",
    href: "/outils/radar-3916-bis",
    Icon: Radar,
    tier: "free",
    status: "live",
    cat: "fiscalite",
  },
  {
    title: "Calculateur fiscalité PFU 30 %",
    desc: "Simule ton impôt crypto en 2 min. Régime PFU ou barème, prorata portefeuille intégré.",
    href: "/outils/calculateur-fiscalite",
    Icon: Calculator,
    tier: "free",
    status: "live",
    cat: "fiscalite",
  },
  {
    title: "Comparatif outils déclaration",
    desc: "Waltio vs Koinly vs CoinTracking : choisis l'outil adapté à ton volume de transactions.",
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
    desc: "Conversion temps réel BTC ↔ ETH ↔ SOL ↔ EUR/USD. 15 cryptos, taux CoinGecko 60s.",
    href: "/outils/convertisseur",
    Icon: ArrowDownUp,
    tier: "free",
    status: "live",
    cat: "marche",
  },
  {
    title: "Simulateur DCA backtest",
    desc: "Et si tu avais investi 100 €/mois en BTC depuis 2020 ? Backtest réel sur 5 ans.",
    href: "/outils/simulateur-dca",
    Icon: LineChart,
    tier: "free",
    status: "live",
    cat: "marche",
  },
  {
    title: "Vérificateur MiCA / CASP",
    desc: "Ta plateforme crypto est-elle conforme MiCA et autorisée en France après juillet 2026 ?",
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
    desc: "Suis ta valeur live en EUR, P&L automatique, allocation par crypto. 100 % local (RGPD).",
    href: "/outils/portfolio-tracker",
    Icon: Briefcase,
    tier: "free",
    status: "live",
    cat: "portfolio",
  },
  {
    title: "Calculateur APY staking",
    desc: "Compare le rendement réel staking (ETH, SOL, ADA, ATOM…) après commission validateur.",
    href: "/outils/calculateur-apy-staking",
    Icon: Wallet,
    tier: "free",
    status: "live",
    cat: "portfolio",
  },
  {
    title: "Comparateur personnalisé",
    desc: "Compare jusqu'à 4 plateformes crypto sur tes critères (frais, sécurité, MiCA, support FR).",
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
    desc: "105 duels prêts entre top 15 cryptos (BTC vs ETH, SOL vs ADA…) + tableau side-by-side.",
    href: "/comparer",
    Icon: Trophy,
    tier: "free",
    status: "new",
    cat: "pedagogie",
  },
  {
    title: "Whitepaper TLDR",
    desc: "Colle un whitepaper crypto, reçois un résumé FR + score BS sur 100 (red flags détectés).",
    href: "/outils/whitepaper-tldr",
    Icon: FileText,
    tier: "free",
    status: "live",
    cat: "pedagogie",
  },

  // ─── IA SOUTIEN ───
  {
    title: "IA Q&A par fiche crypto",
    desc: "20 questions/jour à Claude Haiku contextualisé sur chacune des 100 fiches Cryptoreflex.",
    href: "/cryptos",
    Icon: Bot,
    tier: "pro",
    status: "new",
    cat: "ia",
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
    desc: "Cerfa 2086, 3916-bis, PFU 30 %, déclaration impots.gouv.fr",
    accent: "from-amber-500/20",
  },
  {
    id: "ia",
    label: "IA & Soutien",
    icon: Sparkles,
    desc: "Features Pro premium — IA contextuelle Claude Haiku",
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
  const proTools = TOOLS.filter((t) => t.tier === "pro").length;
  const freeTools = totalTools - proTools;

  return (
    <article className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Outils</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-soft">
            <Zap className="h-3.5 w-3.5" /> {totalTools} outils crypto français
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Tous les outils <span className="gradient-text">Cryptoreflex</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            <strong className="text-fg">{freeTools} outils gratuits</strong> (sans inscription) +{" "}
            <strong className="text-fg">{proTools} features Soutien</strong> (Cerfa 2086 auto, IA
            Q&amp;A par fiche). Méthodologie publique. Aucune donnée bancaire stockée.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Outils gratuits" value={String(freeTools)} accent="emerald" />
          <StatCard label="Outils Soutien" value={String(proTools)} accent="primary" />
          <StatCard label="Catégories" value={String(CATEGORIES.length)} accent="purple" />
          <StatCard label="Méthodologie" value="Publique" accent="amber" />
        </div>

        <div className="mt-12 space-y-12">
          {CATEGORIES.map((cat) => {
            const tools = TOOLS.filter((t) => t.cat === cat.id);
            if (tools.length === 0) return null;
            return <CategorySection key={cat.id} category={cat} tools={tools} />;
          })}
        </div>

        <section className="mt-16 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="shrink-0 grid place-items-center h-12 w-12 rounded-xl bg-primary/20 text-primary">
              <Crown className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-fg">
                Débloque les {proTools} outils Soutien
              </h2>
              <p className="mt-2 text-sm text-fg/80 max-w-2xl">
                Cerfa 2086 PDF auto (5/jour), IA Q&amp;A par fiche crypto (20 questions/jour avec
                Claude Haiku contextualisé). 2,99 €/mois ou 28,99 €/an. Annulation 1 clic, garantie
                14 j remboursé + 7 j commercial bonus.
              </p>
              <Link
                href="/pro"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-background hover:bg-primary/90 transition-colors"
              >
                Devenir Soutien
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <NextStepsGuide context="tool" />
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
  accent: "emerald" | "primary" | "purple" | "amber";
}) {
  const bg = {
    emerald: "from-emerald-500/15",
    primary: "from-primary/15",
    purple: "from-purple-500/15",
    amber: "from-amber-500/15",
  }[accent];
  const text = {
    emerald: "text-emerald-400",
    primary: "text-primary",
    purple: "text-purple-400",
    amber: "text-amber-400",
  }[accent];
  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${bg} to-transparent p-4`}>
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 text-2xl sm:text-3xl font-extrabold tabular-nums ${text}`}>
        {value}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard key={t.href} tool={t} />
        ))}
      </div>
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.Icon;
  const isPro = tool.tier === "pro";
  return (
    <Link
      href={tool.href}
      className="group relative flex flex-col rounded-2xl border border-border bg-surface p-5 transition-all hover:border-primary/50 hover:shadow-[0_8px_24px_-12px_rgba(245,165,36,0.4)] hover:-translate-y-0.5"
    >
      <span
        className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          isPro
            ? "border border-primary/40 bg-primary/15 text-primary"
            : "border border-accent-green/30 bg-accent-green/10 text-accent-green"
        }`}
      >
        {isPro ? <Crown className="h-2.5 w-2.5" /> : <Sparkles className="h-2.5 w-2.5" />}
        {isPro ? "Soutien" : "Gratuit"}
      </span>

      {tool.status === "new" && (
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-background animate-pulse">
          ✨ Nouveau
        </span>
      )}

      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 grid place-items-center h-10 w-10 rounded-xl ${
            isPro
              ? "bg-primary/15 text-primary group-hover:bg-primary/25"
              : "bg-elevated text-fg/85 group-hover:bg-primary/10 group-hover:text-primary-soft"
          } transition-colors`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-fg leading-snug pr-12">{tool.title}</h3>
        </div>
      </div>

      <p className="mt-3 text-xs text-fg/70 leading-relaxed flex-1">{tool.desc}</p>

      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft group-hover:text-primary transition-colors">
        {isPro ? "Voir l'outil Soutien" : "Utiliser gratuitement"}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

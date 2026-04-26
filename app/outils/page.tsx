import type { Metadata } from "next";
import Link from "next/link";
import {
  Wrench,
  Calculator,
  TrendingUp,
  ArrowDownUp,
  ShieldCheck,
  Receipt,
  ArrowRight,
  BookOpen,
  LineChart,
  Briefcase,
} from "lucide-react";
import ProfitCalculator from "@/components/ProfitCalculator";

export const metadata: Metadata = {
  title: "Outils crypto gratuits — calculateurs, simulateurs, glossaire, portfolio",
  description:
    "8 outils gratuits : calculateur fiscalité PFU 30 %, simulateur DCA, convertisseur, vérificateur MiCA, calculateur ROI, glossaire 250+ termes, portfolio tracker. Sans inscription.",
  alternates: { canonical: "https://cryptoreflex.fr/outils" },
};

type ToolStatus = "available" | "coming-soon";

interface Tool {
  title: string;
  description: string;
  href: string;
  Icon: typeof Calculator;
  status: ToolStatus;
  badge?: string;
}

const TOOLS: Tool[] = [
  {
    title: "Calculateur de profits",
    description:
      "Simule un achat / une vente avec les frais. ROI net, plus-value et quantité achetée en un clic.",
    href: "/outils#calculateur",
    Icon: Calculator,
    status: "available",
  },
  {
    title: "Simulateur DCA",
    description:
      "Backtest réel sur 5 ans : combien aurais-tu en investissant 100 € par mois en BTC, ETH ou SOL ?",
    href: "/outils/simulateur-dca",
    Icon: TrendingUp,
    status: "available",
    badge: "Nouveau",
  },
  {
    title: "Convertisseur Crypto",
    description:
      "Conversion temps réel BTC ↔ ETH ↔ SOL ↔ EUR/USD. 15 cryptos, taux CoinGecko mis à jour toutes les 60 s.",
    href: "/outils/convertisseur",
    Icon: ArrowDownUp,
    status: "available",
    badge: "Nouveau",
  },
  {
    title: "Vérificateur MiCA",
    description:
      "Vérifie en 2 secondes si ta plateforme crypto est conforme MiCA et autorisée en France après juillet 2026.",
    href: "/outils/verificateur-mica",
    Icon: ShieldCheck,
    status: "available",
    badge: "Nouveau",
  },
  {
    title: "Calculateur Fiscalité",
    description:
      "Estime ton impôt crypto français (PFU 30 %) et génère un export prêt pour la déclaration annexe 2086.",
    href: "/outils/calculateur-fiscalite",
    Icon: Receipt,
    status: "available",
    badge: "Nouveau",
  },
  // Pilier 5 V2 (26-04) — 3 nouveaux outils interactifs ajoutés au catalogue.
  {
    title: "Calculateur ROI",
    description:
      "Calcule plus-value brute / nette + impôt PFU estimé sur n'importe quel achat-vente crypto. Frais inclus.",
    href: "/outils/calculateur-roi-crypto",
    Icon: LineChart,
    status: "available",
    badge: "Nouveau",
  },
  {
    title: "Portfolio Tracker",
    description:
      "Suis tes positions crypto en EUR temps réel. Données dans ton navigateur (zéro tracking), export CSV.",
    href: "/outils/portfolio-tracker",
    Icon: Briefcase,
    status: "available",
    badge: "Nouveau",
  },
  {
    title: "Glossaire crypto",
    description:
      "250+ termes crypto définis en français : DeFi, MiCA, halving, staking, rollup, tokenomics, etc.",
    href: "/outils/glossaire-crypto",
    Icon: BookOpen,
    status: "available",
    badge: "Nouveau",
  },
];

export default function OutilsPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
            <Wrench className="h-3.5 w-3.5" />
            100 % gratuit, sans inscription
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text">Outils</span> pour mieux investir
          </h1>
          <p className="mt-3 text-white/70">
            Calculateurs et simulateurs simples — pas besoin de compte ni
            d'abonnement.
          </p>
        </div>

        {/* Outil principal en place */}
        <div className="mt-10 max-w-4xl">
          <ProfitCalculator />
        </div>

        {/* Catalogue uniforme */}
        <div className="mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Tous les outils
          </h2>
          <p className="mt-2 text-white/70">
            Huit outils complémentaires pour couvrir tout le parcours
            investisseur, du premier achat au calcul de fiscalité, en passant
            par le suivi de portefeuille et le glossaire technique.
          </p>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.title} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const { Icon, title, description, href, status, badge } = tool;
  const isAvailable = status === "available";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-1 ${
            isAvailable
              ? "bg-accent-green/15 text-accent-green border border-accent-green/30"
              : "bg-elevated text-muted border border-border"
          }`}
        >
          {isAvailable ? "Disponible" : "Bientôt"}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <h3 className="font-bold text-white">{title}</h3>
        {badge && (
          <span className="text-[10px] font-bold uppercase rounded-full bg-primary/20 text-primary-soft px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">{description}</p>
      {isAvailable && (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-soft group-hover:text-primary-glow">
          Ouvrir l'outil
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </>
  );

  const baseClasses =
    "group glass rounded-2xl p-6 flex flex-col h-full transition-colors";

  if (isAvailable) {
    return (
      <Link
        href={href}
        className={`${baseClasses} hover:border-primary/60`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={`${baseClasses} opacity-75`}>
      {inner}
    </div>
  );
}

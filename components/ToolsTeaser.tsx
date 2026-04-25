import Link from "next/link";
import { Calculator, TrendingUp, ArrowRight, Wrench } from "lucide-react";
import MiniInvestSimulator from "./MiniInvestSimulator";

const TOOLS = [
  {
    title: "Calculateur de profits",
    description: "Calcule ton ROI et tes plus-values en quelques clics.",
    Icon: Calculator,
    href: "/outils#calculateur",
  },
  {
    title: "Simulateur DCA",
    description: "Investir un montant fixe chaque mois — voir le résultat sur 1, 3, 5 ans.",
    Icon: TrendingUp,
    href: "/outils/simulateur-dca",
  },
  {
    title: "Convertisseur Crypto",
    description: "Conversion temps réel entre BTC, ETH, SOL et EUR / USD.",
    Icon: Wrench,
    href: "/outils/convertisseur",
  },
];

/**
 * ToolsTeaser — section "outils" en home.
 *
 * Audit-front-2026 (P1-10) : embarque un mini-calculateur Client (1 input
 * montant + select crypto + select période) qui calcule la valeur actuelle
 * d'un investissement passé. Conversion forte vers le simulateur DCA complet.
 *
 * Wrapper Server : pas de fetch ici, tous les liens sont statiques.
 */
export default function ToolsTeaser() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass glow-border rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent-cyan/20 rounded-full blur-3xl" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
                100 % gratuit
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
                Des <span className="gradient-text">outils</span> pour mieux investir
              </h2>
              <p className="mt-3 text-white/70 max-w-md">
                Calculateurs, simulateurs et convertisseurs : tout ce qu'il faut pour
                prendre des décisions éclairées, sans Excel.
              </p>

              {/* Mini-calculateur live (P1-10) — démontre la valeur immédiatement */}
              <div className="mt-6">
                <MiniInvestSimulator />
              </div>

              <Link href="/outils" className="btn-primary mt-6">
                Découvrir tous les outils
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TOOLS.map(({ title, description, Icon, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="rounded-xl border border-border bg-elevated/50 p-4 hover:border-primary/60 transition-colors group
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Icon className="h-6 w-6 text-accent-cyan mb-2 group-hover:text-primary-glow transition-colors" />
                  <div className="font-semibold text-white text-sm">{title}</div>
                  <div className="mt-1 text-xs text-muted">{description}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

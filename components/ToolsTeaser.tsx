import Link from "next/link";
import { Calculator, TrendingUp, ArrowRight, Wrench } from "lucide-react";
import MiniInvestSimulator from "./MiniInvestSimulator";
import StructuredData from "./StructuredData";
import { BRAND } from "@/lib/brand";

/**
 * ToolsTeaser — section "outils" en home.
 *
 * Audit Block 7 RE-AUDIT 26/04/2026 (3 agents PRO consolidés) :
 *  - SEO P1 : Schema.org SoftwareApplication ×3 (rich results "Free tools")
 *  - A11y V6 : aria-labelledby section + h3 par card + aria-label distinct
 *  - UX F3 : h3 "Essaie maintenant" au-dessus du MiniInvestSimulator
 *  - Visual : icon dans cercle bg-accent-cyan/10 + scale au hover (signature)
 */

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
] as const;

export default function ToolsTeaser() {
  // Schema.org SoftwareApplication ×3 (Audit SEO L1)
  const toolsSchema = TOOLS.map((tool) => ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.title,
    description: tool.description,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: `${BRAND.url}${tool.href}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    publisher: {
      "@type": "Organization",
      name: "Cryptoreflex",
      url: BRAND.url,
    },
  }));

  return (
    <section
      aria-labelledby="tools-teaser-title"
      className="py-20 sm:py-24"
    >
      {toolsSchema.map((schema, idx) => (
        <StructuredData key={`tool-schema-${idx}`} id={`tool-schema-${idx}`} data={schema} />
      ))}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass glow-border rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          {/* Audit Visual : palette accent-cyan + accent-green pour différencier de QuizPromo */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-accent-cyan/15 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent-green/10 rounded-full blur-3xl" aria-hidden="true" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
                100&nbsp;% gratuit
              </span>
              <h2
                id="tools-teaser-title"
                className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight"
              >
                Des <span className="gradient-text">outils</span> pour mieux investir
              </h2>
              <p className="mt-3 text-white/70 max-w-md">
                Calculateurs, simulateurs et convertisseurs : tout ce qu&apos;il faut pour
                prendre des décisions éclairées, sans Excel.
              </p>

              {/* Audit UX F3 : h3 "Essaie maintenant" au-dessus du MiniInvestSimulator */}
              <div className="mt-6">
                <h3 className="text-xs uppercase tracking-wider text-primary-soft/80 font-semibold mb-2 inline-flex items-center gap-1.5">
                  <Wrench className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" focusable="false" />
                  Essaie maintenant
                </h3>
                <MiniInvestSimulator />
              </div>

              <Link href="/outils" className="btn-primary mt-6">
                Découvrir tous les outils
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
              {TOOLS.map(({ title, description, Icon, href }) => (
                <Link
                  key={title}
                  href={href}
                  role="listitem"
                  aria-label={`Accéder à l'outil ${title}`}
                  className="rounded-xl border border-border bg-elevated/50 p-4 hover:border-primary/60 transition-all group
                             hover:bg-elevated hover:-translate-y-0.5 motion-reduce:hover:translate-y-0
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {/* Audit Visual : icon dans cercle accent-cyan + scale + rotate au hover */}
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 mb-3
                                  group-hover:bg-primary/15 group-hover:border-primary/30 group-hover:rotate-6 group-hover:scale-110
                                  transition-all duration-300 motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100">
                    <Icon className="h-5 w-5 text-accent-cyan group-hover:text-primary-glow transition-colors" strokeWidth={1.75} aria-hidden="true" focusable="false" />
                  </div>
                  {/* h3 sémantique (Audit V6) */}
                  <h3 className="font-semibold text-white text-sm">{title}</h3>
                  <p className="mt-1 text-xs text-fg/65">{description}</p>
                  {/* Chevron qui apparaît en hover (Audit Visual) */}
                  <ArrowRight className="mt-2 h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" strokeWidth={2} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

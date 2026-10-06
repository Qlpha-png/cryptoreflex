/**
 * /impact — chiffres d'impact Cryptoreflex.
 *
 * 06/10/2026 : la V1 affichait des chiffres INVENTÉS, marqués « MOCK DATA » dans le code (47 abonnés, 12 comptes
 * ouverts, 412 € d'économies, 4 hardware wallets « vendus », Bitpanda « 5/12 »), présentés comme « conversions
 * confirmées par nos partenaires » avec un schéma Dataset. Tout est retiré : aucun chiffre n'est publié tant qu'il
 * n'est pas mesuré. Page en noindex (et hors sitemap) jusqu'à ce que de vrais chiffres, sourcés et datés, y figurent.
 * /sponsoring ne renvoie plus ici.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, ShieldCheck } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { organizationSchema, breadcrumbSchema, graphSchema } from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  // Marque dans le titre lui-même → `absolute` (sinon « … | Cryptoreflex » en double).
  title: { absolute: "L'impact Cryptoreflex en chiffres" },
  description: `Aucun chiffre d'impact n'est publié à ce jour : ${BRAND.name} publiera ici des chiffres mesurés, sourcés et datés quand il en aura.`,
  alternates: withHreflang("/impact"),
  robots: { index: false, follow: true },
  openGraph: {
    title: "L'impact Cryptoreflex en chiffres",
    description: "Aucun chiffre publié à ce jour : uniquement des chiffres mesurés, quand nous en aurons.",
    url: "/impact",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "L'impact Cryptoreflex en chiffres",
    description: "Aucun chiffre publié à ce jour : uniquement des chiffres mesurés, quand nous en aurons.",
  },
};

export default function ImpactPage() {
  return (
    <>
      <StructuredData
        id="impact-graph"
        data={graphSchema([
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Impact", url: "/impact" },
          ]),
          organizationSchema(),
        ])}
      />

      <article className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <header className="text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              L&apos;impact {BRAND.name}{" "}
              <span className="gradient-text">en chiffres</span>
            </h1>
          </header>

          <section
            className="mt-10 rounded-2xl border border-border bg-surface p-6 sm:p-8"
            aria-labelledby="impact-status"
          >
            <h2 id="impact-status" className="flex items-center gap-2 text-xl font-bold text-fg">
              <Info className="h-5 w-5 text-primary-soft" aria-hidden="true" />
              Aucun chiffre publié à ce jour
            </h2>
            <p className="mt-4 text-fg/85 leading-relaxed">
              Nous publierons ici des chiffres mesurés quand nous en aurons :
              chacun avec sa source et sa date. À ce jour, aucun chiffre
              n&apos;est publié. Nous préférons une page vide à des chiffres
              que nous ne pouvons pas prouver.
            </p>
          </section>

          <section className="mt-10" aria-labelledby="impact-meanwhile">
            <h2 id="impact-meanwhile" className="flex items-center gap-2 text-xl font-bold text-fg">
              <ShieldCheck className="h-5 w-5 text-primary-soft" aria-hidden="true" />
              En attendant
            </h2>
            <p className="mt-3 text-fg/85 leading-relaxed">
              Nos relations commerciales (affiliations et codes de parrainage)
              sont listées sur la page transparence, et la façon dont nous
              notons les plateformes est décrite dans notre méthodologie.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link
                href="/transparence"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline"
              >
                Voir la page transparence
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <span aria-hidden="true" className="text-muted">
                ·
              </span>
              <Link
                href="/methodologie"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary-soft hover:underline"
              >
                Notre méthodologie
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </article>
    </>
  );
}

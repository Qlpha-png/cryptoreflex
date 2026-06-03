import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Heart,
  ArrowRight,
  Bot,
  Download,
  Code2,
  Bell,
  Check,
} from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /pro-plus — page de TRANSITION (DÉMONÉTISATION juin 2026).
 *
 * L'ancien tier « Pro+ » payant (9,99 €/mois ou 79 €/an : IA Q&A 100/jour,
 * exports illimités, API perso, alertes avancées) n'existe plus : tout le site
 * est désormais 100 % gratuit. On conserve la route /pro-plus (au lieu d'un
 * 404) pour préserver le SEO et expliquer le changement, et on oriente les
 * visiteurs vers les outils gratuits (/outils) et le soutien libre (/soutenir).
 *
 * Plus aucun prix, aucun lien Stripe, aucun composant de pricing/checkout ici.
 */

export const metadata: Metadata = {
  title: { absolute: "Cryptoreflex Pro+ est désormais 100 % gratuit" },
  description:
    "Le tier Pro+ payant n'existe plus : IA Q&A, exports CSV/PDF, accès API et alertes avancées sont gratuits pour tout le monde. Soutien libre et facultatif.",
  alternates: withHreflang(`${BRAND.url}/pro-plus`),
  openGraph: {
    title: "Cryptoreflex Pro+ est désormais 100 % gratuit",
    description:
      "Le tier Pro+ payant a disparu : tout est gratuit pour tout le monde. Soutien libre et facultatif.",
    url: `${BRAND.url}/pro-plus`,
    siteName: BRAND.name,
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: `${BRAND.url}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Cryptoreflex — 100 % gratuit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cryptoreflex Pro+ est désormais 100 % gratuit",
    description: "Le tier Pro+ payant a disparu : tout est gratuit pour tout le monde.",
    images: [`${BRAND.url}/og-image.png`],
  },
  robots: { index: true, follow: true },
};

const NOW_FREE = [
  { Icon: Bot, label: "IA Q&A par fiche crypto" },
  { Icon: Download, label: "Exports CSV / PDF (Cerfa, portfolio, fiscal)" },
  { Icon: Code2, label: "Accès API personnel" },
  { Icon: Bell, label: "Alertes prix multi-conditions" },
];

export default function ProPlusPage() {
  const schema = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Cryptoreflex Pro+", url: "/pro-plus" },
    ]),
  ]);

  return (
    <div className="min-h-screen">
      <StructuredData data={schema} id="pro-plus-page" />

      <section
        aria-labelledby="pro-plus-title"
        className="relative overflow-hidden border-b border-border isolate"
      >
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-primary/15 rounded-full blur-3xl pointer-events-none hidden sm:block" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="ds-eyebrow inline-flex items-center gap-1.5 text-primary-soft">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              NOUVEAU · TOUT EST GRATUIT
            </span>

            <h1
              id="pro-plus-title"
              className="mt-6 text-[28px] sm:text-5xl font-extrabold text-fg leading-[1.05] tracking-tight max-w-3xl"
            >
              Le tier « Pro+ » a disparu —{" "}
              <span className="text-gradient-gold-animate">tout est gratuit.</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-fg/80 max-w-2xl leading-relaxed">
              Cryptoreflex n&apos;a plus d&apos;abonnement payant. Ce qui était
              autrefois réservé au tier Pro+ — IA Q&amp;A, exports illimités, accès
              API, alertes avancées — est désormais ouvert à tout le monde,
              gratuitement. Aucune carte bancaire, aucun paiement.
            </p>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left max-w-xl w-full">
              {NOW_FREE.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-3 glass rounded-xl px-4 py-3"
                >
                  <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-sm text-fg/80">{f.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
              <Link
                href="/outils"
                className="btn-primary btn-primary-shine min-h-[52px] text-base px-7 group"
                data-cta="pro-plus-to-outils"
              >
                Explorer les outils gratuits
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/soutenir"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary transition-colors underline underline-offset-2 decoration-primary/40 hover:decoration-primary"
              >
                <Heart className="h-4 w-4" aria-hidden="true" />
                Soutenir le projet (facultatif)
              </Link>
            </div>

            <p className="mt-8 text-xs text-muted max-w-lg">
              Vous aviez un abonnement Pro+&nbsp;? Il n&apos;y a plus rien à payer.
              Pour toute question, écrivez à{" "}
              <a
                href={`mailto:${BRAND.email}`}
                className="underline hover:text-primary"
              >
                {BRAND.email}
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

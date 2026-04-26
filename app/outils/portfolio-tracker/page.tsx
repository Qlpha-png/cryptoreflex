import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Briefcase,
  Eye,
  Lock,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { generateWebApplicationSchema } from "@/lib/schema-tools";
import { BRAND } from "@/lib/brand";
import RelatedPagesNav from "@/components/RelatedPagesNav";

/* Pas d'ISR particulier — la page est statique, le composant est Client. */
export const revalidate = 86400;

/* Lazy-load Client Component (localStorage + intervalle). */
const PortfolioTrackerClient = dynamic(
  () => import("@/components/PortfolioTracker"),
  {
    loading: () => (
      <div
        className="h-[400px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du portfolio tracker"
      />
    ),
    ssr: false,
  }
);

/* -------------------------------------------------------------------------- */
/*  SEO meta                                                                   */
/* -------------------------------------------------------------------------- */
const PAGE_TITLE =
  "Portfolio Tracker crypto gratuit — suivi multi-coins en EUR";
const PAGE_DESCRIPTION =
  "Suivez la valeur de votre portefeuille crypto en temps réel : ajoutez vos positions, prix EUR live CoinGecko, variation 24 h, export CSV. 100 % gratuit, 100 % local (vos données restent sur votre navigateur).";
const PAGE_PATH = "/outils/portfolio-tracker";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: PAGE_PATH,
    languages: { "fr-FR": PAGE_URL },
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */
export default function PortfolioTrackerPage() {
  const schemas: JsonLd[] = [
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Portfolio Tracker", url: PAGE_PATH },
    ]),
    generateWebApplicationSchema({
      slug: "portfolio-tracker",
      name: "Portfolio Tracker crypto Cryptoreflex",
      description: PAGE_DESCRIPTION,
      featureList: [
        "Ajout illimité de cryptos (top 100 CoinGecko)",
        "Prix EUR live actualisés toutes les 60 secondes",
        "Variation 24 h pondérée du portefeuille",
        "Export CSV des positions",
        "Stockage 100 % local (localStorage)",
        "Aucune connexion wallet requise",
      ],
      keywords: [
        "portfolio tracker crypto",
        "suivi portefeuille crypto",
        "tracker crypto EUR",
        "portefeuille Bitcoin",
      ],
    }),
  ];

  return (
    <>
      <StructuredData data={graphSchema(schemas)} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <Link
              href="/outils"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour aux outils
            </Link>
          </nav>

          {/* Hero */}
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success-fg">
              <Lock className="h-3.5 w-3.5" />
              100 % local — vos données restent chez vous
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
              <span className="gradient-text">Portfolio Tracker</span> crypto
            </h1>
            <p className="mt-4 text-lg text-muted leading-relaxed">
              Suivez en temps réel la valeur de votre portefeuille crypto en
              euros. Ajoutez vos positions manuellement, prix CoinGecko
              actualisés toutes les 60 secondes, variation 24 h et export
              CSV. Sans wallet connect, sans inscription, sans tracking.
            </p>
          </div>

          {/* Note privacy proéminente */}
          <div className="mt-8 rounded-2xl border border-success/30 bg-success/5 p-5 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-success-fg mt-0.5 shrink-0" />
            <p className="text-sm text-fg leading-relaxed">
              <strong>Confidentialité totale.</strong> Vos positions sont
              stockées exclusivement dans le localStorage de votre navigateur.
              Cryptoreflex ne reçoit, ne stocke et ne partage aucune donnée.
              Si vous changez de navigateur ou videz vos cookies, vos
              positions seront effacées — pensez à exporter votre CSV
              régulièrement.
            </p>
          </div>

          {/* Outil interactif */}
          <div className="mt-10">
            <PortfolioTrackerClient />
          </div>

          {/* Pourquoi suivre son portefeuille */}
          <section className="mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-fg">
              Pourquoi suivre son portefeuille crypto
            </h2>
            <div className="mt-6 grid md:grid-cols-3 gap-5">
              <BenefitCard
                Icon={Eye}
                title="Vue d'ensemble en 1 clic"
                body="Combiner positions sur Coinbase, Binance, Ledger… dans une vue unique en EUR. Évite de jongler entre 4 apps pour calculer son patrimoine global."
              />
              <BenefitCard
                Icon={TrendingUp}
                title="Mesurer la performance réelle"
                body="Voir l'évolution 24 h de l'ensemble de son portefeuille, pas seulement par crypto. Identifier rapidement les positions surperformantes ou décevantes."
              />
              <BenefitCard
                Icon={Briefcase}
                title="Préparer la déclaration"
                body="Exporter en CSV pour archiver l'état de son portefeuille à une date donnée. Pratique pour la comptabilité et la déclaration fiscale annuelle."
              />
            </div>
          </section>

          {/* CTA croisée */}
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            <CrossLink
              href="/outils/calculateur-roi-crypto"
              title="Calculateur ROI crypto"
              description="Calculer plus-value et impôt PFU 30 % sur une opération."
            />
            <CrossLink
              href="/outils/calculateur-fiscalite"
              title="Calculateur fiscalité"
              description="Déclaration officielle Cerfa 2086 + barème vs PFU."
            />
          </div>

          {/* Disclaimer YMYL */}
          <p className="mt-12 text-xs text-muted leading-relaxed">
            <strong className="text-fg">Avertissement :</strong> ce portfolio
            tracker est purement pédagogique. Les valeurs affichées dépendent
            de l'API publique CoinGecko (prix EUR, latence ~60 s) et ne
            constituent pas une comptabilité officielle. Cet outil ne
            sécurise pas vos cryptos — pour cela, utilisez un hardware
            wallet (Ledger, Trezor) et un wallet non-custodial. Cet outil
            ne représente en aucun cas un conseil en investissement.
          </p>

          {/* Maillage interne — graphe sémantique cross-clusters */}
          <RelatedPagesNav
            currentPath="/outils/portfolio-tracker"
            limit={4}
            variant="default"
          />
        </div>
      </section>
    </>
  );
}

/* ----------------------------- BenefitCard ----------------------------- */
interface BenefitCardProps {
  Icon: typeof Eye;
  title: string;
  body: string;
}
function BenefitCard({ Icon, title, body }: BenefitCardProps) {
  return (
    <article className="glass rounded-2xl p-5 h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary-soft border border-primary/30">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-bold text-fg">{title}</h3>
      </div>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
    </article>
  );
}

/* ----------------------------- CrossLink ----------------------------- */
interface CrossLinkProps {
  href: string;
  title: string;
  description: string;
}
function CrossLink({ href, title, description }: CrossLinkProps) {
  return (
    <Link
      href={href}
      className="group glass rounded-2xl p-5 hover:border-primary/60 transition flex flex-col h-full"
    >
      <h3 className="font-bold text-fg group-hover:text-primary-soft transition">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <span className="mt-3 text-xs font-semibold text-primary-soft">
        Ouvrir l'outil →
      </span>
    </Link>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, ArrowRight } from "lucide-react";

import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
} from "@/lib/schema";
import AmfDisclaimer from "@/components/AmfDisclaimer";
import ProfitLossCalculator from "@/components/outils/ProfitLossCalculator";

/**
 * /outils/profit-loss-calculator — BLOC 4 (2026-05-04).
 *
 * User feedback : "ameliorations possibles dans chaque categorie" - Outils.
 * Mot-cle FR enorme : "calculer plus value crypto", "calculer profit
 * crypto", "PnL crypto calculator". Pas couvert par les outils existants
 * (calculateur-fiscalite est centre fiscalite, pas le PnL brut).
 *
 * Pattern : Server Component pour metadata + JSON-LD + breadcrumb. Le calc
 * lui-meme est un Client Component (ProfitLossCalculator) pour interactivite
 * temps reel sans round-trip serveur.
 *
 * SEO : indexable, hreflang multi-region, JSON-LD WebApplication + FAQ.
 */

export const revalidate = 86400;

const PAGE_PATH = "/outils/profit-loss-calculator";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Calculateur profit/perte crypto : PnL net apres frais et fiscalite";
const DESCRIPTION =
  "Calcule ton profit ou perte crypto en 30 secondes : prix achat, prix vente, montant, frais. Decompose le PnL brut, net apres frais, et apres impot PFU 30% France. Outil gratuit Cryptoreflex.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    // BLOCs 0-7 audit FRONT P0-2 (2026-05-04) — fallback sur OG image global.
    images: [{ url: `${BRAND.url}/opengraph-image`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${BRAND.url}/opengraph-image`],
  },
  keywords: [
    "calculer plus value crypto",
    "calculer profit crypto",
    "PnL crypto",
    "calculateur gain crypto",
    "calcul perte crypto",
    "profit loss calculator FR",
    "PFU crypto",
  ],
  robots: { index: true, follow: true },
};

export default function ProfitLossCalculatorPage() {
  const schemas = graphSchema([
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Calculateur profit/perte", url: PAGE_PATH },
    ]),
    faqSchema([
      {
        question: "Comment calcule-t-on le profit d'une crypto ?",
        answer:
          "Profit brut = (prix_vente - prix_achat) × quantite. Profit net = profit_brut - frais_achat - frais_vente. En France, sur les plus-values realisees (cessions vers fiat ou achat de bien/service), s'applique le PFU (Prelevement Forfaitaire Unique) de 30% : 12.8% impot + 17.2% prelevements sociaux. Donc Net apres impot = Net × 0.7 (si plus-value).",
      },
      {
        question: "Les frais de plateforme (maker, taker, spread) sont-ils deductibles ?",
        answer:
          "Oui. Les frais d'acquisition ET les frais de cession sont deductibles du calcul de plus-value imposable (BOFiP BOI-RPPM-PVBMC-30-30). Inclut : frais maker/taker, spread \"instant buy\", frais retrait fiat, frais reseau (gas) si traceables. Documenter precisement chaque frais (relevé exchange).",
      },
      {
        question: "Pourquoi mon PnL net est-il different du PnL brut affiche par l'exchange ?",
        answer:
          "Les exchanges affichent souvent le PnL BRUT (avant frais) ou le PnL en USD (sans conversion EUR). Notre calcul integre : (1) frais d'achat reels, (2) frais de vente reels, (3) impot estime, (4) conversion en EUR si paire USD. Un PnL brut +1000$ peut devenir +650€ net apres frais et impot (20-35% d'ecart frequent).",
      },
      {
        question: "Cet outil remplace-t-il un comptable / Waltio ?",
        answer:
          "Non. Cet outil est une simulation pedagogique pour UN trade. Pour ta declaration annuelle (formulaire 2086 + 3916-bis), il faut agreger TOUS tes trades + cessions taxables vs non-taxables (token-to-token = non taxable en FR depuis 2019, seuls les flux vers fiat/biens le sont). Utilise notre /outils/cerfa-2086-auto ou un service comme Waltio/Koinly pour l'export.",
      },
      {
        question: "Comment minimiser legalement l'impot sur ma plus-value ?",
        answer:
          "Strategies legales : (1) Etaler les ventes sur plusieurs annees fiscales (utiliser le seuil 305€/an en dessous duquel tu n'es pas imposable), (2) Compenser les plus-values avec les pertes (carry-forward 10 ans), (3) Faire des dons crypto a association reconnue d'utilite publique (deductible 66%), (4) Si tu es en plus-value latente importante, attendre 1 an pour eventuels changements legislatifs. JAMAIS d'optimisation fiscale agressive (\"PEL crypto\", offshore non declare) = risque TRACFIN + redressement.",
      },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="profit-loss-calculator" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/outils" className="hover:text-fg">Outils</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Profit / perte</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
            <Calculator className="h-3.5 w-3.5" />
            Calculateur PnL
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Profit / perte crypto :{" "}
            <span className="gradient-text">calcul net en 30s</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            Renseigne ton prix d&apos;achat, prix de vente, quantite et
            frais. On calcule ton{" "}
            <strong className="text-fg">PnL brut, net apres frais, et apres impot PFU 30%</strong>{" "}
            (France). Pure simulation educative — pas un conseil fiscal.
          </p>
        </header>

        {/* Calculator (client component) */}
        <div className="mt-8">
          <ProfitLossCalculator />
        </div>

        {/* Methodologie */}
        <section className="mt-10 rounded-2xl border border-border bg-elevated/30 p-6">
          <h2 className="text-lg font-bold text-fg">La formule en clair</h2>
          <ol className="mt-3 space-y-2 text-sm text-fg/85 list-decimal pl-5">
            <li>
              <strong className="text-fg">PnL brut</strong> = (prix_vente -
              prix_achat) × quantite
            </li>
            <li>
              <strong className="text-fg">PnL net frais</strong> = PnL brut -
              frais_achat - frais_vente (en valeur absolue selon ton type
              d&apos;ordre : maker/taker/spread)
            </li>
            <li>
              <strong className="text-fg">PnL net apres impot</strong> = si PnL
              net frais &gt; 0 alors × (1 - 0.30), sinon inchange (les pertes
              ne sont pas \"taxables negativement\" mais reportables 10 ans).
            </li>
          </ol>
        </section>

        {/* CTA cross-link outils */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/outils/calculateur-fiscalite"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Outil complementaire
            </div>
            <div className="mt-2 text-base font-bold text-fg flex items-center gap-2">
              Calculateur fiscalite PFU 30%
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="mt-1 text-xs text-muted">
              Detaille tes obligations annuelles complete (cessions, pertes
              reportables, declaration 2086).
            </div>
          </Link>
          <Link
            href="/outils/cerfa-2086-auto"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Outil complementaire
            </div>
            <div className="mt-2 text-base font-bold text-fg flex items-center gap-2">
              Cerfa 2086 + 3916-bis auto
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="mt-1 text-xs text-muted">
              Genere ton PDF declaratif pre-rempli en 30 secondes.
            </div>
          </Link>
        </section>

        {/* Disclaimer */}
        <div className="mt-12">
          <AmfDisclaimer variant="educatif" />
        </div>

        <p className="mt-6 text-[11px] text-muted leading-relaxed">
          Cet outil ne remplace pas un comptable ni un conseiller fiscal. Le
          PFU 30% s&apos;applique sur les{" "}
          <strong className="text-fg">cessions taxables</strong> uniquement
          (vers fiat ou biens/services, pas token-to-token). Pour ta
          declaration annuelle, voir notre{" "}
          <Link
            href="/blog/comment-declarer-crypto-impots-2026-guide-complet"
            className="underline hover:text-fg"
          >
            guide officiel impots crypto 2026
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

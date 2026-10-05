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
import { fitDescription, fitTitle } from "@/lib/seo-text";

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
const TITLE = "Calculateur profit/perte crypto : PnL net après frais et fiscalité";
const DESCRIPTION =
  "Calculez votre profit ou perte crypto en 30 secondes : prix achat, prix vente, montant, frais. Décompose le PnL brut, net après frais, et après impôt PFU 31,4% France. Outil gratuit Cryptoreflex.";

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: fitDescription(DESCRIPTION),
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
          "Profit brut = (prix de vente − prix d'achat) × quantité. Profit net = profit brut − frais d'achat − frais de vente. Côté impôt, l'outil applique une estimation simple : PFU de 31,4 % (12,8 % d'impôt sur le revenu + 18,6 % de prélèvements sociaux) sur le gain net, et rien si vos ventes de l'année ne dépassent pas 305 € nets de frais. Le calcul officiel se fait sur l'ensemble de votre portefeuille (méthode globale, formulaire 2086) : pour vos vrais chiffres, utilisez le générateur 2086.",
      },
      {
        question: "Les frais de plateforme (maker, taker, spread) sont-ils déductibles ?",
        answer:
          "Les frais payés pour la vente (commission de la plateforme, frais de réseau de cette vente) réduisent le prix de cession : c'est écrit dans la notice du formulaire 2086. Pour les frais d'achat, la notice ne les cite pas à la ligne 220 ; les compter dans le prix acquitté est la lecture la plus courante. Les frais de retrait vers votre banque et le gas de vos transferts ou swaps ne sont pas déductibles. Gardez le relevé de chaque frais.",
      },
      {
        question: "Pourquoi mon résultat net est-il différent de celui affiché par la plateforme ?",
        answer:
          "Les plateformes affichent souvent un résultat BRUT (avant frais), parfois en dollars. Notre calcul intègre les frais d'achat et de vente réels et une estimation de l'impôt, en euros. Un gain brut de 1 000 $ peut ainsi devenir environ 650 € nets après frais et impôt.",
      },
      {
        question: "Cet outil remplace-t-il un comptable ou Waltio ?",
        answer:
          "Non. C'est une simulation pédagogique pour UNE opération. Pour votre déclaration annuelle (formulaire 2086 et 3916-bis), il faut reprendre toutes vos ventes contre des euros ou des biens et services ; les échanges entre cryptos ne sont pas imposables depuis 2019. Utilisez notre générateur 2086 ou un service comme Waltio ou Koinly.",
      },
      {
        question: "Comment réduire légalement l'impôt sur ma plus-value ?",
        answer:
          "Trois leviers légaux : (1) le seuil de 305 € : si le total de vos ventes de l'année, nettes de frais, ne dépasse pas 305 €, aucun impôt n'est dû ; (2) les moins-values de l'année compensent les plus-values de la même année, sans report sur les années suivantes ; attention, avec la méthode globale, une vente ne crée une moins-value que si tout votre portefeuille vaut moins que ce qu'il vous a coûté ; (3) l'option pour le barème progressif (case 3CN), intéressante si votre taux marginal d'imposition est de 0 ou 11 %. Jamais de montage agressif ni de compte étranger non déclaré : amende et redressement à la clé.",
      },
    ]),
  ]);

  return (
    <article className="py-10 sm:py-14">
      <StructuredData data={schemas} id="profit-loss-calculator" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
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
            Renseignez votre prix d&apos;achat, prix de vente, quantité et
            frais. On calcule votre{" "}
            <strong className="text-fg">résultat brut, net de frais et après impôt (PFU 31,4 %)</strong>.
            Simulation pédagogique, pas un conseil fiscal.
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
              <strong className="text-fg">Résultat brut</strong> = (prix de vente −
              prix d&apos;achat) × quantité
            </li>
            <li>
              <strong className="text-fg">Résultat net de frais</strong> = résultat brut −
              frais d&apos;achat − frais de vente (maker, taker ou spread selon votre
              type d&apos;ordre)
            </li>
            <li>
              <strong className="text-fg">Résultat après impôt</strong> = résultat net
              × (1 − 0,314) s&apos;il est positif et si la vente dépasse 305 € nets de
              frais ; sinon inchangé. Une perte ne compense que des plus-values crypto
              de la même année, sans report (art. 150 VH bis du CGI). Estimation sur une
              opération isolée : le calcul officiel porte sur tout le portefeuille.
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
              Outil complémentaire
            </div>
            <div className="mt-2 text-base font-bold text-fg flex items-center gap-2">
              Calculateur de fiscalité (PFU 31,4 %)
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="mt-1 text-xs text-muted">
              Estimez l&apos;impôt de l&apos;année et voyez quoi déclarer (cessions,
              moins-values, formulaire 2086).
            </div>
          </Link>
          <Link
            href="/outils/cerfa-2086-auto"
            className="rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Outil complémentaire
            </div>
            <div className="mt-2 text-base font-bold text-fg flex items-center gap-2">
              Cerfa 2086 + 3916-bis auto
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="mt-1 text-xs text-muted">
              Préparez le récapitulatif de votre formulaire 2086, ligne par ligne.
            </div>
          </Link>
        </section>

        {/* Disclaimer */}
        <div className="mt-12">
          <AmfDisclaimer variant="educatif" />
        </div>

        <p className="mt-6 text-[11px] text-muted leading-relaxed">
          Cet outil ne remplace pas un comptable ni un conseiller fiscal. Le
          PFU de 31,4 % s&apos;applique aux{" "}
          <strong className="text-fg">cessions imposables</strong> uniquement
          (ventes contre des euros ou des biens et services, pas les échanges entre
          cryptos). Pour votre déclaration annuelle, voir notre{" "}
          <Link
            href="/blog/comment-declarer-crypto-impots-2026-guide-complet"
            className="underline hover:text-fg"
          >
            guide de déclaration crypto 2026
          </Link>
          .
        </p>
      </div>
    </article>
  );
}

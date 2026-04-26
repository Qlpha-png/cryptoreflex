import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Receipt,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { generateWebApplicationSchema } from "@/lib/schema-tools";
import { BRAND } from "@/lib/brand";
import RelatedPagesNav from "@/components/RelatedPagesNav";

/* ISR : recalcul tous les 24 h (la page est essentiellement statique). */
export const revalidate = 86400;

/* Lazy-load Client Component (state + recalcul on input). */
const CalculateurROIClient = dynamic(
  () => import("@/components/CalculateurROI"),
  {
    loading: () => (
      <div
        className="h-[600px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du calculateur"
      />
    ),
    ssr: false,
  }
);

/* -------------------------------------------------------------------------- */
/*  SEO meta                                                                   */
/* -------------------------------------------------------------------------- */
const PAGE_TITLE =
  "Calculateur ROI crypto gratuit — plus-value & impôts (PFU 30 %)";
const PAGE_DESCRIPTION =
  "Calcule ton ROI crypto + plus-value nette + impôt français estimé en 5 secondes. Frais d'achat/vente inclus, PFU 30 %, seuil 305 €. 100 % gratuit, sans inscription.";
const PAGE_PATH = "/outils/calculateur-roi-crypto";
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
/*  FAQ — 5 questions, JSON-LD FAQPage                                         */
/* -------------------------------------------------------------------------- */
const FAQ_ITEMS = [
  {
    question: "Comment calcule-t-on le ROI d'un investissement crypto ?",
    answer:
      "Le ROI (Return On Investment) se calcule en divisant la plus-value nette par le capital initialement investi, multiplié par 100 pour obtenir un pourcentage. Formule : ROI % = (Valeur finale - Capital initial - Frais) / Capital initial × 100. Notre calculateur intègre les frais d'achat ET de vente pour un résultat net réaliste.",
  },
  {
    question: "Quel impôt est appliqué sur les plus-values crypto en France ?",
    answer:
      "Par défaut, les particuliers en gestion non professionnelle sont soumis au Prélèvement Forfaitaire Unique (PFU) de 30 % : 12,8 % d'impôt sur le revenu + 17,2 % de prélèvements sociaux. L'option pour le barème progressif reste possible et peut être plus avantageuse si la TMI est de 0 ou 11 %. Notre outil affiche l'estimation PFU par défaut.",
  },
  {
    question: "À partir de quel montant les plus-values crypto sont-elles imposables ?",
    answer:
      "Le seuil annuel d'exonération est de 305 € de cessions totales (vers euros ou stablecoins). En-dessous, aucune imposition. Au-delà, tu dois déclarer la plus-value nette globale via le formulaire 2086, et reporter sur le 2042. Notre calculateur affiche 0 € d'impôt en-dessous de ce seuil pour refléter cette règle.",
  },
  {
    question: "Faut-il déclarer même si on n'a pas vendu en euros ?",
    answer:
      "Oui. Les conversions crypto-vers-stablecoin (USDC, USDT, DAI) sont assimilées à des cessions taxables par l'administration fiscale française. En revanche, les conversions crypto-vers-crypto pures sont exonérées tant qu'on ne touche pas à un stablecoin ou à un FIAT. Pour un calcul exhaustif, utilise notre calculateur fiscalité complet.",
  },
  {
    question: "Cet outil est-il fiable pour préparer ma déclaration ?",
    answer:
      "Le calculateur ROI est conçu pour visualiser rapidement une opération unique. Pour une déclaration fiscale officielle, tu dois agréger l'ensemble de tes cessions de l'année, calculer le prix moyen pondéré d'acquisition (PMPA) et remplir le Cerfa 2086. Notre outil dédié /outils/calculateur-fiscalite gère cette complexité, ou consulte un expert-comptable spécialisé crypto.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */
export default function CalculateurROIPage() {
  const schemas: JsonLd[] = [
    breadcrumbSchema([
      { name: "Accueil", url: "/" },
      { name: "Outils", url: "/outils" },
      { name: "Calculateur ROI crypto", url: PAGE_PATH },
    ]),
    generateWebApplicationSchema({
      slug: "calculateur-roi-crypto",
      name: "Calculateur ROI crypto Cryptoreflex",
      description: PAGE_DESCRIPTION,
      featureList: [
        "Calcul ROI net en pourcentage",
        "Plus-value brute et nette en euros",
        "Frais d'achat et de vente personnalisables",
        "Estimation impôt français PFU 30 %",
        "Seuil d'exonération 305 €",
        "Copier les résultats en un clic",
      ],
      keywords: [
        "calculateur ROI crypto",
        "plus-value crypto",
        "PFU 30",
        "impôt crypto France",
      ],
    }),
    faqSchema(FAQ_ITEMS),
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
              <Calculator className="h-3.5 w-3.5" />
              100 % gratuit, sans inscription
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-fg">
              <span className="gradient-text">Calculateur ROI crypto</span>
              <br />
              gratuit (PFU 30 %)
            </h1>
            <p className="mt-4 text-lg text-muted leading-relaxed">
              Calcule ton ROI net, ta plus-value et l'impôt français estimé en
              5 secondes. Frais d'achat et de vente personnalisables. Résultat
              instantané, conforme PFU 2026.
            </p>
          </div>

          {/* Outil principal */}
          <div className="mt-10">
            <CalculateurROIClient />
          </div>

          {/* Section pédagogique : "Comment calculer son ROI" */}
          <section className="mt-16 space-y-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-fg">
              Comment calculer son ROI crypto
            </h2>

            <div className="grid md:grid-cols-3 gap-5">
              <PedagogyCard
                Icon={Calculator}
                title="1. La formule du ROI"
                body={
                  <>
                    <p className="text-sm text-muted leading-relaxed">
                      Le ROI (Return On Investment) mesure la performance
                      d'un placement.
                    </p>
                    <p className="mt-3 text-sm font-semibold text-fg bg-elevated rounded-xl px-3 py-2 font-mono tabular-nums text-center">
                      ROI = (Valeur - Coût) / Coût × 100
                    </p>
                    <p className="mt-3 text-sm text-muted leading-relaxed">
                      Notre calculateur applique la formule sur la valeur{" "}
                      <em>nette</em> : on déduit les frais d'achat et de
                      vente avant le ratio.
                    </p>
                  </>
                }
              />
              <PedagogyCard
                Icon={Receipt}
                title="2. La fiscalité PFU 30 %"
                body={
                  <>
                    <p className="text-sm text-muted leading-relaxed">
                      En France, les plus-values crypto d'un particulier sont
                      taxées à 30 % flat (PFU) :
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted">
                      <li>• 12,8 % d'impôt sur le revenu</li>
                      <li>• 17,2 % de prélèvements sociaux</li>
                    </ul>
                    <p className="mt-3 text-sm text-muted leading-relaxed">
                      Exonération si total des cessions annuelles ≤ 305 €.
                      Option barème progressif possible.
                    </p>
                  </>
                }
              />
              <PedagogyCard
                Icon={TrendingUp}
                title="3. Exemples concrets"
                body={
                  <>
                    <p className="text-sm text-muted leading-relaxed">
                      Achat 5 BTC à 100 €, vente à 200 €, frais 0,5 % :
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted tabular-nums">
                      <li>• Investi : 500 €</li>
                      <li>• Valeur finale : 1 000 €</li>
                      <li>• Frais : 7,50 €</li>
                      <li>• Plus-value nette : 492,50 €</li>
                      <li>• ROI : 98,50 %</li>
                      <li className="text-warning-fg font-semibold">
                        • Impôt PFU : 147,75 €
                      </li>
                    </ul>
                  </>
                }
              />
            </div>
          </section>

          {/* CTA fiscalité */}
          <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary-soft border border-primary/30 shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-fg">
                  Tu vas vraiment déclarer ?
                </h2>
                <p className="mt-2 text-sm text-muted leading-relaxed">
                  Pour la déclaration officielle, il faut agréger toutes tes
                  cessions de l'année et calculer le prix moyen pondéré
                  d'acquisition (PMPA). Notre calculateur fiscalité complet
                  gère le PFU, le barème progressif, le BIC, et exporte un
                  Cerfa 2086 prêt à joindre.
                </p>
                <Link
                  href="/outils/calculateur-fiscalite"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary text-background hover:bg-primary-glow px-4 py-2 text-sm font-bold transition"
                >
                  Calculateur fiscalité complet
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <section className="mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-fg">
              Questions fréquentes
            </h2>
            <div className="mt-6 space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-border bg-surface p-5 open:border-primary/40 transition"
                >
                  <summary className="cursor-pointer text-base font-semibold text-fg list-none flex items-start justify-between gap-4">
                    <span>{item.question}</span>
                    <span
                      aria-hidden="true"
                      className="text-primary-soft transition group-open:rotate-45 text-2xl leading-none mt-[-2px]"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-muted leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* YMYL */}
          <p className="mt-12 text-xs text-muted leading-relaxed">
            <strong className="text-fg">Avertissement :</strong> ce calculateur
            est à but pédagogique et ne constitue pas un conseil fiscal ou en
            investissement. Le PFU à 30 % s'applique aux particuliers en
            gestion non professionnelle ; les situations BIC pro, les
            moins-values reportables et les régimes spécifiques (staking, NFT,
            DeFi) ne sont pas couverts par cet outil. Consultez un
            expert-comptable agréé crypto-actifs pour toute déclaration
            officielle.
          </p>

          {/* Maillage interne — graphe sémantique cross-clusters */}
          <RelatedPagesNav
            currentPath="/outils/calculateur-roi-crypto"
            limit={4}
            variant="default"
          />
        </div>
      </section>
    </>
  );
}

/* ----------------------------- PedagogyCard ----------------------------- */
interface PedagogyCardProps {
  Icon: typeof Calculator;
  title: string;
  body: React.ReactNode;
}
function PedagogyCard({ Icon, title, body }: PedagogyCardProps) {
  return (
    <article className="glass rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary-soft border border-primary/30">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-bold text-fg">{title}</h3>
      </div>
      <div className="flex-1">{body}</div>
    </article>
  );
}

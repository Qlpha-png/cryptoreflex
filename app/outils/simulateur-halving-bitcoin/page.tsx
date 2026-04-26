import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Calendar, TrendingUp, BookOpen, ArrowRight } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import { generateWebApplicationSchema } from "@/lib/schema-tools";
import RelatedPagesNav from "@/components/RelatedPagesNav";

const SimulateurHalvingBitcoin = dynamic(
  () => import("@/components/SimulateurHalvingBitcoin"),
  {
    loading: () => (
      <div
        className="h-[700px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du simulateur halving Bitcoin"
      />
    ),
    ssr: false,
  },
);

export const metadata: Metadata = {
  title: "Simulateur halving Bitcoin 2028 — projection DCA jusqu'en 2036",
  description:
    "Simule ton DCA Bitcoin jusqu'aux halvings 2028, 2032, 2036. 3 scénarios (conservateur, moyen, bullish), graphique recharts, basé sur les cycles historiques BTC.",
  alternates: { canonical: "https://cryptoreflex.fr/outils/simulateur-halving-bitcoin" },
  openGraph: {
    title: "Simulateur halving Bitcoin 2028 — projection DCA",
    description:
      "Combien vaudra ton DCA Bitcoin après les prochains halvings ? 3 scénarios sourcés sur les cycles passés.",
    url: "https://cryptoreflex.fr/outils/simulateur-halving-bitcoin",
    type: "website",
  },
};

const FAQ_ITEMS = [
  {
    question: "C'est quoi un halving Bitcoin ?",
    answer:
      "Le halving (ou halvening) est un événement codé dans le protocole Bitcoin qui divise par deux la récompense des mineurs tous les 210 000 blocs (~ 4 ans). En 2024, la récompense est passée de 6,25 BTC à 3,125 BTC par bloc. Le prochain halving aura lieu en avril 2028 (récompense → 1,5625 BTC). Effet attendu : raréfaction de l'offre, donc pression haussière historiquement observée.",
  },
  {
    question: "Quand auront lieu les prochains halvings ?",
    answer:
      "Les dates futures sont estimées (le bloc 1 050 000 sera atteint vers avril 2028). Halving 5 : avril 2028 (1,5625 BTC). Halving 6 : avril 2032 (0,78125 BTC). Halving 7 : avril 2036 (0,390625 BTC). Le dernier Bitcoin sera miné vers 2140.",
  },
  {
    question: "Les cycles 4 ans vont-ils continuer ?",
    answer:
      "Personne ne peut le garantir. Les cycles passés (2012, 2016, 2020, 2024) ont tous montré un ATH ~ 12 à 18 mois après le halving, avec un facteur multiplicatif décroissant à mesure que la capitalisation monte (x80 → x20 → x7 → x1.7). Notre simulateur propose 3 scénarios — du plus conservateur au plus bullish — mais aucun n'est une promesse.",
  },
  {
    question: "Quel est le meilleur moment pour faire du DCA Bitcoin ?",
    answer:
      "Le DCA neutralise la question du timing. Statistiquement, les meilleurs ROI long terme sont obtenus en démarrant le DCA après un halving et en continuant pendant tout le cycle (4 ans). Si tu attends le prochain ATH, tu rates les achats les moins chers du cycle.",
  },
  {
    question: "Sur quelle plateforme automatiser un DCA Bitcoin en France ?",
    answer:
      "Bitstack est la référence francophone pour le DCA Bitcoin (achats automatiques dès 1 €/jour, conforme MiCA). Bitpanda et Coinbase proposent aussi des achats récurrents. Sur Binance, tu peux programmer un Auto-Invest. Notre comparatif détaillé : /comparatif.",
  },
];

export default function SimulateurHalvingBitcoinPage() {
  return (
    <>
      <StructuredData
        data={graphSchema([
          generateWebApplicationSchema({
            slug: "simulateur-halving-bitcoin",
            name: "Simulateur halving Bitcoin Cryptoreflex",
            description:
              "Simulateur de DCA Bitcoin projeté sur les 3 prochains halvings (2028, 2032, 2036) avec 3 scénarios.",
            featureList: [
              "Projection sur 3 halvings futurs (2028, 2032, 2036)",
              "3 scénarios : conservateur, moyen, bullish",
              "Graphique recharts interactif",
              "DCA mensuel ou hebdomadaire",
              "Basé sur les cycles historiques BTC",
              "Aucune inscription requise",
            ],
            keywords: [
              "halving bitcoin 2028",
              "simulateur halving",
              "DCA bitcoin",
              "projection bitcoin 2032",
              "cycle bitcoin 4 ans",
            ],
          }),
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Outils", url: "/outils" },
            { name: "Simulateur halving Bitcoin", url: "/outils/simulateur-halving-bitcoin" },
          ]),
          faqSchema(FAQ_ITEMS),
        ])}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
              <Calendar className="h-3.5 w-3.5" />
              Prochains halvings : 2028, 2032, 2036
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Simulateur <span className="gradient-text">halving Bitcoin 2028</span>
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Combien vaudra ton DCA Bitcoin après les 3 prochains halvings (2028,
              2032, 2036) ? Projection en 3 scénarios — basée sur les cycles passés,
              pas une promesse de rendement.
            </p>
          </div>

          <div className="mt-10">
            <SimulateurHalvingBitcoin />
          </div>

          <div className="mt-16 grid lg:grid-cols-3 gap-6">
            <h2 className="lg:col-span-3 text-2xl sm:text-3xl font-bold text-white">
              Pourquoi anticiper le halving ?
            </h2>
            <Card
              icon={<Calendar className="h-6 w-6" />}
              title="Événement programmé"
              text="Tous les ~ 4 ans, l'offre de Bitcoin se contracte. C'est mathématique, codé dans le protocole."
            />
            <Card
              icon={<TrendingUp className="h-6 w-6" />}
              title="Cycles historiques"
              text="Les 4 cycles passés ont tous vu un ATH 12 à 18 mois après le halving. Pas garanti, mais documenté."
            />
            <Card
              icon={<BookOpen className="h-6 w-6" />}
              title="Stratégie DCA"
              text="Lisse ton entrée sur tout le cycle plutôt que de timer un point d'entrée. Minimise les regrets."
            />
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-elevated/50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">
                  Page dédiée : tout savoir sur le halving Bitcoin
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  Histoire des halvings, mécanisme on-chain, impact sur le prix,
                  stratégies des investisseurs long terme.
                </p>
                <Link
                  href="/halving-bitcoin"
                  className="mt-3 inline-flex items-center gap-1 text-primary-soft hover:text-primary-glow text-sm font-semibold"
                >
                  Lire la page halving complète
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Questions fréquentes
            </h2>
            <div className="mt-6 space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-xl border border-border bg-elevated/40 p-5 open:border-primary/40"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-white">
                    {item.question}
                    <span className="text-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-white/70 leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <RelatedPagesNav
            currentPath="/outils/simulateur-halving-bitcoin"
            limit={4}
            variant="default"
          />
        </div>
      </section>
    </>
  );
}

function Card({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
        {icon}
      </div>
      <h3 className="mt-4 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">{text}</p>
    </div>
  );
}

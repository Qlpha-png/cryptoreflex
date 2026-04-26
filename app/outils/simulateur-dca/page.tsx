import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, ShieldCheck, Zap, ArrowRight, BookOpen } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy-load DcaSimulator : Client lourd (chart Recharts + fetch historique
// CoinGecko + recalcul on input change). Below-the-fold sous Hero. Audit
// Perf 26-04 : différer le bundle (~10 KB) accélère LCP.
const DcaSimulator = dynamic(() => import("@/components/DcaSimulator"), {
  loading: () => (
    <div
      className="h-[600px] animate-pulse rounded-2xl bg-elevated/40"
      aria-label="Chargement du simulateur DCA"
    />
  ),
  ssr: false,
});
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import { generateWebApplicationSchema } from "@/lib/schema-tools";
import { getPlatformById } from "@/lib/platforms";
import RelatedPagesNav from "@/components/RelatedPagesNav";

export const metadata: Metadata = {
  title: "Simulateur DCA crypto gratuit — backtest 5 ans (BTC, ETH, SOL)",
  description:
    "Calcule la performance d'un Dollar Cost Averaging sur Bitcoin, Ethereum ou Solana. Backtest réel sur 5 ans, comparaison avec un achat unique, prix moyen d'achat et ROI.",
  alternates: { canonical: "https://www.cryptoreflex.fr/outils/simulateur-dca" },
  openGraph: {
    title: "Simulateur DCA crypto — backtest 5 ans gratuit",
    description:
      "Investis un montant fixe chaque mois en BTC, ETH ou SOL et visualise la performance réelle sur 1 à 5 ans.",
    url: "https://www.cryptoreflex.fr/outils/simulateur-dca",
    type: "website",
  },
};

const FAQ_ITEMS = [
  {
    question: "Qu'est-ce que le DCA (Dollar Cost Averaging) ?",
    answer:
      "Le DCA consiste à investir un montant fixe à intervalles réguliers (chaque mois en général), peu importe le prix de la crypto. L'objectif : lisser la volatilité et éviter de tout acheter au plus haut. C'est la stratégie la plus utilisée par les investisseurs long terme sur Bitcoin et Ethereum.",
  },
  {
    question: "Le DCA est-il vraiment plus performant qu'un achat unique ?",
    answer:
      "Pas toujours. Statistiquement, sur les marchés haussiers de long terme (comme le Bitcoin entre 2020 et 2024), un achat unique au début surperforme souvent le DCA. En revanche, le DCA réduit drastiquement le risque de timing — tu évites d'acheter juste avant un krach. C'est un trade-off entre performance maximale et tranquillité d'esprit.",
  },
  {
    question: "Sur quelles données est basé ce simulateur ?",
    answer:
      "Les prix historiques proviennent de l'API publique CoinGecko (clôtures quotidiennes en EUR), couvrant jusqu'à 5 ans glissants. Les frais de transaction sont volontairement exclus du calcul (ils représentent 0,5 à 1 % chez la plupart des plateformes). Pour un calcul plus fin, ajoute ces frais à ton prix moyen.",
  },
  {
    question: "Quelle plateforme propose du DCA automatique en France ?",
    answer:
      "Bitstack est la référence francophone pour le DCA Bitcoin (achats automatiques dès 1 €/jour, conforme MiCA). Coinbase et Bitpanda proposent aussi des achats récurrents sur Ethereum et Solana. Sur la plupart des grandes plateformes, tu peux programmer un virement SEPA mensuel et un ordre d'achat automatique.",
  },
  {
    question: "Quel montant DCA pour débuter ?",
    answer:
      "Il n'y a pas de minimum universel, mais la règle est simple : ne jamais investir plus que ce que tu peux te permettre de perdre. Beaucoup d'investisseurs commencent à 50-100 € par mois sur Bitcoin uniquement, puis diversifient progressivement. L'important est la régularité, pas le montant.",
  },
  {
    question: "Combien de temps faut-il faire du DCA ?",
    answer:
      "Le DCA crypto donne ses meilleurs résultats sur des cycles de marché complets (3 à 5 ans minimum), car le marché crypto suit des cycles d'environ 4 ans liés au halving Bitcoin. Investir en DCA pendant 6 mois puis arrêter expose au risque de timing — l'inverse de l'objectif.",
  },
];

export default function SimulateurDcaPage() {
  const bitstack = getPlatformById("bitstack");

  return (
    <>
      <StructuredData
        data={graphSchema([
          generateWebApplicationSchema({
            slug: "simulateur-dca",
            name: "Simulateur DCA crypto Cryptoreflex",
            description:
              "Simulateur DCA backtest réel BTC/ETH/SOL sur 5 ans glissants — données CoinGecko, comparaison vs achat unique.",
            featureList: [
              "Backtest historique sur 1 à 5 ans (CoinGecko)",
              "Bitcoin, Ethereum et Solana supportés",
              "Comparaison DCA vs achat unique (lump sum)",
              "Calcul prix moyen pondéré d'acquisition",
              "Visualisation graphique de la performance",
              "Aucune inscription requise",
            ],
            keywords: [
              "simulateur DCA",
              "Dollar Cost Averaging",
              "backtest Bitcoin",
              "DCA Ethereum",
              "DCA Solana",
            ],
          }),
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Outils", url: "/outils" },
            { name: "Simulateur DCA", url: "/outils/simulateur-dca" },
          ]),
          faqSchema(FAQ_ITEMS),
        ])}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
              <TrendingUp className="h-3.5 w-3.5" />
              Backtest réel — données CoinGecko
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Simulateur <span className="gradient-text">DCA crypto</span>
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Combien aurais-tu aujourd'hui en investissant 100 € par mois en Bitcoin
              depuis 3 ans ? Réponse en 2 secondes — données réelles, pas de
              projection magique.
            </p>
          </div>

          {/* Composant */}
          <div className="mt-10">
            <DcaSimulator />
          </div>

          {/* Pourquoi le DCA */}
          <div className="mt-16 grid lg:grid-cols-3 gap-6">
            <h2 className="lg:col-span-3 text-2xl sm:text-3xl font-bold text-white">
              Pourquoi le DCA ?
            </h2>
            <Card
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Lisser la volatilité"
              text="En achetant un peu chaque mois, tu obtiens un prix moyen — fini le stress d'acheter pile au plus haut ou de rater le bas."
            />
            <Card
              icon={<Zap className="h-6 w-6" />}
              title="Discipline automatique"
              text="Plus besoin de timer le marché. Tu programmes ton ordre une fois et le DCA tourne tout seul, en haussier comme en baissier."
            />
            <Card
              icon={<TrendingUp className="h-6 w-6" />}
              title="Adapté aux cycles crypto"
              text="Le marché crypto suit des cycles de 4 ans (halving BTC). Le DCA capture ces cycles sans avoir à les prédire."
            />
          </div>

          {/* Lien article DCA */}
          <div className="mt-12 rounded-2xl border border-border bg-elevated/50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">
                  Guide complet : le DCA crypto pour débutants
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  Comment mettre en place un DCA automatique, choisir la bonne
                  plateforme, gérer la fiscalité — tout ce qu'il faut savoir avant
                  de démarrer.
                </p>
                <Link
                  href="/blog"
                  className="mt-3 inline-flex items-center gap-1 text-primary-soft hover:text-primary-glow text-sm font-semibold"
                >
                  Lire le guide DCA débutants
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* CTA Bitstack */}
          {bitstack && (
            <div className="mt-8 glass glow-border rounded-2xl p-6 sm:p-8">
              <div className="grid sm:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <span className="badge-info">Notre choix DCA</span>
                  <h3 className="mt-3 font-bold text-white text-xl">
                    Bitstack — leader du DCA Bitcoin en France
                  </h3>
                  <p className="mt-2 text-sm text-white/70">
                    Achats automatiques dès 1 €/jour, application mobile
                    française, conforme MiCA. La référence pour démarrer un
                    DCA Bitcoin sans se prendre la tête.
                  </p>
                </div>
                <a
                  href={bitstack.affiliateUrl}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="btn-primary whitespace-nowrap"
                >
                  Démarrer mon DCA
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-3 text-xs text-muted">
                Lien affilié — Cryptoreflex peut percevoir une commission, sans
                surcoût pour toi. Notre comparatif reste indépendant.
              </p>
            </div>
          )}

          {/* FAQ */}
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

          {/* Maillage interne — graphe sémantique cross-clusters */}
          <RelatedPagesNav
            currentPath="/outils/simulateur-dca"
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

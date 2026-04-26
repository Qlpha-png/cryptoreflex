import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { GitCompare, ShieldCheck, Sparkles, ArrowRight, BookOpen } from "lucide-react";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema, faqSchema, graphSchema } from "@/lib/schema";
import { generateWebApplicationSchema } from "@/lib/schema-tools";
import RelatedPagesNav from "@/components/RelatedPagesNav";

const ComparateurPersonnalise = dynamic(
  () => import("@/components/ComparateurPersonnalise"),
  {
    loading: () => (
      <div
        className="h-[420px] animate-pulse rounded-2xl bg-elevated/40"
        aria-label="Chargement du comparateur personnalisé"
      />
    ),
    ssr: false,
  },
);

export const metadata: Metadata = {
  title: "Quelle plateforme crypto choisir 2026 ? Quiz personnalisé en 60 sec",
  description:
    "Réponds à 5 questions et reçois ton top 3 personnalisé parmi Bitstack, Bitpanda, Binance, Coinbase, Kraken, SwissBorg. Score sur prix, UX, sécurité — basé sur ton profil.",
  alternates: { canonical: "https://cryptoreflex.fr/outils/comparateur-personnalise" },
  openGraph: {
    title: "Quelle plateforme crypto choisir ? Quiz personnalisé 2026",
    description:
      "5 questions, ton top 3 personnalisé. Compare prix, UX, sécurité selon TON profil — pas un comparatif générique.",
    url: "https://cryptoreflex.fr/outils/comparateur-personnalise",
    type: "website",
  },
};

const FAQ_ITEMS = [
  {
    question: "Comment fonctionne le scoring personnalisé ?",
    answer:
      "Chaque plateforme reçoit une note de 1 à 10 sur 9 axes (prix, UX, sécurité, DCA, swing, hold, day trading, débutant, avancé). Tes 5 réponses pondèrent ces axes : ta priorité numéro 1 reçoit un boost x2, ton intent (DCA / hold / trading) sélectionne l'axe d'usage, ton volume mensuel ajoute un bonus pour les plateformes adaptées (frais bas si > 500 €, micro-DCA si < 50 €). Le score final 0-100 reflète l'adéquation avec TON profil.",
  },
  {
    question: "Pourquoi ces 6 plateformes et pas 50 ?",
    answer:
      "On affiche uniquement les plateformes que Cryptoreflex a auditées en profondeur (audit interne Q1 2026) ET avec lesquelles on a un partenariat actif (transparence : on touche une commission). Si on listait 50 plateformes, la qualité du scoring chuterait — la plupart des comparateurs grand public le font et finissent par recommander n'importe quoi.",
  },
  {
    question: "Pourquoi une plateforme étrangère apparaît dans mes résultats ?",
    answer:
      "Toutes les plateformes recommandées sont conformes MiCA et accessibles aux résidents français (vérifié dans notre /verificateur-mica). Binance et Kraken sont enregistrés ailleurs en UE, pas en France, mais opèrent légalement chez nous via le passeport européen MiCA depuis janvier 2025.",
  },
  {
    question: "Mes réponses sont-elles enregistrées ?",
    answer:
      "Non. Tout le calcul tourne dans ton navigateur (zéro serveur). On envoie uniquement à Plausible (analytics anonymisé, RGPD-friendly) la priorité et l'intent que tu as choisis pour mesurer la popularité du quiz — jamais ton montant ni ton email. Si tu utilises l'option « recevoir mon récap par email », tu nous donnes alors ton email volontairement.",
  },
  {
    question: "À quelle fréquence les notes sont-elles mises à jour ?",
    answer:
      "Une fois par trimestre. À chaque audit interne, on revoit les notes prix/UX/sécurité de chaque plateforme. Date du dernier update : Q1 2026. Si une plateforme change drastiquement (nouveau pricing, faille de sécurité, perte de l'agrément MiCA), on met à jour en cours de trimestre.",
  },
];

export default function ComparateurPersonnalisePage() {
  return (
    <>
      <StructuredData
        data={graphSchema([
          generateWebApplicationSchema({
            slug: "comparateur-personnalise",
            name: "Comparateur plateformes crypto personnalisé Cryptoreflex",
            description:
              "Quiz interactif 5 questions qui recommande les 3 meilleures plateformes crypto selon ton profil (montant, expérience, priorité prix/UX/sécurité, intent DCA/hold/trading).",
            featureList: [
              "5 questions, résultat en 60 secondes",
              "Score personnalisé sur 9 axes par plateforme",
              "6 plateformes auditées Q1 2026",
              "Reco affiliée transparente (loi Influenceurs)",
              "Aucune donnée stockée, calcul navigateur",
              "Lead capture optionnel (récap par email)",
            ],
            keywords: [
              "quelle plateforme crypto choisir",
              "comparateur crypto personnalisé",
              "quiz exchange crypto",
              "meilleure plateforme crypto 2026",
              "bitstack vs binance vs coinbase",
            ],
          }),
          breadcrumbSchema([
            { name: "Accueil", url: "/" },
            { name: "Outils", url: "/outils" },
            { name: "Comparateur personnalisé", url: "/outils/comparateur-personnalise" },
          ]),
          faqSchema(FAQ_ITEMS),
        ])}
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
              <Sparkles className="h-3.5 w-3.5" />
              5 questions, 60 secondes
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Quelle <span className="gradient-text">plateforme crypto</span> choisir en 2026 ?
            </h1>
            <p className="mt-4 text-lg text-white/70">
              Quiz personnalisé : 5 questions sur ton profil, et on te sort
              les 3 plateformes les plus adaptées (parmi Bitstack, Bitpanda, Binance,
              Coinbase, Kraken, SwissBorg). Pas un comparatif générique — UN scoring
              calé sur TES réponses.
            </p>
          </div>

          <div className="mt-10 max-w-3xl">
            <ComparateurPersonnalise />
          </div>

          <div className="mt-16 grid lg:grid-cols-3 gap-6">
            <h2 className="lg:col-span-3 text-2xl sm:text-3xl font-bold text-white">
              Pourquoi un comparateur personnalisé ?
            </h2>
            <Card
              icon={<Sparkles className="h-6 w-6" />}
              title="TON profil compte"
              text="Un débutant qui veut DCA 50 €/mois et un trader actif qui swing 2 000 €/mois ont besoin de 2 plateformes radicalement différentes."
            />
            <Card
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Audit Q1 2026"
              text="Notes par axe revues chaque trimestre — pas un classement figé qui se traîne depuis 2022."
            />
            <Card
              icon={<GitCompare className="h-6 w-6" />}
              title="Transparence totale"
              text="On affiche le score sur prix, UX et sécurité — tu peux déconstruire la reco si tu n'es pas d'accord."
            />
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-elevated/50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">
                  Comparatif détaillé toutes plateformes
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  Tableau side-by-side avec frais, MiCA, support FR, sécurité —
                  pour aller plus loin que le top 3 personnalisé.
                </p>
                <Link
                  href="/comparatif"
                  className="mt-3 inline-flex items-center gap-1 text-primary-soft hover:text-primary-glow text-sm font-semibold"
                >
                  Voir le comparatif complet
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
            currentPath="/outils/comparateur-personnalise"
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

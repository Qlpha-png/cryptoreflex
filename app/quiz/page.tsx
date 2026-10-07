import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Building2,
  Coins,
  Compass,
  CheckCircle2,
} from "lucide-react";

import { BRAND, STATS } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import { fitDescription } from "@/lib/seo-text";

/**
 * /quiz — Hub Quiz (P0-5 audit-back-live-final).
 *
 * Server Component statique. Deux quiz interactifs (Plateforme, Crypto)
 * vivent sur des routes dédiées — on les regroupe ici dans une page-mère
 * pour donner une porte d'entrée SEO ("quiz crypto") et un parcours UX
 * cohérent ("Quiz" devient une section, pas deux URLs orphelines).
 */

export const revalidate = 86400;

const PAGE_PATH = "/quiz";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Questionnaires crypto : plateforme idéale";
const DESCRIPTION =
  // 06/10/2026 : plus de « recommandation » ni de « quelle crypto pour votre premier achat » ; le quiz crypto a 6 questions (pas 5).
  "Deux questionnaires courts et neutres pour démarrer dans la crypto : quelles plateformes correspondent à votre usage (6 questions) et quels types de projets crypto découvrir en premier (6 questions). Outils pédagogiques, pas un conseil d'investissement.";

export const metadata: Metadata = {
  title: TITLE,
  description: fitDescription(DESCRIPTION),
  alternates: withHreflang(PAGE_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  keywords: [
    "quiz crypto",
    "quiz plateforme crypto",
    "découvrir les projets crypto",
    "quel exchange crypto choisir",
    "test crypto débutant",
  ],
};

interface QuizCard {
  href: string;
  title: string;
  description: string;
  questionCount: string;
  estimatedTime: string;
  highlights: string[];
  icon: typeof Building2;
  accent: string;
}

const QUIZZES: QuizCard[] = [
  {
    href: "/quiz/plateforme",
    title: "Quel exchange crypto pour vous ?",
    description:
      `Six questions courtes pour matcher votre profil (budget, fréquence d'achat, support FR, conformité MiCA) avec la plateforme la plus adaptée parmi les ${STATS.platforms} plateformes autorisées en France.`,
    questionCount: "6 questions",
    estimatedTime: "~2 minutes",
    highlights: [
      "Tient compte du support FR",
      "Filtre les plateformes non-MiCA",
      "Résultat neutre, pas d'affilié biaisé",
    ],
    icon: Building2,
    accent: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
  },
  {
    href: "/quiz/crypto",
    title: "Quels projets crypto découvrir en premier ?",
    description:
      "Six questions sur votre horizon, le risque que vous acceptez et ce que vous cherchez (réserve de valeur, smart contracts, paiements…) pour savoir quelles fiches lire en premier parmi notre top 10 et nos hidden gems.",
    questionCount: "6 questions",
    estimatedTime: "~2 minutes",
    highlights: [
      "Top 10 + hidden gems vérifiés",
      "Adapté aux débutants",
      "Pas de conseil financier — juste pédagogie",
    ],
    icon: Coins,
    accent: "from-warning/20 to-orange-500/20 border-warning/30",
  },
];

export default function QuizHubPage() {
  // Schema.org : CollectionPage + Breadcrumb + ItemList des quiz.
  const collectionSchema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${PAGE_URL}#collection`,
    url: PAGE_URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "fr-FR",
    isPartOf: { "@id": `${BRAND.url}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: QUIZZES.length,
      itemListElement: QUIZZES.map((q, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${BRAND.url}${q.href}`,
        name: q.title,
      })),
    },
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Questionnaires", url: PAGE_PATH },
  ]);

  const schema = graphSchema([collectionSchema, breadcrumbs]);

  return (
    <>
      <StructuredData data={schema} id="quiz-hub" />

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fg/80">Questionnaires</span>
          </nav>

          {/* Header */}
          <header className="mt-6 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              {QUIZZES.length} questionnaires pédagogiques
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Questionnaires <span className="gradient-text">crypto</span>
            </h1>
            <p className="mt-3 text-lg text-fg/70">
              Deux questionnaires courts, neutres et pédagogiques pour démarrer sans
              prendre de mauvaise décision : comparer les plateformes, repérer quels
              projets crypto lire en premier. Aucune réponse n'est &quot;fausse&quot; — le
              résultat s&apos;adapte à vos réponses, sans vous dire quoi acheter.
            </p>
          </header>

          {/* Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
            {QUIZZES.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${q.accent} p-6 transition-all hover:translate-y-[-2px] hover:border-primary/50 flex flex-col`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-background/40 border border-border text-fg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-right text-xs text-muted">
                      <div className="font-semibold text-fg/80">{q.questionCount}</div>
                      <div>{q.estimatedTime}</div>
                    </div>
                  </div>

                  <h2 className="mt-5 text-xl font-bold text-fg">{q.title}</h2>
                  <p className="mt-2 text-sm text-fg/70 flex-1">{q.description}</p>

                  <ul className="mt-4 space-y-1.5">
                    {q.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2 text-xs text-fg/80"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-soft group-hover:text-primary">
                    Démarrer le questionnaire
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pédagogie : ce qu'un quiz NE fait pas */}
          <aside className="mt-16 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 text-fg font-bold">
              <Compass className="h-4 w-4 text-primary-soft" />
              Ce que ces questionnaires font (et ne font pas)
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-fg/80">
              <div>
                <div className="font-semibold text-fg mb-1">
                  Ce qu'on fait
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0 mt-0.5" />
                    <span>
                      Vous poser les bonnes questions pour cadrer votre besoin réel.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0 mt-0.5" />
                    <span>
                      Vous présenter en sortie des options qui correspondent à vos
                      réponses (pas les plus rémunératrices pour nous).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0 mt-0.5" />
                    <span>
                      Vous expliquer d&apos;où vient le résultat — pas de boîte noire.
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-fg mb-1">
                  Ce qu'on ne fait pas
                </div>
                <ul className="space-y-1.5 text-fg/70">
                  <li>Du conseil financier personnalisé (réservé aux CIF).</li>
                  <li>De la prédiction de cours.</li>
                  <li>
                    De la "garantie" — la crypto reste un actif risqué, à ne
                    jamais investir au-delà de ce que vous pouvez perdre.
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

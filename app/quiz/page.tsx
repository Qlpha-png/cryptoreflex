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

import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import {
  breadcrumbSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

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
const TITLE = "Quiz crypto — trouve ta plateforme et ta première crypto";
const DESCRIPTION =
  "Deux quiz courts et neutres pour t'aider à démarrer dans la crypto : quelle plateforme pour ton profil (6 questions) et quelle crypto pour ton premier achat (5 questions). Recommandation Cryptoreflex sans biais commercial.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
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
    "quelle crypto acheter",
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
    title: "Quel exchange crypto pour toi ?",
    description:
      "Six questions courtes pour matcher ton profil (budget, fréquence d'achat, support FR, conformité MiCA) avec la plateforme la plus adaptée parmi nos 9 plateformes notées.",
    questionCount: "6 questions",
    estimatedTime: "~2 minutes",
    highlights: [
      "Tient compte du support FR",
      "Filtre les plateformes non-MiCA",
      "Reco neutre, pas d'affilié biaisé",
    ],
    icon: Building2,
    accent: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
  },
  {
    href: "/quiz/crypto",
    title: "Quelle crypto pour ton premier achat ?",
    description:
      "Cinq questions sur ton horizon, ta tolérance au risque et ce que tu cherches (réserve de valeur, smart contracts, hidden gems). Recommandation parmi notre top 10 et nos hidden gems.",
    questionCount: "5 questions",
    estimatedTime: "~2 minutes",
    highlights: [
      "Top 10 + hidden gems vérifiés",
      "Adapté aux débutants",
      "Pas de conseil financier — juste pédagogie",
    ],
    icon: Coins,
    accent: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
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
    { name: "Quiz", url: PAGE_PATH },
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
            <span className="text-fg/80">Quiz</span>
          </nav>

          {/* Header */}
          <header className="mt-6 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" />
              {QUIZZES.length} quiz pédagogiques
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Quiz <span className="gradient-text">crypto</span>
            </h1>
            <p className="mt-3 text-lg text-fg/70">
              Deux quiz courts, neutres et pédagogiques pour démarrer sans
              prendre de mauvaise décision : choisir sa plateforme, choisir sa
              première crypto. Aucune réponse n'est "fausse" — on adapte la
              recommandation à ton profil.
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
                    Démarrer le quiz
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
              Ce que ces quiz font (et ne font pas)
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
                      Te poser les bonnes questions pour cadrer ton besoin réel.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0 mt-0.5" />
                    <span>
                      Te recommander en sortie une option neutre (pas la plus
                      rémunératrice pour nous).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-green shrink-0 mt-0.5" />
                    <span>
                      T'expliquer pourquoi cette reco — pas de boîte noire.
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
                    jamais investir au-delà de ce que tu peux perdre.
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

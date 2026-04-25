import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { getAllPlatforms } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import PlatformQuiz from "@/components/PlatformQuiz";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";

export const revalidate = 86400;

const TITLE = `Quiz : quelle plateforme crypto pour toi ? — ${BRAND.name}`;
const DESCRIPTION =
  "6 questions courtes pour trouver la plateforme crypto la plus adaptée à ton profil : budget, fréquence d'achat, support FR, conformité MiCA. Reco neutre Cryptoreflex.";
const PATH = "/quiz/plateforme";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BRAND.url}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}${PATH}`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function QuizPlateformePage() {
  const platforms = getAllPlatforms();

  /**
   * Schema.org : on combine un Breadcrumb + une WebPage de type Quiz
   * (Quiz est dans schema.org, mais sa support Rich Results est limitée —
   * on garde un WebPage robuste plus une mention Quiz pour la sémantique).
   */
  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: BRAND.url },
    { name: "Quiz plateforme", url: `${BRAND.url}${PATH}` },
  ]);

  const quizSchema = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: TITLE,
    description: DESCRIPTION,
    about: {
      "@type": "Thing",
      name: "Plateformes crypto régulées MiCA en France",
    },
    educationalLevel: "Beginner",
    inLanguage: "fr-FR",
    url: `${BRAND.url}${PATH}`,
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
  };

  const schema = graphSchema([breadcrumbs, quizSchema]);

  return (
    <>
      <StructuredData data={schema} />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'ariane" className="text-xs text-muted mb-6">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-fg">Quiz plateforme</span>
          </nav>

          {/* Hero */}
          <header className="mb-10 sm:mb-12">
            <span className="badge-info">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Quiz personnalisé · 2 minutes
            </span>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
              Quelle plateforme crypto{" "}
              <span className="gradient-text">pour toi&nbsp;?</span>
            </h1>
            <p className="mt-3 max-w-2xl text-fg/80 text-base sm:text-lg">
              Réponds à 6 questions courtes — budget, fréquence d'achat, support
              français, conformité MiCA — on te recommande la plateforme la plus
              adaptée parmi {platforms.length} options analysées.
            </p>
          </header>

          {/* Quiz interactif */}
          <PlatformQuiz platforms={platforms} />

          {/* Méthodologie courte */}
          <section className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Method
              title="Scoring transparent"
              description="6 critères pondérés (frais, sécurité, UX, support, MiCA, dépôt min). Le détail est documenté."
            />
            <Method
              title="Aucun biais sponsor"
              description="Les liens d'affiliation existent mais ne modifient ni le scoring ni la reco."
            />
            <Method
              title="Reco neutre"
              description="Si rien ne matche tes contraintes, on te le dit — pas de reco forcée."
            />
          </section>

          {/* Cross-promo */}
          <aside className="mt-12 glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg">
                Tu hésites encore ? Lance l'assistant "premier achat"
              </h2>
              <p className="mt-1 text-sm text-fg/70">
                5 étapes guidées pour faire ton premier achat sans te tromper —
                montant, crypto, plateforme, méthode de paiement.
              </p>
            </div>
            <Link href="/wizard/premier-achat" className="btn-primary shrink-0">
              Lancer l'assistant
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </article>
    </>
  );
}

function Method({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-5">
      <h3 className="font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 text-sm text-fg/75 leading-relaxed">{description}</p>
    </div>
  );
}

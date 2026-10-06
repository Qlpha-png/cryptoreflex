import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { getAllCryptos } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import CryptoQuiz from "@/components/CryptoQuiz";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";
import { withHreflang } from "@/lib/seo-alternates";
import { fitTitle } from "@/lib/seo-text";

export const revalidate = 86400;

// Suffixe "| Cryptoreflex" auto-ajouté par template root layout.
// 06/10/2026 : plus de recommandation personnalisée (« la crypto la plus adaptée », « Reco neutre ») —
// le questionnaire oriente les lectures (quelles fiches lire en premier), ce n'est pas un conseil d'investissement.
const TITLE = `Questionnaire : quels projets crypto découvrir en premier ?`;
const DESCRIPTION =
  "6 questions courtes pour découvrir quels types de projets crypto correspondent à ce que vous cherchez (réserve de valeur, smart contracts, paiements…) et orienter vos lectures. Outil pédagogique, pas un conseil d'investissement.";
const PATH = "/quiz/crypto";

export const metadata: Metadata = {
  title: fitTitle(TITLE),
  description: DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}${PATH}`),
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

export default function QuizCryptoPage() {
  // SCORING : on garde les 100 fiches editoriales (top10 + hidden-gems).
  // Les fields specifiques (riskLevel, reliability, kind, tagline...) sont
  // requis par scoreCrypto() qui differencie la matrice par type de fiche.
  // Compat issue (bug fix critique 2026-05-09) : les 680 fiches LLM-pipeline
  // ne possedent pas ces fields editoriaux donc ne peuvent pas etre scorees
  // sans degrader la qualite du resultat. Future evolution : enrichir les
  // fiches LLM avec un mini-scoring (riskTier, beginnerLevel) cote pipeline.
  const cryptos = getAllCryptos();
  // 06/10/2026 : le hero annonçait « parmi 780 fiches analysées » alors que seules ces fiches détaillées
  // sont départagées → on affiche leur nombre réel (getAllCryptosUnified n'est plus appelé ici).

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: BRAND.url },
    { name: "Questionnaire crypto", url: `${BRAND.url}${PATH}` },
  ]);

  const quizSchema = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: TITLE,
    description: DESCRIPTION,
    about: {
      "@type": "Thing",
      name: "Types de projets crypto (outil pédagogique)",
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
          <nav aria-label="Fil d'Ariane" className="text-xs text-muted mb-6">
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-fg">Questionnaire crypto</span>
          </nav>

          {/* Hero */}
          <header className="mb-10 sm:mb-12">
            <span className="badge-info">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Questionnaire pédagogique · 2 minutes
            </span>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
              Quels projets crypto{" "}
              <span className="gradient-text">découvrir en premier&nbsp;?</span>
            </h1>
            <p className="mt-3 max-w-2xl text-fg/80 text-base sm:text-lg">
              Répondez à 6 questions courtes — risque accepté, horizon, type de
              projet, familiarité tech, capital, stratégie — pour découvrir quels
              types de projets correspondent à ce que vous cherchez, et orienter vos
              lectures parmi nos {cryptos.length} fiches détaillées. Ce n&apos;est pas
              un conseil d&apos;investissement.
            </p>
          </header>

          {/* Quiz interactif */}
          <CryptoQuiz cryptos={cryptos} />

          {/* Méthodologie courte */}
          <section className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Method
              title="Scoring transparent"
              description="6 critères pondérés (risque, horizon, projet, tech, capital, stratégie). Logique additive auditable."
            />
            <Method
              title="Sans biais sponsor"
              description="Aucun lien d'affiliation crypto — Cryptoreflex ne touche rien si vous choisissez BTC plutôt qu'un autre."
            />
            <Method
              title="Pas un conseil"
              description="Le résultat vous dit quelles fiches lire en premier, pas quoi acheter. Si rien ne correspond à vos réponses, on vous le dit."
            />
          </section>

          {/* Cross-promo */}
          <aside className="mt-12 glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg">
                Vous savez quelle crypto ? Comparez les plateformes MiCA
              </h2>
              <p className="mt-1 text-sm text-fg/70">
                Questionnaire pédagogique en 6 questions — il présente les exchanges régulés
                MiCA pertinents selon votre budget, votre fréquence d&apos;achat et votre
                support préféré. Le choix final vous appartient.
              </p>
            </div>
            <Link href="/quiz/plateforme" className="btn-primary shrink-0">
              Questionnaire plateforme
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

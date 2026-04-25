import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { getAllCryptos } from "@/lib/cryptos";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import CryptoQuiz from "@/components/CryptoQuiz";
import { breadcrumbSchema, graphSchema } from "@/lib/schema";

export const revalidate = 86400;

// Suffixe "| Cryptoreflex" auto-ajouté par template root layout.
const TITLE = `Quiz : quelle crypto correspond à ton profil ?`;
const DESCRIPTION =
  "6 questions courtes pour découvrir la crypto la plus adaptée à ton profil : tolérance au risque, horizon, type de projet, capital, stratégie. Reco neutre Cryptoreflex.";
const PATH = "/quiz/crypto";

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

export default function QuizCryptoPage() {
  const cryptos = getAllCryptos();

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: BRAND.url },
    { name: "Quiz crypto", url: `${BRAND.url}${PATH}` },
  ]);

  const quizSchema = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: TITLE,
    description: DESCRIPTION,
    about: {
      "@type": "Thing",
      name: "Cryptomonnaies adaptées au profil investisseur",
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
            <span className="text-fg">Quiz crypto</span>
          </nav>

          {/* Hero */}
          <header className="mb-10 sm:mb-12">
            <span className="badge-info">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Quiz personnalisé · 2 minutes
            </span>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
              Quelle crypto pour{" "}
              <span className="gradient-text">ton profil&nbsp;?</span>
            </h1>
            <p className="mt-3 max-w-2xl text-fg/80 text-base sm:text-lg">
              Réponds à 6 questions courtes — risque accepté, horizon, type de
              projet, familiarité tech, capital, stratégie — on te recommande la
              crypto la plus adaptée parmi {cryptos.length} fiches analysées.
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
              description="Aucun lien d'affiliation crypto — Cryptoreflex ne touche rien si tu choisis BTC plutôt qu'un autre."
            />
            <Method
              title="Reco honnête"
              description="Si rien ne matche tes contraintes, on te le dit. Pas de reco forcée pour faire plaisir."
            />
          </section>

          {/* Cross-promo */}
          <aside className="mt-12 glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg">
                Quand tu sais quelle crypto, choisis ta plateforme
              </h2>
              <p className="mt-1 text-sm text-fg/70">
                6 questions pour trouver l'exchange régulé MiCA le plus adapté à
                ton budget, ta fréquence d'achat et ton support préféré.
              </p>
            </div>
            <Link href="/quiz/plateforme" className="btn-primary shrink-0">
              Quiz plateforme
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

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, Timer, ShieldCheck } from "lucide-react";

import { getAllPlatforms } from "@/lib/platforms";
import { BRAND } from "@/lib/brand";
import StructuredData from "@/components/StructuredData";
import QuizExchange from "@/components/QuizExchange";
import {
  breadcrumbSchema,
  faqSchema,
  graphSchema,
  type JsonLd,
} from "@/lib/schema";

/**
 * /quiz/trouve-ton-exchange — Quiz "Trouve ton exchange en 60 sec".
 *
 * Différenciation produit : aucun concurrent FR (Cryptoast, Coin Academy,
 * JournalDuCoin) n'a de quiz interactif → big lead magnet.
 *
 * Architecture :
 *  - Server component : SEO + JSON-LD + structure + FAQ
 *  - Client component : `components/QuizExchange.tsx` (state + tracking)
 *  - Pure logic       : `lib/quiz-scoring.ts` (testable)
 */

export const revalidate = 86400;

const PAGE_PATH = "/quiz/trouve-ton-exchange";
const PAGE_URL = `${BRAND.url}${PAGE_PATH}`;
const TITLE = "Quiz : Trouve ton exchange crypto idéal en 60 sec";
const DESCRIPTION =
  "Réponds à 6 questions et reçois la recommandation personnalisée de la meilleure plateforme crypto pour ton profil. 100 % gratuit, sans inscription.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: `${TITLE} — ${BRAND.name}`,
    description: DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  keywords: [
    "quiz exchange crypto",
    "quelle plateforme crypto choisir",
    "trouve ton exchange",
    "comparatif plateforme crypto",
    "meilleure plateforme crypto débutant",
    "quiz crypto MiCA",
  ],
};

/* -------------------------------------------------------------------------- */
/*  FAQ — boost SEO + remplit l'écran de réassurance                           */
/* -------------------------------------------------------------------------- */

const FAQ = [
  {
    question: "Le quiz est-il vraiment gratuit ?",
    answer:
      "Oui, 100 % gratuit, sans inscription obligatoire. Tu peux faire le quiz et obtenir ta recommandation sans laisser ton email. Le formulaire à la fin est optionnel — il sert uniquement à recevoir ta reco par mail et le guide PDF bonus.",
  },
  {
    question: "Sur quels critères les plateformes sont-elles classées ?",
    answer:
      "Le score combine 6 critères pondérés selon tes réponses : sécurité, frais (spot, instant, retrait), UX, support FR, conformité MiCA, taille du catalogue. Toutes les pondérations sont documentées dans le fichier lib/quiz-scoring.ts (open code).",
  },
  {
    question: "Les recommandations sont-elles biaisées par les liens d'affiliation ?",
    answer:
      "Non. Les liens d'affiliation existent (c'est notre modèle économique) mais ne modifient ni le scoring ni l'ordre des recommandations. Si une plateforme ne correspond pas à ton profil, on ne te la propose pas — même si elle nous rapporterait plus.",
  },
  {
    question: "Combien de temps prend le quiz ?",
    answer:
      "Environ 60 secondes pour les 6 questions. Tu peux utiliser les chiffres 1 à 4 du clavier pour répondre encore plus vite, ou la flèche gauche pour revenir en arrière.",
  },
  {
    question: "Mon profil change avec le temps : puis-je refaire le quiz ?",
    answer:
      "Oui, autant de fois que tu veux. Le quiz est conçu pour évoluer avec toi : si tu passes de débutant à trader actif, ton top 3 changera complètement. Le bouton « Refaire le quiz » est en bas du résultat.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function QuizTrouveTonExchangePage() {
  const platforms = getAllPlatforms();

  /* ----------------- JSON-LD : Quiz + Breadcrumb + FAQPage ---------------- */

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Quiz", url: "/quiz" },
    { name: "Trouve ton exchange", url: PAGE_PATH },
  ]);

  const quizJsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: TITLE,
    description: DESCRIPTION,
    about: {
      "@type": "Thing",
      name: "Plateformes crypto régulées MiCA pour utilisateurs francophones",
    },
    educationalLevel: "Beginner",
    inLanguage: "fr-FR",
    url: PAGE_URL,
    isAccessibleForFree: true,
    learningResourceType: "Quiz",
    timeRequired: "PT1M",
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: BRAND.url,
    },
  };

  const faqJsonLd = faqSchema(FAQ);

  const schema = graphSchema([breadcrumbs, quizJsonLd, faqJsonLd]);

  return (
    <>
      <StructuredData data={schema} id="quiz-trouve-ton-exchange" />

      <article className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav
            aria-label="Fil d'Ariane"
            className="text-xs text-muted mb-6"
          >
            <Link href="/" className="hover:text-fg">
              Accueil
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/quiz" className="hover:text-fg">
              Quiz
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-fg">Trouve ton exchange</span>
          </nav>

          {/* Hero */}
          <header className="mb-10 sm:mb-12">
            <span className="badge-info">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Quiz personnalisé · 60 secondes
            </span>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
              Trouve ton exchange crypto{" "}
              <span className="gradient-text">en 60 secondes</span>
            </h1>
            <p className="mt-3 max-w-2xl text-fg/80 text-base sm:text-lg">
              6 questions courtes — budget, fréquence, niveau, priorité,
              staking, auto-custody. On te propose ton top 3 personnalisé
              parmi {platforms.length} plateformes analysées.
            </p>

            {/* Mini-réassurance */}
            <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg/70">
              <li className="inline-flex items-center gap-1.5">
                <Timer className="h-4 w-4 text-primary-soft" aria-hidden="true" />
                60 secondes
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary-soft" aria-hidden="true" />
                100 % gratuit, sans inscription
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary-soft" aria-hidden="true" />
                Reco neutre, scoring open code
              </li>
            </ul>
          </header>

          {/* Quiz interactif */}
          <QuizExchange platforms={platforms} />

          {/* Méthodologie courte */}
          <section className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Method
              title="Scoring transparent"
              description="6 critères pondérés (frais, sécurité, UX, support FR, MiCA, catalogue). La matrice est documentée dans lib/quiz-scoring.ts."
            />
            <Method
              title="Aucun biais sponsor"
              description="Les liens d'affiliation existent mais ne modifient ni le scoring ni l'ordre des recommandations."
            />
            <Method
              title="Profil personnalisé"
              description="On déduit ton profil (Trader actif, DCA HODLer, Long-termiste sécuritaire, etc.) — pas de reco générique."
            />
          </section>

          {/* FAQ */}
          <section className="mt-16" aria-labelledby="faq-title">
            <h2
              id="faq-title"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg"
            >
              Questions fréquentes
            </h2>
            <div className="mt-6 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-border bg-elevated/30 p-5 open:border-primary/30"
                >
                  <summary className="cursor-pointer font-semibold text-fg flex items-center justify-between gap-4">
                    <span>{item.question}</span>
                    <span
                      aria-hidden="true"
                      className="text-primary-soft transition-transform group-open:rotate-180"
                    >
                      <ArrowRight className="h-4 w-4 rotate-90" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-fg/75 leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Cross-promo */}
          <aside className="mt-16 glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-fg">
                Tu hésites encore ? Lance l&apos;assistant &laquo;&nbsp;premier
                achat&nbsp;&raquo;
              </h2>
              <p className="mt-1 text-sm text-fg/70">
                5 étapes guidées pour faire ton premier achat sans te tromper —
                montant, crypto, plateforme, méthode de paiement.
              </p>
            </div>
            <Link
              href="/wizard/premier-achat"
              className="btn-primary shrink-0"
            >
              Lancer l&apos;assistant
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </article>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

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

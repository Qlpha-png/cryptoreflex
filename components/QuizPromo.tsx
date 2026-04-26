import Link from "next/link";
import { Target, ArrowRight, Sparkles, Clock, HelpCircle } from "lucide-react";
import StructuredData from "./StructuredData";
import { BRAND } from "@/lib/brand";

/**
 * QuizPromo — encart "Quiz éclair" pour la home (KPI conversion).
 *
 * Audit Block 7 RE-AUDIT 26/04/2026 (3 agents PRO consolidés) :
 *  - SEO P1 L2 : Schema.org Quiz JSON-LD (numberOfQuestions: 5, timeRequired: PT30S)
 *  - UX F1 : aperçu d'une question d'exemple sous l'accroche
 *  - UX F2 : "Voir le comparatif" downgradé en lien texte secondaire (1 CTA primary)
 *  - UX F4 : version mobile compacte du panneau visuel droite (au lieu de hidden lg:flex)
 *  - Visual : palette primary + cyan (vs ToolsTeaser cyan+green) — différenciation
 *  - Server Component pur — zéro JS shippé.
 */
export default function QuizPromo() {
  const quizSchema = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: "Quiz : Trouve ta plateforme crypto idéale",
    description:
      "5 questions courtes pour identifier la plateforme crypto la plus adaptée à ton profil (budget, fréquence d'achat, support FR, conformité MiCA).",
    educationalAlignment: {
      "@type": "AlignmentObject",
      alignmentType: "educationalSubject",
      targetName: "Cryptocurrency exchange selection",
    },
    timeRequired: "PT30S",
    typicalAgeRange: "18-",
    url: `${BRAND.url}/quiz/plateforme`,
    publisher: {
      "@type": "Organization",
      name: "Cryptoreflex",
      url: BRAND.url,
    },
  };

  return (
    <section
      aria-labelledby="quiz-promo-title"
      className="py-16 sm:py-20"
    >
      <StructuredData id="quiz-schema" data={quizSchema} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass glow-border rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-violet-500/15 rounded-full blur-3xl" aria-hidden="true" />

          <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" focusable="false" />
                Quiz éclair — 30 secondes
              </span>
              <h2
                id="quiz-promo-title"
                className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight"
              >
                Trouve ta <span className="gradient-text">plateforme idéale</span> en 5 questions
              </h2>
              <p className="mt-3 text-white/70 max-w-xl">
                Budget, fréquence d&apos;achat, support FR, conformité MiCA : on te
                pose 5 questions courtes et on te recommande la plateforme la
                plus adaptée à ton profil. Reco neutre, sans bullshit.
              </p>

              {/* Audit UX F1 : aperçu d'une question d'exemple (transparence + démo) */}
              <div className="mt-4 inline-flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-fg/75">
                <HelpCircle className="h-3.5 w-3.5 text-primary-soft shrink-0 mt-0.5" strokeWidth={2} aria-hidden="true" focusable="false" />
                <span>
                  Exemple : <em className="text-fg/90 not-italic font-medium">« Combien veux-tu investir par mois ? »</em>
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 items-center">
                <Link
                  href="/quiz/plateforme"
                  className="btn-primary btn-primary-shine text-sm sm:text-base inline-flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" focusable="false" />
                  Démarrer le quiz
                  <ArrowRight className="h-4 w-4 arrow-spring" strokeWidth={1.75} aria-hidden="true" focusable="false" />
                </Link>
                {/* Audit UX F2 : downgrade en lien texte secondaire (1 CTA primary suffit) */}
                <Link
                  href="/comparatif"
                  className="text-sm text-fg/60 hover:text-primary-soft underline underline-offset-2 transition-colors"
                >
                  Voir le comparatif complet
                </Link>
              </div>

              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60" role="list">
                <li className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true" />
                  100&nbsp;% gratuit
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true" />
                  Sans inscription
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true" />
                  Reco neutre &amp; indépendante
                </li>
              </ul>
            </div>

            {/* Audit UX F4 : version mobile compacte (chips horizontaux au lieu de hidden lg:flex) */}
            <div className="lg:hidden flex items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-elevated/40 px-3 py-2">
                <span className="text-lg font-extrabold gradient-text tabular-nums">5</span>
                <span className="text-[10px] uppercase tracking-wider text-white/65 font-semibold">questions</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-elevated/40 px-3 py-2">
                <span className="text-lg font-extrabold gradient-text tabular-nums">30s</span>
                <span className="text-[10px] uppercase tracking-wider text-white/65 font-semibold">pour finir</span>
              </div>
            </div>

            {/* Bloc visuel droite (desktop) — icône Target stylisée + accroche */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl" aria-hidden="true" />
                <div className="relative flex flex-col items-center gap-4 p-8 rounded-2xl border border-primary/30 bg-elevated/40 backdrop-blur">
                  <div className="flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary-soft text-background motion-safe:animate-pulse">
                    <Target className="h-10 w-10" strokeWidth={2} aria-hidden="true" focusable="false" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-extrabold gradient-text tabular-nums">5</div>
                    <div className="text-xs uppercase tracking-wider text-white/60 mt-1">
                      questions
                    </div>
                  </div>
                  <div className="h-px w-16 bg-border/60" aria-hidden="true" />
                  <div className="text-center">
                    <div className="text-3xl font-extrabold gradient-text tabular-nums">~30s</div>
                    <div className="text-xs uppercase tracking-wider text-white/60 mt-1">
                      pour finir
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

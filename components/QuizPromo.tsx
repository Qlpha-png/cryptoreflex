import Link from "next/link";
import { Target, ArrowRight, Sparkles, Clock } from "lucide-react";

/**
 * QuizPromo — encart "Quiz éclair" pour la home.
 *
 * Pourquoi ? Bug UX 26-04 : l'utilisateur a remonté que le quiz
 * "trouve ta plateforme" (/quiz/plateforme) était introuvable. On corrige
 * en parallèle de l'ajout dans la Navbar (catégorie "Quiz" entre Outils et
 * Blog), avec un encart visuel fort sur la home pour exposer la valeur :
 *  - 30 s pour répondre, 5 questions
 *  - Reco neutre Cryptoreflex (pas un comparateur sponsorisé)
 *  - Conversion forte vers /quiz/plateforme
 *
 * Server Component pur — zéro JS shippé. À insérer dans `app/page.tsx`
 * (par un autre agent ou plus tard) entre BeginnerJourney et ToolsTeaser
 * idéalement, ou juste après la Hero pour une visibilité maximale.
 */
export default function QuizPromo() {
  return (
    <section
      aria-labelledby="quiz-promo-title"
      className="py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass glow-border rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          {/* Halos décoratifs cohérents avec ToolsTeaser */}
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-accent-cyan/20 rounded-full blur-3xl" aria-hidden="true" />

          <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                Quiz éclair — 30 secondes
              </span>
              <h2
                id="quiz-promo-title"
                className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight"
              >
                Trouve ta <span className="gradient-text">plateforme idéale</span> en 5 questions
              </h2>
              <p className="mt-3 text-white/70 max-w-xl">
                Budget, fréquence d'achat, support FR, conformité MiCA : on te
                pose 5 questions courtes et on te recommande la plateforme la
                plus adaptée à ton profil. Reco neutre, sans bullshit.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/quiz/plateforme"
                  className="btn-primary text-sm sm:text-base inline-flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  Démarrer le quiz
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </Link>
                <Link
                  href="/comparatif"
                  className="btn-ghost text-sm sm:text-base"
                >
                  Voir le comparatif complet
                </Link>
              </div>

              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60">
                <li className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true" />
                  100 % gratuit
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true" />
                  Sans inscription
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true" />
                  Reco neutre & indépendante
                </li>
              </ul>
            </div>

            {/* Bloc visuel droite — icône Target stylisée + accroche secondaire */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl" aria-hidden="true" />
                <div className="relative flex flex-col items-center gap-4 p-8 rounded-2xl border border-primary/30 bg-elevated/40 backdrop-blur">
                  <div className="flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary-soft text-background">
                    <Target className="h-10 w-10" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-extrabold gradient-text">5</div>
                    <div className="text-xs uppercase tracking-wider text-white/60 mt-1">
                      questions
                    </div>
                  </div>
                  <div className="h-px w-16 bg-border/60" aria-hidden="true" />
                  <div className="text-center">
                    <div className="text-3xl font-extrabold gradient-text">~30s</div>
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

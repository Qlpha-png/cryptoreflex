import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Sparkles,
  Mail,
  ArrowRight,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /pro/welcome — page de bienvenue (démonétisation juin 2026).
 *
 * Anciennement page post-paiement (retour Stripe, confetti + pixel de
 * conversion publicitaire). Cryptoreflex étant désormais 100 % gratuit, il
 * n'y a plus de paiement : on retire toute référence paiement/abonnement, le
 * pixel de conversion et le confetti lié au session_id Stripe.
 *
 * On conserve la route (pas de 404) avec une notice neutre de bienvenue qui
 * oriente vers la connexion / l'espace compte et les outils gratuits. Reste
 * noindex (pas de valeur SEO propre).
 */

export const metadata: Metadata = {
  title: "Bienvenue sur Cryptoreflex",
  description:
    "Bienvenue : tous les outils Cryptoreflex sont gratuits. Connectez-vous pour retrouver votre portfolio, vos alertes et votre watchlist.",
  alternates: withHreflang(`${BRAND.url}/pro/welcome`),
  robots: { index: false, follow: true },
};

export default function WelcomePage() {
  return (
    <section
      aria-labelledby="welcome-title"
      className="relative overflow-hidden min-h-[80vh] py-16 sm:py-20 isolate"
    >
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success border border-success/30 mb-5">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <span className="ds-eyebrow inline-flex items-center gap-1.5 text-primary-soft">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            BIENVENUE
          </span>
          <h1
            id="welcome-title"
            className="mt-4 text-3xl sm:text-5xl font-extrabold text-fg leading-tight"
          >
            Tout est{" "}
            <span className="text-gradient-gold-animate">gratuit.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-xl mx-auto leading-relaxed">
            Bienvenue sur {BRAND.name}. Portfolio, alertes, watchlist et tous
            les outils sont ouverts à tout le monde, gratuitement. Connectez-vous
            pour retrouver votre espace personnel.
          </p>
        </div>

        {/* Connexion par lien magique */}
        <div className="glass rounded-2xl p-6 mb-8 border-l-4 border-primary">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-fg text-lg">
                Connectez-vous en un clic
              </h2>
              <p className="mt-2 text-sm text-fg/70 leading-relaxed">
                Entrez votre email sur la page de connexion : vous recevez un
                lien magique pour activer votre espace — pas de mot de passe à
                retenir. Pensez à vérifier vos spams (le lien expire dans
                1&nbsp;heure).
              </p>
              <p className="mt-2 text-sm text-fg/70 leading-relaxed">
                Une question&nbsp;? Écrivez-nous à{" "}
                <a
                  href={`mailto:${BRAND.email}`}
                  className="text-primary-soft underline hover:text-primary font-semibold"
                >
                  {BRAND.email}
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* CTA principal */}
        <div className="text-center">
          <Link
            href="/connexion"
            className="btn-primary btn-primary-shine min-h-[52px] text-base px-7 group inline-flex"
            data-cta="welcome-login"
          >
            Aller à la connexion
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Quick wins disponibles immédiatement */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-muted mb-5">
            En attendant, jette un œil à ces outils
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/outils/radar-3916-bis"
              className="glass rounded-2xl p-4 hover:border-primary/40 transition-colors group"
            >
              <h3 className="font-bold text-sm text-fg group-hover:text-primary transition-colors">
                Radar 3916-bis
              </h3>
              <p className="mt-1 text-xs text-fg/70">
                Détectez vos comptes crypto étrangers à déclarer
              </p>
            </Link>
            <Link
              href="/outils/portfolio-tracker"
              className="glass rounded-2xl p-4 hover:border-primary/40 transition-colors group"
            >
              <h3 className="font-bold text-sm text-fg group-hover:text-primary transition-colors">
                Portfolio Tracker
              </h3>
              <p className="mt-1 text-xs text-fg/70">
                Suivez vos positions en temps réel
              </p>
            </Link>
            <Link
              href="/outils/calculateur-fiscalite"
              className="glass rounded-2xl p-4 hover:border-primary/40 transition-colors group"
            >
              <h3 className="font-bold text-sm text-fg group-hover:text-primary transition-colors">
                Calculateur fiscalité
              </h3>
              <p className="mt-1 text-xs text-fg/70">
                Estimez votre impôt PFU 31,4 %
              </p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

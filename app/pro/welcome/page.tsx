import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Crown,
  Mail,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Bienvenue dans Cryptoreflex Pro",
  description:
    "Ton paiement est confirmé. Voici comment accéder à ton compte Pro et débloquer tes premières features.",
  alternates: { canonical: `${BRAND.url}/pro/welcome` },
  robots: { index: false, follow: true }, // page post-paiement, pas indexable
};

interface SearchParams {
  searchParams?: { session_id?: string };
}

export default function WelcomePage({ searchParams }: SearchParams) {
  // session_id Stripe — on l'affiche pour la traçabilité user
  const sessionId = searchParams?.session_id;

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
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            BIENVENUE DANS PRO
          </span>
          <h1
            id="welcome-title"
            className="mt-4 text-3xl sm:text-5xl font-extrabold text-fg leading-tight"
          >
            Ton paiement est{" "}
            <span className="text-gradient-gold-animate">confirmé.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-fg/75 max-w-xl mx-auto leading-relaxed">
            Merci de ta confiance. Ton accès Pro est actif. Voici comment te
            connecter à ton espace personnel.
          </p>
        </div>

        {/* Étape 1 : email magic link */}
        <div className="glass rounded-2xl p-6 mb-4 border-l-4 border-primary">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-primary-soft mb-1">
                Étape 1 — Email envoyé
              </p>
              <h2 className="font-bold text-fg text-lg">
                Vérifie ta boîte mail
              </h2>
              <p className="mt-2 text-sm text-fg/70 leading-relaxed">
                Un lien magique de connexion vient d&apos;être envoyé à
                l&apos;email utilisé pour ton paiement Stripe. Clique dessus
                pour activer ton accès — pas de mot de passe à retenir.
              </p>
              <p className="mt-2 text-xs text-muted">
                Pense à vérifier tes spams. Le lien expire dans 1 heure.
              </p>
            </div>
          </div>
        </div>

        {/* Étape 2 : si magic link non reçu */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning border border-warning/30">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-warning-fg mb-1">
                Pas reçu d&apos;email ?
              </p>
              <p className="mt-1 text-sm text-fg/70 leading-relaxed">
                Tu peux demander un nouveau lien sur la page connexion en
                renseignant ton email de paiement. Si rien ne fonctionne,
                écris-nous à{" "}
                <a
                  href={`mailto:${BRAND.email}?subject=Probl%C3%A8me%20activation%20Pro`}
                  className="text-primary-soft underline hover:text-primary font-semibold"
                >
                  {BRAND.email}
                </a>{" "}
                — on débloque sous 24 h ouvrées.
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
          <p className="mt-4 text-xs text-muted flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            Annulation 1 clic · Garantie 14 j remboursé · RGPD UE
          </p>
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
                Détecte tes amendes crypto avant mai 2026
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
                Suis tes positions en temps réel
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
                Estime ton impôt PFU 30 %
              </p>
            </Link>
          </div>
        </div>

        {sessionId && (
          <p className="mt-8 text-center text-xs text-muted">
            Référence de paiement&nbsp;:{" "}
            <code className="font-mono">{sessionId.slice(0, 20)}…</code>
          </p>
        )}
      </div>
    </section>
  );
}

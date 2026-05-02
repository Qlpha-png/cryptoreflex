import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, ShieldCheck, Lock } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import SignupForm from "@/components/auth/SignupForm";
// FIX UX FLOW 2026-05-02 #9 (audit consolidé) — Avant ce commit la page
// inscription était un cul-de-sac complet : formulaire seul, aucun "et
// après ?". Avec NextStepsGuide, on propose 3 destinations contextuelles
// (watchlist, alertes, newsletter) en attendant que le user signe.
import NextStepsGuide from "@/components/NextStepsGuide";

export const metadata: Metadata = {
  title: "Créer un compte — Cryptoreflex",
  description:
    "Crée ton compte Cryptoreflex en 30 secondes avec ton email et un mot de passe. Gratuit, sans engagement.",
  alternates: { canonical: `${BRAND.url}/inscription` },
  robots: { index: false, follow: true },
};

export default function InscriptionPage() {
  const isConfigured = isSupabaseConfigured();

  return (
    <section className="min-h-[80vh] flex items-center py-16">
      <div className="mx-auto max-w-md px-4 sm:px-6 w-full">
        <div className="text-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 mb-4">
            <UserPlus className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-extrabold text-fg">
            Crée ton <span className="gradient-text">compte</span>
          </h1>
          <p className="mt-3 text-sm text-fg/70">
            Gratuit · 30 secondes · Aucune carte bancaire requise.
          </p>
        </div>

        {isConfigured ? (
          <SignupForm />
        ) : (
          <div className="glass rounded-2xl p-6 text-center">
            <Lock className="h-8 w-8 text-muted mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-bold text-fg mb-2">
              Inscription bientôt disponible
            </h2>
            <p className="text-sm text-fg/70 leading-relaxed">
              L&apos;espace personnel sera ouvert dans les prochains jours.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-fg/70">
          Déjà un compte&nbsp;?{" "}
          <Link
            href="/connexion"
            className="text-primary-soft hover:text-primary underline font-semibold"
          >
            Se connecter
          </Link>
        </p>

        <p className="mt-8 text-center text-xs text-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Données chiffrées · Conforme RGPD · Désinscription en 1 clic
        </p>
      </div>

      {/* FIX UX FLOW 2026-05-02 #9 — fin de cul-de-sac : 3 destinations
          contextuelles à découvrir avant ou après signup (homepage = explore
          le produit, sans forcer la création de compte). */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 mt-16 w-full">
        <NextStepsGuide context="homepage" />
      </div>
    </section>
  );
}

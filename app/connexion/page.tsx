import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldCheck, Lock, ArrowRight } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Connexion — Cryptoreflex",
  description:
    "Connecte-toi à ton compte Cryptoreflex avec ton email et ton mot de passe, ou via un lien magique. Sécurisé, rapide.",
  alternates: { canonical: `${BRAND.url}/connexion` },
  robots: { index: false, follow: true }, // pas indexable
};

interface SearchParams {
  searchParams?: { error?: string; next?: string };
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code:
    "Le lien de connexion est invalide ou a expiré. Demande un nouveau lien ci-dessous.",
  missing_code:
    "Le lien semble incomplet. Demande un nouveau lien ci-dessous.",
  service_unavailable:
    "L'authentification est temporairement indisponible. On y travaille.",
};

export default function ConnexionPage({ searchParams }: SearchParams) {
  const isConfigured = isSupabaseConfigured();
  const errorKey = searchParams?.error;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : null;

  return (
    <section className="min-h-[80vh] flex items-center py-16">
      <div className="mx-auto max-w-md px-4 sm:px-6 w-full">
        <div className="text-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 mb-4">
            <Mail className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-extrabold text-fg">
            Connexion à <span className="gradient-text">ton compte</span>
          </h1>
          <p className="mt-3 text-sm text-fg/70">
            Avec ton email et ton mot de passe — ou un lien magique si tu
            préfères.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-xl bg-warning/10 border border-warning/30 p-4 text-sm text-warning-fg"
          >
            {errorMessage}
          </div>
        )}

        {isConfigured ? (
          <LoginForm />
        ) : (
          <div className="glass rounded-2xl p-6 text-center">
            <Lock className="h-8 w-8 text-muted mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-bold text-fg mb-2">
              Connexion bientôt disponible
            </h2>
            <p className="text-sm text-fg/70 mb-4 leading-relaxed">
              L&apos;espace personnel sera ouvert dans les prochains jours. En
              attendant, tu peux découvrir Cryptoreflex Pro et rejoindre la
              waitlist.
            </p>
            <Link
              href="/pro"
              className="btn-primary btn-primary-shine min-h-[44px] inline-flex"
            >
              Découvrir Pro
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Connexion chiffrée · Cookies sécurisés · Aucun tracker
        </p>
      </div>
    </section>
  );
}

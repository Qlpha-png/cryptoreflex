import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Cryptoreflex",
  description:
    "Réinitialise ton mot de passe Cryptoreflex en quelques clics via un lien sécurisé reçu par email.",
  alternates: { canonical: `${BRAND.url}/mot-de-passe-oublie` },
  robots: { index: false, follow: true },
};

export default function MotDePasseOubliePage() {
  const isConfigured = isSupabaseConfigured();

  return (
    <section className="min-h-[80vh] flex items-center py-16">
      <div className="mx-auto max-w-md px-4 sm:px-6 w-full">
        <Link
          href="/connexion"
          className="inline-flex items-center gap-1.5 text-sm text-fg/70 hover:text-fg mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Retour à la connexion
        </Link>

        <div className="text-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 mb-4">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-extrabold text-fg">
            Mot de passe <span className="gradient-text">oublié&nbsp;?</span>
          </h1>
          <p className="mt-3 text-sm text-fg/70">
            Entre ton email — on t&apos;envoie un lien pour en définir un nouveau.
          </p>
        </div>

        {isConfigured ? (
          <ResetPasswordForm />
        ) : (
          <div className="glass rounded-2xl p-6 text-center">
            <Lock className="h-8 w-8 text-muted mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-bold text-fg mb-2">
              Service indisponible
            </h2>
            <p className="text-sm text-fg/70">
              L&apos;authentification est temporairement indisponible.
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Lien chiffré · Expire en 1 h · Usage unique
        </p>
      </div>
    </section>
  );
}

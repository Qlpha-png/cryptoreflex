import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe — Mon compte",
  description: "Définis ou modifie ton mot de passe Cryptoreflex.",
  alternates: { canonical: `${BRAND.url}/mon-compte/mot-de-passe` },
  robots: { index: false, follow: false },
};

export default async function MotDePassePage() {
  if (!isSupabaseConfigured()) {
    redirect("/connexion");
  }

  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte/mot-de-passe");
  }

  return (
    <section className="min-h-[80vh] py-12 sm:py-16">
      <div className="mx-auto max-w-md px-4 sm:px-6 w-full">
        <Link
          href="/mon-compte"
          className="inline-flex items-center gap-1.5 text-sm text-fg/70 hover:text-fg mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Retour au compte
        </Link>

        <div className="text-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 mb-4">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-extrabold text-fg">
            Définir un <span className="gradient-text">mot de passe</span>
          </h1>
          <p className="mt-3 text-sm text-fg/70">
            Pour te connecter sans attendre un email à chaque fois.
          </p>
        </div>

        <UpdatePasswordForm />

        <p className="mt-8 text-center text-xs text-muted flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Hash bcrypt · Stocké chiffré · Jamais visible côté serveur
        </p>
      </div>
    </section>
  );
}

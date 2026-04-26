import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Mail, ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * /ambassadeurs/merci — page de remerciement post-soumission.
 *
 * On évite "noindex" sec : la page est utile en confirmation conversion
 * (analytics, tracking GA event "ambassadeur_apply_submit"), mais elle est
 * orpheline du sitemap (pas d'intérêt SEO direct).
 */

export const metadata: Metadata = {
  title: "Candidature ambassadeur reçue — Cryptoreflex",
  description:
    "Merci pour ta candidature au programme ambassadeurs Cryptoreflex. Réponse manuelle sous 7 jours ouvrés.",
  alternates: { canonical: `${BRAND.url}/ambassadeurs/merci` },
  robots: { index: false, follow: true },
};

export default function MerciPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-xl w-full text-center">
        <CheckCircle2
          className="h-16 w-16 text-success mx-auto"
          aria-hidden="true"
        />
        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold text-fg">
          Candidature reçue
        </h1>
        <p className="mt-4 text-fg/75">
          Merci ! On a bien reçu ta candidature au programme ambassadeurs
          {" "}
          <span className="text-primary-soft font-semibold">{BRAND.name}</span>.
          Tu reçois un email de confirmation tout de suite et notre équipe
          partenariats t&apos;écrit sous 7 jours ouvrés depuis{" "}
          <span className="text-primary-soft">{BRAND.partnersEmail}</span>.
        </p>

        <div className="mt-8 glass rounded-2xl p-6 text-left">
          <h2 className="font-bold text-fg flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary-soft" aria-hidden="true" />
            Pendant qu&apos;on étudie ta candidature
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-white/80" role="list">
            <li className="flex items-start gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                aria-hidden="true"
              />
              <span>
                Découvre la{" "}
                <Link
                  href="/methodologie"
                  className="text-primary-soft underline hover:text-primary"
                >
                  méthodologie de scoring
                </Link>{" "}
                qu&apos;on applique aux plateformes — utile à comprendre avant
                de pitcher.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                aria-hidden="true"
              />
              <span>
                Inscris-toi à la{" "}
                <Link
                  href="/newsletter"
                  className="text-primary-soft underline hover:text-primary"
                >
                  newsletter quotidienne
                </Link>{" "}
                pour voir comment on convertit nos lecteurs.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                aria-hidden="true"
              />
              <span>
                Réponds à l&apos;email de confirmation pour ajouter du contexte
                (URL d&apos;exemple, capture analytics, niche précise).
              </span>
            </li>
          </ul>
        </div>

        <Link href="/" className="btn-primary mt-8 inline-flex">
          Retour à l&apos;accueil
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

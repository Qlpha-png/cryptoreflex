"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, Mail } from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * Error boundary global Cryptoreflex.
 *
 * `"use client"` est obligatoire — Next.js exige un client component pour
 * intercepter les erreurs runtime du subtree (équivalent React Error Boundary).
 *
 * Le composant reçoit :
 *  - error : l'erreur capturée (avec digest pour matcher les logs serveur)
 *  - reset : callback fourni par Next pour ré-essayer le rendu du segment
 *
 * Logging :
 *  - dev : console.error pour debug local
 *  - prod : placeholder Sentry (à brancher quand SENTRY_DSN sera dispo)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      // TODO: Sentry.captureException(error, { tags: { digest: error.digest } });
      // En prod on log quand même un payload structuré, exploitable par
      // n'importe quel collector (Vercel logs, Logtail, Datadog…).
      console.error("[Cryptoreflex] Runtime error", {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    } else {
      console.error("[Cryptoreflex] Runtime error", error);
    }
  }, [error]);

  const mailtoSubject = encodeURIComponent(
    `[Bug] Erreur sur ${BRAND.domain}${
      error.digest ? ` (digest: ${error.digest})` : ""
    }`
  );
  const mailtoBody = encodeURIComponent(
    [
      "Bonjour,",
      "",
      "Je viens de rencontrer une erreur sur le site.",
      "",
      `URL : ${typeof window !== "undefined" ? window.location.href : ""}`,
      `Digest : ${error.digest ?? "n/a"}`,
      `Message : ${error.message ?? "n/a"}`,
      "",
      "Détails (ce que je faisais) :",
      "",
    ].join("\n")
  );

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-rose/10 text-accent-rose border border-accent-rose/30 mx-auto">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
          Oups, une erreur s'est glissée
        </h1>

        <p className="mt-4 text-base text-fg/70">
          Quelque chose n'a pas fonctionné de notre côté. On a déjà été notifiés —
          tu peux réessayer ou nous signaler le problème.
        </p>

        {error.digest ? (
          <p className="mt-3 text-xs text-muted font-mono">
            Réf. erreur : <span className="text-fg/70">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary text-base"
          >
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </button>

          <Link href="/" className="btn-ghost text-base">
            <Home className="h-4 w-4" />
            Retour à l'accueil
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60">
          <a
            href={`mailto:${BRAND.email}?subject=${mailtoSubject}&body=${mailtoBody}`}
            className="inline-flex items-center gap-2 text-sm text-primary-soft hover:text-primary underline underline-offset-4"
          >
            <Mail className="h-4 w-4" />
            Signaler le problème par email
          </a>
        </div>
      </div>
    </section>
  );
}

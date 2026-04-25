"use client";

import { useEffect } from "react";

/**
 * Fallback ULTIME — déclenché si le RootLayout lui-même crash.
 *
 * Contraintes Next.js (App Router) :
 *  - Doit définir <html> et <body> (le layout n'est pas appliqué).
 *  - "use client" obligatoire.
 *  - Aucune dépendance à des composants applicatifs (Navbar, fonts…)
 *    car ils peuvent justement être la source du crash.
 *
 * On reste minimal : HTML brut + style inline pour ne dépendre de rien.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      // TODO: Sentry.captureException(error, { tags: { scope: "global", digest: error.digest } });
      console.error("[Cryptoreflex] Global runtime error", {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    } else {
      console.error("[Cryptoreflex] Global runtime error", error);
    }
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
          background: "#0B0D10",
          color: "#F4F5F7",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: 480 }}>
          <div
            aria-hidden="true"
            style={{
              fontSize: 48,
              lineHeight: 1,
              color: "#F5A524",
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: "0 0 12px",
              letterSpacing: "-0.01em",
            }}
          >
            Une erreur critique est survenue
          </h1>
          <p style={{ color: "#9BA3AF", margin: "0 0 24px", lineHeight: 1.5 }}>
            Le site n'a pas pu charger correctement. Tu peux essayer de
            recharger la page ou revenir dans quelques instants.
          </p>

          {error.digest ? (
            <p
              style={{
                color: "#9BA3AF",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 12,
                margin: "0 0 24px",
              }}
            >
              Réf. : {error.digest}
            </p>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: "#F5A524",
                color: "#0B0D10",
                border: "none",
                borderRadius: 12,
                padding: "12px 20px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              Recharger
            </button>
            <a
              href="/"
              style={{
                background: "transparent",
                color: "#F4F5F7",
                border: "1px solid #262B33",
                borderRadius: 12,
                padding: "12px 20px",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                minHeight: 44,
              }}
            >
              Retour à l'accueil
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

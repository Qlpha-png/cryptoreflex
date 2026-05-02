/**
 * sentry.client.config.ts — Init Sentry côté browser.
 *
 * Chargé automatiquement par @sentry/nextjs au boot du bundle client.
 * - DSN exposé via NEXT_PUBLIC_* (obligatoire côté browser).
 * - Si DSN absent : Sentry est no-op (pas d'init), aucun bruit.
 * - dev (NODE_ENV !== "production") : on capture les events mais on les drop
 *   en `beforeSend` pour éviter de polluer le projet Sentry pendant les tests.
 *
 * Replay : on désactive `replaysSessionSampleRate` (Pro plan) pour rester
 * sur le free tier ; `replaysOnErrorSampleRate: 1` ne consomme du quota que
 * lorsqu'une erreur est capturée → coût marginal.
 */

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Performance — 10% des transactions (assez pour repérer les regressions
    // sans cramer le quota free tier 50k transactions/mois).
    tracesSampleRate: 0.1,

    // Session Replay — désactivé hors erreur (Pro plan only). On garde
    // replaysOnErrorSampleRate: 1 pour avoir le replay des erreurs capturées
    // (cas d'usage le plus utile pour debugger une regression UI).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // Bruit récurrent à filtrer.
    // FIX 2026-05-02 audit Sentry user — élargi la liste après observation
    // des premiers events réels :
    //  - "Failed to fetch" + stack `prefetch-cache-utils` = Next.js prefetch
    //    interrompu (user navigue ou ferme l'onglet pendant le prefetch).
    //    Pas un vrai bug. Filtré dans beforeSend (par stack).
    //  - "AbortError: Transition was skipped" = navigation Next.js interrompue
    //    (user re-clique avant fin route change). Pas un vrai bug.
    //  - "AbortError" générique = nos AbortController (cmdk close, AskAI stop,
    //    streamRef abort au unmount). Comportement intentionnel.
    //  - "Failed to fetch" générique = perte connexion mid-fetch. Pas un bug code.
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection captured",
      /^Network Error$/,
      /^AbortError/,
      /^Failed to fetch$/,
      "Transition was skipped",
      "Load failed", // Safari équivalent de "Failed to fetch"
      "NetworkError when attempting to fetch",
    ],

    beforeSend(event) {
      // Pas de bruit en dev — on log uniquement les events prod réels.
      if (process.env.NODE_ENV !== "production") {
        return null;
      }
      // Filtrage par stack : si l'erreur vient du prefetch/router-reducer
      // Next.js (transient), on drop. C'est jamais un vrai bug code.
      try {
        const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
        const isNextPrefetchNoise = frames.some((f) => {
          const file = f?.filename ?? "";
          return (
            file.includes("router-reducer/fetch-server-response") ||
            file.includes("router-reducer/prefetch-cache-utils") ||
            file.includes("router-reducer/reducers/prefetch-reducer") ||
            file.includes("shared/lib/router/action-queue")
          );
        });
        if (isNextPrefetchNoise) {
          return null;
        }
      } catch {
        // Si le parsing du stack échoue, on garde l'event (mieux vaut bruit
        // que silence sur un vrai bug).
      }
      return event;
    },
  });
}

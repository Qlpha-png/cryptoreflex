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

    // Bruit récurrent à filtrer (ResizeObserver est un faux positif Chrome
    // connu, "Non-Error promise rejection" = libs tierces qui rejettent un
    // string, "Network Error" = perte de connexion utilisateur).
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection captured",
      /^Network Error$/,
    ],

    beforeSend(event) {
      // Pas de bruit en dev — on log uniquement les events prod réels.
      if (process.env.NODE_ENV !== "production") {
        return null;
      }
      return event;
    },
  });
}

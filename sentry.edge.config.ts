/**
 * sentry.edge.config.ts — Init Sentry côté Edge Runtime (middleware,
 * Edge Functions / Route Handlers configurés avec runtime = "edge").
 *
 * Le runtime Edge a une surface API restreinte (pas de Node APIs). Sentry
 * fournit un build dédié qui évite les imports incompatibles.
 *
 * Replay/profiling indisponibles côté edge — on garde uniquement la
 * capture d'erreurs + le sampling de transactions.
 */

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    tracesSampleRate: 0.1,

    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection captured",
      /^Network Error$/,
    ],

    beforeSend(event) {
      if (process.env.NODE_ENV !== "production") {
        return null;
      }
      return event;
    },
  });
}

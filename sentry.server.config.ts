/**
 * sentry.server.config.ts — Init Sentry côté Node.js (Vercel Functions).
 *
 * Chargé automatiquement par @sentry/nextjs via instrumentation.ts au boot
 * du runtime serveur. Capture les exceptions des Server Components, Route
 * Handlers, Server Actions, et middleware (sauf middleware en Edge — voir
 * sentry.edge.config.ts).
 *
 * On garde la même politique de filtrage que côté browser pour cohérence.
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

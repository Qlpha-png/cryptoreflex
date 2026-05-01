/**
 * instrumentation.ts — Hook Next.js (App Router) appelé au boot du runtime
 * serveur. C'est l'endroit recommandé par @sentry/nextjs pour initialiser
 * Sentry côté Node.js / Edge (pattern v8+).
 *
 * Cf. https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Note : `experimental.instrumentationHook` n'est plus requis depuis
 * Next.js 15 ; en 14.2 il l'est toujours pour activer ce hook. Mais
 * @sentry/nextjs > 8 l'active automatiquement via withSentryConfig si
 * besoin — on n'a rien à toucher dans next.config.js de ce côté.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Hook erreurs des Request Handlers (App Router) — branche Sentry sur
 * les uncaught errors des Server Components / Route Handlers.
 * Réexporté depuis @sentry/nextjs pour zéro boilerplate.
 */
export { captureRequestError as onRequestError } from "@sentry/nextjs";

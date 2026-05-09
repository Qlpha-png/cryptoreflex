/**
 * instrumentation-client.ts — Init Sentry côté browser (Sentry 8+/10 pattern).
 *
 * Remplace l'ancien `sentry.client.config.ts` (déprécié à partir de Sentry 8 ;
 * incompatible avec Turbopack). Webpack le détecte automatiquement via le regex
 *   /(?:sentry\.client\.config\.(jsx?|tsx?)|(?:src[\\/])?instrumentation-client\.(js|ts))$/
 * (cf. node_modules/@sentry/nextjs/build/cjs/config/webpack.js).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PERF FIX 2026-05-09 — Sentry browser SDK = 362 KB raw / 108 KB brotli, chargé
 * EAGER sur toutes les pages (chunk 2647-*.js). Lighthouse mobile : +400-800 ms
 * de TBT. La config était dans `sentry.client.config.ts` qui s'exécute en tout
 * début du bootstrap client → bloque le main thread juste avant le first paint.
 *
 * Stratégie : on diffère l'init dans `requestIdleCallback` (fallback `setTimeout`).
 *  - Le bundle Sentry reste chargé (le webpack plugin l'injecte comme entry,
 *    impossible de le sortir du first-load chunk sans réécrire withSentryConfig).
 *  - Mais l'init (parsing config + register listeners + monkey-patch fetch/XHR
 *    + setup tracing) ne tourne plus sur le main thread initial.
 *  - Conséquence : capture des erreurs runtime DIFFÉRÉE de ~50-300 ms après
 *    l'idle (acceptable : 99 % des erreurs surviennent au moins après le
 *    premier tap user, donc bien après l'idle).
 *
 * Côté serveur (instrumentation.ts → sentry.server.config.ts) : INCHANGÉ.
 * On garde init eager Node.js + Edge runtime → toutes les erreurs SSR / Route
 * Handlers / Server Actions restent capturées dès le boot du worker.
 * ─────────────────────────────────────────────────────────────────────────
 */

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // FIX 2026-05-08 — audit Lighthouse a revele des `Minified React error
    // #422/#425` (hydration mismatch) qui apparaissent UNIQUEMENT via
    // console.error natif (et seulement en prod reelle, pas en build prod
    // local — donc lie au cache ISR Coolify ou Cloudflare).
    //
    // Sentry par defaut NE capture PAS console.error. Pour eviter de polluer
    // (3rd party libs spamment beaucoup), on filtre AVANT capture pour ne
    // garder QUE les `Minified React error` qui sont notre vraie cible.
    // Le filtre `ignoreErrors` (plus bas) continue de nettoyer le reste.
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
    ],

    // Performance — 10% des transactions (assez pour repérer les regressions
    // sans cramer le quota free tier 50k transactions/mois).
    tracesSampleRate: 0.1,

    // Session Replay — DÉSACTIVÉ entièrement (PERF FIX 2026-05-09).
    // L'ancienne config avait `replaysOnErrorSampleRate: 1.0` MAIS sans
    // `Sentry.replayIntegration()` dans `integrations`, ce qui ne l'activait
    // jamais réellement (Replay n'est PAS dans les default integrations browser).
    // → On retire complètement les sample rates pour signaler clairement
    // qu'on n'utilise pas Replay (et éviter qu'un futur dev pense que ça marche).
    // Si on veut Replay plus tard : ajouter `Sentry.lazyLoadIntegration("replayIntegration")`
    // dans un useEffect d'un composant non-critique (loader déféré, ~50KB).

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
    // FIX 2026-05-02 audit user (run #2) — l'event Sentry remontait encore
    // "Failed to fetch (www.cryptoreflex.fr)" malgré le filtre `/^Failed to fetch$/`
    // car ce regex exige le match EXACT et n'attrapait pas les variantes avec
    // domaine entre parenthèses. Sentry compare ignoreErrors en substring si
    // string fournie, en regex test() si regex fournie.
    // → On utilise des STRINGS (substring) pour les messages "Failed to fetch"
    // et "AbortError" qui sont systématiquement transient et jamais un vrai
    // bug code (nos fetches sont tous dans try/catch + cleanup AbortController).
    ignoreErrors: [
      "ResizeObserver loop",
      "Non-Error promise rejection captured",
      "Network Error",
      "AbortError",
      "Failed to fetch", // substring : attrape "Failed to fetch", "Failed to fetch (host)", etc.
      "Transition was skipped",
      "Load failed", // Safari équivalent de "Failed to fetch"
      "NetworkError when attempting to fetch",
      "cancelled", // iOS Safari fetch cancel
      "The user aborted a request",
    ],

    // denyUrls : drop les events qui viennent de scripts tiers (extensions
    // browser, scrapers anti-bot, scripts injectés). Ces errors ne sont JAMAIS
    // un bug de notre code et polluent Sentry.
    denyUrls: [
      /chrome-extension:\/\//i,
      /moz-extension:\/\//i,
      /safari-extension:\/\//i,
      /safari-web-extension:\/\//i,
      /^app:\/\/\/frame_ant\//i, // anti-bot scanner observé en prod
      /^app:\/\/\/[^/]*ant[^/]*\.js/i, // variantes
    ],

    beforeSend(event) {
      // Pas de bruit en dev — on log uniquement les events prod réels.
      if (process.env.NODE_ENV !== "production") {
        return null;
      }

      // FIX 2026-05-08 — filtrage des events captures via console.error :
      // captureConsoleIntegration ajoute le breadcrumb logger:"console". On
      // veut UNIQUEMENT capturer les Minified React errors (#422/#425/etc.)
      // pas tout le bruit (libs externes, warnings benins).
      const isFromConsole =
        event.logger === "console" ||
        event.tags?.logger === "console" ||
        event.breadcrumbs?.some((b) => b.category === "console" && b.level === "error");
      if (isFromConsole) {
        const msg =
          event.message ||
          event.exception?.values?.[0]?.value ||
          "";
        // On garde SEULEMENT les Minified React errors. Tout autre console.error
        // est ignore (Plausible noise, Reddit pixel CSP block, etc.).
        if (typeof msg !== "string" || !msg.includes("Minified React error")) {
          return null;
        }
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

// Defer init au prochain idle frame du browser. Si l'API n'est pas dispo
// (Safari < 16.4 typiquement), fallback sur setTimeout(0) → init dans la
// macrotask suivante, donc après le first paint.
//
// Pourquoi pas un simple `setTimeout(0)` partout ? `requestIdleCallback`
// attend que le main thread soit RÉELLEMENT idle (pas juste qu'un microtick
// soit passé). Sur mobile bas de gamme avec hydration React lourde, on peut
// économiser plusieurs centaines de ms supplémentaires.
//
// Timeout 2000 ms : si aucun idle ne survient en 2s (rare, mais possible
// sur très petit device avec énormément d'hydration), on force l'init.
if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => initSentry(), { timeout: 2000 });
  } else {
    setTimeout(() => initSentry(), 0);
  }
}

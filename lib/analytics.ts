/**
 * Analytics — Cryptoreflex
 * ------------------------
 * Wrapper minimal au-dessus des custom events Vercel Web Analytics
 * (`track` de @vercel/analytics ; Plausible retiré le 2026-05-21).
 *
 * - Le script Vercel est injecté par `<Analytics />` (app/layout.tsx). Sans
 *   lui (bloqueur, dev), `track()` est un no-op sûr (window.va absent).
 * - SSR-safe : tous les appels vérifient `typeof window`.
 * - Vercel Web Analytics : sans cookie ni IP stockée (cf. commentaire
 *   « Analytics — migration 2026-05-21 » dans app/layout.tsx).
 *
 * Server-side, indépendant du script :
 *  - `trackAffiliateClick` POST aussi vers `/api/analytics/affiliate-click`
 *    pour persister un compteur KV (`analytics:aff-click:...`) → /admin/stats.
 *  - Les redirections /go/[partner] incrémentent le même compteur KV
 *    côté serveur (cf. app/go/[partner]/route.ts).
 */

import { track as vercelTrack } from "@vercel/analytics";

/**
 * Legacy Plausible — conservé pour le typage de `window.plausible`, encore
 * référencé par quelques composants (PerfMonitor…) qui restent des no-ops.
 */
type PlausibleEventOptions = {
  props?: Record<string, string | number | boolean>;
  callback?: () => void;
  u?: string; // override URL (utile pour outbound-links)
};

// Augmentation du type global window pour TypeScript.
declare global {
  interface Window {
    plausible?: (eventName: string, options?: PlausibleEventOptions) => void;
  }
}

/**
 * Liste des custom events (Vercel Web Analytics — onglet Events du dashboard).
 *
 * FIX DATA 2026-05-02 #19 (audit expert data) — extension du catalogue
 * d'EVENTS critiques business non-trackés. Naming standardisé Title Case
 * (vs ancien chaos kebab-case "calc-fiscal-start"). Bannir les literals
 * inline dans `track()` — toujours utiliser `EVENTS.X`.
 */
export const EVENTS = {
  // Acquisition / engagement
  AffiliateClick: "Affiliate Click",
  NewsletterSignup: "Newsletter Signup",
  ToolUsage: "Tool Usage",
  ArticleRead: "Article Read",
  Outbound: "Outbound Link",
  // Search & navigation
  SearchUsed: "Search Used",
  SearchNoResults: "Search No Results",
  // Quiz & onboarding
  QuizStarted: "Quiz Started",
  QuizCompleted: "Quiz Completed",
  QuizResultViewed: "Quiz Result Viewed",
  // Outils
  RoiSimulatorUsed: "ROI Simulator Used",
  CalculatorResult: "Calculator Result",
  LeadMagnetDownloaded: "Lead Magnet Downloaded",
  // Pro funnel
  ProPlanViewed: "Pro Plan Viewed",
  ProCheckoutStarted: "Pro Checkout Started",
  ProSubscribed: "Pro Subscribed",         // Server-side via webhook Stripe
  ProChurned: "Pro Churned",                // Server-side via webhook Stripe
  // Account
  AccountCreated: "Account Created",
  WalletConnected: "Wallet Connected",
  // A/B testing
  VariantExposed: "Variant Exposed",
  VariantConversion: "Variant Conversion",
  // CTA visibility (impression-tracking)
  CtaVisible: "CTA Visible 50pct",
  // FAQ pricing (signal d'objection)
  PricingFaqExpanded: "Pricing FAQ Expanded",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * Nombre max de propriétés par custom event Vercel sur le plan Pro (8 avec
 * l'add-on Web Analytics Plus). Source : vercel.com/docs/analytics/limits-and-pricing
 * (consulté le 2026-10-02). On garde les N premières clés, dans l'ordre
 * d'insertion → les appelants mettent la propriété la plus utile en premier
 * (ex. trackAffiliateClick : platform, placement, puis cta).
 */
const MAX_EVENT_PROPS = 2;

/**
 * Émet un custom event Vercel Web Analytics (`<Analytics />` monté dans
 * app/layout.tsx). No-op côté serveur ou si le script n'est pas chargé.
 *
 * FIX 2026-10-02 — conversion tracking mort depuis la sortie de Plausible
 * (2026-05-21) : cette fonction ne parlait qu'à `window.plausible`, absent →
 * aucun event. Noms d'events (EVENTS) inchangés.
 */
export function track(
  eventName: string,
  props?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  try {
    if (props && Object.keys(props).length > 0) {
      const capped = Object.fromEntries(
        Object.entries(props).slice(0, MAX_EVENT_PROPS),
      );
      vercelTrack(eventName, capped);
    } else {
      vercelTrack(eventName);
    }
  } catch {
    /* on n'altère jamais l'UX si l'analytics échoue */
  }
}

/* -------------------------------------------------------------------------- */
/* Trackers métier                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Clic sur un lien d'affiliation.
 *
 * Surcharge volontairement permissive : on garde l'ancienne signature
 * `(platform, placement?)` pour compat avec tous les composants existants
 * et on ajoute un overload enrichi `(platform, placement, ctaText)`.
 *
 * @param platformId identifiant kebab-case de la plateforme (ex: "coinbase")
 * @param placement zone du site où le clic a eu lieu (ex: "home-platforms",
 *   "comparison-table", "review-cta", "platform-card-sub-cta"). TRÈS utile
 *   pour identifier ce qui convertit le mieux.
 * @param ctaText texte exact du CTA cliqué (ex: "S'inscrire sur Coinbase",
 *   "Lire l'avis détaillé"). Utile pour A/B-tester le wording des boutons.
 */
export function trackAffiliateClick(
  platformId: string,
  placement?: string,
  ctaText?: string,
): void {
  // 1) Custom event Vercel Web Analytics (côté browser ; props limitées à 2 sur Pro).
  track(EVENTS.AffiliateClick, {
    platform: platformId,
    ...(placement ? { placement } : {}),
    ...(ctaText ? { cta: ctaText } : {}),
  });

  // 2) POST KV server-side (indépendant du script analytics).
  //    On n'a pas besoin du consent ici : les compteurs KV sont totalement
  //    anonymes (aucune donnée perso, aucun cookie posé). Conforme RGPD.
  postAffiliateClickServerSide(platformId, placement, ctaText);
}

/**
 * Fire-and-forget POST vers /api/analytics/affiliate-click pour persister
 * la stat côté KV (servir la page /admin/stats). Aucune exception remontée.
 */
function postAffiliateClickServerSide(
  platformId: string,
  placement?: string,
  ctaText?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/analytics/affiliate-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformId,
        placement: placement ?? "unknown",
        cta: ctaText ?? null,
      }),
      // keepalive : la requête survit si l'utilisateur quitte la page
      // (essentiel : on tracke souvent juste avant un redirect affilié).
      keepalive: true,
    }).catch(() => {
      /* analytics never blocks UX */
    });
  } catch {
    /* ignore */
  }
}

/**
 * Inscription à la newsletter (à appeler après succès de la requête).
 * @param source d'où vient l'inscription (ex: "footer", "blog-cta", "popup")
 */
export function trackNewsletterSignup(source: string = "unknown"): void {
  track(EVENTS.NewsletterSignup, { source });
}

/**
 * Usage d'un outil (calculateur de profit, simulateur fiscal, etc.).
 * @param toolName ex: "tax-calculator", "profit-calculator", "dca-simulator"
 * @param action sous-action optionnelle (ex: "compute", "export", "share")
 */
export function trackToolUsage(toolName: string, action?: string): void {
  track(EVENTS.ToolUsage, {
    tool: toolName,
    ...(action ? { action } : {}),
  });
}

/**
 * Profondeur de lecture d'un article (à appeler à 25 / 50 / 75 / 100 %).
 * @param slug slug de l'article
 * @param depth pourcentage atteint (25, 50, 75, 100)
 */
export function trackArticleRead(slug: string, depth: 25 | 50 | 75 | 100): void {
  track(EVENTS.ArticleRead, { slug, depth });
}

/**
 * Helper générique pour tout lien sortant non-affilié (Twitter, Trustpilot…).
 */
export function trackOutbound(url: string): void {
  track(EVENTS.Outbound, { url });
}

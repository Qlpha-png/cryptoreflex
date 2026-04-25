/**
 * Analytics — Cryptoreflex
 * ------------------------
 * Wrapper minimal au-dessus de l'API custom events de Plausible.
 *
 * - Aucune dépendance externe.
 * - Respecte le consentement utilisateur (catégorie "analytics").
 *   Si l'utilisateur a refusé, le script Plausible n'est pas chargé du tout
 *   (cf. app/layout.tsx + components/PlausibleScript.tsx) — donc les appels
 *   ci-dessous deviennent simplement des no-ops sûrs.
 * - SSR-safe : tous les appels vérifient `typeof window`.
 *
 * Référence Plausible custom events :
 *   https://plausible.io/docs/custom-event-goals
 *   La fonction globale `window.plausible(eventName, { props: {...} })`
 *   est exposée par le snippet `script.js` quand `data-domain` est défini.
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

/** Liste des événements custom configurables comme "Goals" dans Plausible. */
export const EVENTS = {
  AffiliateClick: "Affiliate Click",
  NewsletterSignup: "Newsletter Signup",
  ToolUsage: "Tool Usage",
  ArticleRead: "Article Read",
  Outbound: "Outbound Link", // fallback générique
} as const;

/** Émet un événement Plausible si le script est chargé. No-op sinon. */
export function track(
  eventName: string,
  props?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;
  try {
    window.plausible(eventName, props ? { props } : undefined);
  } catch {
    /* on n'altère jamais l'UX si l'analytics échoue */
  }
}

/* -------------------------------------------------------------------------- */
/* Trackers métier                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Clic sur un lien d'affiliation.
 * @param platform identifiant kebab-case de la plateforme (ex: "coinbase")
 * @param placement zone du site où le clic a eu lieu (ex: "platforms-section",
 *   "comparison-table", "review-cta"). Optionnel mais TRÈS utile pour mesurer
 *   ce qui convertit le mieux.
 */
export function trackAffiliateClick(
  platform: string,
  placement?: string
): void {
  track(EVENTS.AffiliateClick, {
    platform,
    ...(placement ? { placement } : {}),
  });
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

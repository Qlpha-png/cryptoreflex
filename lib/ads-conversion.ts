/**
 * lib/ads-conversion.ts — helper client pour fire un événement de conversion
 * vers tous les pixels publicitaires installés (Reddit + X + Google Ads).
 *
 * Usage :
 *
 *   import { trackAdsConversion } from "@/lib/ads-conversion";
 *
 *   // Newsletter signup
 *   trackAdsConversion("subscribe_newsletter");
 *
 *   // Pro checkout
 *   trackAdsConversion("purchase", { value: 9.99, currency: "EUR", tier: "pro_plus_monthly" });
 *
 * Aucun appel réseau si l'utilisateur n'a pas accepté les cookies (les pixels
 * sous-jacents respectent le consent gating de <AdsPixels />).
 *
 * Aucun crash si un pixel n'est pas installé : on no-op silencieusement.
 *
 * NB : ce helper est CLIENT-ONLY. Il s'appuie sur `window.rdt`, `window.twq`,
 * `window.gtag`. Côté serveur (route handlers, server actions, etc.) il faut
 * utiliser `lib/analytics-server.ts` (track via Plausible Events API).
 */

type AdsEventName =
  | "subscribe_newsletter"
  | "purchase"
  | "lead"
  | "tool_used"
  | "view_content"
  | "complete_registration";

interface AdsEventProps {
  /** Valeur monétaire de la conversion (EUR) — utile pour ROAS. */
  value?: number;
  /** Code devise ISO 4217. Défaut "EUR". */
  currency?: string;
  /** Plan Stripe (pro_monthly, pro_annual, pro_plus_monthly, pro_plus_annual). */
  tier?: string;
  /** ID/slug de l'outil pour `tool_used`. */
  toolId?: string;
  /** Email haché pour l'enhanced conversion (optionnel, FYI ne PAS passer email clair). */
  hashedEmail?: string;
}

/* -------------------------------------------------------------------------- */
/*  Mapping event name -> nom natif de chaque réseau                          */
/* -------------------------------------------------------------------------- */

// Reddit standard events : https://business.reddithelp.com/s/article/manual-reddit-pixel-installation
const REDDIT_EVENT_MAP: Record<AdsEventName, string> = {
  subscribe_newsletter: "Lead",
  purchase: "Purchase",
  lead: "Lead",
  tool_used: "ViewContent",
  view_content: "ViewContent",
  complete_registration: "SignUp",
};

// X (Twitter) standard events : https://developer.x.com/en/docs/twitter-ads-api/measurement/web-conversions
const X_EVENT_MAP: Record<AdsEventName, string> = {
  subscribe_newsletter: "tw-newsletter-signup",
  purchase: "tw-purchase",
  lead: "tw-lead",
  tool_used: "tw-page-view",
  view_content: "tw-page-view",
  complete_registration: "tw-signup",
};

// Google Ads conversion labels — chacun est un label distinct créé dans Google
// Ads UI (Conversions > New conversion action). Configurer via env vars.
function getGoogleAdsConversionLabel(event: AdsEventName): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  if (!id) return null;
  switch (event) {
    case "subscribe_newsletter":
      return process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_NEWSLETTER ?? null;
    case "purchase":
      return process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_PURCHASE ?? null;
    case "lead":
      return process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_LEAD ?? null;
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Window typings                                                            */
/* -------------------------------------------------------------------------- */

declare global {
  interface Window {
    rdt?: (action: string, eventName: string, props?: Record<string, unknown>) => void;
    twq?: (action: string, eventName: string, props?: Record<string, unknown>) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Fire un événement de conversion vers tous les pixels installés.
 *
 * Sécurisé : aucun crash si pixels non installés ou refus cookie.
 */
export function trackAdsConversion(event: AdsEventName, props?: AdsEventProps): void {
  if (typeof window === "undefined") return;

  const value = props?.value;
  const currency = props?.currency ?? "EUR";

  // 1. Reddit
  try {
    if (typeof window.rdt === "function") {
      const rdtEvent = REDDIT_EVENT_MAP[event];
      const rdtProps: Record<string, unknown> = {};
      if (typeof value === "number") {
        rdtProps.value = value;
        rdtProps.currency = currency;
      }
      if (props?.tier) rdtProps.itemCount = 1;
      window.rdt("track", rdtEvent, rdtProps);
    }
  } catch {
    // ignore — best-effort tracking
  }

  // 2. X (Twitter)
  try {
    if (typeof window.twq === "function") {
      const twqEvent = X_EVENT_MAP[event];
      const twqProps: Record<string, unknown> = {};
      if (typeof value === "number") {
        twqProps.value = value;
        twqProps.currency = currency;
      }
      window.twq("event", twqEvent, twqProps);
    }
  } catch {
    // ignore
  }

  // 3. Google Ads
  try {
    if (typeof window.gtag === "function") {
      const label = getGoogleAdsConversionLabel(event);
      const gAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
      if (label && gAdsId) {
        const gAdsProps: Record<string, unknown> = {
          send_to: `${gAdsId}/${label}`,
        };
        if (typeof value === "number") {
          gAdsProps.value = value;
          gAdsProps.currency = currency;
        }
        window.gtag("event", "conversion", gAdsProps);
      }
    }
  } catch {
    // ignore
  }

  // 4. Bonus : Plausible custom event si dispo (analytics côté Cryptoreflex)
  try {
    const w = window as unknown as { plausible?: (eventName: string, opts?: { props?: Record<string, unknown> }) => void };
    if (typeof w.plausible === "function") {
      const plausibleProps: Record<string, unknown> = {};
      if (typeof value === "number") plausibleProps.value = value;
      if (props?.tier) plausibleProps.tier = props.tier;
      if (props?.toolId) plausibleProps.toolId = props.toolId;
      w.plausible(event, { props: plausibleProps });
    }
  } catch {
    // ignore
  }
}

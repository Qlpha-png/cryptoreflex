/**
 * lib/analytics-server.ts — Server-side tracking helpers.
 *
 * FIX DATA 2026-05-02 #19 (audit expert data) — bypass adblocker (~30 %
 * du trafic crypto en France) en envoyant les events business critiques
 * directement vers l'API Plausible Events depuis nos serveurs (webhooks
 * Stripe, conversions affiliate, etc.). Avant ce fix, les revenus Pro
 * subscriptions n'étaient PAS visibles dans Plausible.
 *
 * Usage typique (webhook Stripe, cron, server action) :
 *
 *   import { trackServer } from "@/lib/analytics-server";
 *   await trackServer("Pro Subscribed", {
 *     plan: "pro_monthly",
 *     mrr: 2.99,
 *   });
 *
 * Référence : https://plausible.io/docs/events-api
 *
 * Sécurité : aucune donnée PII (email, user ID hashé OK).
 */

const PLAUSIBLE_API_URL = "https://plausible.io/api/event";

interface ServerEventOptions {
  /** Domaine Plausible (default depuis env). */
  domain?: string;
  /** URL associée à l'event (default https://www.cryptoreflex.fr/server). */
  url?: string;
  /** User-Agent à transmettre (default "Cryptoreflex Server"). */
  userAgent?: string;
  /** IP du user (X-Forwarded-For) — optionnel pour deduplication Plausible. */
  ip?: string;
}

/**
 * Envoie un event Plausible côté serveur. No-op si NEXT_PUBLIC_PLAUSIBLE_DOMAIN
 * n'est pas configuré (mode local/dev).
 *
 * Best-effort : si l'API Plausible répond non-2xx, on log et on continue
 * (un event analytics ne doit JAMAIS bloquer un workflow business critique
 * comme un webhook Stripe).
 */
export async function trackServer(
  eventName: string,
  props?: Record<string, string | number | boolean>,
  options: ServerEventOptions = {},
): Promise<void> {
  const domain =
    options.domain ?? process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "";
  if (!domain) {
    // No-op silencieux en dev (pas de spam log).
    return;
  }

  const url = options.url ?? `https://${domain}/server`;
  const userAgent = options.userAgent ?? "Cryptoreflex Server";
  const ip = options.ip;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": userAgent,
  };
  if (ip) {
    headers["X-Forwarded-For"] = ip;
  }

  try {
    const res = await fetch(PLAUSIBLE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        domain,
        name: eventName,
        url,
        props: props ?? {},
      }),
      // Best-effort : 3 sec timeout, on ne bloque pas le workflow critique.
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.warn(
        `[analytics-server] Plausible API ${res.status}: ${eventName}`,
      );
    }
  } catch (err) {
    console.warn(
      `[analytics-server] Failed to track ${eventName}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

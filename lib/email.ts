/**
 * lib/email.ts — Wrapper Resend avec fallback "mocked".
 *
 * Aligné sur le même pattern que `lib/newsletter.ts` :
 *  - Si RESEND_API_KEY absente, on log la requête et on retourne `{ ok: true }`.
 *  - Si présente, on POST sur l'API Resend (`/emails`).
 *
 * Pourquoi Resend (pas SendGrid / Mailgun) ?
 *  - DX moderne (API REST stricte, doc lisible)
 *  - Free tier 3000 emails/mois — confortable pour les alertes prix
 *  - Délivrabilité solide (Postmark-tier) sans config DKIM/SPF compliquée
 *  - Compatible edge runtime (un simple `fetch`)
 *
 * Pas de dépendance externe : `fetch` natif.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Override du from (sinon RESEND_FROM_EMAIL ou "alertes@cryptoreflex.fr"). */
  from?: string;
  /** Tag Resend pour catégoriser dans le dashboard (max 10 chars). */
  tag?: string;
  /** Reply-to optionnel (par défaut, pas de reply pour les alertes auto). */
  replyTo?: string;
}

export type SendEmailResult =
  | { ok: true; mocked: false; id: string }
  | { ok: true; mocked: true; reason: string }
  | { ok: false; error: string; status?: number };

const RESEND_BASE = "https://api.resend.com";
const DEFAULT_FROM = "Cryptoreflex Alertes <alertes@cryptoreflex.fr>";

/**
 * Envoie un email via Resend (ou mocké si l'API key manque).
 *
 * Erreurs : on ne throw jamais — on retourne `{ ok: false }` pour permettre
 * au caller (cron, route) de logger sans crasher l'évaluation des autres alertes.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEnv = process.env.RESEND_FROM_EMAIL;
  const from = input.from ?? fromEnv ?? DEFAULT_FROM;

  // ---- Fallback mock : pas de credentials ----
  if (!apiKey) {
    // console.info plutôt que warn pour ne pas polluer Sentry/Vercel logs en dev.
    console.info("[email] mode mock — RESEND_API_KEY absente. Email simulé :", {
      to: input.to,
      from,
      subject: input.subject,
      htmlLength: input.html.length,
      tag: input.tag,
    });
    return {
      ok: true,
      mocked: true,
      reason: "RESEND_API_KEY manquante",
    };
  }

  // ---- Mode réel ----
  try {
    const res = await fetch(`${RESEND_BASE}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        // Resend supporte `tags` pour segmentation analytics.
        tags: input.tag ? [{ name: "category", value: input.tag }] : undefined,
        reply_to: input.replyTo,
      }),
      cache: "no-store",
      // 8s : Resend répond en ~200 ms typique, 8s = vraie panne réseau.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[email] Resend error", {
        status: res.status,
        body: text.slice(0, 500),
        to: input.to,
      });
      return {
        ok: false,
        error: "Envoi email impossible.",
        status: res.status,
      };
    }

    const json = (await res.json()) as { id?: string };
    return {
      ok: true,
      mocked: false,
      id: json.id ?? "unknown",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[email] Resend fetch failed", { message: msg, to: input.to });
    return { ok: false, error: "Service email temporairement indisponible." };
  }
}

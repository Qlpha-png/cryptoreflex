/**
 * Resend email client.
 *
 * IMPORTANT — refonte 27/04/2026 :
 *  - Avant : sendEmail() re-wrappait le HTML via wrapHtml() (header + footer).
 *    Mais les templates dans `lib/email/templates.ts` utilisent deja
 *    `wrapEmail()` de `lib/email/components.ts` qui produit un HTML complet
 *    (DOCTYPE + html + body + header + footer). Resultat : DOUBLE WRAP →
 *    `<html>` imbrique dans `<body>`, deux DOCTYPE, deux footers, deux
 *    pre-headers cloaks → Gmail spam filter trigger immediat.
 *  - Maintenant : sendEmail() passe `opts.html` brut (deja wrappe) directement
 *    a Resend. Aucun double-wrap, HTML structurellement valide.
 *
 * GRACEFUL DEGRADATION : si RESEND_API_KEY absent, sendEmail() log un warn
 * et retourne sans crasher. Le webhook Stripe doit pouvoir traiter le
 * paiement meme sans email envoye.
 */

import { Resend } from "resend";
import { BRAND_EMAIL } from "./tokens";

let _resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  /** HTML COMPLET deja wrappe via wrapEmail() de components.ts. */
  html: string;
  text: string;
  /** Pre-header (preview text Gmail/Outlook), 60 chars max — deja inclus dans html. */
  preheader?: string;
}

/**
 * Default From : `Cryptoreflex <hello@cryptoreflex.fr>`.
 *
 * NE PAS utiliser `onboarding@resend.dev` (sandbox Resend) en prod : Gmail
 * filtre quasi-systematiquement → spam/promotions tab. Le domaine
 * `cryptoreflex.fr` doit etre verifie dans Resend Dashboard (DKIM + SPF).
 *
 * Override possible via env var RESEND_FROM_EMAIL si besoin (ex: noreply@).
 */
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || BRAND_EMAIL.fromEmail || "hello@cryptoreflex.fr";
const FROM_NAME = BRAND_EMAIL.fromName || "Cryptoreflex";
const REPLY_TO = BRAND_EMAIL.supportEmail || "hello@cryptoreflex.fr";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || BRAND_EMAIL.siteUrl || "https://www.cryptoreflex.fr";

/**
 * Envoie un email transactionnel via Resend.
 * Retourne `{ ok: true, id }` si envoye, `{ ok: false, error }` sinon.
 * Ne throw JAMAIS — caller doit gerer le retour.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{
  ok: boolean;
  error?: string;
  id?: string;
}> {
  const resend = getResendClient();

  if (!resend) {
    console.warn(
      `[email] Resend non configure — email "${opts.subject}" non envoye a ${opts.to}`
    );
    return { ok: false, error: "Resend not configured" };
  }

  // Sanitize From : si l'env var contient encore le sandbox resend.dev,
  // on log un warning critique et on force notre domaine pour eviter le spam.
  const safeFrom = FROM_EMAIL.includes("resend.dev")
    ? "hello@cryptoreflex.fr"
    : FROM_EMAIL;
  if (FROM_EMAIL !== safeFrom) {
    console.warn(
      `[email] WARNING: RESEND_FROM_EMAIL=${FROM_EMAIL} (sandbox) → forced to ${safeFrom}. Update Vercel env vars.`
    );
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${safeFrom}>`,
      to: opts.to,
      subject: opts.subject,
      replyTo: REPLY_TO,
      html: opts.html, // FIX double-wrap : HTML deja complet via wrapEmail()
      text: opts.text,
      headers: {
        // RFC 8058 List-Unsubscribe pour Gmail bulk sender compliance 2024+
        "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>, <${SITE_URL}/api/email/unsubscribe?email=${encodeURIComponent(opts.to)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        // Feedback-ID pour Gmail Postmaster Tools (improve deliverability monitoring)
        "Feedback-ID": `transactional:cryptoreflex:${Date.now()}`,
      },
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] sendEmail exception:", message);
    return { ok: false, error: message };
  }
}

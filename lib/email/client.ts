/**
 * Resend email client + helpers.
 *
 * Templates HTML inline (pas de @react-email/components — surcharge inutile).
 * Tous les templates sont en français, ton chaleureux mais pro, conformes
 * aux règles RGPD (header List-Unsubscribe + lien désinscription footer).
 *
 * GRACEFUL DEGRADATION : si RESEND_API_KEY absent, sendEmail() log un warn
 * et retourne sans crasher. Le webhook Stripe doit pouvoir traiter le
 * paiement même sans email envoyé.
 */

import { Resend } from "resend";

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
  html: string;
  text: string;
  /** Pré-header (preview text Gmail/Outlook), 60 chars max. */
  preheader?: string;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@cryptoreflex.fr";
const FROM_NAME = "Cryptoreflex";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr";

/**
 * Envoie un email transactionnel via Resend.
 * Retourne `{ ok: true }` si envoyé, `{ ok: false, error }` sinon.
 * Ne throw JAMAIS — caller doit gérer le retour.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{
  ok: boolean;
  error?: string;
  id?: string;
}> {
  const resend = getResendClient();

  if (!resend) {
    console.warn(
      `[email] Resend non configuré — email "${opts.subject}" non envoyé à ${opts.to}`
    );
    return { ok: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: opts.to,
      subject: opts.subject,
      html: wrapHtml(opts.html, opts.preheader, opts.to),
      text: opts.text,
      headers: {
        // RFC 8058 List-Unsubscribe pour Gmail bulk sender compliance 2024+
        "List-Unsubscribe": `<mailto:${FROM_EMAIL}?subject=unsubscribe>, <${SITE_URL}/api/email/unsubscribe?email=${encodeURIComponent(opts.to)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
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

/**
 * Wrap le HTML d'un template dans le shell commun (header + footer Cryptoreflex).
 * Évite la duplication dans chaque template + garantit la cohérence brand.
 */
function wrapHtml(content: string, preheader?: string, to?: string): string {
  const preheaderHidden = preheader
    ? `<div style="display:none;font-size:1px;color:#fafafa;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cryptoreflex</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#FAFAFA;">
${preheaderHidden}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#15171C;border-radius:16px;overflow:hidden;border:1px solid #2A2D35;">

<!-- Header brand -->
<tr><td style="background:linear-gradient(135deg,#0A0A0A 0%,#15171C 100%);padding:28px 28px 24px;text-align:center;border-bottom:1px solid #2A2D35;">
<a href="${SITE_URL}" style="text-decoration:none;">
<span style="color:#F59E0B;font-size:24px;font-weight:800;letter-spacing:1.5px;">CRYPTOREFLEX</span>
</a>
</td></tr>

<!-- Content -->
<tr><td style="padding:32px 28px;color:#FAFAFA;">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 28px;border-top:1px solid #2A2D35;font-size:12px;line-height:1.6;color:#71757D;text-align:center;">
<p style="margin:0 0 8px;">Cryptoreflex — éditeur indépendant français · SIREN 103 352 621</p>
<p style="margin:0;">
<a href="${SITE_URL}/mon-compte" style="color:#71757D;text-decoration:underline;">Mon compte</a>
&nbsp;·&nbsp;
<a href="${SITE_URL}/confidentialite" style="color:#71757D;text-decoration:underline;">Confidentialité</a>
&nbsp;·&nbsp;
<a href="${SITE_URL}/api/email/unsubscribe?email=${encodeURIComponent(to || "")}" style="color:#71757D;text-decoration:underline;">Désinscription</a>
</p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

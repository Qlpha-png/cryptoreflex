/**
 * Email components — header, footer, button, card.
 *
 * Design pro inspiré Resend, Linear, Stripe, Vercel emails.
 * Tous compatibles : Gmail (web/mobile), Outlook 2016+, Apple Mail, Yahoo.
 *
 * Inline CSS only (Gmail strip <style> en mobile app).
 * Table layout (Outlook ne supporte pas flex/grid).
 * Bulletproof button (mso conditional pour Outlook padding).
 */

import { EMAIL_TOKENS as T, BRAND_EMAIL } from "./tokens";

/* -------------------------------------------------------------------------- */
/*  Header — logo brand                                                       */
/* -------------------------------------------------------------------------- */

export function renderHeader(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,${T.colors.surface} 0%,${T.colors.bg} 100%);background-color:${T.colors.surface};">
  <tr><td align="center" style="padding:32px 24px;border-bottom:1px solid ${T.colors.border};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:${T.fonts.sans};font-size:20px;font-weight:800;letter-spacing:4px;color:${T.colors.primary};text-transform:uppercase;text-align:center;">CRYPTOREFLEX</td></tr></table>
  </td></tr>
</table>`;
}

/* -------------------------------------------------------------------------- */
/*  Footer — RGPD + List-Unsubscribe + mentions légales                       */
/* -------------------------------------------------------------------------- */

interface FooterArgs {
  email: string;
  unsubscribeUrl?: string;
  showSocial?: boolean;
}

export function renderFooter({
  email,
  unsubscribeUrl,
  showSocial = false,
}: FooterArgs): string {
  const safeEmail = email.replace(/[<>"'&]/g, "");
  const unsubUrl =
    unsubscribeUrl ||
    `${BRAND_EMAIL.siteUrl}/api/email/unsubscribe?email=${encodeURIComponent(safeEmail)}`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.colors.bg};border-top:1px solid ${T.colors.border};">
  <tr><td align="center" style="padding:32px 24px;font-family:${T.fonts.sans};color:${T.colors.textMuted};font-size:13px;line-height:1.6;">

    <!-- Liens nav -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:0 10px;"><a href="${BRAND_EMAIL.siteUrl}/mon-compte" style="color:${T.colors.primary};text-decoration:none;font-weight:600;font-size:13px;">Mon compte</a></td>
        <td style="color:${T.colors.border};">·</td>
        <td style="padding:0 10px;"><a href="${BRAND_EMAIL.siteUrl}/confidentialite" style="color:${T.colors.textMuted};text-decoration:none;font-size:13px;">Confidentialité</a></td>
        <td style="color:${T.colors.border};">·</td>
        <td style="padding:0 10px;"><a href="${unsubUrl}" style="color:${T.colors.textMuted};text-decoration:none;font-size:13px;">Désinscription</a></td>
      </tr>
    </table>

    <!-- Mention légale -->
    <p style="margin:0 0 8px;color:${T.colors.textMuted};font-size:12px;">
      <strong style="color:${T.colors.text};">${BRAND_EMAIL.legalName}</strong> — SIREN ${BRAND_EMAIL.siren}
    </p>
    <p style="margin:0 0 16px;color:#71717A;font-size:11px;line-height:1.5;max-width:480px;">
      Éditeur web indépendant français. Ne constitue pas un conseil en investissement (art. L541-1 CMF).
      Données traitées conformément au RGPD — droits accès/rectification/suppression via
      <a href="mailto:${BRAND_EMAIL.supportEmail}" style="color:${T.colors.textMuted};text-decoration:underline;">${BRAND_EMAIL.supportEmail}</a>.
    </p>
    <p style="margin:0;color:#52525B;font-size:11px;">© 2026 Cryptoreflex. Tous droits réservés.</p>

  </td></tr>
</table>`;
}

/* -------------------------------------------------------------------------- */
/*  Button — Bulletproof CTA (compat Outlook MSO)                             */
/* -------------------------------------------------------------------------- */

interface ButtonArgs {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}

export function renderButton({ href, label, variant = "primary" }: ButtonArgs): string {
  if (variant === "secondary") {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" style="border-radius:10px;border:1px solid ${T.colors.primary};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:13px 31px;font-family:${T.fonts.sans};font-size:15px;font-weight:600;color:${T.colors.primary};text-decoration:none;border-radius:10px;">${label}</a>
    </td></tr></table>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" bgcolor="${T.colors.primary}" style="border-radius:10px;background-color:${T.colors.primary};box-shadow:0 4px 14px rgba(245,158,11,0.35);">
    <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${T.fonts.sans};font-size:15px;font-weight:700;color:#0A0A0A;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">${label}</a>
  </td></tr></table>`;
}

/* -------------------------------------------------------------------------- */
/*  Wrap — wrapper HTML universel                                             */
/* -------------------------------------------------------------------------- */

interface WrapArgs {
  subject: string;
  preheader?: string;
  content: string; // HTML body
  email: string; // pour footer + unsubscribe url
  unsubscribeUrl?: string;
}

export function wrapEmail({
  subject,
  preheader = "",
  content,
  email,
  unsubscribeUrl,
}: WrapArgs): string {
  const preheaderHidden = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${T.colors.bg};">${escape(preheader)}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escape(subject)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .px-32{padding-left:24px !important;padding-right:24px !important;}
    .py-32{padding-top:24px !important;padding-bottom:24px !important;}
    h1{font-size:24px !important;}
  }
  a{color:${T.colors.primary};}
</style>
</head>
<body style="margin:0;padding:0;background-color:${T.colors.bg};font-family:${T.fonts.sans};-webkit-font-smoothing:antialiased;">
${preheaderHidden}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.colors.bg};">
<tr><td align="center">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;margin:0 auto;">
    <tr><td>${renderHeader()}</td></tr>
    <tr><td class="px-32 py-32" style="padding:40px 32px;background-color:${T.colors.bg};">${content}</td></tr>
    <tr><td>${renderFooter({ email, unsubscribeUrl })}</td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

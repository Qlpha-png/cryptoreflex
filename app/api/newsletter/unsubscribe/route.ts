/**
 * /api/newsletter/unsubscribe — endpoint RGPD (droit de retrait, art. 21).
 *
 * Deux modes :
 *
 *   1. GET  ?email=xxx&token=xxx  — one-click depuis un lien email.
 *      • Validation du token HMAC (timingSafe) côté serveur.
 *      • Si valide → unsubscribe Beehiiv + page HTML de confirmation.
 *      • Si invalide → 404 (pas de leak sur l'existence du compte).
 *
 *   2. POST { email }  — formulaire web depuis /confidentialite ou similaire.
 *      • Génère un token, envoie un email de confirmation via Resend
 *        (lien GET cliquable, double-opt-out style).
 *      • Always returns { ok: true } pour empêcher l'enumération d'abonnés.
 *
 * Pourquoi un endpoint custom plutôt que le lien Beehiiv natif ?
 *  - On envoie via Resend (pas via Beehiiv SMTP) → l'URL `{{unsubscribe_url}}`
 *    Beehiiv n'est pas substituée. Il faut notre propre endpoint.
 *  - RGPD impose un lien fonctionnel dans CHAQUE email envoyé. Sans cet
 *    endpoint, les emails de la séquence fiscalité ont un lien 404 → violation.
 *
 * Sécurité :
 *  - Token HMAC (lib/auth-tokens.ts) — pas de DB lookup nécessaire.
 *  - Pas de CORS (same-origin uniquement pour POST).
 *  - Rate limit 30 req/min/IP sur POST (protège contre spam d'emails de confirmation).
 *  - Réponses identiques pour email valide / invalide / inconnu (anti-enum).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/auth-tokens";
import { unsubscribeFromBeehiiv } from "@/lib/beehiiv";
import { sendEmail } from "@/lib/email/client";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Regex email simple (suffisante pour validation server-side). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Page HTML de confirmation post-unsubscribe.
 * Pas de framework — HTML inline self-contained, pas de JS, pas de tracking.
 */
function buildConfirmHtml(email: string): string {
  const safeEmail = escapeHtml(email);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Désabonnement confirmé — ${BRAND.name}</title>
  <meta name="robots" content="noindex,nofollow">
  <style>
    body { margin: 0; padding: 0; background: #0B0D10; color: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 520px; width: 100%; background: #111827; border-radius: 12px; padding: 40px 32px; text-align: center; box-shadow: 0 20px 60px -20px rgba(0,0,0,0.5); }
    .logo { font-size: 22px; font-weight: 800; color: #F5A524; letter-spacing: -0.5px; margin: 0 0 24px 0; }
    h1 { font-size: 24px; margin: 0 0 16px 0; color: #F5A524; }
    p { font-size: 16px; line-height: 1.6; margin: 0 0 12px 0; color: #D1D5DB; }
    .email { font-family: "JetBrains Mono", "Courier New", monospace; background: #1F2937; padding: 4px 8px; border-radius: 4px; color: #F5A524; }
    .actions { margin-top: 32px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    a.btn { display: inline-block; padding: 12px 20px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; transition: opacity 0.15s; }
    a.btn:hover { opacity: 0.85; }
    a.btn-primary { background: #F5A524; color: #0B0D10; }
    a.btn-secondary { background: transparent; color: #F5A524; border: 1px solid #F5A524; }
    .footer { margin-top: 24px; font-size: 12px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="card" role="status" aria-live="polite">
    <div class="logo">${BRAND.name}</div>
    <h1>Désabonnement confirmé</h1>
    <p>L'adresse <span class="email">${safeEmail}</span> a bien été retirée de notre liste de diffusion.</p>
    <p>Tu ne recevras plus aucun email de notre part. Conformément au RGPD (art. 21), ton retrait est immédiat et définitif.</p>
    <p>Si c'était une erreur, tu peux te réinscrire à tout moment depuis notre site.</p>
    <div class="actions">
      <a class="btn btn-primary" href="${BRAND.url}">Retour à l'accueil</a>
      <a class="btn btn-secondary" href="${BRAND.url}/confidentialite">Politique RGPD</a>
    </div>
    <div class="footer">${BRAND.name} — ${BRAND.domain}</div>
  </div>
</body>
</html>`;
}

/**
 * Email HTML de demande de confirmation (envoyé après POST).
 * Garde une UX minimale et conforme : un bouton + un fallback texte.
 */
function buildConfirmRequestEmail(email: string, confirmUrl: string): string {
  const safeEmail = escapeHtml(email);
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Confirme ton désabonnement</title></head>
<body style="margin:0;padding:0;background:#0B0D10;font-family:Arial,sans-serif;color:#F4F5F7;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0B0D10">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#111827;border-radius:12px;padding:32px 24px;">
<tr><td>
<h1 style="margin:0 0 16px 0;font-size:22px;color:#F5A524;">Confirme ton désabonnement</h1>
<p style="font-size:15px;line-height:1.6;color:#D1D5DB;">Tu as demandé à te désinscrire de la newsletter ${BRAND.name} pour l'adresse <strong>${safeEmail}</strong>.</p>
<p style="font-size:15px;line-height:1.6;color:#D1D5DB;">Pour confirmer, clique simplement sur le bouton ci-dessous :</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto 0 auto;">
<tr><td align="center" bgcolor="#F5A524" style="border-radius:8px;">
<a href="${confirmUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#0B0D10;text-decoration:none;border-radius:8px;">Me désinscrire définitivement</a>
</td></tr></table>
<p style="font-size:12px;line-height:1.6;color:#9CA3AF;margin-top:24px;">Si tu n'es pas à l'origine de cette demande, ignore simplement cet email — aucune action n'est nécessaire.</p>
<p style="font-size:11px;line-height:1.5;color:#6B7280;margin-top:24px;border-top:1px solid #374151;padding-top:16px;">${BRAND.name} — ${BRAND.domain}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* -------------------------------------------------------------------------- */
/*  Rate limiter (POST uniquement)                                            */
/* -------------------------------------------------------------------------- */

const postLimiter = createRateLimiter({
  limit: 30,
  windowMs: 60_000,
  key: "newsletter-unsubscribe",
});

/* -------------------------------------------------------------------------- */
/*  GET — one-click depuis email                                              */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  const token = (req.nextUrl.searchParams.get("token") ?? "").trim();

  // Validation basique : 404 silencieux pour ne pas leaker l'existence de la route.
  if (!email || !token || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Token valide — appel Beehiiv. Si Beehiiv échoue on log mais on confirme
  // quand même côté UX (l'utilisateur a légitimement validé son token).
  const result = await unsubscribeFromBeehiiv(email);
  if (!result.ok) {
    console.error("[newsletter/unsubscribe] beehiiv failed but token valid", {
      email,
    });
    // On affiche quand même la page de confirmation : l'utilisateur a fait sa
    // part. On retentera côté backend (logs) ou via une re-tentative manuelle.
  }

  return new NextResponse(buildConfirmHtml(email), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  POST — formulaire web (envoie un email de confirmation)                   */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit pour éviter qu'un attaquant nous fasse spammer des emails.
  const ip = getClientIp(req);
  const rl = await postLimiter(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      },
    );
  }

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  // Génère le token + URL de confirmation (GET ci-dessus).
  const token = generateUnsubscribeToken(email);
  const base = BRAND.url.replace(/\/$/, "");
  const confirmUrl =
    base +
    "/api/newsletter/unsubscribe?email=" +
    encodeURIComponent(email) +
    "&token=" +
    encodeURIComponent(token);

  // Envoie l'email de confirmation. On ne fail jamais le response côté client :
  // on retourne ok systématiquement (anti-enum). Erreurs réelles loggées server-side.
  // Migration 27/04 → lib/email/client : signature requiert `text` ; `tag` et `from`
  // ne sont plus supportés (FROM_EMAIL centralisé).
  const confirmText =
    `Confirme ton désabonnement de ${BRAND.name}\n\n` +
    `Tu as demandé à te désinscrire pour l'adresse ${email}.\n\n` +
    `Pour confirmer, ouvre ce lien :\n${confirmUrl}\n\n` +
    `Si tu n'es pas à l'origine de cette demande, ignore simplement cet email — aucune action n'est nécessaire.\n\n` +
    `${BRAND.name} — ${BRAND.domain}`;
  const sendResult = await sendEmail({
    to: email,
    subject: `Confirme ton désabonnement de ${BRAND.name}`,
    html: buildConfirmRequestEmail(email, confirmUrl),
    text: confirmText,
  });

  if (!sendResult.ok) {
    console.error("[newsletter/unsubscribe] confirmation email failed", {
      email,
      error: sendResult.error,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

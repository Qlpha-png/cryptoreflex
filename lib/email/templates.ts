/**
 * Email templates Cryptoreflex Pro — design system pro.
 *
 * 5 templates principaux :
 *  - magicLinkEmail()    : connexion magic link (bypass Supabase SMTP)
 *  - resetPasswordEmail() : reset password (bypass Supabase SMTP)
 *  - welcomeProEmail()   : post-paiement Stripe (welcome + magic link)
 *  - cancelConfirmationEmail() : post-cancel (respectueux + porte ouverte)
 *  - paymentFailedEmail() : payment failed (empathique + grace period 7j)
 *
 * Tous wrappés via wrapEmail() de components.ts pour cohérence visuelle.
 *
 * Refonte 27/04/2026 : design system 10 agents email experts (header gradient,
 * footer RGPD, bulletproof button, dark mode forcé, mobile responsive, mso conditional).
 */

import { wrapEmail, renderButton } from "./components";
import { EMAIL_TOKENS as T } from "./tokens";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr";

interface EmailContent {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

/* -------------------------------------------------------------------------- */
/*  0. MAGIC LINK — connexion sans password                                   */
/* -------------------------------------------------------------------------- */

export function magicLinkEmail(opts: {
  email: string;
  magicLink: string;
}): EmailContent {
  const subject = `Ton lien de connexion à Cryptoreflex`;
  const preheader = `Lien sécurisé valide 1 heure. Pas besoin de mot de passe.`;

  const content = `
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:${T.colors.text};font-weight:800;letter-spacing:-0.5px;">
Bienvenue&nbsp;👋
</h1>

<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${T.colors.text};">
Ton lien de connexion à <strong style="color:${T.colors.primary};">Cryptoreflex</strong> est prêt.
</p>

<p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:${T.colors.textMuted};">
Clique sur le bouton ci-dessous pour accéder à ton espace. Pas de mot de passe à retenir, pas de friction.
</p>

<!-- CTA principal -->
<div style="text-align:center;margin:32px 0 12px;">
  ${renderButton({ href: opts.magicLink, label: "Me connecter →" })}
</div>

<p style="margin:14px 0 0;font-size:12px;color:${T.colors.textMuted};text-align:center;">
Lien sécurisé valide 1&nbsp;heure. Usage unique.
</p>

<!-- Fallback URL en clair -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.colors.surface};border:1px solid ${T.colors.border};border-radius:10px;margin:32px 0 24px;">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${T.colors.textMuted};text-transform:uppercase;letter-spacing:1.2px;">Le bouton ne fonctionne pas&nbsp;?</p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:${T.colors.textMuted};word-break:break-all;">
      Copie-colle ce lien dans ton navigateur&nbsp;:<br>
      <a href="${opts.magicLink}" style="color:${T.colors.primary};text-decoration:underline;font-size:11px;">${opts.magicLink}</a>
    </p>
  </td></tr>
</table>

<p style="margin:24px 0 6px;font-size:13px;line-height:1.55;color:${T.colors.textMuted};">
Tu n'as pas demandé ce lien&nbsp;? Tu peux ignorer ce message en toute sécurité — sans clic, rien ne se passe.
</p>
`;

  return {
    subject,
    preheader,
    html: wrapEmail({ subject, preheader, content, email: opts.email }),
    text: `Bienvenue 👋

Ton lien de connexion à Cryptoreflex :
${opts.magicLink}

Lien sécurisé valide 1 heure. Usage unique.

Tu n'as pas demandé ce lien ? Tu peux l'ignorer en toute sécurité.

—
Cryptoreflex EI · SIREN 103 352 621
${SITE_URL}/confidentialite`,
  };
}

/* -------------------------------------------------------------------------- */
/*  0bis. RESET PASSWORD — reinitialisation password                          */
/* -------------------------------------------------------------------------- */

export function resetPasswordEmail(opts: {
  email: string;
  resetLink: string;
}): EmailContent {
  const subject = `Réinitialisation de ton mot de passe Cryptoreflex`;
  const preheader = `Lien sécurisé valide 1 heure. Si tu n'as rien demandé, ignore cet email.`;

  const content = `
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:${T.colors.text};font-weight:800;letter-spacing:-0.5px;">
Mot de passe oublié&nbsp;?
</h1>

<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${T.colors.text};">
Ça arrive. Voici un lien sécurisé pour en définir un nouveau, en 30&nbsp;secondes.
</p>

<p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:${T.colors.textMuted};">
Le lien expire dans 1&nbsp;heure et ne peut être utilisé qu'une seule fois.
</p>

<div style="text-align:center;margin:32px 0 12px;">
  ${renderButton({ href: opts.resetLink, label: "Définir un nouveau mot de passe →" })}
</div>

<p style="margin:14px 0 0;font-size:12px;color:${T.colors.textMuted};text-align:center;">
Lien sécurisé · Expire en 1&nbsp;h · Usage unique
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.colors.surface};border:1px solid ${T.colors.border};border-radius:10px;margin:32px 0 24px;">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${T.colors.textMuted};text-transform:uppercase;letter-spacing:1.2px;">Le bouton ne fonctionne pas&nbsp;?</p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:${T.colors.textMuted};word-break:break-all;">
      <a href="${opts.resetLink}" style="color:${T.colors.primary};text-decoration:underline;font-size:11px;">${opts.resetLink}</a>
    </p>
  </td></tr>
</table>

<!-- Sécurité : note discrète -->
<p style="margin:24px 0 6px;font-size:13px;line-height:1.55;color:${T.colors.textMuted};">
<strong style="color:${T.colors.text};">Tu n'as pas demandé de réinitialisation&nbsp;?</strong> Ignore ce message — ton mot de passe actuel reste valide. Si tu reçois ce mail souvent sans le demander, contacte-nous.
</p>
`;

  return {
    subject,
    preheader,
    html: wrapEmail({ subject, preheader, content, email: opts.email }),
    text: `Mot de passe oublié ?

Voici ton lien sécurisé pour en définir un nouveau :
${opts.resetLink}

Le lien expire dans 1 heure et ne peut être utilisé qu'une seule fois.

Tu n'as pas demandé cette réinitialisation ? Ignore ce message,
ton mot de passe actuel reste valide.

—
Cryptoreflex EI · SIREN 103 352 621
${SITE_URL}/confidentialite`,
  };
}

/* -------------------------------------------------------------------------- */
/*  1. WELCOME — envoyé après paiement Stripe                                 */
/* -------------------------------------------------------------------------- */

export function welcomeProEmail(opts: {
  email: string;
  plan: "pro_monthly" | "pro_annual";
  magicLink: string;
}): EmailContent {
  const planLabel =
    opts.plan === "pro_annual" ? "Pro Annuel (79,99 €/an)" : "Pro Mensuel (9,99 €/mois)";

  const subject = `Bienvenue dans Cryptoreflex Pro`;
  const preheader = `Ton accès Pro est actif. 4 actions à faire en 60 secondes.`;

  const content = `
<!-- H1 -->
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:${T.colors.text};font-weight:800;letter-spacing:-0.5px;">
  Bienvenue dans Cryptoreflex&nbsp;<span style="color:${T.colors.primary};">Pro</span>
</h1>

<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${T.colors.text};">Merci. Vraiment.</p>

<p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:${T.colors.textMuted};">
Ton paiement <strong style="color:${T.colors.text};">${planLabel}</strong> est confirmé. Ton accès Pro est actif <em>maintenant</em>. Tu débloques :
portfolio illimité, alertes prix illimitées, glossaire 250+ termes, brief PRO hebdo et réponse fiscale 48&nbsp;h.
</p>

<!-- Quick wins -->
<p style="margin:24px 0 14px;font-size:11px;font-weight:700;color:${T.colors.textMuted};text-transform:uppercase;letter-spacing:1.5px;">
À faire dans les 60 prochaines secondes
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  <tr>
    <td width="40" valign="top" style="padding:10px 0;font-size:20px;line-height:1;color:${T.colors.primary};">①</td>
    <td valign="top" style="padding:10px 0;font-size:14px;line-height:1.5;color:${T.colors.text};">
      <strong>Lance le Radar 3916-bis</strong><br>
      <span style="color:${T.colors.textMuted};font-size:13px;">Détecte tes amendes potentielles avant la deadline mai 2026 (1500-10000€/compte).</span>
    </td>
  </tr>
  <tr>
    <td width="40" valign="top" style="padding:10px 0;font-size:20px;line-height:1;color:${T.colors.primary};">②</td>
    <td valign="top" style="padding:10px 0;font-size:14px;line-height:1.5;color:${T.colors.text};">
      <strong>Configure ton portfolio</strong><br>
      <span style="color:${T.colors.textMuted};font-size:13px;">Suivi multi-wallets, P&L automatique, allocation pie chart, export CSV.</span>
    </td>
  </tr>
  <tr>
    <td width="40" valign="top" style="padding:10px 0;font-size:20px;line-height:1;color:${T.colors.primary};">③</td>
    <td valign="top" style="padding:10px 0;font-size:14px;line-height:1.5;color:${T.colors.text};">
      <strong>Active une alerte prix</strong><br>
      <span style="color:${T.colors.textMuted};font-size:13px;">Seuil up/down, % de variation, market crash — illimitées en Pro.</span>
    </td>
  </tr>
  <tr>
    <td width="40" valign="top" style="padding:10px 0;font-size:20px;line-height:1;color:${T.colors.primary};">④</td>
    <td valign="top" style="padding:10px 0;font-size:14px;line-height:1.5;color:${T.colors.text};">
      <strong>Pose ta première question fiscale</strong><br>
      <span style="color:${T.colors.textMuted};font-size:13px;">Réponds simplement à cet email — réponse argumentée sous 48&nbsp;h.</span>
    </td>
  </tr>
</table>

<!-- CTA principal -->
<div style="text-align:center;margin:32px 0 12px;">
  ${renderButton({ href: opts.magicLink, label: "Accéder à mon espace Pro →" })}
</div>

<p style="margin:14px 0 0;font-size:12px;color:${T.colors.textMuted};text-align:center;">
Lien sécurisé valide 1&nbsp;heure. Pas besoin de mot de passe.
</p>

<!-- Plan info card -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.colors.surface};border:1px solid ${T.colors.border};border-radius:10px;margin:32px 0 24px;">
  <tr><td style="padding:18px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size:11px;font-weight:700;color:${T.colors.textMuted};text-transform:uppercase;letter-spacing:1.2px;padding-bottom:8px;">Ton abonnement</td>
        <td align="right" style="font-size:11px;font-weight:700;color:${T.colors.success};text-transform:uppercase;letter-spacing:1.2px;padding-bottom:8px;">● Actif</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:${T.colors.text};font-weight:600;padding:2px 0;">${planLabel}</td>
      </tr>
    </table>
    <div style="border-top:1px solid ${T.colors.border};margin-top:14px;padding-top:12px;font-size:12px;line-height:1.5;color:${T.colors.textMuted};">
      Tu peux annuler à tout moment, en 1&nbsp;clic, depuis <a href="${SITE_URL}/mon-compte" style="color:${T.colors.textMuted};text-decoration:underline;">ton espace</a>. Pas de question, pas de friction.
    </div>
  </td></tr>
</table>

<!-- Sign off -->
<p style="margin:24px 0 6px;font-size:14px;line-height:1.55;color:${T.colors.text};font-weight:600;">
Une question&nbsp;? Réponds simplement à cet email.
</p>
<p style="margin:0;font-size:13px;line-height:1.55;color:${T.colors.textMuted};">
C'est une vraie boîte mail surveillée. Réponse sous 24&nbsp;h ouvrées, par un humain.
</p>
`;

  return {
    subject,
    preheader,
    html: wrapEmail({ subject, preheader, content, email: opts.email }),
    text: `Bienvenue dans Cryptoreflex Pro

Merci. Vraiment.

Ton paiement ${planLabel} est confirmé. Ton accès Pro est actif maintenant.

Connexion sécurisée (1 h, usage unique) :
${opts.magicLink}

À faire dans les 60 prochaines secondes :
1. Radar 3916-bis (avant mai 2026) : ${SITE_URL}/outils/radar-3916-bis
2. Configure ton portfolio : ${SITE_URL}/outils/portfolio-tracker
3. Active une alerte prix
4. Pose ta première question fiscale (réponds à cet email)

Une question ? Réponds simplement à ce message — réponse sous 24 h.

—
Cryptoreflex EI · SIREN 103 352 621
Tu peux annuler à tout moment depuis ${SITE_URL}/mon-compte`,
  };
}

/* -------------------------------------------------------------------------- */
/*  2. CANCEL CONFIRMATION — envoyé après résiliation Stripe                  */
/* -------------------------------------------------------------------------- */

export function cancelConfirmationEmail(opts: {
  email: string;
  endDate: Date;
}): EmailContent {
  const endDateFr = opts.endDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = `Annulation enregistrée — accès Pro jusqu'au ${endDateFr}`;
  const preheader = `Ton accès Pro reste actif jusqu'au ${endDateFr}. Aucun nouveau prélèvement.`;

  const content = `
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:${T.colors.text};font-weight:800;letter-spacing:-0.5px;">
C'est confirmé.
</h1>

<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${T.colors.text};">
Ta demande d'annulation est bien prise en compte. Aucun nouveau prélèvement ne sera effectué après le ${endDateFr}.
</p>

<!-- End date banner success -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);border-radius:10px;margin:24px 0;">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0 0 4px;font-size:12px;color:${T.colors.success};text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Accès Pro maintenu</p>
    <p style="margin:0;font-size:18px;color:${T.colors.text};font-weight:700;">Jusqu'au ${endDateFr}</p>
  </td></tr>
</table>

<h2 style="margin:32px 0 12px;font-size:17px;font-weight:700;color:${T.colors.text};">Ce que tu gardes en Free</h2>
<ul style="margin:0;padding:0 0 0 20px;font-size:15px;color:${T.colors.text};line-height:1.7;">
  <li style="margin-bottom:6px;">Tous les calculateurs gratuits (fiscal, DCA, ROI, halving, glossaire 100 termes)</li>
  <li style="margin-bottom:6px;">Le Radar 3916-bis (gratuit, sans limite)</li>
  <li style="margin-bottom:6px;">Tes préférences et ton historique</li>
</ul>

<h2 style="margin:24px 0 8px;font-size:15px;font-weight:600;color:${T.colors.textMuted};">Ce qui change après le ${endDateFr}</h2>
<p style="margin:0;font-size:14px;color:${T.colors.textMuted};">Limites Free : 10 positions portfolio, 3 alertes prix.</p>

<p style="margin:32px 0 0;font-size:14px;color:${T.colors.textMuted};line-height:1.55;">
Si tu changes d'avis, tu peux te réabonner à tout moment depuis <a href="${SITE_URL}/pro" style="color:${T.colors.primary};text-decoration:underline;">cryptoreflex.fr/pro</a>.
</p>

<p style="margin:24px 0 0;font-size:13px;color:${T.colors.textMuted};line-height:1.55;">
On reste à l'écoute. Réponds simplement à ce message si tu as une question.
</p>
`;

  return {
    subject,
    preheader,
    html: wrapEmail({ subject, preheader, content, email: opts.email }),
    text: `C'est confirmé.

Ta demande d'annulation est bien prise en compte.
Aucun nouveau prélèvement ne sera effectué après le ${endDateFr}.

Accès Pro maintenu jusqu'au ${endDateFr}.

Ce que tu gardes en Free :
- Tous les calculateurs gratuits
- Le Radar 3916-bis (gratuit)
- Tes préférences et ton historique

Si tu changes d'avis, tu peux te réabonner à tout moment :
${SITE_URL}/pro

On reste à l'écoute. Réponds simplement à ce message si tu as une question.

—
Cryptoreflex EI · SIREN 103 352 621`,
  };
}

/* -------------------------------------------------------------------------- */
/*  3. PAYMENT FAILED — envoyé après échec de paiement Stripe                 */
/* -------------------------------------------------------------------------- */

export function paymentFailedEmail(opts: {
  email: string;
  updatePaymentUrl: string;
  graceDays: number;
}): EmailContent {
  const subject = `Petit souci avec ton paiement Cryptoreflex`;
  const preheader = `Pas de panique — ${opts.graceDays} jours pour mettre à jour ta carte.`;

  const content = `
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:${T.colors.text};font-weight:800;letter-spacing:-0.5px;">
Ton paiement n'est pas passé
</h1>

<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${T.colors.text};">
Pas de panique — ça arrive régulièrement. Causes les plus fréquentes :
</p>

<ul style="margin:0 0 24px;padding:0 0 0 20px;font-size:15px;color:${T.colors.text};line-height:1.7;">
  <li style="margin-bottom:6px;">Carte expirée ou bloquée</li>
  <li style="margin-bottom:6px;">Plafond de paiement atteint</li>
  <li style="margin-bottom:6px;">Refus de l'authentification 3D Secure</li>
</ul>

<!-- Grace period banner warning -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:10px;margin:24px 0;">
  <tr><td style="padding:16px 20px;">
    <p style="margin:0 0 4px;font-size:14px;color:${T.colors.warning};font-weight:700;">Tu as ${opts.graceDays} jours pour mettre à jour ta carte</p>
    <p style="margin:0;font-size:13px;color:${T.colors.text};line-height:1.5;">Pendant ce délai, ton accès Pro reste actif. Aucune interruption, aucune perte de données.</p>
  </td></tr>
</table>

<!-- CTA principal -->
<div style="text-align:center;margin:32px 0 12px;">
  ${renderButton({ href: opts.updatePaymentUrl, label: "Mettre à jour ma carte →" })}
</div>

<p style="margin:24px 0 0;font-size:13px;color:${T.colors.textMuted};line-height:1.55;text-align:center;">
Besoin d'aide ? Réponds à ce message — on traite sous 24&nbsp;h ouvrées.
</p>
`;

  return {
    subject,
    preheader,
    html: wrapEmail({ subject, preheader, content, email: opts.email }),
    text: `Ton paiement n'est pas passé

Pas de panique — ça arrive. Causes : carte expirée, plafond, refus 3D Secure.

Tu as ${opts.graceDays} jours pour mettre à jour ta carte.
Pendant ce délai, ton accès Pro reste actif.

Mettre à jour : ${opts.updatePaymentUrl}

Besoin d'aide ? Réponds à ce message.

—
Cryptoreflex EI · SIREN 103 352 621`,
  };
}

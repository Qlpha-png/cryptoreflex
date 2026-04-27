/**
 * Email templates Cryptoreflex Pro.
 *
 * 3 templates au lancement :
 *  - welcomeProEmail() : envoyé après paiement Stripe (via webhook)
 *  - cancelConfirmationEmail() : envoyé après résiliation
 *  - paymentFailedEmail() : envoyé après échec de paiement
 *
 * Tous retournent { subject, preheader, html, text } pour passer à sendEmail().
 *
 * Style : ton chaleureux mais pro, vouvoiement implicite (pas de "tu/vous"
 * dans les variables génériques pour rester neutre — adresse à la marque
 * pas à la personne).
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr";
const PRIMARY = "#F59E0B"; // gold
const FG = "#FAFAFA";
const MUTED = "#A1A1AA";
const SUCCESS = "#22C55E";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";

interface EmailContent {
  subject: string;
  preheader: string;
  html: string;
  text: string;
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

  return {
    subject: `Bienvenue dans Cryptoreflex Pro`,
    preheader: `Votre accès est actif. 3 actions à faire en 60 secondes.`,
    html: `
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${FG};font-weight:800;">
Bienvenue dans Cryptoreflex <span style="color:${PRIMARY};">Pro</span>
</h1>

<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${FG};">
Merci de votre confiance. Votre paiement <strong>${planLabel}</strong> est confirmé et votre accès Pro est actif dès maintenant.
</p>

<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${FG};">
Voici votre lien de connexion sécurisé (valide 1 heure) :
</p>

<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 28px;">
<tr><td style="background:${PRIMARY};border-radius:10px;">
<a href="${opts.magicLink}" style="display:inline-block;padding:14px 32px;color:#0A0A0A;font-size:15px;font-weight:700;text-decoration:none;">
Accéder à mon espace Pro →
</a>
</td></tr>
</table>

<div style="border-top:1px solid #2A2D35;padding-top:24px;margin-top:8px;">
<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">
Prochaines étapes
</p>
<ol style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.8;color:${FG};">
<li><strong>Lancez le Radar 3916-bis</strong> — détectez vos amendes potentielles avant la deadline mai 2026 (<a href="${SITE_URL}/outils/radar-3916-bis" style="color:${PRIMARY};text-decoration:underline;">accéder</a>)</li>
<li><strong>Configurez votre portfolio</strong> — suivez vos positions crypto en temps réel (<a href="${SITE_URL}/outils/portfolio-tracker" style="color:${PRIMARY};text-decoration:underline;">accéder</a>)</li>
<li><strong>Posez votre première question fiscale</strong> — réponse argumentée sous 48 h (répondez simplement à cet email)</li>
</ol>
</div>

<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">
Une question ou un souci ? Répondez à cet email — on lit tout, on répond sous 24 h ouvrées.
</p>
`,
    text: `Bienvenue dans Cryptoreflex Pro

Votre paiement ${planLabel} est confirmé. Votre accès Pro est actif.

Connexion sécurisée (valide 1 heure) :
${opts.magicLink}

3 prochaines étapes :
1. Lancez le Radar 3916-bis avant mai 2026 : ${SITE_URL}/outils/radar-3916-bis
2. Configurez votre portfolio : ${SITE_URL}/outils/portfolio-tracker
3. Posez votre première question fiscale (répondez à cet email)

Question ? Répondez simplement à ce message.

—
Cryptoreflex — éditeur indépendant français · SIREN 103 352 621`,
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

  return {
    subject: `Résiliation confirmée — accès maintenu jusqu'au ${endDateFr}`,
    preheader: `Votre accès Pro reste actif jusqu'au ${endDateFr}, puis bascule en Free.`,
    html: `
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${FG};font-weight:800;">
Résiliation enregistrée
</h1>

<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${FG};">
Votre demande de résiliation est bien prise en compte.
</p>

<div style="background:#0A0A0A;border-left:3px solid ${SUCCESS};border-radius:6px;padding:14px 18px;margin:0 0 20px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:${FG};">
Votre accès Pro reste actif jusqu'au <strong style="color:${SUCCESS};">${endDateFr}</strong>. Aucun nouveau prélèvement ne sera effectué après cette date.
</p>
</div>

<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${FG};">
Après le ${endDateFr}, votre compte basculera automatiquement en plan Gratuit. Vous conservez :
</p>

<ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.7;color:${FG};">
<li>Tous vos calculateurs gratuits (fiscal, DCA, ROI, halving…)</li>
<li>Le Radar 3916-bis (gratuit également)</li>
<li>Vos préférences et votre historique de connexion</li>
</ul>

<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${MUTED};">
Une question ou un retour à partager sur votre expérience Pro ? Répondez à ce message — chaque feedback nous aide à améliorer le service.
</p>

<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">
La porte reste ouverte. Si vous souhaitez revenir un jour, vous pouvez vous réabonner à tout moment depuis <a href="${SITE_URL}/pro" style="color:${PRIMARY};text-decoration:underline;">/pro</a>.
</p>
`,
    text: `Résiliation enregistrée

Votre accès Pro reste actif jusqu'au ${endDateFr}. Aucun prélèvement après cette date.

Après le ${endDateFr}, votre compte bascule en plan Gratuit. Vous conservez :
- Tous les calculateurs gratuits
- Le Radar 3916-bis
- Vos préférences et historique

Une question ou un retour ? Répondez à ce message.

—
Cryptoreflex — éditeur indépendant français · SIREN 103 352 621
Vous pouvez vous réabonner à tout moment : ${SITE_URL}/pro`,
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
  return {
    subject: `Petit souci avec votre paiement Cryptoreflex`,
    preheader: `Pas de panique — vous avez ${opts.graceDays} jours pour mettre à jour votre carte.`,
    html: `
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${FG};font-weight:800;">
Votre paiement n'est pas passé
</h1>

<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${FG};">
Pas de panique — ça arrive régulièrement. Les causes les plus fréquentes :
</p>

<ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;color:${FG};">
<li>Carte expirée ou bloquée</li>
<li>Plafond de paiement atteint</li>
<li>Refus de l'authentification 3D Secure</li>
</ul>

<div style="background:#0A0A0A;border-left:3px solid ${WARNING};border-radius:6px;padding:14px 18px;margin:0 0 24px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:${FG};">
Vous avez <strong style="color:${WARNING};">${opts.graceDays} jours</strong> pour mettre à jour votre moyen de paiement. Pendant ce délai, votre accès Pro reste actif.
</p>
</div>

<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 24px;">
<tr><td style="background:${PRIMARY};border-radius:10px;">
<a href="${opts.updatePaymentUrl}" style="display:inline-block;padding:14px 32px;color:#0A0A0A;font-size:15px;font-weight:700;text-decoration:none;">
Mettre à jour ma carte →
</a>
</td></tr>
</table>

<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};">
Besoin d'aide ? Répondez à ce message, on traite sous 24 h ouvrées.
</p>
`,
    text: `Votre paiement n'est pas passé

Pas de panique — ça arrive. Causes possibles : carte expirée, plafond, refus 3D Secure.

Vous avez ${opts.graceDays} jours pour mettre à jour votre carte. Accès Pro maintenu pendant ce délai.

Mettre à jour : ${opts.updatePaymentUrl}

Besoin d'aide ? Répondez à ce message.

—
Cryptoreflex — éditeur indépendant français`,
  };
}

/**
 * lib/email-series/fiscalite-crypto-series.ts
 * ------------------------------------------------------------------
 * Séquence email "Fiscalité crypto en 5 emails" déclenchée après
 * inscription via le calculateur fiscalité (source = "calculateur-fiscalite-pdf").
 *
 * Flow lead → conversion :
 *   1. User remplit le calculateur /outils/calculateur-fiscalite
 *   2. Email gate pour télécharger l'export PDF (Cerfa 2086 + 2042-C)
 *   3. Inscription via /api/newsletter/subscribe (source ci-dessus)
 *   4. Cron quotidien `email-series-fiscalite` envoie l'email correspondant au
 *      `dayOffset` (J0, J2, J5, J9, J14) si pas déjà envoyé pour cet abonné
 *   5. Mesure conversion via UTM `utm_campaign=fiscalite-d{N}` sur les CTA Waltio
 *
 * Pourquoi un module dédié plutôt qu'étendre `email-drip-templates.ts` ?
 *  - La séquence drip welcome 7 jours est généraliste (newsletter principale)
 *  - Cette séquence fiscalité est ultra-ciblée sur le sous-segment "calculateur"
 *  - Permet d'A/B-tester / désactiver indépendamment via env var
 *  - Cible YMYL différente : disclaimers fiscaux renforcés à chaque envoi
 *
 * Cadence : 5 emails sur 14 jours = ~1 email tous les 3 jours en moyenne.
 *  - Cadence raisonnable, jamais 2 emails le même jour
 *  - Dernier touch J14 = ré-engagement final avant transition vers la
 *    newsletter générale (06/10/2026 : aucune édition de newsletter n'est envoyée par le code)
 *
 * Conformité :
 *  - RGPD : opt-out global (lien Beehiiv {{unsubscribe_url}}) dans chaque email
 *  - Loi Influenceurs (juin 2023) : tous les CTA Waltio = "Lien d'affiliation
 *    publicitaire" + label visible dans le bouton
 *  - YMYL : disclaimer fiscal "estimation indicative, consulter un expert" en
 *    pied de chaque email
 */

import { BRAND } from "@/lib/brand";
import { waltioAffiliateUrl } from "@/lib/partner-links";
import { generateUnsubscribeToken } from "@/lib/auth-tokens";

/* -------------------------------------------------------------------------- */
/*  Helper unsubscribe (RGPD)                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Construit l'URL de désinscription one-click pour un email donné.
 *
 * Le token HMAC permet de valider la légitimité du lien sans état serveur :
 *  - Pas besoin de stocker un token par envoi en DB / KV
 *  - Le lien reste valide indéfiniment (tant que UNSUBSCRIBE_SECRET ne change pas)
 *  - Un attaquant ne peut pas désinscrire arbitrairement les abonnés sans
 *    connaître le secret (et l'enumération est protégée côté Beehiiv via la
 *    réponse "ok" générique de unsubscribeFromBeehiiv)
 *
 * Substitué dans les emails à la place de `{{unsubscribe_url}}` par
 * `lib/email-renderer.ts` au moment de l'envoi (côté cron).
 */
export function buildUnsubscribeUrl(email: string): string {
  const base = BRAND.url.replace(/\/$/, "");
  const token = generateUnsubscribeToken(email);
  return (
    base +
    "/api/newsletter/unsubscribe?email=" +
    encodeURIComponent(email) +
    "&token=" +
    encodeURIComponent(token)
  );
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Décalage en jours depuis l'inscription. Discriminant unique d'un email. */
export type FiscaliteDayOffset = 0 | 2 | 5 | 9 | 14;

/** CTA primaire / secondaire d'un email. */
export interface EmailCta {
  /** Wording du bouton (ex: "Découvrir Waltio"). */
  label: string;
  /** URL absolue (déjà UTM-isée si externe). */
  url: string;
  /** Indique si c'est un lien d'affiliation (loi Influenceurs : mention obligatoire). */
  sponsored?: boolean;
}

/** Un email de la séquence — structure minimale réutilisable côté renderer. */
export interface EmailInSequence {
  /** Identifiant kebab-case stable (utilisé pour idempotence KV). */
  id: string;
  /** Décalage J0 / J2 / J5 / J9 / J14. */
  dayOffset: FiscaliteDayOffset;
  /** Sujet (≤ 60 chars recommandé pour mobile). */
  subject: string;
  /** Preheader (preview text, ≤ 90 chars). */
  preheader: string;
  /** HTML inline-styled, max-width 600px, table-based pour Outlook compat. */
  htmlBody: string;
  /** Version texte (fallback / accessibilité / antispam scoring). */
  textBody: string;
  /** CTA principal (généralement Waltio sponsored). */
  ctaPrimary: EmailCta;
  /** CTA secondaire optionnel (souvent interne, ex: lead magnet PDF). */
  ctaSecondary?: EmailCta;
}

/* -------------------------------------------------------------------------- */
/*  Helpers d'URL                                                             */
/* -------------------------------------------------------------------------- */

/**
 * URL Waltio sponsored avec UTM séquence.
 * Source unique : si Waltio change d'URL d'affiliation, on ne touche qu'ici.
 */
function waltioUrl(day: FiscaliteDayOffset, sub: string): string {
  // 06/10/2026 : vrai lien d'affiliation (a_aid) — « waltio.com?ref=cryptoreflex » n'était pas tracé.
  return waltioAffiliateUrl({
    utm_source: "cryptoreflex",
    utm_medium: "email",
    utm_campaign: `fiscalite-d${day}`,
    utm_content: sub,
  });
}

/** URL interne Cryptoreflex avec UTM séquence. */
function internalUrl(path: string, day: FiscaliteDayOffset, sub: string): string {
  const sep = path.includes("?") ? "&" : "?";
  const base = BRAND.url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : "/" + path;
  return (
    base +
    cleanPath +
    sep +
    "utm_source=email&utm_medium=fiscalite-series&utm_campaign=fiscalite-d" +
    String(day) +
    "&utm_content=" +
    encodeURIComponent(sub)
  );
}

/* -------------------------------------------------------------------------- */
/*  Building block HTML — un email est une suite de blocs                     */
/* -------------------------------------------------------------------------- */

/**
 * Wrapper HTML email : table 600px, dark gold theme cohérent Cryptoreflex.
 * Inline styles uniquement (pas de <style> dans <head> — Outlook desktop ignore).
 */
function wrapEmail(opts: {
  preheader: string;
  contentHtml: string;
  ctaPrimary: EmailCta;
  ctaSecondary?: EmailCta;
}): string {
  const { preheader, contentHtml, ctaPrimary, ctaSecondary } = opts;

  // Bouton CTA primaire — gold sur fond sombre (charte Cryptoreflex).
  const primaryBtn =
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto 0 auto;">' +
    '<tr><td align="center" bgcolor="#F5A524" style="border-radius:8px;">' +
    '<a href="' +
    ctaPrimary.url +
    '" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#0B0D10;text-decoration:none;border-radius:8px;" rel="' +
    (ctaPrimary.sponsored ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer") +
    '" target="_blank">' +
    ctaPrimary.label +
    "</a></td></tr>" +
    (ctaPrimary.sponsored
      ? '<tr><td align="center" style="padding-top:8px;font-family:Arial,sans-serif;font-size:11px;color:#9CA3AF;">Lien d\'affiliation publicitaire — Cryptoreflex perçoit une commission</td></tr>'
      : "") +
    "</table>";

  // CTA secondaire optionnel — bouton outline sobre.
  const secondaryBtn = ctaSecondary
    ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:12px auto 0 auto;">' +
      '<tr><td align="center" style="border:1px solid #F5A524;border-radius:8px;">' +
      '<a href="' +
      ctaSecondary.url +
      '" style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#F5A524;text-decoration:none;border-radius:8px;" rel="' +
      (ctaSecondary.sponsored
        ? "sponsored nofollow noopener noreferrer"
        : "noopener noreferrer") +
      '" target="_blank">' +
      ctaSecondary.label +
      "</a></td></tr>" +
      (ctaSecondary.sponsored
        ? '<tr><td align="center" style="padding-top:6px;font-family:Arial,sans-serif;font-size:10px;color:#9CA3AF;">Lien d\'affiliation publicitaire</td></tr>'
        : "") +
      "</table>"
    : "";

  // Disclaimer YMYL fiscal en pied (avant le footer Beehiiv).
  const disclaimer =
    '<p style="margin:24px 0 0 0;padding:12px;background:#1F2937;border-left:3px solid #F5A524;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#D1D5DB;">' +
    "<strong>Information importante :</strong> les exemples chiffrés et les conseils de cet email sont fournis " +
    "à titre indicatif et ne constituent pas un conseil fiscal personnalisé. La fiscalité crypto évolue " +
    "régulièrement (cf. art. 150 VH bis CGI). Pour une situation complexe (DeFi, staking, activité habituelle/professionnelle), " +
    "consultez un expert-comptable agréé." +
    "</p>";

  // Footer commun à tous les emails (mention RGPD + désinscription).
  const footer =
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;border-top:1px solid #374151;padding-top:16px;">' +
    "<tr><td align=\"center\" style=\"font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:#9CA3AF;\">" +
    "Vous recevez cet email car vous vous êtes inscrit·e à la newsletter Cryptoreflex via le calculateur fiscalité.<br>" +
    "Cryptoreflex — Édition indépendante française — SIRET 103 352 621<br>" +
    '<a href="{{unsubscribe_url}}" style="color:#F5A524;text-decoration:underline;">Se désinscrire en 1 clic</a>' +
    " · " +
    '<a href="' +
    BRAND.url +
    '/confidentialite" style="color:#F5A524;text-decoration:underline;">Confidentialité (RGPD)</a>' +
    "</td></tr></table>";

  return (
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cryptoreflex</title></head>' +
    '<body style="margin:0;padding:0;background:#0B0D10;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#F4F5F7;">' +
    '<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#0B0D10;">' +
    preheader +
    "</div>" +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0B0D10">' +
    '<tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#111827;border-radius:12px;padding:32px 24px;">' +
    // Header avec wordmark
    '<tr><td align="center" style="padding-bottom:16px;border-bottom:1px solid #374151;">' +
    '<a href="' +
    BRAND.url +
    '" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#F5A524;text-decoration:none;letter-spacing:-0.5px;">Cryptoreflex</a>' +
    '<div style="font-family:Arial,sans-serif;font-size:11px;color:#9CA3AF;margin-top:4px;">Série Fiscalité Crypto · 5 emails sur 14 jours</div>' +
    "</td></tr>" +
    // Contenu principal
    '<tr><td style="padding-top:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#F4F5F7;">' +
    contentHtml +
    primaryBtn +
    secondaryBtn +
    disclaimer +
    footer +
    "</td></tr>" +
    "</table></td></tr></table></body></html>"
  );
}

/* -------------------------------------------------------------------------- */
/*  Email J0 — Bienvenue + récap simulation                                   */
/* -------------------------------------------------------------------------- */

const J0_CONTENT_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Bienvenue ! Voici vos 5 conseils pour démarrer</h1>' +
  "<p>Bonjour,</p>" +
  "<p>Merci d'avoir utilisé notre <strong>calculateur fiscalité crypto</strong>. Vous avez fait le premier pas — la majorité des Français qui détiennent du Bitcoin ne déclarent encore <strong>rien</strong>, par peur ou par méconnaissance. C'est exactement ce qu'on va corriger en 14 jours.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Vos 5 conseils pour démarrer la déclaration 2026</h2>' +
  '<ol style="padding-left:20px;">' +
  "<li><strong>Récupérez tous vos historiques</strong> sur chaque exchange (CSV ou API). Sans données complètes, impossible de calculer votre plus-value selon la formule officielle 150 VH bis.</li>" +
  "<li><strong>Identifiez vos plateformes étrangères</strong> (Binance, Kraken, Bybit…) — chacune doit être déclarée via le formulaire <strong>3916-bis</strong>, y compris un compte fermé en cours d'année. Oubli = amende 750 € par compte (1 500 € si solde &gt; 50 000 €).</li>" +
  "<li><strong>Comptez vos cessions, pas vos achats</strong>. Si vous avez moins de 305 € de cessions sur l'année, vous êtes <strong>exonéré·e</strong>.</li>" +
  "<li><strong>Choisissez votre régime</strong> : PFU 31,4 % par défaut, ou option barème progressif (intéressant à TMI 0 % ; à TMI 11 %, seulement sans décote). On en reparle au mail 3.</li>" +
  "<li><strong>N'oubliez pas vos pertes</strong> : elles peuvent compenser vos gains de la même année. On creuse au mail 4.</li>" +
  "</ol>" +
  '<p style="margin-top:24px;">Pour automatiser tout ça (import des exchanges, calcul plus-value, génération Cerfa), nous recommandons <strong>Waltio</strong> — outil français, agréé expert-comptable, pré-remplissage 2086 + 3916-bis automatique.</p>';

const J0: EmailInSequence = {
  id: "fiscalite-j0-bienvenue",
  dayOffset: 0,
  subject: "Bienvenue — voici votre simulation et 5 conseils gratuits",
  preheader: "Vos premiers pas vers une déclaration crypto sereine en 14 jours.",
  htmlBody: wrapEmail({
    preheader: "Vos premiers pas vers une déclaration crypto sereine en 14 jours.",
    contentHtml: J0_CONTENT_HTML,
    ctaPrimary: {
      label: "Découvrir Waltio (essai gratuit)",
      url: waltioUrl(0, "j0-bienvenue"),
      sponsored: true,
    },
    ctaSecondary: {
      label: "Relancer le calculateur",
      url: internalUrl("/outils/calculateur-fiscalite", 0, "j0-bienvenue"),
    },
  }),
  textBody:
    "Bienvenue chez Cryptoreflex !\n\n" +
    "Vos 5 conseils pour démarrer la déclaration 2026 :\n" +
    "1. Récupérez tous vos historiques (CSV ou API).\n" +
    "2. Identifiez vos plateformes étrangères et déclarez-les via le 3916-bis.\n" +
    "3. Si vous avez moins de 305 EUR de cessions sur l'année, vous êtes exonéré·e.\n" +
    "4. Choisissez votre régime : PFU 31,4 % ou barème progressif.\n" +
    "5. N'oubliez pas vos pertes — elles compensent vos gains de la même année.\n\n" +
    "Outil recommandé : Waltio (lien d'affiliation publicitaire).\n" +
    waltioUrl(0, "j0-bienvenue") +
    "\n\nInformation indicative — ne constitue pas un conseil fiscal personnalisé.\n\n" +
    "Désinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Découvrir Waltio (essai gratuit)",
    url: waltioUrl(0, "j0-bienvenue"),
    sponsored: true,
  },
  ctaSecondary: {
    label: "Relancer le calculateur",
    url: internalUrl("/outils/calculateur-fiscalite", 0, "j0-bienvenue"),
  },
};

/* -------------------------------------------------------------------------- */
/*  Email J2 — Erreur n°1 : oublier le 3916-bis                               */
/* -------------------------------------------------------------------------- */

const J2_CONTENT_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">L\'erreur n°1 que font 80 % des Français</h1>' +
  "<p>Aujourd'hui on parle d'un truc qui passe sous le radar — et qui coûte cher.</p>" +
  '<p style="background:#1F2937;padding:12px;border-left:3px solid #F5A524;">Si vous détenez — ou avez détenu dans l\'année, même sur un compte fermé depuis — des cryptos sur <strong>Binance, Kraken, Bybit, KuCoin, Coinbase Inc. (USA)</strong> ou tout autre exchange basé hors de France, vous devez remplir un formulaire dédié : le <strong>3916-bis</strong>.</p>' +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">C\'est quoi le 3916-bis ?</h2>' +
  "<p>Une simple déclaration des comptes étrangers que vous détenez, à joindre à votre déclaration de revenus. Un formulaire par compte. Pas de calcul, juste de l'identification (nom de l'exchange, n° de compte, adresse).</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Combien ça coûte si vous oubliez ?</h2>' +
  '<ul style="padding-left:20px;">' +
  "<li><strong>750 € par compte non déclaré</strong> (1 500 € si solde &gt; 50 000 €, article 1736 X du CGI)</li>" +
  "<li><strong>125 €</strong> par omission ou inexactitude (250 € au-delà de 50 000 €), dans la limite de 10 000 € par déclaration</li>" +
  "<li>Délai de reprise de l'administration pouvant être porté à <strong>10 ans</strong> au lieu de 3 (art. L169 du LPF)</li>" +
  "</ul>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Le truc qui change tout</h2>' +
  "<p>Remplir manuellement 5 ou 10 formulaires 3916-bis, c'est fastidieux. Waltio les pré-remplit automatiquement à partir de vos connexions exchanges (200+ supportées). Vous n'avez qu'à imprimer et joindre.</p>";

const J2: EmailInSequence = {
  id: "fiscalite-j2-3916bis",
  dayOffset: 2,
  subject: "L'erreur n°1 que font 80 % des Français : le 3916-bis",
  preheader: "Oublier ce formulaire = amende 750 € par compte. Voici comment l'éviter.",
  htmlBody: wrapEmail({
    preheader: "Oublier ce formulaire = amende 750 € par compte. Voici comment l'éviter.",
    contentHtml: J2_CONTENT_HTML,
    ctaPrimary: {
      label: "Générer votre 3916-bis avec Waltio",
      url: waltioUrl(2, "j2-3916bis"),
      sponsored: true,
    },
    ctaSecondary: {
      label: "Lire notre guide 3916-bis détaillé",
      url: internalUrl("/blog/declarer-comptes-crypto-etrangers-3916-bis", 2, "j2-3916bis"),
    },
  }),
  textBody:
    "L'erreur n°1 : oublier le formulaire 3916-bis.\n\n" +
    "Si vous avez (ou avez eu dans l'année) un compte sur Binance, Kraken, Bybit ou tout autre exchange étranger, vous devez le déclarer, même s'il est fermé depuis.\n\n" +
    "Sanction : 750 EUR par compte oublié, 1 500 EUR si solde > 50 000 EUR (art. 1736 X CGI).\n\n" +
    "Waltio pré-remplit le 3916-bis automatiquement (lien d'affiliation publicitaire) :\n" +
    waltioUrl(2, "j2-3916bis") +
    "\n\nGuide détaillé : " +
    internalUrl("/blog/declarer-comptes-crypto-etrangers-3916-bis", 2, "j2-3916bis") +
    "\n\nInformation indicative — ne constitue pas un conseil fiscal personnalisé.\n\n" +
    "Désinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Générer votre 3916-bis avec Waltio",
    url: waltioUrl(2, "j2-3916bis"),
    sponsored: true,
  },
  ctaSecondary: {
    label: "Lire notre guide 3916-bis détaillé",
    url: internalUrl("/blog/declarer-comptes-crypto-etrangers-3916-bis", 2, "j2-3916bis"),
  },
};

/* -------------------------------------------------------------------------- */
/*  Email J5 — PFU vs Barème progressif                                       */
/* -------------------------------------------------------------------------- */

const J5_CONTENT_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">PFU 31,4 % ou barème progressif ? Le bon choix selon votre tranche</h1>' +
  "<p>Par défaut, vos plus-values crypto sont taxées au PFU de 31,4 % (12,8 % d'impôt + 18,6 % de prélèvements sociaux), y compris celles de 2025 déclarées en 2026.</p>" +
  "<p>Mais si votre tranche d'imposition (TMI) est basse, opter pour le barème progressif peut vous faire économiser des centaines d'euros.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">La règle simple</h2>' +
  '<table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;background:#1F2937;border-radius:8px;margin:12px 0;">' +
  '<tr><td style="border-bottom:1px solid #374151;font-weight:700;color:#F5A524;">Votre TMI</td><td style="border-bottom:1px solid #374151;font-weight:700;color:#F5A524;">Choix optimal</td></tr>' +
  "<tr><td>0 % (non imposable)</td><td>Barème (vous ne payez que les 18,6 % de PS)</td></tr>" +
  "<tr><td>11 %</td><td>Barème (29,6 % au lieu de 31,4 %), sauf si votre impôt bénéficie de la décote : alors PFU</td></tr>" +
  "<tr><td>30 %</td><td>PFU (48,6 % au barème contre 31,4 %)</td></tr>" +
  "<tr><td>41 / 45 %</td><td>PFU (économie large)</td></tr>" +
  "</table>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Exemple chiffré (PV crypto = 5 000 €)</h2>' +
  '<ul style="padding-left:20px;">' +
  "<li>TMI 0 % → barème : <strong>930 €</strong> (prélèvements sociaux uniquement) contre 1 570 € au PFU → <strong>économie 640 €</strong></li>" +
  "<li>TMI 11 % → barème : <strong>1 480 €</strong> d'impôt contre 1 570 € au PFU → économie 90 €, mais seulement si votre impôt ne bénéficie pas de la décote. Avec la décote, chaque euro ajouté coûte environ 16 % d'impôt : le barème devient plus cher que le PFU. Simulez avant de cocher.</li>" +
  "<li>TMI 41 % → barème : 2 980 € contre 1 570 € au PFU → <strong>perte 1 410 €</strong> si vous choisissez le barème</li>" +
  "</ul>" +
  '<p style="margin-top:16px;background:#1F2937;padding:12px;border-left:3px solid #F5A524;"><strong>Comment opter :</strong> cochez la <strong>case 3CN</strong> de la déclaration 2042 C (là où vous reportez votre plus-value en 3AN). L\'option porte sur <strong>toutes</strong> vos plus-values crypto de l\'année et elle est irrévocable, mais elle ne touche <strong>pas</strong> vos dividendes ni vos intérêts (leur option, la case 2OP, est distincte).</p>';

const J5: EmailInSequence = {
  id: "fiscalite-j5-pfu-vs-bareme",
  dayOffset: 5,
  subject: "PFU 31,4 % ou barème ? Le bon choix selon votre tranche",
  preheader: "Selon votre tranche d'imposition, le barème peut vous faire économiser des centaines d'euros.",
  htmlBody: wrapEmail({
    preheader: "Selon votre tranche d'imposition, le barème peut vous faire économiser des centaines d'euros.",
    contentHtml: J5_CONTENT_HTML,
    ctaPrimary: {
      label: "Comparer PFU vs Barème en 2 clics",
      url: internalUrl("/outils/calculateur-fiscalite", 5, "j5-pfu-bareme"),
    },
    ctaSecondary: {
      label: "Automatiser le calcul avec Waltio",
      url: waltioUrl(5, "j5-pfu-bareme"),
      sponsored: true,
    },
  }),
  textBody:
    "PFU 31,4 % ou barème progressif ?\n\n" +
    "Règle simple :\n" +
    "- TMI 0 % → barème (vous payez moins).\n" +
    "- TMI 11 % → barème, sauf si votre impôt bénéficie de la décote : alors PFU.\n" +
    "- TMI 30 % et plus → PFU (vous payez moins).\n\n" +
    "Exemple PV 5 000 EUR :\n" +
    "- TMI 0 % → 930 EUR au barème contre 1 570 EUR au PFU (-640 EUR)\n" +
    "- TMI 11 % → 1 480 EUR contre 1 570 EUR (-90 EUR), seulement sans décote\n" +
    "- TMI 41 % → 2 980 EUR contre 1 570 EUR (+1 410 EUR si vous choisissez le barème)\n\n" +
    "Pour opter : case 3CN de la déclaration 2042 C (option globale pour vos cryptos de l'année, irrévocable, sans effet sur vos dividendes).\n\n" +
    "Comparez avec notre calculateur : " +
    internalUrl("/outils/calculateur-fiscalite", 5, "j5-pfu-bareme") +
    "\n\nOu automatisez tout avec Waltio (lien d'affiliation publicitaire) : " +
    waltioUrl(5, "j5-pfu-bareme") +
    "\n\nInformation indicative — ne constitue pas un conseil fiscal personnalisé.\n\n" +
    "Désinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Comparer PFU vs Barème en 2 clics",
    url: internalUrl("/outils/calculateur-fiscalite", 5, "j5-pfu-bareme"),
  },
  ctaSecondary: {
    label: "Automatiser le calcul avec Waltio",
    url: waltioUrl(5, "j5-pfu-bareme"),
    sponsored: true,
  },
};

/* -------------------------------------------------------------------------- */
/*  Email J9 — Déduction des pertes                                           */
/* -------------------------------------------------------------------------- */

const J9_CONTENT_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Vos pertes crypto peuvent vous faire économiser des impôts</h1>' +
  "<p>Si vous avez vendu à perte cette année (Luna, FTX, projets DeFi qui ont rugged…), bonne nouvelle : ces pertes peuvent <strong>diminuer votre plus-value imposable</strong>.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Comment ça marche ?</h2>' +
  '<ul style="padding-left:20px;">' +
  "<li>Les <strong>moins-values crypto sont compensables</strong> avec les plus-values crypto de la <strong>même année</strong>.</li>" +
  "<li>Si le solde net est négatif, la perte est <strong>perdue</strong> (pas de report sur années suivantes pour les particuliers — contrairement aux actions).</li>" +
  "<li>Les pertes sur tokens devenus illiquides (LUNA, FTT post-faillite FTX) sont <strong>déductibles uniquement à la cession effective</strong> — il faut réellement vendre, même à 0,01 €.</li>" +
  "</ul>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Exemple concret</h2>' +
  '<table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;background:#1F2937;border-radius:8px;margin:12px 0;">' +
  "<tr><td>+ 8 000 € PV sur BTC vendu en avril</td><td align=\"right\">+ 8 000 €</td></tr>" +
  "<tr><td>- 3 000 € MV sur Luna vendu en mai (poussière restante)</td><td align=\"right\">- 3 000 €</td></tr>" +
  '<tr><td style="font-weight:700;color:#F5A524;">PV nette imposable</td><td align="right" style="font-weight:700;color:#F5A524;">5 000 €</td></tr>' +
  "<tr><td>Économie d'impôt (PFU 31,4 %)</td><td align=\"right\"><strong>942 €</strong></td></tr>" +
  "</table>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Le piège à éviter</h2>' +
  "<p>Si vos tokens sont stuck sur un exchange en faillite (FTX, Celsius), vous ne pouvez <strong>pas</strong> les déduire tant qu'ils ne sont pas \"officiellement perdus\" (jugement, liquidation). Conservez les preuves d'irrécouvrabilité.</p>" +
  '<p style="margin-top:16px;">Pour identifier toutes vos pertes de l\'année, l\'import automatique Waltio scanne vos 200+ exchanges + wallets DeFi.</p>';

const J9: EmailInSequence = {
  id: "fiscalite-j9-pertes",
  dayOffset: 9,
  subject: "Vos pertes crypto peuvent vous faire économiser des impôts",
  preheader: "Vendu à perte cette année ? Voici comment compenser votre plus-value (exemples chiffrés).",
  htmlBody: wrapEmail({
    preheader: "Vendu à perte cette année ? Voici comment compenser votre plus-value (exemples chiffrés).",
    contentHtml: J9_CONTENT_HTML,
    ctaPrimary: {
      label: "Importer mes données dans Waltio (gratuit)",
      url: waltioUrl(9, "j9-pertes"),
      sponsored: true,
    },
    ctaSecondary: {
      label: "Recalculer ma situation",
      url: internalUrl("/outils/calculateur-fiscalite", 9, "j9-pertes"),
    },
  }),
  textBody:
    "Vos pertes crypto peuvent réduire vos impôts.\n\n" +
    "Règle : les MV crypto compensent les PV crypto de la MÊME année.\n" +
    "Pas de report sur années suivantes pour les particuliers.\n\n" +
    "Exemple : PV BTC +8 000 EUR - MV Luna 3 000 EUR = PV nette 5 000 EUR\n" +
    "Économie : 942 EUR (au PFU 31,4 %).\n\n" +
    "Piège : tokens stuck sur exchange en faillite ne sont pas déductibles tant que pas de jugement.\n\n" +
    "Importer mes données dans Waltio (lien d'affiliation publicitaire) : " +
    waltioUrl(9, "j9-pertes") +
    "\n\nRecalculer ma situation : " +
    internalUrl("/outils/calculateur-fiscalite", 9, "j9-pertes") +
    "\n\nInformation indicative — ne constitue pas un conseil fiscal personnalisé.\n\n" +
    "Désinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Importer mes données dans Waltio (gratuit)",
    url: waltioUrl(9, "j9-pertes"),
    sponsored: true,
  },
  ctaSecondary: {
    label: "Recalculer ma situation",
    url: internalUrl("/outils/calculateur-fiscalite", 9, "j9-pertes"),
  },
};

/* -------------------------------------------------------------------------- */
/*  Email J14 — Récap final + plan d'action                                   */
/* -------------------------------------------------------------------------- */

const J14_CONTENT_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Votre plan d\'action complet pour votre prochaine déclaration</h1>' +
  "<p>Dernier email de la série ! Voici la checklist condensée des 10 actions à mener d'ici votre <strong>prochaine déclaration de revenus</strong> (au printemps).</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">La checklist 10 points</h2>' +
  '<ol style="padding-left:20px;">' +
  "<li>Recensez <strong>toutes</strong> les plateformes utilisées dans l'année (CEX, DEX, wallets, applis mobiles).</li>" +
  "<li>Exportez les historiques CSV ou connectez les API à un agrégateur fiscal.</li>" +
  "<li>Vérifiez si votre total de cessions dépasse 305 € (sinon exonération).</li>" +
  "<li>Listez les comptes étrangers → un <strong>3916-bis par compte</strong>.</li>" +
  "<li>Calculez la plus-value via la formule 150 VH bis (prorata du portefeuille).</li>" +
  "<li>Comparez PFU 31,4 % et barème progressif selon votre TMI (option barème = case 3CN de la 2042 C).</li>" +
  "<li>Identifiez les pertes réalisées dans l'année (vente effective requise).</li>" +
  "<li>Remplissez le <strong>Cerfa 2086</strong> (détail des cessions) + <strong>2042-C</strong> (report en 3AN ou 3BN).</li>" +
  "<li>Joignez les 3916-bis et gardez les exports CSV en sauvegarde pendant 6 ans.</li>" +
  "<li>Déclarez avant la date limite (fin mai ou début juin selon votre département).</li>" +
  "</ol>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Le calendrier à retenir</h2>' +
  '<table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;background:#1F2937;border-radius:8px;margin:12px 0;">' +
  "<tr><td><strong>Avril</strong></td><td>Ouverture du service de déclaration en ligne</td></tr>" +
  "<tr><td><strong>Mi-mai</strong></td><td>Date limite de la déclaration papier</td></tr>" +
  "<tr><td><strong>Fin mai – début juin</strong></td><td>Dates limites en ligne, selon votre département</td></tr>" +
  "</table>" +
  '<p style="font-style:italic;color:#9CA3AF;font-size:13px;">Les dates exactes sont publiées chaque année par la DGFiP sur impots.gouv.fr.</p>' +
  '<p style="margin-top:16px;">Pour avoir tout sous la main, téléchargez notre <strong>Bible Fiscalité Crypto</strong> (gratuit). Et pour gagner du temps sur les calculs, Waltio importe vos historiques et prépare le 2086.</p>';

const J14: EmailInSequence = {
  id: "fiscalite-j14-recap",
  dayOffset: 14,
  subject: "Récap : votre plan d'action complet pour votre prochaine déclaration",
  preheader: "Checklist 10 points + calendrier de la déclaration + Bible Fiscalité PDF offerte.",
  htmlBody: wrapEmail({
    preheader: "Checklist 10 points + calendrier de la déclaration + Bible Fiscalité PDF offerte.",
    contentHtml: J14_CONTENT_HTML,
    ctaPrimary: {
      label: "Télécharger la Bible Fiscalité (PDF)",
      url: internalUrl("/api/lead-magnet/bible-fiscalite", 14, "j14-recap-bible"),
    },
    ctaSecondary: {
      label: "Démarrer Waltio (essai gratuit)",
      url: waltioUrl(14, "j14-recap"),
      sponsored: true,
    },
  }),
  textBody:
    "Votre plan d'action pour votre prochaine déclaration — checklist 10 points :\n\n" +
    "1. Recensez toutes vos plateformes de l'année.\n" +
    "2. Exportez les historiques CSV / API.\n" +
    "3. Vérifiez le seuil de 305 EUR de cessions.\n" +
    "4. 1 formulaire 3916-bis par compte étranger.\n" +
    "5. Calculez la PV via 150 VH bis.\n" +
    "6. Comparez PFU et barème (option barème = case 3CN de la 2042 C).\n" +
    "7. Identifiez les pertes (vente effective).\n" +
    "8. Remplissez le Cerfa 2086 + la 2042-C (3AN ou 3BN).\n" +
    "9. Joignez les 3916-bis + gardez les CSV 6 ans.\n" +
    "10. Déclarez avant la date limite (fin mai ou début juin selon votre département).\n\n" +
    "Bible Fiscalité Crypto 2026 (PDF gratuit) : " +
    internalUrl("/api/lead-magnet/bible-fiscalite", 14, "j14-recap-bible") +
    "\n\nWaltio (lien d'affiliation publicitaire) : " +
    waltioUrl(14, "j14-recap") +
    "\n\nInformation indicative — ne constitue pas un conseil fiscal personnalisé.\n\n" +
    "Désinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Télécharger la Bible Fiscalité (PDF)",
    url: internalUrl("/api/lead-magnet/bible-fiscalite", 14, "j14-recap-bible"),
  },
  ctaSecondary: {
    label: "Démarrer Waltio (essai gratuit)",
    url: waltioUrl(14, "j14-recap"),
    sponsored: true,
  },
};

/* -------------------------------------------------------------------------- */
/*  Export                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Liste ordonnée des 5 emails de la séquence.
 * L'ordre n'est pas critique (le cron filtre par dayOffset) mais on garde
 * croissant pour lisibilité dans les outils de debug / dashboards.
 */
export const FISCALITE_EMAIL_SERIES: EmailInSequence[] = [J0, J2, J5, J9, J14];

/** Source Beehiiv tag attendu pour qu'un abonné soit éligible à la séquence. */
export const FISCALITE_SERIES_SOURCE = "calculateur-fiscalite-pdf";

/** Set des dayOffsets autorisés (utilisé par le cron pour matcher). */
export const FISCALITE_VALID_OFFSETS: ReadonlySet<FiscaliteDayOffset> = new Set([
  0, 2, 5, 9, 14,
]);

/** Récupère un email par son dayOffset, ou undefined si absent. */
export function getFiscaliteEmailByOffset(
  offset: number,
): EmailInSequence | undefined {
  return FISCALITE_EMAIL_SERIES.find((e) => e.dayOffset === offset);
}

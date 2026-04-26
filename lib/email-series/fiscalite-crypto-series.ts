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
 *    newsletter quotidienne standard
 *
 * Conformité :
 *  - RGPD : opt-out global (lien Beehiiv {{unsubscribe_url}}) dans chaque email
 *  - Loi Influenceurs (juin 2023) : tous les CTA Waltio = "Lien d'affiliation
 *    publicitaire" + label visible dans le bouton
 *  - YMYL : disclaimer fiscal "estimation indicative, consulter un expert" en
 *    pied de chaque email
 */

import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Décalage en jours depuis l'inscription. Discriminant unique d'un email. */
export type FiscaliteDayOffset = 0 | 2 | 5 | 9 | 14;

/** CTA primaire / secondaire d'un email. */
export interface EmailCta {
  /** Wording du bouton (ex: "Découvre Waltio (30% de réduction)"). */
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
  const base =
    "https://waltio.com?ref=cryptoreflex&utm_source=cryptoreflex&utm_medium=email&utm_campaign=fiscalite-d" +
    String(day) +
    "&utm_content=" +
    encodeURIComponent(sub);
  return base;
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
    "régulièrement (cf. art. 150 VH bis CGI). Pour une situation complexe (DeFi, staking, BIC pro), " +
    "consulte un expert-comptable agréé." +
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
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Bienvenue ! Voici tes 5 conseils pour démarrer</h1>' +
  "<p>Bonjour,</p>" +
  "<p>Merci d'avoir utilisé notre <strong>calculateur fiscalité crypto</strong>. Tu as fait le premier pas — la majorité des Français qui détiennent du Bitcoin ne déclarent encore <strong>rien</strong>, par peur ou par méconnaissance. C'est exactement ce qu'on va corriger en 14 jours.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Tes 5 conseils pour démarrer la déclaration 2026</h2>' +
  '<ol style="padding-left:20px;">' +
  "<li><strong>Récupère tous tes historiques</strong> sur chaque exchange (CSV ou API). Sans données complètes, impossible de calculer ta plus-value selon la formule officielle 150 VH bis.</li>" +
  "<li><strong>Identifie tes plateformes étrangères</strong> (Binance, Kraken, Bybit…) — chacune doit être déclarée via le formulaire <strong>3916-bis</strong>. Oubli = amende 1 500 € par compte.</li>" +
  "<li><strong>Compte tes cessions, pas tes achats</strong>. Si tu as moins de 305 € de cessions sur l'année, tu es <strong>exonéré·e</strong>.</li>" +
  "<li><strong>Choisis ton régime</strong> : PFU 30 % par défaut, ou option barème progressif (intéressant si TMI 0 % ou 11 %). On en reparle au mail 3.</li>" +
  "<li><strong>N'oublie pas tes pertes</strong> : elles peuvent compenser tes gains. On creuse au mail 4.</li>" +
  "</ol>" +
  '<p style="margin-top:24px;">Pour automatiser tout ça (import des exchanges, calcul plus-value, génération Cerfa), nous recommandons <strong>Waltio</strong> — outil français, agréé expert-comptable, pré-remplissage 2086 + 3916-bis automatique.</p>';

const J0: EmailInSequence = {
  id: "fiscalite-j0-bienvenue",
  dayOffset: 0,
  subject: "Bienvenue — voici ta simulation et 5 conseils gratuits",
  preheader: "Tes premiers pas vers une déclaration crypto sereine en 14 jours.",
  htmlBody: wrapEmail({
    preheader: "Tes premiers pas vers une déclaration crypto sereine en 14 jours.",
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
    "Tes 5 conseils pour démarrer la déclaration 2026 :\n" +
    "1. Récupère tous tes historiques (CSV ou API).\n" +
    "2. Identifie tes plateformes étrangères et déclare-les via le 3916-bis.\n" +
    "3. Si tu as moins de 305 EUR de cessions sur l'année, tu es exonéré·e.\n" +
    "4. Choisis ton régime : PFU 30 % ou barème progressif.\n" +
    "5. N'oublie pas tes pertes — elles compensent tes gains.\n\n" +
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
  '<p style="background:#1F2937;padding:12px;border-left:3px solid #F5A524;">Si tu détiens des cryptos sur <strong>Binance, Kraken, Bybit, KuCoin, Coinbase Inc. (USA)</strong> ou tout autre exchange basé hors de France, tu dois remplir un formulaire dédié : le <strong>3916-bis</strong>.</p>' +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">C\'est quoi le 3916-bis ?</h2>' +
  "<p>Une simple déclaration des comptes étrangers que tu détiens, à joindre à ta déclaration de revenus. Un formulaire par compte. Pas de calcul, juste de l'identification (nom de l'exchange, n° de compte, adresse).</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Combien ça coûte si tu oublies ?</h2>' +
  '<ul style="padding-left:20px;">' +
  "<li><strong>1 500 € par compte non déclaré</strong> (article 1736 IV du CGI)</li>" +
  "<li><strong>10 000 €</strong> si l'État du compte n'a pas signé d'accord d'assistance avec la France</li>" +
  "<li>Délai de prescription porté à <strong>10 ans</strong> au lieu de 3</li>" +
  "</ul>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Le truc qui change tout</h2>' +
  "<p>Remplir manuellement 5 ou 10 formulaires 3916-bis, c'est fastidieux. Waltio les pré-remplit automatiquement à partir de tes connexions exchanges (200+ supportées). Tu n'as qu'à imprimer et joindre.</p>";

const J2: EmailInSequence = {
  id: "fiscalite-j2-3916bis",
  dayOffset: 2,
  subject: "L'erreur n°1 que font 80 % des Français : le 3916-bis",
  preheader: "Oublier ce formulaire = amende 1 500 € par compte. Voici comment l'éviter.",
  htmlBody: wrapEmail({
    preheader: "Oublier ce formulaire = amende 1 500 € par compte. Voici comment l'éviter.",
    contentHtml: J2_CONTENT_HTML,
    ctaPrimary: {
      label: "Générer ton 3916-bis avec Waltio",
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
    "Si tu as un compte sur Binance, Kraken, Bybit ou tout autre exchange étranger, tu dois le déclarer.\n\n" +
    "Sanction : 1 500 EUR par compte oublié (art. 1736 IV CGI).\n\n" +
    "Waltio pré-remplit le 3916-bis automatiquement (lien d'affiliation publicitaire) :\n" +
    waltioUrl(2, "j2-3916bis") +
    "\n\nGuide détaillé : " +
    internalUrl("/blog/declarer-comptes-crypto-etrangers-3916-bis", 2, "j2-3916bis") +
    "\n\nInformation indicative — ne constitue pas un conseil fiscal personnalisé.\n\n" +
    "Désinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Générer ton 3916-bis avec Waltio",
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
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">PFU 30 % ou barème progressif ? Le piège qui coûte cher</h1>' +
  "<p>La majorité des contribuables crypto laissent par défaut le PFU 30 %. Et pour 70 % d'entre eux, c'est en effet le bon choix.</p>" +
  "<p>Mais pour <strong>30 % des cas</strong>, opter pour le barème progressif fait économiser des centaines (parfois milliers) d'euros.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">La règle simple</h2>' +
  '<table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;background:#1F2937;border-radius:8px;margin:12px 0;">' +
  '<tr><td style="border-bottom:1px solid #374151;font-weight:700;color:#F5A524;">Ta TMI</td><td style="border-bottom:1px solid #374151;font-weight:700;color:#F5A524;">Choix optimal</td></tr>' +
  "<tr><td>0 % (non imposable)</td><td>Barème (tu ne paies que les 17,2 % de PS)</td></tr>" +
  "<tr><td>11 %</td><td>Barème (28,2 % au lieu de 30 %)</td></tr>" +
  "<tr><td>30 %</td><td>Indifférent (47,2 % vs 30 % — PFU gagne)</td></tr>" +
  "<tr><td>41 / 45 %</td><td>PFU (économie large)</td></tr>" +
  "</table>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Exemple chiffré (PV crypto = 5 000 €)</h2>' +
  '<ul style="padding-left:20px;">' +
  "<li>TMI 11 % → barème : <strong>1 410 €</strong> d'impôt vs PFU : 1 500 € → économie 90 €</li>" +
  "<li>TMI 0 % → barème : <strong>860 €</strong> (PS uniquement) vs PFU : 1 500 € → <strong>économie 640 €</strong></li>" +
  "<li>TMI 41 % → barème : 2 910 € vs PFU : 1 500 € → <strong>perte 1 410 €</strong> si on choisit le barème</li>" +
  "</ul>" +
  '<p style="margin-top:16px;background:#1F2937;padding:12px;border-left:3px solid #F5A524;"><strong>Attention :</strong> l\'option barème est <strong>globale</strong> — si tu la coches, elle s\'applique aussi à tes dividendes, intérêts et autres PV mobilières. Calcule toujours sur l\'ensemble.</p>';

const J5: EmailInSequence = {
  id: "fiscalite-j5-pfu-vs-bareme",
  dayOffset: 5,
  subject: "PFU 30 % ou barème ? Le piège qui coûte cher",
  preheader: "30 % des contribuables crypto choisissent le mauvais régime. Calcule en 2 clics.",
  htmlBody: wrapEmail({
    preheader: "30 % des contribuables crypto choisissent le mauvais régime. Calcule en 2 clics.",
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
    "PFU 30 % ou barème progressif ?\n\n" +
    "Règle simple :\n" +
    "- TMI 0 % ou 11 % → barème (tu paies moins).\n" +
    "- TMI 30 % et plus → PFU (tu paies moins).\n\n" +
    "Exemple PV 5 000 EUR :\n" +
    "- TMI 0 % → 860 EUR au barème vs 1 500 EUR au PFU (-640 EUR)\n" +
    "- TMI 11 % → 1 410 EUR vs 1 500 EUR (-90 EUR)\n" +
    "- TMI 41 % → 2 910 EUR vs 1 500 EUR (+1 410 EUR si on choisit le barème)\n\n" +
    "Compare avec notre calculateur : " +
    internalUrl("/outils/calculateur-fiscalite", 5, "j5-pfu-bareme") +
    "\n\nOu automatise tout avec Waltio (lien d'affiliation publicitaire) : " +
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
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Tes pertes crypto peuvent te faire économiser des impôts</h1>' +
  "<p>Si tu as vendu à perte en 2025 (Luna, FTX, projets DeFi qui ont rugged…), bonne nouvelle : ces pertes peuvent <strong>diminuer ta plus-value imposable</strong>.</p>" +
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
  "<tr><td>Économie d'impôt (PFU 30 %)</td><td align=\"right\"><strong>900 €</strong></td></tr>" +
  "</table>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Le piège à éviter</h2>' +
  "<p>Si tes tokens sont stuck sur un exchange en faillite (FTX, Celsius), tu ne peux <strong>pas</strong> les déduire tant qu'ils ne sont pas \"officiellement perdus\" (jugement, liquidation). Conserve les preuves d'irrécouvrabilité.</p>" +
  '<p style="margin-top:16px;">Pour identifier toutes tes pertes 2025, l\'import automatique Waltio scanne tes 200+ exchanges + wallets DeFi.</p>';

const J9: EmailInSequence = {
  id: "fiscalite-j9-pertes",
  dayOffset: 9,
  subject: "Tes pertes crypto peuvent te faire économiser des impôts",
  preheader: "Vendu à perte en 2025 ? Voici comment compenser ta plus-value (exemples chiffrés).",
  htmlBody: wrapEmail({
    preheader: "Vendu à perte en 2025 ? Voici comment compenser ta plus-value (exemples chiffrés).",
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
    "Tes pertes crypto peuvent réduire tes impôts.\n\n" +
    "Règle : les MV crypto compensent les PV crypto de la MÊME année.\n" +
    "Pas de report sur années suivantes pour les particuliers.\n\n" +
    "Exemple : PV BTC +8 000 EUR - MV Luna 3 000 EUR = PV nette 5 000 EUR\n" +
    "Économie : 900 EUR (au PFU 30 %).\n\n" +
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
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Ton plan d\'action complet pour la déclaration 2026</h1>' +
  "<p>Dernier email de la série ! Voici la checklist condensée des 10 actions à mener entre <strong>maintenant et juin 2026</strong>.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">La checklist 10 points</h2>' +
  '<ol style="padding-left:20px;">' +
  "<li>Recense <strong>toutes</strong> les plateformes utilisées en 2025 (CEX, DEX, wallets, applis mobiles).</li>" +
  "<li>Exporte les historiques CSV ou connecte les API à un agrégateur fiscal.</li>" +
  "<li>Vérifie que ton total de cessions dépasse 305 € (sinon exonération).</li>" +
  "<li>Liste les comptes étrangers → un <strong>3916-bis par compte</strong>.</li>" +
  "<li>Calcule la plus-value via la formule 150 VH bis (prorata du portefeuille).</li>" +
  "<li>Compare PFU 30 % vs barème progressif selon ta TMI.</li>" +
  "<li>Identifie les pertes 2025 réalisées (vente effective requise).</li>" +
  "<li>Remplis le <strong>Cerfa 2086</strong> (détail des cessions) + <strong>2042-C</strong> (synthèse).</li>" +
  "<li>Joins les 3916-bis et garde les exports CSV en backup pendant 6 ans.</li>" +
  "<li>Soumets avant la date limite (mai-juin 2026 selon ton département).</li>" +
  "</ol>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Dates clés 2026 à retenir</h2>' +
  '<table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;background:#1F2937;border-radius:8px;margin:12px 0;">' +
  "<tr><td><strong>Avril 2026</strong></td><td>Ouverture du service de déclaration en ligne</td></tr>" +
  "<tr><td><strong>22 mai 2026</strong></td><td>Date limite départements 01-19 + non-résidents (estimation)</td></tr>" +
  "<tr><td><strong>29 mai 2026</strong></td><td>Date limite départements 20-54 (estimation)</td></tr>" +
  "<tr><td><strong>5 juin 2026</strong></td><td>Date limite départements 55-976 (estimation)</td></tr>" +
  "</table>" +
  '<p style="font-style:italic;color:#9CA3AF;font-size:13px;">Dates indicatives selon le calendrier 2025 — les dates 2026 seront confirmées par la DGFiP en mars 2026.</p>' +
  '<p style="margin-top:16px;">Pour avoir tout sous la main, télécharge notre <strong>Bible Fiscalité Crypto 2026</strong> (30 pages, gratuit). Et si tu veux gagner 10h de paperasse, Waltio reste l\'outil le plus complet du marché FR.</p>';

const J14: EmailInSequence = {
  id: "fiscalite-j14-recap",
  dayOffset: 14,
  subject: "Récap : ton plan d'action complet pour la déclaration 2026",
  preheader: "Checklist 10 points + dates clés mai-juin 2026 + Bible Fiscalité PDF offerte.",
  htmlBody: wrapEmail({
    preheader: "Checklist 10 points + dates clés mai-juin 2026 + Bible Fiscalité PDF offerte.",
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
    "Ton plan d'action déclaration 2026 — checklist 10 points :\n\n" +
    "1. Recense toutes tes plateformes 2025.\n" +
    "2. Exporte les historiques CSV / API.\n" +
    "3. Vérifie le seuil 305 EUR de cessions.\n" +
    "4. 1 formulaire 3916-bis par compte étranger.\n" +
    "5. Calcule la PV via 150 VH bis.\n" +
    "6. Compare PFU vs Barème.\n" +
    "7. Identifie les pertes (vente effective).\n" +
    "8. Remplis Cerfa 2086 + 2042-C.\n" +
    "9. Joins 3916-bis + garde CSV 6 ans.\n" +
    "10. Soumets avant mai-juin 2026.\n\n" +
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

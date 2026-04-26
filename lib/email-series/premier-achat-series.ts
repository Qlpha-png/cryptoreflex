/**
 * lib/email-series/premier-achat-series.ts
 * ------------------------------------------------------------------
 * Sequence email "Premier achat crypto en 5 emails" declenchee apres
 * inscription via le quiz exchange OU le PDF du calculateur fiscalite.
 * Cible persona P1 : debutant FR avec intent d'achat premier coin.
 *
 * Flow lead → conversion :
 *   1. User complete /quiz/exchange OU /outils/calculateur-fiscalite
 *   2. Email gate pour recevoir recommandation perso / PDF
 *   3. Inscription via /api/newsletter/subscribe avec source ad hoc
 *   4. Cron quotidien `email-series-premier-achat` filtre par dayOffset
 *      (J0, J3, J7, J14, J21) idempotent par abonne (KV)
 *   5. Mesure conversion via UTM utm_campaign=premier-achat-d{N}
 *
 * Cadence : 5 emails sur 21 jours = on prend le temps d'eduquer avant
 * le push affiliation (Coinbase / Bitpanda). Le persona "debutant" a
 * besoin de plus de reassurance qu'un user fiscalite (deja averti).
 *
 * Conformite :
 *  - RGPD : opt-out global via {{unsubscribe_url}} (HMAC token)
 *  - Loi Influenceurs (juin 2023) : tous les CTA exchanges = "Lien
 *    d'affiliation publicitaire" + label visible dans le bouton
 *  - YMYL : disclaimer "investir comporte un risque de perte en
 *    capital" en pied de chaque email
 *  - AMF (art. 222-15) : aucune recommandation d'achat d'un actif
 *    specifique ; on parle de "premiere experience d'achat" pas de
 *    "investis dans BTC".
 *
 * Pourquoi pas etendre fiscalite-crypto-series ?
 *  - Persona different (debutant vs deja investisseur cherchant a
 *    optimiser sa fisca)
 *  - CTA different (exchange vs Waltio)
 *  - Disclaimer different (risque investissement vs risque fiscal)
 */

import { BRAND } from "@/lib/brand";
import { generateUnsubscribeToken } from "@/lib/auth-tokens";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type PremierAchatDayOffset = 0 | 3 | 7 | 14 | 21;

export interface EmailCta {
  label: string;
  url: string;
  sponsored?: boolean;
}

export interface EmailInSequence {
  id: string;
  dayOffset: PremierAchatDayOffset;
  subject: string;
  preheader: string;
  htmlBody: string;
  textBody: string;
  ctaPrimary: EmailCta;
  ctaSecondary?: EmailCta;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

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

/** URL Coinbase sponsored avec UTM sequence (a verifier : lien partenaire reel). */
function coinbaseUrl(day: PremierAchatDayOffset, sub: string): string {
  return (
    "https://www.coinbase.com/join/cryptoreflex" +
    "?utm_source=cryptoreflex&utm_medium=email&utm_campaign=premier-achat-d" +
    String(day) +
    "&utm_content=" +
    encodeURIComponent(sub)
  );
}

/** URL Bitpanda sponsored (a verifier). */
function bitpandaUrl(day: PremierAchatDayOffset, sub: string): string {
  return (
    "https://www.bitpanda.com/?ref=cryptoreflex" +
    "&utm_source=cryptoreflex&utm_medium=email&utm_campaign=premier-achat-d" +
    String(day) +
    "&utm_content=" +
    encodeURIComponent(sub)
  );
}

function internalUrl(path: string, day: PremierAchatDayOffset, sub: string): string {
  const sep = path.includes("?") ? "&" : "?";
  const base = BRAND.url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : "/" + path;
  return (
    base +
    cleanPath +
    sep +
    "utm_source=email&utm_medium=premier-achat-series&utm_campaign=premier-achat-d" +
    String(day) +
    "&utm_content=" +
    encodeURIComponent(sub)
  );
}

/* -------------------------------------------------------------------------- */
/*  Wrapper HTML email                                                        */
/* -------------------------------------------------------------------------- */

function wrapEmail(opts: {
  preheader: string;
  contentHtml: string;
  ctaPrimary: EmailCta;
  ctaSecondary?: EmailCta;
}): string {
  const { preheader, contentHtml, ctaPrimary, ctaSecondary } = opts;

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
      ? '<tr><td align="center" style="padding-top:8px;font-family:Arial,sans-serif;font-size:11px;color:#9CA3AF;">Lien d\'affiliation publicitaire — Cryptoreflex percoit une commission</td></tr>'
      : "") +
    "</table>";

  const secondaryBtn = ctaSecondary
    ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:12px auto 0 auto;">' +
      '<tr><td align="center" style="border:1px solid #F5A524;border-radius:8px;">' +
      '<a href="' +
      ctaSecondary.url +
      '" style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#F5A524;text-decoration:none;border-radius:8px;" rel="' +
      (ctaSecondary.sponsored ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer") +
      '" target="_blank">' +
      ctaSecondary.label +
      "</a></td></tr></table>"
    : "";

  // Disclaimer YMYL investissement (different de fiscalite-series).
  const disclaimer =
    '<p style="margin:24px 0 0 0;padding:12px;background:#1F2937;border-left:3px solid #F5A524;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#D1D5DB;">' +
    "<strong>Information importante :</strong> investir dans les cryptoactifs comporte un risque de perte en capital. " +
    "Cryptoreflex ne fournit pas de conseil en investissement (art. 222-15 RGAMF). Les contenus de cet email sont " +
    "informatifs et ne constituent ni une recommandation d'achat, ni une sollicitation. Investis uniquement ce que tu " +
    "peux te permettre de perdre. Verifie toujours qu'une plateforme est enregistree PSAN/MiCA avant tout depot." +
    "</p>";

  const footer =
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;border-top:1px solid #374151;padding-top:16px;">' +
    "<tr><td align=\"center\" style=\"font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:#9CA3AF;\">" +
    "Tu recois cet email car tu t'es inscrit·e a la newsletter Cryptoreflex via le quiz Exchange ou le calculateur fiscalite.<br>" +
    "Cryptoreflex — Edition independante francaise — SIRET 103 352 621<br>" +
    '<a href="{{unsubscribe_url}}" style="color:#F5A524;text-decoration:underline;">Se desinscrire en 1 clic</a>' +
    " · " +
    '<a href="' +
    BRAND.url +
    '/confidentialite" style="color:#F5A524;text-decoration:underline;">Confidentialite (RGPD)</a>' +
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
    '<tr><td align="center" style="padding-bottom:16px;border-bottom:1px solid #374151;">' +
    '<a href="' +
    BRAND.url +
    '" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#F5A524;text-decoration:none;letter-spacing:-0.5px;">Cryptoreflex</a>' +
    '<div style="font-family:Arial,sans-serif;font-size:11px;color:#9CA3AF;margin-top:4px;">Serie Premier Achat · 5 emails sur 21 jours</div>' +
    "</td></tr>" +
    '<tr><td style="padding-top:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#F4F5F7;">' +
    contentHtml +
    primaryBtn +
    secondaryBtn +
    disclaimer +
    footer +
    "</td></tr></table></td></tr></table></body></html>"
  );
}

/* -------------------------------------------------------------------------- */
/*  Email J0 — Bienvenue + cadre risque                                       */
/* -------------------------------------------------------------------------- */

const J0_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Avant ton premier achat : 3 reflexes a avoir</h1>' +
  "<p>Bienvenue ! Tu envisages ton premier achat crypto — c'est un cap qui se reflechit.</p>" +
  "<p>Cette serie de 5 emails sur 21 jours va te guider, sans te pousser a acheter quoi que ce soit. Notre objectif : que tu fasses ton premier achat <strong>quand tu te sens pret·e</strong>, en connaissant les risques et les bonnes pratiques.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Les 3 reflexes a integrer maintenant</h2>' +
  '<ol style="padding-left:20px;">' +
  "<li><strong>N'investis que ce que tu peux perdre.</strong> Le BTC a deja perdu 80 % de sa valeur a plusieurs reprises. Si une chute totale te met en difficulte, le montant est trop eleve.</li>" +
  "<li><strong>Verifie le statut de la plateforme.</strong> En France, une plateforme doit etre enregistree PSAN ou agreee MiCA. Notre comparateur t'aide.</li>" +
  "<li><strong>Active la 2FA des le depart.</strong> Application (Google Authenticator) > SMS. Sans 2FA, ton compte sera pirate tot ou tard.</li>" +
  "</ol>";

const J0: EmailInSequence = {
  id: "premier-achat-j0-bienvenue",
  dayOffset: 0,
  subject: "Avant ton premier achat : 3 reflexes a avoir",
  preheader: "21 jours pour faire ton premier achat crypto sereinement, sans pression.",
  htmlBody: wrapEmail({
    preheader: "21 jours pour faire ton premier achat crypto sereinement, sans pression.",
    contentHtml: J0_HTML,
    ctaPrimary: {
      label: "Voir le comparateur PSAN/MiCA",
      url: internalUrl("/comparateur", 0, "j0-comparateur"),
    },
    ctaSecondary: {
      label: "Refaire le quiz Exchange",
      url: internalUrl("/quiz/exchange", 0, "j0-quiz"),
    },
  }),
  textBody:
    "Bienvenue ! Avant ton premier achat crypto, 3 reflexes :\n\n" +
    "1. N'investis que ce que tu peux perdre.\n" +
    "2. Verifie le statut PSAN/MiCA de la plateforme.\n" +
    "3. Active la 2FA des le premier login.\n\n" +
    "Comparateur : " +
    internalUrl("/comparateur", 0, "j0-comparateur") +
    "\nQuiz : " +
    internalUrl("/quiz/exchange", 0, "j0-quiz") +
    "\n\nInvestir comporte un risque de perte en capital.\n\nDesinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Voir le comparateur PSAN/MiCA",
    url: internalUrl("/comparateur", 0, "j0-comparateur"),
  },
  ctaSecondary: {
    label: "Refaire le quiz Exchange",
    url: internalUrl("/quiz/exchange", 0, "j0-quiz"),
  },
};

/* -------------------------------------------------------------------------- */
/*  Email J3 — Choisir une plateforme reglementee                             */
/* -------------------------------------------------------------------------- */

const J3_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Comment choisir une plateforme sans se faire avoir</h1>' +
  "<p>Tu vas vite voir : il y a des dizaines de plateformes qui te promettent monts et merveilles. La majorite ne sont pas autorisees en France.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Les 4 criteres non negociables</h2>' +
  '<ul style="padding-left:20px;">' +
  "<li><strong>Enregistrement PSAN ou agrement MiCA</strong> aupres de l'AMF — sinon, recours impossible en cas de probleme.</li>" +
  "<li><strong>Siege social en UE</strong> de preference (juridiction lisible, RGPD applicable).</li>" +
  "<li><strong>Frais transparents</strong> avant achat (depot, conversion, retrait crypto et euro).</li>" +
  "<li><strong>Reputation</strong> : Trustpilot > 3.5/5, age > 3 ans, pas d'historique de hack non rembourse.</li>" +
  "</ul>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Notre top 3 pour debuter (FR)</h2>' +
  "<p>On detaille les criteres + un classement neutre dans notre comparateur. Pas de podium force : tu choisis selon TES priorites (frais bas, app simple, securite, etc.).</p>";

const J3: EmailInSequence = {
  id: "premier-achat-j3-choisir-plateforme",
  dayOffset: 3,
  subject: "Comment choisir une plateforme sans se faire avoir",
  preheader: "PSAN, MiCA, frais, reputation : la grille a appliquer avant tout depot.",
  htmlBody: wrapEmail({
    preheader: "PSAN, MiCA, frais, reputation : la grille a appliquer avant tout depot.",
    contentHtml: J3_HTML,
    ctaPrimary: {
      label: "Comparer les plateformes PSAN",
      url: internalUrl("/comparateur", 3, "j3-compare"),
    },
    ctaSecondary: {
      label: "Tester Bitpanda (essai gratuit)",
      url: bitpandaUrl(3, "j3-bitpanda"),
      sponsored: true,
    },
  }),
  textBody:
    "Choisir une plateforme : 4 criteres non negociables.\n\n" +
    "1. Enregistrement PSAN / MiCA (AMF).\n" +
    "2. Siege social UE.\n" +
    "3. Frais transparents avant achat.\n" +
    "4. Reputation Trustpilot, age, historique.\n\n" +
    "Comparateur : " +
    internalUrl("/comparateur", 3, "j3-compare") +
    "\nBitpanda (lien d'affiliation publicitaire) : " +
    bitpandaUrl(3, "j3-bitpanda") +
    "\n\nInvestir comporte un risque de perte en capital.\n\nDesinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Comparer les plateformes PSAN",
    url: internalUrl("/comparateur", 3, "j3-compare"),
  },
  ctaSecondary: {
    label: "Tester Bitpanda (essai gratuit)",
    url: bitpandaUrl(3, "j3-bitpanda"),
    sponsored: true,
  },
};

/* -------------------------------------------------------------------------- */
/*  Email J7 — Combien investir et avec quelle strategie                      */
/* -------------------------------------------------------------------------- */

const J7_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Combien investir ? Le DCA, ami du debutant</h1>' +
  "<p>La question qui revient le plus souvent : <em>combien je mets pour mon premier achat ?</em></p>" +
  '<p style="background:#1F2937;padding:12px;border-left:3px solid #F5A524;">Reponse honnete : aucune regle universelle. Mais une approche bat statistiquement le \'lump sum\' chez les debutants : le <strong>DCA (Dollar Cost Averaging)</strong>.</p>' +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">DCA = lisser ton entree dans le temps</h2>' +
  "<p>Au lieu d'investir 1 000 € d'un coup, tu mets 100 € par mois pendant 10 mois. Tu lisses la volatilite, tu evites le stress du timing.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Notre simulateur DCA</h2>' +
  "<p>On a un outil qui simule un DCA sur BTC, ETH ou SOL : tu vois combien tu aurais aujourd'hui si tu avais commence il y a X mois avec Y € par mois. Indispensable avant de te decider.</p>";

const J7: EmailInSequence = {
  id: "premier-achat-j7-dca",
  dayOffset: 7,
  subject: "Combien investir ? Le DCA, ami du debutant",
  preheader: "Pourquoi etaler ton entree bat (statistiquement) le tout-en-un coup.",
  htmlBody: wrapEmail({
    preheader: "Pourquoi etaler ton entree bat (statistiquement) le tout-en-un coup.",
    contentHtml: J7_HTML,
    ctaPrimary: {
      label: "Simuler mon DCA",
      url: internalUrl("/outils/simulateur-dca", 7, "j7-dca"),
    },
  }),
  textBody:
    "Combien investir ? Le DCA est l'ami du debutant.\n\n" +
    "Au lieu de 1 000 EUR d'un coup, mets 100 EUR par mois pendant 10 mois.\n" +
    "Tu lisses la volatilite, tu evites le stress du timing.\n\n" +
    "Simulateur DCA : " +
    internalUrl("/outils/simulateur-dca", 7, "j7-dca") +
    "\n\nInvestir comporte un risque de perte en capital.\n\nDesinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Simuler mon DCA",
    url: internalUrl("/outils/simulateur-dca", 7, "j7-dca"),
  },
};

/* -------------------------------------------------------------------------- */
/*  Email J14 — Securite : custody et hardware wallet                         */
/* -------------------------------------------------------------------------- */

const J14_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">"Not your keys, not your coins" — vraiment ?</h1>' +
  "<p>Tu as fait ton premier achat, tes cryptos sont sur l'exchange. Peut-on les y laisser ?</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">La regle empirique</h2>' +
  '<ul style="padding-left:20px;">' +
  "<li>< 500 € : laisse sur la plateforme PSAN, securise avec 2FA app + email different.</li>" +
  "<li>500 € — 5 000 € : envisage un hardware wallet (Ledger, Trezor) pour la majorite.</li>" +
  "<li>> 5 000 € : hardware wallet obligatoire selon nous. Le risque exchange (faillite, hack, blocage) depasse l'effort d'apprentissage du wallet.</li>" +
  "</ul>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Pourquoi ?</h2>' +
  "<p>Souviens-toi de FTX (novembre 2022) : 8 milliards $ disparus. Les utilisateurs reglo qui avaient leurs coins sur la plateforme ont attendu 2 ans pour recuperer une fraction. Ceux qui avaient un hardware wallet n'ont rien perdu.</p>";

const J14: EmailInSequence = {
  id: "premier-achat-j14-securite",
  dayOffset: 14,
  subject: "\"Not your keys, not your coins\" — vraiment ?",
  preheader: "Quand passer au hardware wallet : nos seuils empiriques.",
  htmlBody: wrapEmail({
    preheader: "Quand passer au hardware wallet : nos seuils empiriques.",
    contentHtml: J14_HTML,
    ctaPrimary: {
      label: "Guide hardware wallets (FR)",
      url: internalUrl("/guides/hardware-wallets", 14, "j14-guide"),
    },
  }),
  textBody:
    "Securite : la regle empirique.\n\n" +
    "- < 500 EUR : exchange PSAN avec 2FA app.\n" +
    "- 500 - 5 000 EUR : hardware wallet conseille.\n" +
    "- > 5 000 EUR : hardware wallet quasi obligatoire.\n\n" +
    "Souviens-toi de FTX. Hardware wallet = pas de risque tiers.\n\n" +
    "Guide : " +
    internalUrl("/guides/hardware-wallets", 14, "j14-guide") +
    "\n\nInvestir comporte un risque de perte en capital.\n\nDesinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Guide hardware wallets (FR)",
    url: internalUrl("/guides/hardware-wallets", 14, "j14-guide"),
  },
};

/* -------------------------------------------------------------------------- */
/*  Email J21 — Recap fiscalite + transition vers newsletter quotidienne     */
/* -------------------------------------------------------------------------- */

const J21_HTML =
  '<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#F5A524;">Et la fiscalite dans tout ca ?</h1>' +
  "<p>Tu as ton premier achat, tu sais comment securiser. Reste un sujet souvent ignore par les debutants : la fiscalite.</p>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Les 3 trucs a savoir des maintenant</h2>' +
  '<ol style="padding-left:20px;">' +
  "<li><strong>Tant que tu n'as pas vendu vers une monnaie fiat (€), pas d'imposition.</strong> Acheter, conserver, swapper crypto-vers-crypto = neutre fiscalement (regime particulier).</li>" +
  "<li><strong>Au premier retrait en €, tu seras impose</strong> via le PFU 30 % (ou bareme progressif si plus interessant).</li>" +
  "<li><strong>Si tu as un compte sur un exchange etranger</strong> (Binance, Kraken), tu dois le declarer via le formulaire 3916-bis. Amende 1 500 €/compte sinon.</li>" +
  "</ol>" +
  '<h2 style="font-size:18px;color:#F5A524;margin-top:24px;">Pour aller plus loin</h2>' +
  "<p>On a une serie dediee de 5 emails sur la fisca crypto FR — declenchee si tu utilises notre calculateur. Et la newsletter quotidienne couvre toute l'actu.</p>";

const J21: EmailInSequence = {
  id: "premier-achat-j21-fisca-transition",
  dayOffset: 21,
  subject: "Et la fiscalite dans tout ca ? (recap + suite)",
  preheader: "Les 3 reflexes fiscaux a integrer des le premier achat.",
  htmlBody: wrapEmail({
    preheader: "Les 3 reflexes fiscaux a integrer des le premier achat.",
    contentHtml: J21_HTML,
    ctaPrimary: {
      label: "Calculer ma fiscalite crypto",
      url: internalUrl("/outils/calculateur-fiscalite", 21, "j21-calc"),
    },
    ctaSecondary: {
      label: "Telecharger la Bible Fiscalite (PDF)",
      url: internalUrl("/api/lead-magnet/bible-fiscalite", 21, "j21-bible"),
    },
  }),
  textBody:
    "Fiscalite : 3 trucs a savoir des maintenant.\n\n" +
    "1. Crypto -> crypto = neutre fiscalement.\n" +
    "2. Crypto -> EUR = impose au PFU 30 % (ou bareme).\n" +
    "3. Compte exchange etranger = formulaire 3916-bis obligatoire.\n\n" +
    "Calculateur : " +
    internalUrl("/outils/calculateur-fiscalite", 21, "j21-calc") +
    "\nBible PDF : " +
    internalUrl("/api/lead-magnet/bible-fiscalite", 21, "j21-bible") +
    "\n\nInvestir comporte un risque de perte en capital.\n\nDesinscription : {{unsubscribe_url}}",
  ctaPrimary: {
    label: "Calculer ma fiscalite crypto",
    url: internalUrl("/outils/calculateur-fiscalite", 21, "j21-calc"),
  },
  ctaSecondary: {
    label: "Telecharger la Bible Fiscalite (PDF)",
    url: internalUrl("/api/lead-magnet/bible-fiscalite", 21, "j21-bible"),
  },
};

/* -------------------------------------------------------------------------- */
/*  Export                                                                    */
/* -------------------------------------------------------------------------- */

export const PREMIER_ACHAT_EMAIL_SERIES: EmailInSequence[] = [J0, J3, J7, J14, J21];

/** Sources Beehiiv tags eligibles pour declencher la sequence. */
export const PREMIER_ACHAT_SERIES_SOURCES: ReadonlyArray<string> = [
  "quiz-exchange",
  "calculator-pdf",
  "sticky-bar-mobile",
];

export const PREMIER_ACHAT_VALID_OFFSETS: ReadonlySet<PremierAchatDayOffset> = new Set([
  0, 3, 7, 14, 21,
]);

export function getPremierAchatEmailByOffset(
  offset: number,
): EmailInSequence | undefined {
  return PREMIER_ACHAT_EMAIL_SERIES.find((e) => e.dayOffset === offset);
}

/**
 * lib/email-drip-templates.ts — Templates HTML pour la séquence drip welcome 7 jours.
 *
 * Pourquoi un fichier dédié plutôt que d'étendre `email-templates.ts` ?
 *  - Séparation des responsabilités : `email-templates.ts` reste focalisé sur les
 *    notifications transactionnelles (alertes prix). `email-drip-templates.ts`
 *    porte la séquence d'onboarding marketing.
 *  - Facilite une éventuelle externalisation : si on bascule la séquence drip
 *    dans Beehiiv automation native (recommandé en V2), on supprime ce fichier
 *    sans toucher au reste.
 *
 * Cohérence visuelle :
 *  - Mêmes couleurs / largeur / style que `priceAlertHtml` (#0B0F1A bg, #111827
 *    surface, #6366F1 primary).
 *  - Bouton CTA gold (`#F59E0B`) — variante chaude pour différencier le contexte
 *    onboarding (vs notification urgente du transactionnel).
 *  - Préférer `<table role="presentation">` partout (compat Outlook desktop).
 *
 * Sécurité opt-out :
 *  - On réutilise EXACTEMENT le même mécanisme que les alertes :
 *    SHA-256(`${email}:${ALERT_DELETE_SECRET}`), tronqué 32 chars base64url.
 *  - 1 lien d'opt-out global (`/api/newsletter/unsubscribe`) qui désinscrit
 *    de la séquence drip ET de la newsletter quotidienne.
 *  - Conformité RGPD : un seul clic suffit, pas de re-confirmation requise.
 *
 * Tracking :
 *  - UTM systématique : utm_source=email, utm_medium=drip, utm_campaign=welcome-d{N}
 *  - Préheader (preview text) optimisé < 90 chars pour mobile.
 *
 * Contenu :
 *  - Tone factuel cohérent avec la ligne éditoriale Cryptoreflex.
 *  - Pas de "tu" — on tutoie comme dans le reste du site.
 *  - Mentions AMF systématiques en footer.
 */

import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface DripEmailContext {
  /** Email du destinataire — utilisé pour le lien d'opt-out + UTM tracking. */
  email: string;
  /** Token signé pour l'opt-out (compute via `computeUnsubscribeToken`). */
  unsubscribeToken: string;
  /** Prénom optionnel — fallback "toi" si absent. */
  firstName?: string;
}

export interface DripEmail {
  subject: string;
  /** Preview text affiché sous le sujet dans Gmail/Apple Mail (≤ 90 chars). */
  preview: string;
  html: string;
}

export type DripDay = 0 | 1 | 2 | 3 | 4 | 5 | 7;

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

/** Échappement HTML strict — identique à `email-templates.ts`. */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Construit une URL Cryptoreflex absolue avec UTM drip. */
function utmUrl(path: string, day: DripDay): string {
  const sep = path.includes("?") ? "&" : "?";
  const qs = `utm_source=email&utm_medium=drip&utm_campaign=welcome-d${day}`;
  // Empêche les doubles-slash si path commence par /
  const base = BRAND.url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}${sep}${qs}`;
}

/** URL d'opt-out global (désinscription drip + daily). */
function unsubscribeUrl(email: string, token: string): string {
  const base = BRAND.url.replace(/\/$/, "");
  return `${base}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}

/** URL absolue d'une ressource publique (logo, lead magnet PDF). */
function abs(path: string): string {
  const base = BRAND.url.replace(/\/$/, "");
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Wrapper HTML commun à tous les emails drip.
 * - Header avec logo Cryptoreflex
 * - Bloc content (prop)
 * - Bouton CTA gold
 * - Footer méthodologie + opt-out + AMF
 */
interface DripWrapperOpts {
  preheader: string;
  title: string;
  intro: string;
  /** Bullet points ou paragraphes additionnels (déjà escapés). */
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
  /** Phrase finale en italique (signature / teaser). */
  outro?: string;
  email: string;
  unsubscribeToken: string;
  /** Numéro de jour (pour copyright + footer). */
  day: DripDay;
}

function dripWrapperHtml(opts: DripWrapperOpts): string {
  const {
    preheader,
    title,
    intro,
    bodyHtml,
    ctaText,
    ctaUrl,
    outro,
    email,
    unsubscribeToken,
    day,
  } = opts;

  const optOutUrl = unsubscribeUrl(email, unsubscribeToken);
  const logoUrl = abs("/logo.png");
  const methodologyUrl = utmUrl("/methodologie", day);

  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E5E7EB;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;mso-hide:all;">
    ${esc(preheader)}
  </span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0F1A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#111827;border:1px solid rgba(99,102,241,0.25);border-radius:16px;overflow:hidden;">

          <!-- Header / Logo -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <a href="${utmUrl("/", day)}" style="text-decoration:none;color:inherit;">
                <img src="${logoUrl}" alt="${esc(BRAND.name)}" width="140" height="32" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:140px;" />
              </a>
              <div style="margin-top:14px;display:inline-block;padding:6px 12px;border-radius:9999px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);font-size:11px;font-weight:600;color:#FCD34D;letter-spacing:0.05em;text-transform:uppercase;">
                Bienvenue · Jour ${day}
              </div>
            </td>
          </tr>

          <!-- Titre -->
          <tr>
            <td style="padding:18px 28px 8px 28px;">
              <h1 style="margin:0 0 8px 0;font-size:24px;line-height:1.25;font-weight:700;color:#FFFFFF;">
                ${esc(title)}
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.55;color:#9CA3AF;">
                ${esc(intro)}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px 28px 0 28px;font-size:15px;line-height:1.65;color:#E5E7EB;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- CTA principal (gold) -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0;">
                    <a href="${ctaUrl}" style="display:inline-block;background:#F59E0B;color:#0B0F1A;font-weight:700;font-size:15px;padding:14px 26px;border-radius:10px;text-decoration:none;">
                      ${esc(ctaText)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            outro
              ? `<tr><td style="padding:18px 28px 0 28px;font-size:13px;font-style:italic;color:#9CA3AF;line-height:1.5;">
                ${esc(outro)}
              </td></tr>`
              : ""
          }

          <!-- Disclaimer AMF -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <div style="border:1px solid rgba(245,158,11,0.18);background:rgba(245,158,11,0.04);border-radius:10px;padding:12px 14px;font-size:11px;line-height:1.5;color:#FCD34D;">
                <strong style="color:#FDE68A;">Information éditoriale — pas un conseil en investissement.</strong>
                Crypto-actifs = risque de perte en capital. Voir notre
                <a href="${methodologyUrl}" style="color:#FDE68A;">méthodologie</a>.
              </div>
            </td>
          </tr>

          <!-- Footer / opt-out -->
          <tr>
            <td style="padding:20px 28px 28px 28px;">
              <hr style="border:0;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 14px 0;" />
              <p style="margin:0 0 6px 0;font-size:12px;line-height:1.5;color:#9CA3AF;">
                Tu reçois cet e-mail car tu t'es inscrit à la séquence d'onboarding sur ${esc(BRAND.domain)}.
                <a href="${optOutUrl}" style="color:#A5B4FC;text-decoration:underline;">Se désinscrire en 1 clic</a>.
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#6B7280;">
                ${esc(BRAND.name)} · ${esc(BRAND.domain)} · ${esc(BRAND.email)}
                <br />
                Site éditorial indépendant. Comparatifs basés sur tests réels et données publiques (AMF, ESMA).
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*  Day 0 — Welcome + lead magnet PDF                                          */
/* -------------------------------------------------------------------------- */

export function dripDay0Welcome(ctx: DripEmailContext): DripEmail {
  const ctaUrl = utmUrl("/lead-magnets/guide-debutant-crypto-2026.pdf", 0);
  const subject = `Bienvenue sur ${BRAND.name} — ton guide débutant est dispo`;
  const preview = "Ton guide PDF + ce qui t'attend dans la séquence Cryptoreflex.";
  const intro = `Merci pour ton inscription, ${ctx.firstName ? esc(ctx.firstName) : "toi"}. Voici comment on va t'aider à devenir crypto-autonome en 7 jours.`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">
      <strong style="color:#FFFFFF;">Le guide débutant crypto 2026</strong> est prêt à télécharger
      (PDF, 28 pages, sans pub) — il couvre les bases, les pièges courants et le cadre MiCA français.
    </p>
    <ul style="margin:0 0 14px 0;padding-left:20px;color:#E5E7EB;">
      <li>Les 5 plateformes safe en France (PSAN + MiCA)</li>
      <li>Les 7 erreurs des débutants à éviter</li>
      <li>La fiscalité française expliquée en 4 schémas</li>
      <li>Une checklist sécurité (2FA, seed, hardware wallet)</li>
    </ul>
    <p style="margin:0 0 14px 0;">
      Sur les 7 prochains jours, on t'envoie un email court par jour pour mettre tout ça en pratique.
      Pas de pression, pas de spam — tu peux te désinscrire à tout moment en bas du mail.
    </p>
  `;

  return {
    subject,
    preview,
    html: dripWrapperHtml({
      preheader: preview,
      title: `Bienvenue sur ${BRAND.name}`,
      intro,
      bodyHtml,
      ctaText: "Télécharger le guide PDF",
      ctaUrl,
      outro: `Demain, on t'aide à choisir ta première plateforme avec un quiz en 6 questions.`,
      email: ctx.email,
      unsubscribeToken: ctx.unsubscribeToken,
      day: 0,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Day 1 — Choisir sa plateforme                                              */
/* -------------------------------------------------------------------------- */

export function dripDay1Plateforme(ctx: DripEmailContext): DripEmail {
  const ctaUrl = utmUrl("/quiz/plateforme", 1);
  const subject = "Choisis ta plateforme crypto en 6 questions (quiz)";
  const preview = "Coinbase, Bitpanda, Kraken... laquelle est faite pour toi ?";
  const intro =
    "Le piège, c'est de prendre la plateforme la plus connue (Binance) sans regarder si elle est adaptée à ton profil.";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">
      Notre quiz pose <strong style="color:#FFFFFF;">6 questions</strong> en 2 minutes :
      ton budget, ta tolérance au risque, ton besoin de support FR, ton intérêt pour le staking,
      ton expérience préalable, ton objectif (DCA long terme vs trading actif).
    </p>
    <p style="margin:0 0 14px 0;">
      Tu obtiens une recommandation chiffrée parmi <strong style="color:#FFFFFF;">10 plateformes
      MiCA-compliant</strong> testées par notre équipe (frais réels, KYC, support, sécurité).
    </p>
    <p style="margin:0 0 14px 0;">
      Aucun classement sponsorisé : la méthodologie est <a href="${utmUrl("/methodologie", 1)}" style="color:#A5B4FC;text-decoration:underline;">100 % publique</a>.
    </p>
  `;

  return {
    subject,
    preview,
    html: dripWrapperHtml({
      preheader: preview,
      title: "Trouve TA plateforme en 2 minutes",
      intro,
      bodyHtml,
      ctaText: "Lancer le quiz plateforme",
      ctaUrl,
      outro: "Demain : un mode d'emploi pour ton premier achat sans te tromper.",
      email: ctx.email,
      unsubscribeToken: ctx.unsubscribeToken,
      day: 1,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Day 2 — Premier achat                                                      */
/* -------------------------------------------------------------------------- */

export function dripDay2PremierAchat(ctx: DripEmailContext): DripEmail {
  const ctaUrl = utmUrl("/wizard/premier-achat", 2);
  const subject = "Ton premier achat crypto, sans te tromper";
  const preview = "Wizard pas-à-pas : combien, quoi, où, comment.";
  const intro =
    "C'est le moment où la majorité des débutants paie 2 % de frais cachés sans s'en rendre compte. On va éviter ça.";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">
      Notre wizard premier achat te demande 4 choses :
    </p>
    <ul style="margin:0 0 14px 0;padding-left:20px;color:#E5E7EB;">
      <li><strong style="color:#FFFFFF;">Combien</strong> tu peux investir sans stress (10 % max de l'épargne dispo)</li>
      <li><strong style="color:#FFFFFF;">Quoi</strong> acheter pour démarrer (Bitcoin pour la stabilité, ETH pour l'écosystème)</li>
      <li><strong style="color:#FFFFFF;">Où</strong> acheter selon ton quiz d'hier</li>
      <li><strong style="color:#FFFFFF;">Quand</strong> acheter (DCA mensuel vs achat unique)</li>
    </ul>
    <p style="margin:0 0 14px 0;">
      Bonus : on calcule les frais réels de chaque méthode (CB instant buy vs SEPA lent — différence de 1,5 %
      en moyenne, soit 15 € sur 1 000 € investis).
    </p>
  `;

  return {
    subject,
    preview,
    html: dripWrapperHtml({
      preheader: preview,
      title: "Premier achat : le mode d'emploi 5 étapes",
      intro,
      bodyHtml,
      ctaText: "Lancer le wizard premier achat",
      ctaUrl,
      outro: "Demain : les 5 règles sécurité pour ne jamais perdre tes crypto.",
      email: ctx.email,
      unsubscribeToken: ctx.unsubscribeToken,
      day: 2,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Day 3 — Sécurité                                                           */
/* -------------------------------------------------------------------------- */

export function dripDay3Securite(ctx: DripEmailContext): DripEmail {
  const ctaUrl = utmUrl("/blog/securiser-cryptos-wallet-2fa-2026", 3);
  const subject = "5 règles pour ne jamais perdre tes crypto";
  const preview = "2FA, seed phrase, hardware wallet, phishing : tout ce qui compte vraiment.";
  const intro =
    "60 % des pertes crypto en 2025 ne viennent pas du marché — elles viennent d'erreurs de sécurité évitables.";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">
      On a synthétisé les 5 règles qui ont sauvé nos lecteurs en 2025 :
    </p>
    <ol style="margin:0 0 14px 0;padding-left:20px;color:#E5E7EB;">
      <li><strong style="color:#FFFFFF;">2FA app</strong> (Google Authenticator, Aegis), <em>jamais SMS</em></li>
      <li><strong style="color:#FFFFFF;">Seed phrase</strong> écrite sur métal ou papier ignifuge, <em>jamais en photo</em></li>
      <li><strong style="color:#FFFFFF;">Whitelist</strong> d'adresses de retrait sur l'exchange</li>
      <li><strong style="color:#FFFFFF;">Hardware wallet</strong> dès 1 000 € (Ledger Nano S+ ~80 €)</li>
      <li><strong style="color:#FFFFFF;">Vérifier l'URL</strong> à chaque connexion (binance.com, pas binance-secure.com)</li>
    </ol>
    <p style="margin:0 0 14px 0;">
      L'article complet détaille chaque règle avec captures d'écran, marques recommandées, et les pièges
      phishing observés en 2025-2026.
    </p>
  `;

  return {
    subject,
    preview,
    html: dripWrapperHtml({
      preheader: preview,
      title: "Sécurité crypto : les 5 règles non-négociables",
      intro,
      bodyHtml,
      ctaText: "Lire le guide sécurité complet",
      ctaUrl,
      outro: "Demain : on configure ta watchlist personnalisée pour suivre tes positions.",
      email: ctx.email,
      unsubscribeToken: ctx.unsubscribeToken,
      day: 3,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Day 4 — Watchlist                                                          */
/* -------------------------------------------------------------------------- */

export function dripDay4Watchlist(ctx: DripEmailContext): DripEmail {
  const ctaUrl = utmUrl("/watchlist", 4);
  const subject = "Crée ta watchlist crypto personnalisée (gratuit)";
  const preview = "Suis tes positions sans installer 5 apps différentes.";
  const intro =
    "Tu n'as pas besoin de Trading View Pro à 60 € par mois. Notre watchlist gratuite couvre 95 % du job.";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">
      Avec ta watchlist Cryptoreflex, tu peux :
    </p>
    <ul style="margin:0 0 14px 0;padding-left:20px;color:#E5E7EB;">
      <li>Suivre <strong style="color:#FFFFFF;">jusqu'à 50 cryptos</strong> en EUR/USD temps réel</li>
      <li>Configurer des <strong style="color:#FFFFFF;">alertes prix par email</strong> (5 actives gratuites)</li>
      <li>Voir les variations 24h / 7j / 30j en un coup d'œil</li>
      <li>Synchroniser sur mobile via PWA (pas d'app à installer)</li>
    </ul>
    <p style="margin:0 0 14px 0;">
      Pas de compte requis : la watchlist se sauvegarde dans ton navigateur. Pour les alertes email,
      tu n'as besoin que de ton adresse mail.
    </p>
  `;

  return {
    subject,
    preview,
    html: dripWrapperHtml({
      preheader: preview,
      title: "Ta watchlist crypto en 30 secondes",
      intro,
      bodyHtml,
      ctaText: "Configurer ma watchlist",
      ctaUrl,
      outro: "Demain : on s'attaque au sujet le plus relou — la fiscalité crypto en France.",
      email: ctx.email,
      unsubscribeToken: ctx.unsubscribeToken,
      day: 4,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Day 5 — Fiscalité                                                          */
/* -------------------------------------------------------------------------- */

export function dripDay5Fiscalite(ctx: DripEmailContext): DripEmail {
  const ctaUrl = utmUrl("/outils/calculateur-fiscalite", 5);
  const subject = "La fiscalité crypto en France en 2026 (sans jargon)";
  const preview = "Flat tax 30 %, formulaire 2086, comptes étrangers : on déblaie.";
  const intro =
    "Tu n'as pas besoin d'un expert-comptable pour ta première déclaration crypto. Tu as besoin du bon outil.";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">
      Les 3 choses à retenir :
    </p>
    <ul style="margin:0 0 14px 0;padding-left:20px;color:#E5E7EB;">
      <li><strong style="color:#FFFFFF;">Flat tax 30 %</strong> sur les plus-values en EUR (12,8 % IR + 17,2 % PS)</li>
      <li><strong style="color:#FFFFFF;">Formulaire 2086</strong> pour chaque cession (vente vers EUR ou achat avec crypto)</li>
      <li><strong style="color:#FFFFFF;">Formulaire 3916-bis</strong> obligatoire pour chaque compte étranger (oubli = 750-1500 € d'amende)</li>
    </ul>
    <p style="margin:0 0 14px 0;">
      Notre calculateur applique automatiquement la méthode du prix moyen pondéré (PMP),
      calcule la flat tax, et génère un PDF prêt à attacher à ta déclaration.
    </p>
  `;

  return {
    subject,
    preview,
    html: dripWrapperHtml({
      preheader: preview,
      title: "Fiscalité crypto 2026 : le calculateur gratuit",
      intro,
      bodyHtml,
      ctaText: "Calculer ma fiscalité crypto",
      ctaUrl,
      outro: "J+2, on te présente Cryptoreflex Pro — la version premium qui arrive bientôt.",
      email: ctx.email,
      unsubscribeToken: ctx.unsubscribeToken,
      day: 5,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Day 7 — Premium tease                                                      */
/* -------------------------------------------------------------------------- */

export function dripDay7Premium(ctx: DripEmailContext): DripEmail {
  const ctaUrl = utmUrl("/pro", 7);
  const subject = `${BRAND.name} Pro arrive — inscris-toi à la waitlist`;
  const preview = "Alertes avancées, fiscalité automatisée, accès API : la V2 en juin 2026.";
  const intro =
    "Tu as terminé la séquence d'onboarding. Voici ce qu'on prépare pour aller plus loin.";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">
      <strong style="color:#FFFFFF;">${esc(BRAND.name)} Pro</strong> arrive en juin 2026. Au programme :
    </p>
    <ul style="margin:0 0 14px 0;padding-left:20px;color:#E5E7EB;">
      <li><strong style="color:#FFFFFF;">Alertes avancées</strong> (variations %, croisement de moyennes mobiles)</li>
      <li><strong style="color:#FFFFFF;">Portfolio tracker</strong> multi-exchanges avec import API automatique</li>
      <li><strong style="color:#FFFFFF;">Rapport fiscal annuel</strong> 2086 + 3916-bis pré-rempli, exportable PDF</li>
      <li><strong style="color:#FFFFFF;">Accès API privée</strong> Cryptoreflex (scoring plateformes, MiCA registry)</li>
      <li><strong style="color:#FFFFFF;">Newsletter Pro hebdo</strong> avec analyses fondamentales</li>
    </ul>
    <p style="margin:0 0 14px 0;">
      <strong style="color:#FCD34D;">Early bird :</strong> -50 % à vie pour les 500 premiers inscrits sur la waitlist.
      Lancement prévu fin juin 2026, juste après l'échéance MiCA.
    </p>
  `;

  return {
    subject,
    preview,
    html: dripWrapperHtml({
      preheader: preview,
      title: `${BRAND.name} Pro — rejoins la waitlist`,
      intro,
      bodyHtml,
      ctaText: "Rejoindre la waitlist Pro",
      ctaUrl,
      outro: `Merci d'avoir suivi la séquence. Tu vas continuer à recevoir notre newsletter quotidienne (1 mail/jour, 3 minutes de lecture). Pour t'en désinscrire en gardant juste ton compte, c'est en bas du mail.`,
      email: ctx.email,
      unsubscribeToken: ctx.unsubscribeToken,
      day: 7,
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Index — sélection par jour                                                */
/* -------------------------------------------------------------------------- */

/**
 * Map jour → générateur. Utile pour Beehiiv ou un cron custom qui sélectionne
 * dynamiquement le bon template selon le jour de la séquence.
 */
export const DRIP_TEMPLATES: Record<DripDay, (ctx: DripEmailContext) => DripEmail> = {
  0: dripDay0Welcome,
  1: dripDay1Plateforme,
  2: dripDay2PremierAchat,
  3: dripDay3Securite,
  4: dripDay4Watchlist,
  5: dripDay5Fiscalite,
  7: dripDay7Premium,
};

/**
 * Renvoie l'email drip correspondant à un jour donné, ou null si le jour n'a pas
 * d'email programmé (ex: jour 6 où on laisse respirer).
 */
export function getDripEmail(day: number, ctx: DripEmailContext): DripEmail | null {
  if (![0, 1, 2, 3, 4, 5, 7].includes(day)) return null;
  const fn = DRIP_TEMPLATES[day as DripDay];
  return fn ? fn(ctx) : null;
}

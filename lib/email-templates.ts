/**
 * lib/email-templates.ts — Templates HTML pour les emails transactionnels.
 *
 * Pourquoi du HTML inline plutôt qu'un moteur de template (Handlebars / MJML) ?
 *  - 1 seul template (alerte prix) en V1 — pas de matrice à factoriser.
 *  - HTML inline-styled = compat universelle (Gmail / Outlook / Yahoo /
 *    clients dark mode) sans préprocesseur.
 *  - Pas de dépendance externe (cohérent avec la contrainte sprint).
 *
 * Couleurs Cryptoreflex extraites de tailwind.config.ts :
 *  - background : #0B0F1A
 *  - surface    : #111827
 *  - primary    : #6366F1 (indigo-500)
 *  - accent-grn : #10B981
 *  - accent-rose: #F43F5E
 *  - fg/muted   : #E5E7EB / #9CA3AF
 */

import { BRAND } from "@/lib/brand";
import type { PriceAlert } from "@/lib/alerts";

/**
 * Échappement HTML pour valeurs dynamiques injectées dans le template.
 * Stricte : on encode tout ce qui pourrait casser le markup ou injecter du JS.
 */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format prix avec 0-6 décimales selon ordre de grandeur (cohérent avec UI). */
function formatPrice(value: number, currency: "eur" | "usd"): string {
  const sym = currency === "eur" ? "€" : "$";
  if (!Number.isFinite(value) || value <= 0) return `0 ${sym}`;
  let digits = 2;
  if (value < 0.01) digits = 6;
  else if (value < 1) digits = 4;
  else if (value < 100) digits = 2;
  else digits = 0;
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${sym}`;
}

export interface PriceAlertEmailContext {
  alert: PriceAlert;
  /** Prix observé au moment du déclenchement, exprimé dans `alert.currency`. */
  currentPrice: number;
  /** Nom long affichable de la crypto (ex: "Bitcoin"). Fallback : symbol. */
  cryptoName?: string;
  /** Token signé pour le lien d'opt-out (DELETE one-click). */
  unsubscribeToken: string;
  /** Slug Cryptoreflex pour les CTA (ex: "bitcoin"). Fallback : cryptoId. */
  detailSlug?: string;
}

/**
 * Génère le HTML d'un email d'alerte prix déclenchée.
 * - Inline styles pour compat clients mail
 * - Lien d'opt-out direct (RGPD : 1 clic)
 * - CTA "Voir sur Cryptoreflex" + "Gérer mes alertes"
 */
export function priceAlertHtml(ctx: PriceAlertEmailContext): string {
  const { alert, currentPrice, unsubscribeToken } = ctx;
  const name = ctx.cryptoName || alert.symbol.toUpperCase();
  const detailSlug = ctx.detailSlug || alert.cryptoId;

  const directionLabel = alert.condition === "above" ? "au-dessus de" : "en-dessous de";
  const directionEmoji = alert.condition === "above" ? "↗" : "↘";
  const directionColor = alert.condition === "above" ? "#10B981" : "#F43F5E";

  const subjectLine = `${directionEmoji} Alerte prix ${esc(name)} déclenchée`;
  const headline = `${esc(name)} est passé ${directionLabel} ${formatPrice(alert.threshold, alert.currency)}`;

  const detailUrl = `${BRAND.url}/cryptos/${esc(detailSlug)}`;
  const manageUrl = `${BRAND.url}/alertes?email=${encodeURIComponent(alert.email)}`;
  const unsubscribeUrl = `${BRAND.url}/api/alerts/${esc(alert.id)}?token=${encodeURIComponent(unsubscribeToken)}&action=delete`;
  const logoUrl = `${BRAND.url}/logo.png`;

  // HTML défensif :
  //  - largeur fixe 600px (standard mail)
  //  - rôles ARIA absents (clients mail les ignorent / cassent parfois)
  //  - pas de <button>, uniquement <a> (Outlook + Apple Mail OK)
  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${subjectLine}</title>
</head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E5E7EB;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;mso-hide:all;">
    ${esc(name)} ${directionEmoji} ${formatPrice(currentPrice, alert.currency)} — alerte Cryptoreflex
  </span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0F1A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#111827;border:1px solid rgba(99,102,241,0.25);border-radius:16px;overflow:hidden;">

          <!-- Header / Logo -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <a href="${BRAND.url}" style="text-decoration:none;color:inherit;">
                <img src="${logoUrl}" alt="${esc(BRAND.name)}" width="140" height="32" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:140px;" />
              </a>
            </td>
          </tr>

          <!-- Titre alerte -->
          <tr>
            <td style="padding:24px 28px 8px 28px;">
              <div style="display:inline-block;padding:6px 12px;border-radius:9999px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);font-size:11px;font-weight:600;color:#A5B4FC;letter-spacing:0.05em;text-transform:uppercase;">
                Alerte prix déclenchée
              </div>
              <h1 style="margin:18px 0 8px 0;font-size:24px;line-height:1.25;font-weight:700;color:#FFFFFF;">
                ${headline}
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.55;color:#9CA3AF;">
                Tu avais demandé à être prévenu·e dès que ${esc(name)} passerait ${directionLabel} <strong style="color:#E5E7EB;">${formatPrice(alert.threshold, alert.currency)}</strong>. C'est fait.
              </p>
            </td>
          </tr>

          <!-- Bloc prix -->
          <tr>
            <td style="padding:20px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0F1A;border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;width:50%;">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9CA3AF;">Prix actuel</div>
                    <div style="margin-top:4px;font-size:22px;font-weight:700;color:${directionColor};font-variant-numeric:tabular-nums;">
                      ${formatPrice(currentPrice, alert.currency)}
                    </div>
                  </td>
                  <td style="padding:18px 20px;width:50%;border-left:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9CA3AF;">Seuil défini</div>
                    <div style="margin-top:4px;font-size:22px;font-weight:700;color:#E5E7EB;font-variant-numeric:tabular-nums;">
                      ${formatPrice(alert.threshold, alert.currency)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTAs -->
          <tr>
            <td style="padding:24px 28px 0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 12px 0;">
                    <a href="${detailUrl}" style="display:inline-block;background:#6366F1;color:#FFFFFF;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;text-decoration:none;">
                      Voir ${esc(name)} sur ${esc(BRAND.name)}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${manageUrl}" style="display:inline-block;color:#A5B4FC;font-size:13px;text-decoration:underline;">
                      Gérer mes alertes
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Disclaimer AMF -->
          <tr>
            <td style="padding:28px 28px 0 28px;">
              <div style="border:1px solid rgba(245,158,11,0.25);background:rgba(245,158,11,0.05);border-radius:10px;padding:14px 16px;font-size:12px;line-height:1.5;color:#FCD34D;">
                <strong style="color:#FDE68A;">Information non sollicitée — pas un conseil en investissement.</strong>
                Les variations de prix crypto sont structurellement volatiles. Cette alerte est purement informative ;
                ${esc(BRAND.name)} ne recommande aucune action d'achat ou de vente.
                Voir notre <a href="${BRAND.url}/methodologie" style="color:#FDE68A;">méthodologie</a>.
              </div>
            </td>
          </tr>

          <!-- Footer / opt-out -->
          <tr>
            <td style="padding:24px 28px 28px 28px;">
              <hr style="border:0;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 16px 0;" />
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#9CA3AF;">
                Tu reçois cet e-mail car tu as configuré une alerte prix sur ${esc(BRAND.domain)}.
                Pour ne plus recevoir cette alerte précise :
                <a href="${unsubscribeUrl}" style="color:#A5B4FC;text-decoration:underline;">désactiver cette alerte</a>.
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#6B7280;">
                ${esc(BRAND.name)} · ${esc(BRAND.domain)} · ${esc(BRAND.email)}
                <br />
                Données prix : CoinGecko. Site indépendant non affilié à l'AMF ni à un PSI.
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

/**
 * Sujet d'email standardisé. Centralisé ici pour cohérence avec
 * le préheader inclus dans `priceAlertHtml`.
 */
export function priceAlertSubject(ctx: { cryptoName: string; condition: "above" | "below"; threshold: number; currency: "eur" | "usd" }): string {
  const dir = ctx.condition === "above" ? "↗" : "↘";
  return `${dir} ${ctx.cryptoName} ${ctx.condition === "above" ? ">" : "<"} ${formatPrice(ctx.threshold, ctx.currency)} — alerte Cryptoreflex`;
}

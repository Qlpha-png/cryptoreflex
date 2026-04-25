/**
 * lib/newsletter-daily-template.ts — Template HTML newsletter quotidienne Cryptoreflex.
 *
 * Format cible :
 *  - 1 email / jour, ~3 minutes de lecture (≤ 500 mots HTML rendered).
 *  - Largeur fixe 600px, responsive, dark mode by default.
 *  - Sections fixes : header date / market recap (BTC ETH SOL) / featured article /
 *    sponsored platform / fear & greed / footer opt-out.
 *
 * Pourquoi un fichier dédié plutôt qu'extension de `email-templates.ts` :
 *  - Newsletter quotidienne = produit éditorial récurrent, candidat à l'externalisation
 *    Beehiiv automation native (RSS-to-email). Garder le code isolé facilite la migration.
 *  - Logique de mise en forme spécifique (price formatter avec variation %, fear gauge SVG-free).
 *
 * Sécurité opt-out :
 *  - Mêmes mécaniques que `email-drip-templates.ts` : SHA-256 token, lien direct,
 *    1-clic conforme RGPD.
 *
 * Tracking :
 *  - UTM systématique : utm_source=newsletter&utm_medium=email&utm_campaign=daily-{YYYY-MM-DD}
 *  - Lien plateforme sponsorisée : utm_content=sponsored-{platformId} pour suivi conversion.
 */

import { BRAND } from "@/lib/brand";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface MarketSnapshot {
  /** Symbole upper-case (ex: "BTC"). */
  symbol: string;
  /** Nom long affichable (ex: "Bitcoin"). */
  name: string;
  /** Prix en EUR (cours du jour de l'envoi). */
  priceEur: number;
  /** Variation 24h en % (ex: -2.3). */
  change24hPct: number;
}

export interface FeaturedArticle {
  /** Titre éditorial à afficher. */
  title: string;
  /** Slug d'article Cryptoreflex (ex: "mica-juillet-2026-checklist-survie"). */
  slug: string;
  /** Excerpt court pour donner envie de cliquer (max 200 chars). */
  excerpt: string;
  /** Catégorie pour le badge (ex: "Régulation", "Fiscalité"). */
  category: string;
}

export interface SponsoredPlatform {
  /** Nom plateforme (ex: "Bitget"). */
  name: string;
  /** Pitch court (max 150 chars). */
  pitch: string;
  /** URL d'affiliation directe. */
  affiliateUrl: string;
  /** Mention CTA (ex: "Voir l'offre Bitget"). */
  ctaLabel: string;
  /** Mention de divulgation obligatoire (ex: "Lien partenaire — Bitget"). */
  disclosure: string;
}

export interface FearGreedReading {
  /** 0-100. */
  value: number;
  /** Label humain (ex: "Greed", "Fear", "Extreme Fear"). */
  label: string;
}

export interface DailyNewsletterContext {
  /** Date de l'édition (Date object, formaté en français). */
  date: Date;
  /** Snapshot des cryptos majeures (BTC, ETH, SOL minimum). */
  marketRecap: MarketSnapshot[];
  /** Article du jour mis en avant. */
  featuredArticle: FeaturedArticle;
  /** Plateforme sponsorisée du jour (1 unique pour ne pas saturer). */
  sponsoredPlatform: SponsoredPlatform;
  /** Indice Fear & Greed du jour. */
  fearGreed: FearGreedReading;
  /** Email destinataire pour opt-out. */
  email: string;
  /** Token signé d'opt-out. */
  unsubscribeToken: string;
  /** Greeting personnalisé optionnel. */
  firstName?: string;
}

export interface DailyNewsletterEmail {
  subject: string;
  preview: string;
  html: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Formate le prix en EUR avec décimales adaptées à l'ordre de grandeur. */
function formatEur(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 €";
  let digits = 2;
  if (value < 0.01) digits = 6;
  else if (value < 1) digits = 4;
  else if (value < 100) digits = 2;
  else digits = 0;
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} €`;
}

/** Formate la variation % avec signe explicite et 1 décimale. */
function formatChange(pct: number): string {
  if (!Number.isFinite(pct)) return "0,0 %";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1).replace(".", ",")} %`;
}

/** Couleur de variation (vert haussier / rose baissier / neutre). */
function changeColor(pct: number): string {
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.05) return "#9CA3AF";
  return pct >= 0 ? "#10B981" : "#F43F5E";
}

/** Date formatée en français : "vendredi 25 avril 2026". */
function formatDateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Slug ISO (YYYY-MM-DD) pour la campagne UTM. */
function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** URL utm-tagged pour la newsletter quotidienne. */
function utmUrl(path: string, dateIso: string, content?: string): string {
  const base = BRAND.url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const sep = cleanPath.includes("?") ? "&" : "?";
  let qs = `utm_source=newsletter&utm_medium=email&utm_campaign=daily-${dateIso}`;
  if (content) qs += `&utm_content=${encodeURIComponent(content)}`;
  return `${base}${cleanPath}${sep}${qs}`;
}

/** Variante UTM pour les liens externes affiliés (preserve querystring origine). */
function utmAffiliate(rawUrl: string, dateIso: string, platformId: string): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.set("utm_source", "cryptoreflex-newsletter");
    u.searchParams.set("utm_medium", "email");
    u.searchParams.set("utm_campaign", `daily-${dateIso}`);
    u.searchParams.set("utm_content", `sponsored-${platformId}`);
    return u.toString();
  } catch {
    return rawUrl;
  }
}

/** URL d'opt-out global (désinscrit la daily ET le drip). */
function unsubscribeUrl(email: string, token: string): string {
  const base = BRAND.url.replace(/\/$/, "");
  return `${base}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}

function abs(path: string): string {
  const base = BRAND.url.replace(/\/$/, "");
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Couleur du gauge fear & greed selon valeur 0-100. */
function fearGreedColor(value: number): string {
  if (value < 25) return "#F43F5E"; // Extreme fear
  if (value < 45) return "#F59E0B"; // Fear
  if (value < 55) return "#A5B4FC"; // Neutral
  if (value < 75) return "#10B981"; // Greed
  return "#FCD34D"; // Extreme greed
}

/* -------------------------------------------------------------------------- */
/*  Sub-renderers                                                              */
/* -------------------------------------------------------------------------- */

function renderMarketRecap(snapshots: MarketSnapshot[]): string {
  // On limite à 3 cryptos pour rester < 500 mots et garder la lisibilité.
  const top = snapshots.slice(0, 3);
  const lastIndex = top.length - 1;

  const cells = top
    .map((m, idx) => {
      const color = changeColor(m.change24hPct);
      // Pas de border-right sur la dernière cellule (séparateurs internes uniquement).
      const sep = idx < lastIndex ? "border-right:1px solid rgba(255,255,255,0.06);" : "";
      return `
        <td style="padding:12px 8px;text-align:center;width:33%;${sep}">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9CA3AF;">${esc(m.symbol)}</div>
          <div style="margin-top:4px;font-size:16px;font-weight:700;color:#E5E7EB;font-variant-numeric:tabular-nums;">
            ${formatEur(m.priceEur)}
          </div>
          <div style="margin-top:2px;font-size:12px;font-weight:600;color:${color};font-variant-numeric:tabular-nums;">
            ${formatChange(m.change24hPct)}
          </div>
        </td>
      `;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0F1A;border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
      <tr>${cells}</tr>
    </table>
  `;
}

function renderFearGauge(reading: FearGreedReading): string {
  const color = fearGreedColor(reading.value);
  const pct = Math.min(100, Math.max(0, reading.value));
  return `
    <div style="background:#0B0F1A;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px 16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#9CA3AF;">
        <span style="text-transform:uppercase;letter-spacing:0.06em;">Fear &amp; Greed du jour</span>
        <span style="font-weight:700;color:${color};">${pct} · ${esc(reading.label)}</span>
      </div>
      <div style="margin-top:10px;height:6px;width:100%;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
        <div style="height:6px;width:${pct}%;background:${color};border-radius:3px;"></div>
      </div>
    </div>
  `;
}

function renderFeaturedArticle(a: FeaturedArticle, dateIso: string): string {
  const url = utmUrl(`/blog/${a.slug}`, dateIso, "featured-article");
  return `
    <a href="${url}" style="display:block;text-decoration:none;color:inherit;background:#0B0F1A;border:1px solid rgba(99,102,241,0.25);border-radius:12px;padding:16px 18px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#A5B4FC;font-weight:600;">
        ${esc(a.category)}
      </div>
      <h2 style="margin:6px 0 8px 0;font-size:17px;line-height:1.35;font-weight:700;color:#FFFFFF;">
        ${esc(a.title)}
      </h2>
      <p style="margin:0;font-size:14px;line-height:1.55;color:#9CA3AF;">
        ${esc(a.excerpt)}
      </p>
      <div style="margin-top:10px;font-size:13px;font-weight:600;color:#A5B4FC;">
        Lire l'article →
      </div>
    </a>
  `;
}

function renderSponsoredBlock(s: SponsoredPlatform, dateIso: string, platformId: string): string {
  const aff = utmAffiliate(s.affiliateUrl, dateIso, platformId);
  return `
    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:16px 18px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#FCD34D;font-weight:600;">
        Partenaire du jour · ${esc(s.name)}
      </div>
      <p style="margin:8px 0 12px 0;font-size:14px;line-height:1.55;color:#E5E7EB;">
        ${esc(s.pitch)}
      </p>
      <a href="${aff}" rel="noopener noreferrer sponsored" style="display:inline-block;background:#F59E0B;color:#0B0F1A;font-weight:700;font-size:14px;padding:10px 20px;border-radius:8px;text-decoration:none;">
        ${esc(s.ctaLabel)}
      </a>
      <div style="margin-top:10px;font-size:11px;color:#9CA3AF;">
        ${esc(s.disclosure)}
      </div>
    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/*  Main renderer                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Génère le HTML complet d'une édition de la newsletter quotidienne.
 *
 * Cible :
 *  - ≤ 500 mots rendered (≈ 3 min lecture mobile)
 *  - 600px max width
 *  - dark mode par défaut, fallback light géré par les meta color-scheme
 *  - tous les UTM cohérents pour reporting Plausible / Beehiiv
 */
export function dailyNewsletterHtml(ctx: DailyNewsletterContext): DailyNewsletterEmail {
  const dateIso = isoDay(ctx.date);
  const dateFr = formatDateFr(ctx.date);
  const greeting = ctx.firstName ? `Salut ${esc(ctx.firstName)}` : "Salut";

  // Subject line : on inclut un signal de marché pour le hook
  const btc = ctx.marketRecap.find((m) => m.symbol === "BTC");
  const subjectSignal = btc ? ` · BTC ${formatEur(btc.priceEur)}` : "";
  const subject = `Cryptoreflex · ${dateFr.split(" ")[0]}${subjectSignal}`;

  const previewBase = `${ctx.featuredArticle.title} · F&G ${ctx.fearGreed.value}/${ctx.fearGreed.label}`;
  const preview = previewBase.length > 120 ? `${previewBase.slice(0, 117)}…` : previewBase;

  const optOut = unsubscribeUrl(ctx.email, ctx.unsubscribeToken);
  const logoUrl = abs("/logo.png");
  const homeUrl = utmUrl("/", dateIso, "home");
  const archiveUrl = utmUrl("/newsletter", dateIso, "archive");

  // Identifiant plateforme pour le tracking : on slugifie le name simplement.
  const platformId = ctx.sponsoredPlatform.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const html = `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E5E7EB;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;mso-hide:all;">
    ${esc(preview)}
  </span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0F1A;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#111827;border:1px solid rgba(99,102,241,0.25);border-radius:16px;overflow:hidden;">

          <!-- Header / date -->
          <tr>
            <td style="padding:20px 24px 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <a href="${homeUrl}" style="text-decoration:none;color:inherit;">
                      <img src="${logoUrl}" alt="${esc(BRAND.name)}" width="120" height="28" style="display:block;border:0;outline:none;height:auto;max-width:120px;" />
                    </a>
                  </td>
                  <td align="right" style="font-size:12px;color:#9CA3AF;">
                    ${esc(dateFr)}
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0 0;font-size:14px;color:#9CA3AF;">
                ${greeting}, voici ton point crypto du jour.
              </p>
            </td>
          </tr>

          <!-- Market recap BTC ETH SOL -->
          <tr>
            <td style="padding:18px 24px 0 24px;">
              ${renderMarketRecap(ctx.marketRecap)}
            </td>
          </tr>

          <!-- Fear & Greed -->
          <tr>
            <td style="padding:14px 24px 0 24px;">
              ${renderFearGauge(ctx.fearGreed)}
            </td>
          </tr>

          <!-- Featured article -->
          <tr>
            <td style="padding:18px 24px 0 24px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9CA3AF;font-weight:600;margin-bottom:8px;">
                À lire aujourd'hui
              </div>
              ${renderFeaturedArticle(ctx.featuredArticle, dateIso)}
            </td>
          </tr>

          <!-- Sponsored block -->
          <tr>
            <td style="padding:18px 24px 0 24px;">
              ${renderSponsoredBlock(ctx.sponsoredPlatform, dateIso, platformId)}
            </td>
          </tr>

          <!-- Footer / méthodologie + opt-out + AMF -->
          <tr>
            <td style="padding:22px 24px 24px 24px;">
              <hr style="border:0;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 14px 0;" />
              <p style="margin:0 0 8px 0;font-size:11px;line-height:1.5;color:#FCD34D;">
                <strong style="color:#FDE68A;">Pas un conseil en investissement.</strong>
                Crypto-actifs = risque de perte en capital. Voir notre
                <a href="${utmUrl("/methodologie", dateIso, "footer-methodo")}" style="color:#FDE68A;">méthodologie</a>.
              </p>
              <p style="margin:0 0 6px 0;font-size:12px;line-height:1.5;color:#9CA3AF;">
                Tu reçois la newsletter ${esc(BRAND.name)}.
                <a href="${optOut}" style="color:#A5B4FC;text-decoration:underline;">Se désinscrire en 1 clic</a> ·
                <a href="${archiveUrl}" style="color:#A5B4FC;text-decoration:underline;">Archives</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#6B7280;">
                ${esc(BRAND.name)} · ${esc(BRAND.domain)} · ${esc(BRAND.email)}
                <br />
                Données prix : CoinGecko. Indice F&amp;G : Alternative.me. Site éditorial indépendant non affilié à l'AMF.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, preview, html };
}

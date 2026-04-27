/**
 * Email design tokens — Cryptoreflex.
 *
 * Source de vérité pour tous les emails transactionnels.
 * Synchronisé avec la palette Tailwind du site (cf. globals.css BLOCK 5).
 *
 * IMPORTANT : ne JAMAIS utiliser de variables CSS dans les emails. Inline
 * uniquement. Gmail, Outlook, Yahoo strippent ou ignorent les <style> tags
 * dans certains contextes (mobile app, forward, dark mode).
 *
 * Compatibilité validée : Gmail (web/iOS/Android), Outlook 2016+, Apple Mail
 * (macOS/iOS), Yahoo, ProtonMail, Thunderbird.
 */

export const EMAIL_TOKENS = {
  // Couleurs (matching globals.css palette)
  colors: {
    bg: "#0A0A0A", // background page
    surface: "#15171C", // card surface
    border: "#2A2D35", // borders subtils
    text: "#FAFAFA", // text primary
    textMuted: "#A1A1AA", // text secondary
    primary: "#F59E0B", // gold (CTA, accents)
    primaryHover: "#FBBF24", // gold hover
    success: "#22C55E", // vert (status actif, gain)
    warning: "#F59E0B", // ambre (alerte douce)
    danger: "#EF4444", // rouge (perte, échec)
  },
  // Typographie
  fonts: {
    sans: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`,
    mono: `"SF Mono", Menlo, Monaco, Consolas, monospace`,
  },
  // Spacing (8px base)
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  // Border radius
  radius: {
    sm: 6,
    md: 10,
    lg: 12,
    xl: 16,
  },
  // Layout
  width: {
    container: 600, // standard email max-width
  },
} as const;

/**
 * Brand info Cryptoreflex.
 * Centralisé pour cohérence + injection facile dans templates.
 */
export const BRAND_EMAIL = {
  name: "Cryptoreflex",
  legalName: "Cryptoreflex EI",
  siren: "103 352 621",
  fromEmail: "noreply@cryptoreflex.fr",
  fromName: "Cryptoreflex",
  supportEmail: "hello@cryptoreflex.fr",
  siteUrl: "https://www.cryptoreflex.fr",
  socialX: "https://x.com/cryptoreflex",
  // Pas de Discord (founder l'a explicitement banni)
} as const;

/**
 * Helper pour escape HTML en injection sûre.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

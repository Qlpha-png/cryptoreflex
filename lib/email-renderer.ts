/**
 * lib/email-renderer.ts — Helpers pour rendre les emails (string-based).
 *
 * Approche string-only (pas de React rendering) car :
 *  1. Next.js 14 bloque l'import direct de react-dom/server hors Server Components
 *     (cf. erreur webpack "You're importing a component that imports react-dom/server").
 *  2. Le HTML inline-stylé des emails est déjà construit en dur dans
 *     `fiscalite-crypto-series.ts` (template strings) — pas besoin de re-render React.
 *  3. Plus léger en bundle / cold-start serverless.
 *
 * Si un jour on veut rendre un composant React vers HTML (ex: prévisualisation
 * dans un Server Component), utiliser `react-dom/server` directement DANS ce
 * Server Component (pas via un import depuis lib/).
 */

import type { EmailInSequence } from "@/lib/email-series/fiscalite-crypto-series";

/**
 * Rend un email de la séquence fiscalité en HTML final.
 *
 * Étapes :
 *  1. Substitue `{{unsubscribe_url}}` dans le HTML brut (déjà construit en
 *     dur dans `fiscalite-crypto-series.ts`).
 *  2. Ne re-render PAS le composant React (évite double-escape) — on retourne
 *     directement le HTML déjà inline-stylé.
 *  3. Ne minify pas (Resend ne facture pas au byte, et la lisibilité aide au
 *     debug en mode mock console.info).
 *
 * @param email — sortie de FISCALITE_EMAIL_SERIES
 * @param data — placeholders à substituer (au minimum unsubscribeUrl)
 */
export function renderEmailHtml(
  email: EmailInSequence,
  data: { unsubscribeUrl: string },
): string {
  let html = email.htmlBody;
  html = html.replace(/\{\{unsubscribe_url\}\}/g, data.unsubscribeUrl);
  // Garde la porte ouverte pour d'autres placeholders (firstName, etc.) :
  //   html = html.replace(/\{\{first_name\}\}/g, data.firstName ?? "toi");
  return html;
}

/**
 * Rend la version texte d'un email (pour fallback antispam scoring).
 * Substitue les mêmes placeholders que la version HTML.
 */
export function renderEmailText(
  email: EmailInSequence,
  data: { unsubscribeUrl: string },
): string {
  return email.textBody.replace(/\{\{unsubscribe_url\}\}/g, data.unsubscribeUrl);
}

/**
 * lib/format-fr.ts — nombres affichés au format français.
 *
 * Audit du 05/10/2026 : 1 953 formes de décimales au format anglais dans le texte du site (« 4.9/5 », « Hausse de
 * 1.17 % », « RSI 65.5 »), produites par des `.toFixed()` affichés tels quels. En français, la virgule sépare les
 * décimales. À utiliser pour TOUT nombre affiché ; jamais pour un chemin SVG, une valeur CSS ou une clé technique.
 */

/** Nombre avec au plus `maxDigits` décimales, sans zéros inutiles (« 0,1 », « 4,5 », « 12 »). */
export function fmtNb(n: number | null | undefined, maxDigits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: maxDigits });
}

/** Nombre avec exactement `digits` décimales, virgule décimale (« 4,9 », « 1,17 »), milliers séparés. */
export function fmtFr(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Date « AAAA-MM-JJ » affichée en français (« 13 juin 2026 ») ; une valeur non reconnue est rendue telle quelle. */
export function fmtDateFr(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Espace insécable (U+00A0), construite par code : jamais d'espace invisible écrite dans le source. */
export const NBSP = String.fromCharCode(0x00a0);

/**
 * Pourcentage : UNE seule convention partout, « 3,17 % » avec espace INSÉCABLE (le « % » ne passe jamais seul à la ligne).
 * `signe: true` ajoute « + » devant un nombre positif (« +1,68 % »). Valeur absente ou infinie : « — ».
 */
export function fmtPct(n: number | null | undefined, digits = 2, signe = false): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${signe && n > 0 ? "+" : ""}${fmtFr(n, digits)}${NBSP}%`;
}

/** Montant en euros, « 1 000 € » : espaces fines dans le nombre (locale fr-FR), espace insécable devant « € ». */
export function fmtEur(n: number | null | undefined, maxDigits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${fmtNb(n, maxDigits)}${NBSP}€`;
}

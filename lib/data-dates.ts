/**
 * lib/data-dates.ts — dates RÉELLES des données publiées (lot fraîcheur A, 08/10/2026).
 *
 * Règle : une date affichée ou publiée (lastmod, dateModified, updatedAt, lastUpdated) est la date de la donnée elle-même
 * (relevé, vérification, calcul), jamais « maintenant » ni la date du build. Sans date connue : null, et le champ est omis
 * ou affiché « date inconnue » — jamais remplacé par new Date(). Test : tests/lib/fraicheur-dates-publiees.test.ts.
 */

/** AAAA-MM, AAAA-MM-JJ ou horodatage ISO complet. */
const ISO = /^\d{4}-\d{2}(-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?)?$/;

/** valeur datée exploitable (chaîne ISO valide), sinon null */
export function isoOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!ISO.test(s)) return null;
  if (!Number.isFinite(Date.parse(s.length === 7 ? `${s}-01` : s))) return null;
  // jour réellement existant (Date.parse accepte « 2026-02-31 » et le reporte au 3 mars)
  const jour = s.length === 7 ? `${s}-01` : s.slice(0, 10);
  return new Date(`${jour}T00:00:00Z`).toISOString().slice(0, 10) === jour ? s : null;
}

const instant = (s: string): number => Date.parse(s.length === 7 ? `${s}-01` : s);

/**
 * Date la plus RÉCENTE d'une liste (chaîne d'origine, non reformatée), null si aucune n'est valide.
 * Pour un « dernier changement » de jeu de données : le maximum des dates de ses lignes.
 */
export function latestIso(values: ReadonlyArray<unknown>): string | null {
  let best: string | null = null;
  for (const v of values) {
    const s = isoOrNull(v);
    if (s && (best === null || instant(s) > instant(best))) best = s;
  }
  return best;
}

/**
 * Date la plus ANCIENNE d'une liste, null si aucune n'est valide.
 * Pour l'heure d'une réponse qui mélange plusieurs relevés : l'âge du plus vieux (on n'annonce jamais plus frais que vrai).
 */
export function oldestIso(values: ReadonlyArray<unknown>): string | null {
  let best: string | null = null;
  for (const v of values) {
    const s = isoOrNull(v);
    if (s && (best === null || instant(s) < instant(best))) best = s;
  }
  return best;
}

/** « AAAA-MM-JJ » seul (aucune heure connue) */
export const isDateOnly = (v: string | null | undefined): boolean => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());

/** date « AAAA-MM-JJ » ou « AAAA-MM » en clair, en français (« 2 octobre 2026 », « avril 2026 »), sans décalage horaire */
export function formatDataDateFr(v: string | null | undefined, long = true): string | null {
  const s = isoOrNull(v ?? null);
  if (!s) return null;
  if (s.length === 7) {
    return new Date(`${s}-01T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", month: "long", year: "numeric" });
  }
  const d = new Date(s.length === 10 ? `${s}T00:00:00Z` : s);
  return d.toLocaleDateString("fr-FR", {
    timeZone: s.length === 10 ? "UTC" : "Europe/Paris",
    day: "numeric",
    month: long ? "long" : "2-digit",
    year: "numeric",
  });
}

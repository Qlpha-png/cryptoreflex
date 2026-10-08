/**
 * Trustpilot (08/10/2026, décision de Kev) : ses conditions interdisent de reprendre les notes. Le site ne stocke,
 * n'affiche ni ne publie plus aucune note, aucun nombre d'avis ni aucune date de relevé Trustpilot. Seul un lien
 * sobre vers la page officielle de la plateforme est gardé (ratings.trustpilotUrl).
 */
export const TRUSTPILOT_LINK_LABEL = "Avis des utilisateurs sur Trustpilot";

const TRUSTPILOT_URL = /^https:\/\/(fr\.|www\.)?trustpilot\.com\/review\/[a-z0-9.-]+$/i;

/** Adresse fiable d'une page Trustpilot officielle, ou null. */
export function trustpilotUrlOrNull(url: unknown): string | null {
  return typeof url === "string" && TRUSTPILOT_URL.test(url) ? url : null;
}

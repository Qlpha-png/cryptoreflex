/**
 * lib/mica-auto.ts — date du contrôle automatique du statut MiCA (lot fraîcheur A, reprise du 08/10/2026, L6 MiCA).
 *
 * Chaque nuit, la veille (scripts/veille-officielle.mjs) compare le statut publié de chaque plateforme au registre MiCA
 * de l'ESMA (CASPS.csv). Quand il n'y a AUCUN écart, elle écrit la date du jour dans data/veille/mica-auto.json ; une
 * plateforme en écart garde sa date précédente (le ticket de la veille demande alors une relecture humaine).
 * L'affichage prend la plus récente des deux dates : relecture humaine (`mica.lastVerified`) ou contrôle automatique.
 * Le libellé dit laquelle : « Registre ESMA contrôlé automatiquement le JJ/MM/AAAA » n'est jamais présenté comme une
 * relecture humaine.
 */
import miCaAuto from "@/data/veille/mica-auto.json";
import { isoOrNull } from "@/lib/data-dates";

const AUTO = (miCaAuto as { plateformes?: Record<string, string> }).plateformes ?? {};

export const LIBELLE_MICA_AUTO = "Registre ESMA contrôlé automatiquement";

/** Date du dernier contrôle automatique sans écart (AAAA-MM-JJ), null si aucun. */
export function controleMicaAuto(platformId: string | null | undefined): string | null {
  if (!platformId) return null;
  return isoOrNull(AUTO[platformId]);
}

/**
 * Date et libellé à afficher pour le statut MiCA d'une plateforme de data/platforms.json.
 * `libelleManuel` sert quand la relecture humaine est la plus récente (ou qu'aucun contrôle automatique n'existe).
 */
export function dateStatutMica(
  platformId: string | null | undefined,
  lastVerified: string | null | undefined,
  libelleManuel: string,
): { date: string | null; label: string; auto: boolean } {
  const manuel = isoOrNull(lastVerified);
  const auto = controleMicaAuto(platformId);
  if (auto && (!manuel || auto.slice(0, 10) > manuel.slice(0, 10))) return { date: auto, label: LIBELLE_MICA_AUTO, auto: true };
  return { date: manuel, label: libelleManuel, auto: false };
}

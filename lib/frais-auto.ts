/**
 * lib/frais-auto.ts — date du contrôle automatique des grilles de frais (lot Z6, 10/10/2026, `fees.autoCheckedAt`).
 *
 * Chaque nuit, la veille (scripts/veille-officielle.mjs) relit les pages de frais OFFICIELLES de chaque plateforme.
 * Quand toutes les pages suivies d'une plateforme sont lues et inchangées depuis l'enregistrement de leur référence, ET que
 * la relecture humaine des frais est postérieure ou égale à cet enregistrement (scripts/lib/frais-auto.mjs), elle écrit la
 * date du jour dans data/veille/frais-auto.json. Une grille changée, illisible (403, défi anti-robot, forme changée) ou sans
 * référence n'avance AUCUNE date. Le robot ne modifie jamais un montant de frais.
 *
 * Affichage : la date est la plus récente entre la relecture humaine (`fees.verified.date`, `fees.cost.date`) et ce
 * contrôle. Quand elle vient du contrôle, le texte le DIT (comme « Registre ESMA contrôlé automatiquement » pour MiCA) :
 * jamais « relevé le » ni « vérifié le » pour une date qu'aucun humain n'a relue. Une liste qui mêle les deux natures
 * reçoit un libellé neutre exact.
 */
import fraisAuto from "@/data/veille/frais-auto.json";
import { isoOrNull, latestIso } from "@/lib/data-dates";
import type { DateFrais } from "@/lib/frais-libelle";

const AUTO = (fraisAuto as { plateformes?: Record<string, string> }).plateformes ?? {};

export type { DateFrais } from "@/lib/frais-libelle";
export { LIBELLE_FRAIS_AUTO, LIBELLE_FRAIS_AUTO_PLURIEL, LIBELLE_FRAIS_MIXTE, datesDe, libelleFrais } from "@/lib/frais-libelle";

/** Date du dernier contrôle automatique sans écart (AAAA-MM-JJ), null si aucun. */
export function controleFraisAuto(platformId: string | null | undefined): string | null {
  if (!platformId) return null;
  return isoOrNull(AUTO[platformId]);
}

const jour = (d: string) => d.slice(0, 10);

/**
 * Date de frais à afficher : la plus récente entre les dates de relecture humaine données et le contrôle automatique de
 * la plateforme. `auto` est vrai seulement si le contrôle est STRICTEMENT plus récent que toute relecture humaine (à jour
 * égal, c'est la relecture qui prime). Sans aucune date lisible : { date: null, auto: false }.
 */
export function dateFraisAffichee(platformId: string | null | undefined, ...datesManuelles: ReadonlyArray<string | null | undefined>): DateFrais {
  const manuelle = latestIso(datesManuelles);
  const auto = controleFraisAuto(platformId);
  if (auto && (!manuelle || jour(auto) > jour(manuelle))) return { date: auto, auto: true };
  return { date: manuelle, auto: false };
}

/** Ajoute `fees.autoCheckedAt` à une plateforme chargée depuis data/platforms.json (champ absent si aucun contrôle). */
export function withFraisAuto<T extends { id: string; fees: object }>(p: T): T & { fees: { autoCheckedAt?: string } } {
  const auto = controleFraisAuto(p.id);
  return auto ? { ...p, fees: { ...p.fees, autoCheckedAt: auto } } : (p as T & { fees: { autoCheckedAt?: string } });
}

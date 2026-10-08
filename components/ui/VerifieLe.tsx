import { type FamilleFraicheur, SEUILS_JOURS, estAReverifier, instantDonnee, periodeVerification } from "@/lib/fraicheur";
import VerifieLeAge from "@/components/ui/VerifieLeAge";

/**
 * <VerifieLe> — LE composant des dates « vérifié le JJ/MM/AAAA » (lot fraîcheur A2, 08/10/2026).
 *
 * - Date affichée = date réelle de la donnée (jamais « maintenant », jamais la date du build).
 * - Au-delà du seuil de sa famille (lib/fraicheur.ts), il ajoute lui-même « · relevé il y a plus de N jours » (constat neutre). Le calcul est
 *   fait dans le navigateur (VerifieLeAge), ou au rendu seulement si la page passe un instant sérialisé (`maintenant`).
 * - Plusieurs dates (ex. 34 plateformes) : « entre le 02/10/2026 et le 05/10/2026 », âge = la plus ancienne.
 * - Repère `data-verifie-le` : l'inventaire de la sentinelle (scripts/lib/inventaire-dates.mjs) refuse toute date
 *   « vérifié / mis à jour / relevé » affichée hors de ce composant.
 */
export interface VerifieLeProps {
  /** une date ISO (AAAA-MM-JJ, AAAA-MM ou horodatage) */
  date?: string | null;
  /** ou plusieurs dates (la plus ancienne compte pour l'âge) */
  dates?: ReadonlyArray<string | null | undefined>;
  famille: FamilleFraicheur;
  /** texte avant la date, ex. « Vérifié », « Frais relevés », « Mis à jour » (défaut « Vérifié ») ; "" = date seule
   *  (cellule de tableau dont l'en-tête dit déjà « vérifié le ») */
  label?: string;
  /** date en clair imposée quand la source ne donne qu'une période (ex. « T1 2026 ») ; `date` sert alors au seul calcul
   *  de l'âge et doit être le DÉBUT de la période (on ne rajeunit jamais une donnée) */
  affichage?: string;
  /** texte affiché si aucune date n'est lisible (défaut : rien n'est affiché) */
  inconnue?: string;
  className?: string;
  /** instant de référence SÉRIALISÉ par une page serveur (ou un test). Sans lui, l'âge n'est calculé que dans le
   *  navigateur : jamais de Date.now() au rendu (composants client : écart d'hydratation, juré I5 du 08/10/2026). */
  maintenant?: number;
  /** false : aucune mention d'âge (une seule mention par page ; jamais sur « hors champ MiCA »). Défaut true. */
  age?: boolean;
}

export default function VerifieLe({ date, dates, famille, label = "Vérifié", affichage, inconnue, className, maintenant, age = true }: VerifieLeProps) {
  const periode = periodeVerification(dates ?? [date]);
  if (!periode) {
    return inconnue ? (
      <span data-verifie-le="" data-famille={famille} className={className}>
        {inconnue}
      </span>
    ) : null;
  }
  const depuisMs = instantDonnee(periode.plusAncienne)!;
  const initial = maintenant !== undefined && estAReverifier(periode.plusAncienne, famille, maintenant) === true;
  return (
    <span data-verifie-le={periode.plusAncienne} data-famille={famille} className={className}>
      {affichage ? (label ? `${label} ${affichage}` : affichage) : label ? `${label} ${periode.texte}` : periode.brut}
      {age && <VerifieLeAge depuisMs={depuisMs} seuilJours={SEUILS_JOURS[famille]} initial={initial} />}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";

/** Texte du suffixe d'âge : un constat neutre, jamais un impératif (reprise du 08/10/2026, juré B1). */
export const texteAge = (seuilJours: number) => ` · relevé il y a plus de ${seuilJours} jours`;

/**
 * Suffixe d'âge de <VerifieLe> (lot fraîcheur A2, reprise du 08/10/2026).
 * - Calculé dans le navigateur (useEffect), pour qu'une page statique ou mise en cache vieillisse d'elle-même.
 * - Premier rendu = `initial`, qui vaut false sauf si la page serveur a fourni un instant de référence sérialisé
 *   (prop `maintenant` de <VerifieLe>) : jamais de Date.now() pendant le rendu, sinon le serveur et le navigateur
 *   divergent dès qu'un seuil est franchi entre la génération du HTML et la visite (erreurs React #418/#422, juré I5).
 * - Constat neutre « · relevé il y a plus de N jours » (et non « à revérifier »).
 */
export default function VerifieLeAge({ depuisMs, seuilJours, initial }: { depuisMs: number; seuilJours: number; initial: boolean }) {
  const [vieux, setVieux] = useState(initial);
  useEffect(() => {
    setVieux(Math.floor((Date.now() - depuisMs) / 86_400_000) > seuilJours);
  }, [depuisMs, seuilJours]);
  if (!vieux) return null;
  return <span data-a-reverifier="">{texteAge(seuilJours)}</span>;
}

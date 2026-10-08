"use client";

import { useEffect, useState } from "react";
import { BarChart3, Coins, Trophy, Clock } from "lucide-react";

/**
 * Cours d'une fiche générée (prix, capitalisation, rang) — lot fraîcheur A2 (08/10/2026), audit n° 5.
 *
 * Le serveur ne transmet les chiffres QUE si le relevé a moins de 24 h au rendu (lib/cours-fiche.ts) : sinon ils ne sont
 * ni dans le HTML ni dans les données de la page. Le navigateur recontrôle : au-delà de 48 h (page restée en cache),
 * les chiffres sont masqués. Dans les deux cas : « Cours non suivi depuis le JJ/MM/AAAA » (date réelle du relevé).
 * Repères pour la sentinelle : data-cours-releve (chiffres affichés), data-cours-non-suivi (chiffres masqués).
 */
export interface CoursFicheProps {
  /** horodatage ISO du relevé (updated_at), null si inconnu */
  releve: string | null;
  /** jour du relevé, JJ/MM/AAAA */
  depuis: string | null;
  /** chiffres déjà mis en forme ; absents si le serveur a jugé le relevé trop ancien */
  prix?: string | null;
  capitalisation?: string | null;
  rang?: number | null;
  /** âge maximal vu par un visiteur, en heures */
  ageMaxH: number;
}

export default function CoursFiche({ releve, depuis, prix, capitalisation, rang, ageMaxH }: CoursFicheProps) {
  const chiffres = !!(prix || capitalisation || rang);
  const [perime, setPerime] = useState(!chiffres);
  useEffect(() => {
    if (!chiffres) return;
    const t = releve ? Date.parse(releve) : NaN;
    setPerime(!Number.isFinite(t) || Date.now() - t > ageMaxH * 3_600_000);
  }, [chiffres, releve, ageMaxH]);

  if (perime) {
    return (
      <span data-cours-non-suivi={releve ?? ""} className="inline-flex items-center gap-1.5 text-muted">
        <Clock className="size-4" aria-hidden="true" />
        {depuis ? `Cours non suivi depuis le ${depuis}` : "Cours non suivi (date du dernier relevé inconnue)"}
      </span>
    );
  }
  return (
    <span data-cours-releve={releve ?? ""} className="contents">
      {rang ? (
        <span className="inline-flex items-center gap-1.5">
          <Trophy className="size-4" aria-hidden="true" />
          Rang : <strong>{rang}</strong>
        </span>
      ) : null}
      {capitalisation ? (
        <span className="inline-flex items-center gap-1.5">
          <BarChart3 className="size-4" aria-hidden="true" />
          Capitalisation : <strong>{capitalisation}</strong>
        </span>
      ) : null}
      {prix ? (
        <span className="inline-flex items-center gap-1.5">
          <Coins className="size-4" aria-hidden="true" />
          Prix : <strong>{prix}</strong>
        </span>
      ) : null}
      {depuis ? <span className="text-muted">(relevé du {depuis})</span> : null}
    </span>
  );
}

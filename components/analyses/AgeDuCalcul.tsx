"use client";

import { useEffect, useState } from "react";

/**
 * Âge du dernier calcul, lu sur l'horloge DU NAVIGATEUR (lot L2, 08/10/2026). La page est statique : elle n'est
 * reconstruite que lorsque le robot publie. Si le robot tombe, rien ne se reconstruit ; un contrôle fait au build ne
 * s'afficherait jamais. D'où ces deux petits composants client, sans rien au rendu serveur (pas d'écart d'hydratation).
 */

const NBSP = String.fromCharCode(0x00a0);
const HEURE = 3_600_000;

function useMaintenant(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function texteIlYa(heures: number): string {
  if (heures < 1) return "il y a moins d’une heure";
  if (heures < 48) return `il y a ${Math.floor(heures)}${NBSP}h`;
  return `il y a ${Math.floor(heures / 24)}${NBSP}jours`;
}

/** « (il y a 3 h) » à côté de l'horodatage. */
export function IlYa({ iso, avant = " (", apres = ")" }: { iso: string; avant?: string; apres?: string }) {
  const now = useMaintenant();
  const t = Date.parse(iso);
  if (now === null || !Number.isFinite(t)) return null;
  return (
    <span data-il-y-a="">
      {avant}
      {texteIlYa(Math.max(0, (now - t) / HEURE))}
      {apres}
    </span>
  );
}

/** Texte du bandeau (reprise L2 : plus de « pour décider », qui laissait entendre que les valeurs à jour y servent). */
export const TEXTE_BANDEAU_ANCIEN = `${NBSP}: ces valeurs ne sont plus à jour. Le calcul quotidien n’a pas pu être publié depuis.`;

/**
 * Bandeau « donnée ancienne » au-delà de `seuilH` heures (36 h par défaut). `titre` : « Dernier calcul le … » sur une page,
 * « Calcul le plus ancien du tableau : … » sur le hub (calé sur le plus ancien des 5).
 */
export function BandeauAncien({ iso, dateCourte, seuilH = 36, titre }: { iso: string; dateCourte: string; seuilH?: number; titre?: string }) {
  const now = useMaintenant();
  const t = Date.parse(iso);
  if (now === null || !Number.isFinite(t) || now - t <= seuilH * HEURE) return null;
  return (
    <div role="status" data-bandeau-ancien="" className="mt-4 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-fg">
      <strong>{titre ?? `Dernier calcul le ${dateCourte}`}</strong>
      {TEXTE_BANDEAU_ANCIEN}
    </div>
  );
}

/** Mention « calcul ancien » sur une ligne du hub, au-delà du seuil (rien sinon). */
export function MarqueAncien({ iso, seuilH = 36 }: { iso: string; seuilH?: number }) {
  const now = useMaintenant();
  const t = Date.parse(iso);
  if (now === null || !Number.isFinite(t) || now - t <= seuilH * HEURE) return null;
  return (
    <span data-marque-ancien="" className="ml-1 rounded border border-warning/50 bg-warning/10 px-1.5 py-0.5 text-[11px] font-semibold text-fg">
      calcul ancien
    </span>
  );
}

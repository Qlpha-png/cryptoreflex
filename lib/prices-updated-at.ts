/**
 * lib/prices-updated-at.ts — `updatedAt` des réponses de prix (/api/prices, /api/coins/top, /api/portfolio-prices).
 *
 * 08/10/2026 (lot fraîcheur A, audit n° 1) : ces routes renvoyaient l'heure de la RÉPONSE (new Date()), qui ne prouve
 * rien sur l'âge des cours. Désormais : heure du relevé le plus ANCIEN parmi les prix réellement servis (prix > 0 avec une
 * heure connue), ou null si aucune heure n'est connue. On n'annonce jamais plus frais que vrai.
 */
import { oldestIso } from "@/lib/data-dates";

export function pricesUpdatedAt(items: ReadonlyArray<{ fetchedAt?: string | null; price?: number; priceUsd?: number; priceEur?: number }>): string | null {
  return oldestIso(
    items
      .filter((p) => {
        const v = p.price ?? p.priceUsd ?? p.priceEur ?? 0;
        return Number.isFinite(v) && v > 0;
      })
      .map((p) => p.fetchedAt ?? null),
  );
}

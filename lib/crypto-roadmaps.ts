/**
 * lib/crypto-roadmaps.ts — Lookup roadmap d'événements pour une crypto.
 *
 * Toutes les cryptos n'ont pas une roadmap publique crédible. La fonction
 * retourne `null` quand on n'a pas de données fiables pour ne pas afficher
 * une section vide ou inventée. Le composant UI doit gérer ce cas.
 */
import roadmapsData from "@/data/crypto-roadmaps.json";

export type RoadmapStatus = "done" | "in-progress" | "planned";

export interface RoadmapEvent {
  date: string;          // YYYY-MM
  status: RoadmapStatus;
  title: string;
  description: string;
}

const ROADMAPS = roadmapsData.roadmaps as Record<string, RoadmapEvent[]>;

/** Retourne la roadmap d'une crypto par son id, ou null si pas de données. */
export function getRoadmapFor(cryptoId: string): RoadmapEvent[] | null {
  const r = ROADMAPS[cryptoId];
  if (!r || r.length === 0) return null;
  return r;
}

/**
 * lib/crypto-roadmaps.ts — Lookup roadmap d'événements pour une crypto.
 *
 * V2 (audit 2026-05-01) : ajout des champs optionnels `sourceUrl` (URL primaire
 * vérifiée) et `sourceVerifiedAt` (date de dernière vérif manuelle) pour la
 * traçabilité E-E-A-T. Le composant `CryptoRoadmap.tsx` rend un lien cliquable
 * "Source officielle" + badge "Vérifié YYYY-MM" si présents.
 *
 * Toutes les cryptos n'ont pas une roadmap publique crédible. La fonction
 * retourne `null` quand on n'a pas de données fiables pour ne pas afficher
 * une section vide ou inventée. Le composant UI gère ce cas (placeholder
 * honnête depuis le fix audit-UX 2026-05-01).
 */
import roadmapsData from "@/data/crypto-roadmaps.json";

export type RoadmapStatus = "done" | "in-progress" | "planned";

export interface RoadmapEvent {
  /** Date format `YYYY-MM` | `YYYY-Q[1-4]` | `YYYY+`. */
  date: string;
  status: RoadmapStatus;
  title: string;
  description: string;
  /** URL source PRIMAIRE (whitepaper officiel, blog projet, GitHub). V2. */
  sourceUrl?: string;
  /** Date `YYYY-MM` de dernière vérif manuelle de la sourceUrl. V2. */
  sourceVerifiedAt?: string;
}

interface RoadmapsFile {
  _meta?: {
    lastUpdated?: string;
    purpose?: string;
    schema?: string;
    schemaVersion?: string;
  };
  roadmaps: Record<string, RoadmapEvent[]>;
}

const FILE = roadmapsData as RoadmapsFile;
const ROADMAPS = FILE.roadmaps ?? {};

/** Retourne la roadmap d'une crypto par son id, ou null si pas de données. */
export function getRoadmapFor(cryptoId: string): RoadmapEvent[] | null {
  const r = ROADMAPS[cryptoId];
  if (!r || r.length === 0) return null;
  return r;
}

/** Liste des cryptoIds qui ont au moins 1 événement de roadmap (utile audit/sitemap). */
export function getCryptosWithRoadmap(): string[] {
  return Object.entries(ROADMAPS)
    .filter(([, events]) => events.length > 0)
    .map(([id]) => id);
}

/** Date de dernière mise à jour globale du dataset (depuis _meta). */
export const ROADMAPS_LAST_UPDATED: string =
  FILE._meta?.lastUpdated ?? "2026-05-01";

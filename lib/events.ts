/**
 * Events helpers — calendrier crypto evergreen.
 *
 * Source : `data/events.json` (curé manuellement, refresh trimestriel).
 *
 * Pourquoi un JSON static plutôt qu'une API tiers (CoinMarketCal, etc.) :
 *  - Zéro dépendance externe au build (le site reste 100 % statique-friendly).
 *  - Pas de rate-limit, pas de risque de panne tiers en prod.
 *  - Édition humaine = curation qualité (pas de spam token unlock obscur).
 *  - Coût maintenance acceptable : ~15-25 events / trimestre à actualiser.
 */
import eventsData from "@/data/events.json";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type EventCategory =
  | "halving"
  | "etf-deadline"
  | "mainnet-launch"
  | "unlock"
  | "regulation"
  | "conference";

export type EventImpact = "low" | "medium" | "high";

export interface EventLink {
  label: string;
  url: string;
}

export interface CryptoEvent {
  id: string;
  title: string;
  category: EventCategory;
  /** ISO date "YYYY-MM-DD" */
  date: string;
  isApproximate: boolean;
  description: string;
  impact: EventImpact;
  links?: EventLink[];
}

interface EventsFile {
  _meta: {
    lastUpdated: string;
    schemaVersion: string;
    notes?: string;
  };
  events: CryptoEvent[];
}

const EVENTS = eventsData as EventsFile;

/** Métadonnée du fichier (date du dernier refresh manuel). */
export const EVENTS_META = EVENTS._meta;

/* -------------------------------------------------------------------------- */
/* API publique                                                               */
/* -------------------------------------------------------------------------- */

/** Tous les événements, triés par date asc. */
export function getAllEvents(): CryptoEvent[] {
  return [...EVENTS.events].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Évènements futurs (date >= aujourd'hui, comparaison sur la *date civile*),
 * triés du plus proche au plus lointain.
 *
 * @param limit nombre max retourné. `undefined` = pas de limite.
 */
export function getUpcomingEvents(limit?: number): CryptoEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const filtered = getAllEvents().filter((e) => e.date >= today);
  return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
}

/** Évènements passés, triés du plus récent au plus ancien. */
export function getPastEvents(): CryptoEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return getAllEvents()
    .filter((e) => e.date < today)
    .reverse();
}

/** Lookup direct par id (utile pour le cross-link / debug). */
export function getEventById(id: string): CryptoEvent | undefined {
  return EVENTS.events.find((e) => e.id === id);
}

/** Catégories distinctes effectivement présentes (ordre stable de référence). */
export const EVENT_CATEGORIES: EventCategory[] = [
  "halving",
  "etf-deadline",
  "regulation",
  "unlock",
  "conference",
  "mainnet-launch",
];

/** Libellés FR par catégorie — utilisés dans l'UI (filtre + badge). */
export const CATEGORY_LABEL: Record<EventCategory, string> = {
  halving: "Halving",
  "etf-deadline": "ETF",
  "mainnet-launch": "Mainnet",
  unlock: "Token unlock",
  regulation: "Régulation",
  conference: "Conférence",
};

/** Classes Tailwind pré-générées par catégorie (purge-safe). */
export const CATEGORY_BADGE: Record<EventCategory, string> = {
  halving:        "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  "etf-deadline": "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  "mainnet-launch":"bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30",
  unlock:         "bg-rose-500/15 text-rose-200 ring-rose-500/30",
  regulation:     "bg-info/15 text-info-fg ring-info/30",
  conference:     "bg-sky-500/15 text-sky-200 ring-sky-500/30",
};

/* -------------------------------------------------------------------------- */
/* Helpers UI                                                                 */
/* -------------------------------------------------------------------------- */

/** Format français — "15 avril 2028" ou "~ avril 2028". */
export function formatEventDate(date: string, isApproximate: boolean): string {
  const d = new Date(date + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return date;

  if (isApproximate) {
    return (
      "~ " +
      d.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    );
  }
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Format mois + année compact ("avr. 2028") pour les regroupements. */
export function formatEventMonth(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Regroupe une liste d'évènements par mois ("YYYY-MM" → events).
 * Conserve l'ordre d'entrée dans chaque groupe (donc respecte le tri amont).
 */
export function groupByMonth(
  events: CryptoEvent[]
): Array<{ key: string; label: string; events: CryptoEvent[] }> {
  const map = new Map<string, CryptoEvent[]>();
  for (const e of events) {
    const k = e.date.slice(0, 7); // "YYYY-MM"
    const arr = map.get(k);
    if (arr) arr.push(e);
    else map.set(k, [e]);
  }
  return Array.from(map.entries()).map(([key, evs]) => ({
    key,
    label: formatEventMonth(evs[0].date),
    events: evs,
  }));
}

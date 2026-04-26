"use client";

/**
 * components/calendar/EventsList.tsx — Vue liste chronologique groupée par mois.
 *
 * Sticky header par mois, scroll fluide. Utilise <EventCard /> pour chaque item.
 * Reçoit la liste filtrée du parent — pas de logique de filtre ici.
 */

import EventCard from "./EventCard";
import type { CryptoEvent } from "@/lib/events-types";

interface EventsListProps {
  events: CryptoEvent[];
}

/** Format "Avril 2026" capitalisé pour le sticky header. */
function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const formatted = d.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Regroupe par mois en conservant l'ordre d'entrée. */
function groupByMonth(
  events: CryptoEvent[]
): Array<{ month: string; events: CryptoEvent[] }> {
  const map = new Map<string, CryptoEvent[]>();
  for (const e of events) {
    const key = e.date.slice(0, 7);
    const arr = map.get(key);
    if (arr) arr.push(e);
    else map.set(key, [e]);
  }
  return Array.from(map.entries()).map(([month, evs]) => ({ month, events: evs }));
}

export default function EventsList({ events }: EventsListProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-12 text-center">
        <p className="text-body text-muted">
          Aucun événement ne correspond à tes filtres.
        </p>
      </div>
    );
  }

  const groups = groupByMonth(events);

  return (
    <div className="space-y-8">
      {groups.map(({ month, events: monthEvents }) => (
        <section key={month} aria-label={formatMonthLabel(month)}>
          <h2 className="sticky top-16 z-10 -mx-4 mb-4 border-b border-border bg-background/85 px-4 py-2 text-h5 font-bold text-fg backdrop-blur-md">
            {formatMonthLabel(month)}
            <span className="ml-2 text-caption font-normal text-muted">
              ({monthEvents.length} événement{monthEvents.length > 1 ? "s" : ""})
            </span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {monthEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

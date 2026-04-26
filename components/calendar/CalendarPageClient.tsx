"use client";

/**
 * components/calendar/CalendarPageClient.tsx — Wrapper Client de /calendrier.
 *
 * Server page (`app/calendrier/page.tsx`) délègue toute la partie interactive
 * (toggle vue, filtres, modal jour) à ce composant. Les données arrivent
 * déjà fetchées en props.
 *
 * Pourquoi pas tout en Client direct ?
 *  - On veut le SEO + JSON-LD côté serveur (rendu HTML brut).
 *  - On garde Server Component pour le hero / disclaimer / structured data.
 */

import { useMemo, useState } from "react";
import EventFilters from "./EventFilters";
import EventsList from "./EventsList";
import CalendarGrid from "./CalendarGrid";
import {
  DEFAULT_FILTERS,
  type CryptoEvent,
  type EventsFilterState,
} from "@/lib/events-types";

interface CalendarPageClientProps {
  events: CryptoEvent[];
  availableCryptos: string[];
}

type ViewMode = "calendar" | "list";

function applyFilters(events: CryptoEvent[], f: EventsFilterState): CryptoEvent[] {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  let cutoffIso: string | null = null;
  if (f.period !== "all") {
    const days = f.period === "7d" ? 7 : 30;
    const cutoff = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    cutoffIso = cutoff.toISOString().slice(0, 10);
  }
  return events.filter((e) => {
    if (f.cryptos.length > 0 && !f.cryptos.includes(e.crypto)) return false;
    if (f.categories.length > 0 && !f.categories.includes(e.category)) return false;
    if (e.importance < f.minImportance) return false;
    if (cutoffIso) {
      // Période = events à venir entre aujourd'hui et cutoff.
      if (e.date < todayIso || e.date > cutoffIso) return false;
    }
    return true;
  });
}

export default function CalendarPageClient({
  events,
  availableCryptos,
}: CalendarPageClientProps) {
  const [view, setView] = useState<ViewMode>("calendar");
  const [filters, setFilters] = useState<EventsFilterState>(DEFAULT_FILTERS);

  const filtered = useMemo(() => applyFilters(events, filters), [events, filters]);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar filtres — sticky sur desktop */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <EventFilters
          filters={filters}
          onChange={setFilters}
          availableCryptos={availableCryptos}
        />
        <p className="mt-3 text-caption text-muted">
          {filtered.length} événement{filtered.length > 1 ? "s" : ""} affiché
          {filtered.length > 1 ? "s" : ""}.
        </p>
      </aside>

      {/* Main */}
      <div>
        {/* Toggle vue */}
        <div
          role="tablist"
          aria-label="Affichage du calendrier"
          className="mb-5 inline-flex rounded-xl bg-elevated p-1 ring-1 ring-border"
        >
          <button
            role="tab"
            aria-selected={view === "calendar"}
            type="button"
            onClick={() => setView("calendar")}
            className={`rounded-lg px-4 py-1.5 text-small font-medium transition focus:outline-none focus:ring-2 focus:ring-primary ${
              view === "calendar"
                ? "bg-primary/15 text-primary-glow"
                : "text-muted hover:text-fg"
            }`}
          >
            Calendrier
          </button>
          <button
            role="tab"
            aria-selected={view === "list"}
            type="button"
            onClick={() => setView("list")}
            className={`rounded-lg px-4 py-1.5 text-small font-medium transition focus:outline-none focus:ring-2 focus:ring-primary ${
              view === "list"
                ? "bg-primary/15 text-primary-glow"
                : "text-muted hover:text-fg"
            }`}
          >
            Liste
          </button>
        </div>

        {view === "calendar" ? (
          <CalendarGrid events={filtered} />
        ) : (
          <EventsList events={filtered} />
        )}
      </div>
    </div>
  );
}

/**
 * components/calendar/EventCard.tsx — Carte événement réutilisable.
 *
 * Rendue dans :
 *  - <EventsList /> (vue liste)
 *  - Modal de <CalendarGrid /> (vue calendrier mensuel)
 *  - <UpcomingEventsBanner /> (homepage / fiches crypto)
 *
 * Pure presentational component — pas de state, pas d'effet.
 * Server-renderable (peut être importée depuis un Server Component si besoin).
 */

import {
  CATEGORY_BADGE,
  IMPORTANCE_COLOR,
  IMPORTANCE_LABEL,
  IMPORTANCE_RING,
  type CryptoEvent,
} from "@/lib/events-types";

interface EventCardProps {
  event: CryptoEvent;
  /** Si true, masque la date (utile dans la modal d'un jour spécifique). */
  hideDate?: boolean;
  /** Variante compacte (UpcomingEventsBanner). */
  compact?: boolean;
}

/** Format français : "lundi 1er juin 2026". On gère le "1er" manuellement. */
function formatLongDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  const formatted = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  // Tendance Académie française : "1er" plutôt que "1" pour le premier du mois.
  return formatted.replace(/\b1 /, "1er ");
}

export default function EventCard({ event, hideDate = false, compact = false }: EventCardProps) {
  const importanceLabel = IMPORTANCE_LABEL[event.importance];
  const dotColor = IMPORTANCE_COLOR[event.importance];
  const ringColor = IMPORTANCE_RING[event.importance];
  const badgeClass = CATEGORY_BADGE[event.category];

  return (
    <article
      className={`group relative rounded-xl bg-elevated/60 p-${compact ? "4" : "5"} ring-1 ${ringColor} shadow-e2 transition hover:shadow-e3 hover:bg-elevated/80`}
      aria-label={`Événement ${event.category} : ${event.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Header : crypto + catégorie + importance dot */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-background/80 px-2 py-0.5 text-caption font-semibold text-fg ring-1 ring-border">
              {event.crypto}
            </span>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-caption font-semibold ring-1 ${badgeClass}`}
            >
              {event.category}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-caption text-muted`}
              title={`Importance : ${importanceLabel}`}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${dotColor}`}
              />
              {importanceLabel}
            </span>
          </div>

          {/* Titre */}
          <h3 className={`${compact ? "text-body" : "text-h6"} font-semibold leading-snug text-fg`}>
            {event.title}
          </h3>

          {/* Date */}
          {!hideDate && (
            <p className="mt-1 text-small text-muted">{formatLongDate(event.date)}</p>
          )}

          {/* Description */}
          {!compact && (
            <p className="mt-3 text-small leading-relaxed text-muted">{event.description}</p>
          )}

          {/* Source */}
          <div className="mt-3 flex items-center gap-2 text-caption text-muted">
            <span>via</span>
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="font-medium text-primary-glow underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
              aria-label={`Source officielle : ${event.source} (s'ouvre dans un nouvel onglet)`}
            >
              {event.source}
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

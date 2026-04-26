/**
 * components/calendar/UpcomingEventsBanner.tsx — Top 3 événements à venir.
 *
 * Composant Server-renderable, conçu pour être réutilisé :
 *  - Homepage (section éducation / actualité)
 *  - Fiches crypto (sidebar contextuel)
 *  - Page /calendrier (header)
 *
 * Reçoit la liste pré-fetchée du parent — pas de fetch interne pour rester
 * Server Component-friendly et éviter le double-fetch.
 */

import Link from "next/link";
import EventCard from "./EventCard";
import type { CryptoEvent } from "@/lib/events-types";

interface UpcomingEventsBannerProps {
  events: CryptoEvent[];
  /** Nombre max d'events à afficher (default: 3). */
  limit?: number;
  /** Titre custom — par défaut "Prochains événements crypto". */
  title?: string;
  /** Si true, masque le lien "voir tout". */
  hideAllLink?: boolean;
}

export default function UpcomingEventsBanner({
  events,
  limit = 3,
  title = "Prochains événements crypto",
  hideAllLink = false,
}: UpcomingEventsBannerProps) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter((e) => e.date >= today)
    .slice(0, limit);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-border bg-gradient-to-br from-surface to-background p-6 shadow-e2"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-h5 font-bold text-fg">{title}</h2>
        {!hideAllLink && (
          <Link
            href="/calendrier"
            className="text-small font-medium text-primary-glow underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
          >
            Voir tout →
          </Link>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {upcoming.map((e) => (
          <EventCard key={e.id} event={e} compact />
        ))}
      </div>
    </section>
  );
}

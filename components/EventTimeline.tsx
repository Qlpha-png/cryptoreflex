"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  List as ListIcon,
  LayoutGrid,
  Circle,
  ExternalLink,
  Calendar as CalendarIcon,
  AlertTriangle,
} from "lucide-react";
import {
  CATEGORY_BADGE,
  CATEGORY_LABEL,
  EVENT_CATEGORIES,
  formatEventDate,
  formatEventMonth,
  groupByMonth,
  type CryptoEvent,
  type EventCategory,
  type EventImpact,
} from "@/lib/events";

/**
 * EventTimeline — composant client interactif pour /calendrier-crypto.
 *
 * Server-Component-friendly : la donnée est passée en props (déjà triée par
 * date asc), le seul état local est le filtre catégorie + le mode de vue.
 *
 * 3 vues :
 *  - Timeline (défaut) : ligne verticale, mois en sticky-left, badges + impact.
 *  - List : table responsive (date / titre / catégorie / impact).
 *  - Calendar : grille 12 mois avec un indicateur par mois ayant >=1 event.
 *
 * Filtres catégorie : multi-select via chips. URL `?cat=halving` pré-sélectionne
 * une catégorie (utilisé pour le cross-link `/halving-bitcoin → /calendrier-crypto?cat=halving`).
 *
 * a11y :
 *  - Tablist sémantique pour la bascule de vues.
 *  - aria-pressed sur les chips de filtre.
 *  - Liste sémantique <ul role="list"> pour la timeline (SR-friendly).
 *  - Focus visible (ring) sur tous les contrôles.
 */

interface Props {
  events: CryptoEvent[];
  /** Catégorie pré-sélectionnée via ?cat= (depuis le Server Component). */
  initialCategory?: EventCategory | null;
}

type View = "timeline" | "list" | "calendar";

const VIEW_LABEL: Record<View, string> = {
  timeline: "Timeline",
  list: "Liste",
  calendar: "Calendrier",
};

const VIEW_ICON: Record<View, typeof ListIcon> = {
  timeline: CalendarDays,
  list: ListIcon,
  calendar: LayoutGrid,
};

const IMPACT_LABEL: Record<EventImpact, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
};

const IMPACT_DOT_COUNT: Record<EventImpact, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const IMPACT_DOT_COLOR: Record<EventImpact, string> = {
  low: "text-muted",
  medium: "text-warning-fg",
  high: "text-danger-fg",
};

/* -------------------------------------------------------------------------- */

export default function EventTimeline({ events, initialCategory = null }: Props) {
  const [view, setView] = useState<View>("timeline");
  const [activeCat, setActiveCat] = useState<EventCategory | null>(initialCategory);

  const filtered = useMemo(() => {
    return activeCat ? events.filter((e) => e.category === activeCat) : events;
  }, [events, activeCat]);

  const counts = useMemo(() => {
    const c: Partial<Record<EventCategory, number>> = {};
    for (const e of events) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Toolbar — view switcher + filtres */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Filtres catégorie */}
        <div
          role="group"
          aria-label="Filtrer par catégorie"
          className="flex flex-wrap gap-2"
        >
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            aria-pressed={activeCat === null}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${
                activeCat === null
                  ? "border-primary bg-primary/15 text-primary-glow"
                  : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg"
              }`}
          >
            Toutes
            <span className="ml-1.5 text-[11px] text-muted">({events.length})</span>
          </button>
          {EVENT_CATEGORIES.map((cat) => {
            const n = counts[cat] ?? 0;
            if (n === 0) return null;
            const isActive = activeCat === cat;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => setActiveCat(isActive ? null : cat)}
                aria-pressed={isActive}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                  focus-visible:ring-offset-2 focus-visible:ring-offset-background
                  ${
                    isActive
                      ? "border-primary bg-primary/15 text-primary-glow"
                      : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg"
                  }`}
              >
                {CATEGORY_LABEL[cat]}
                <span className="ml-1.5 text-[11px] text-muted">({n})</span>
              </button>
            );
          })}
        </div>

        {/* View switcher */}
        <div
          role="tablist"
          aria-label="Mode d'affichage"
          className="inline-flex rounded-lg border border-border bg-surface p-1 self-start"
        >
          {(Object.keys(VIEW_LABEL) as View[]).map((v) => {
            const Icon = VIEW_ICON[v];
            const isActive = view === v;
            return (
              <button
                role="tab"
                type="button"
                key={v}
                aria-selected={isActive}
                onClick={() => setView(v)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                  focus-visible:ring-offset-2 focus-visible:ring-offset-surface
                  ${
                    isActive
                      ? "bg-elevated text-primary-glow"
                      : "text-muted hover:text-fg"
                  }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{VIEW_LABEL[v]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-fg/70">
            Aucun événement à venir dans cette catégorie pour le moment.
          </p>
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            className="mt-3 inline-block text-sm font-semibold text-primary-glow hover:underline"
          >
            Réinitialiser le filtre
          </button>
        </div>
      ) : view === "timeline" ? (
        <TimelineView events={filtered} />
      ) : view === "list" ? (
        <ListView events={filtered} />
      ) : (
        <CalendarView events={filtered} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* TIMELINE VIEW                                                              */
/* -------------------------------------------------------------------------- */

function TimelineView({ events }: { events: CryptoEvent[] }) {
  const groups = groupByMonth(events);

  return (
    <ol role="list" className="space-y-10">
      {groups.map((g) => (
        <li key={g.key} className="relative">
          {/* Sticky month label (desktop) */}
          <div className="lg:sticky lg:top-24 lg:float-left lg:w-32 mb-4 lg:mb-0">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-primary-soft">
              {g.label}
            </h3>
          </div>

          {/* Events stack */}
          <ul role="list" className="lg:ml-40 space-y-3 relative">
            {/* Vertical line */}
            <div
              className="hidden lg:block absolute left-[-26px] top-2 bottom-2 w-px bg-border"
              aria-hidden="true"
            />
            {g.events.map((e) => (
              <li key={e.id} className="relative">
                {/* Dot on the line */}
                <div
                  className="hidden lg:block absolute left-[-30px] top-5 h-2 w-2 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <EventCard event={e} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function EventCard({ event }: { event: CryptoEvent }) {
  return (
    <article
      className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40"
      aria-labelledby={`event-${event.id}-title`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-wider ring-1 ${CATEGORY_BADGE[event.category]}`}
        >
          {CATEGORY_LABEL[event.category]}
        </span>
        <time
          dateTime={event.date}
          className="font-mono text-muted"
        >
          {formatEventDate(event.date, event.isApproximate)}
        </time>
        {event.isApproximate && (
          <span
            className="inline-flex items-center gap-1 text-warning-fg"
            title="Date approximative — basée sur estimation publique"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Date approximative.</span>
            <span aria-hidden="true">approx.</span>
          </span>
        )}
        <ImpactDots impact={event.impact} />
      </div>

      <h4
        id={`event-${event.id}-title`}
        className="mt-2 text-base font-semibold text-fg"
      >
        {event.title}
      </h4>
      <p className="mt-1.5 text-sm text-muted leading-relaxed">
        {event.description}
      </p>

      {event.links && event.links.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3 text-xs">
          {event.links.map((l) => {
            const isExternal = /^https?:\/\//.test(l.url);
            const baseClass =
              "inline-flex items-center gap-1 font-medium text-primary-soft hover:text-primary-glow underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded";
            return (
              <li key={`${event.id}-${l.url}`} className="list-none">
                {isExternal ? (
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={baseClass}
                  >
                    {l.label}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <Link href={l.url} className={baseClass}>
                    {l.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function ImpactDots({ impact }: { impact: EventImpact }) {
  const count = IMPACT_DOT_COUNT[impact];
  const color = IMPACT_DOT_COLOR[impact];
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={`Impact ${IMPACT_LABEL[impact]}`}
      aria-label={`Impact ${IMPACT_LABEL[impact]}`}
    >
      {[1, 2, 3].map((i) => (
        <Circle
          key={i}
          className={`h-2 w-2 ${i <= count ? color + " fill-current" : "text-border"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* LIST VIEW                                                                  */
/* -------------------------------------------------------------------------- */

function ListView({ events }: { events: CryptoEvent[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Liste des événements crypto triés par date croissante.
          </caption>
          <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium">Date</th>
              <th scope="col" className="px-4 py-3 text-left font-medium">Évènement</th>
              <th scope="col" className="px-4 py-3 text-left font-medium hidden sm:table-cell">Catégorie</th>
              <th scope="col" className="px-4 py-3 text-left font-medium hidden md:table-cell">Impact</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-border align-top">
                <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">
                  <time dateTime={e.date}>
                    {formatEventDate(e.date, e.isApproximate)}
                  </time>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-fg">{e.title}</div>
                  <p className="mt-0.5 text-xs text-muted leading-snug">
                    {e.description}
                  </p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${CATEGORY_BADGE[e.category]}`}
                  >
                    {CATEGORY_LABEL[e.category]}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <ImpactDots impact={e.impact} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CALENDAR VIEW (V1 simple — grille mois)                                    */
/* -------------------------------------------------------------------------- */

function CalendarView({ events }: { events: CryptoEvent[] }) {
  // Groupe par mois "YYYY-MM" → events
  const map = new Map<string, CryptoEvent[]>();
  for (const e of events) {
    const k = e.date.slice(0, 7);
    const arr = map.get(k);
    if (arr) arr.push(e);
    else map.set(k, [e]);
  }

  // On affiche une grille couvrant la plage observée.
  const allKeys = Array.from(map.keys()).sort();
  if (allKeys.length === 0) return null;

  const [first, last] = [allKeys[0], allKeys[allKeys.length - 1]];
  const monthKeys: string[] = [];
  let cur = new Date(first + "-01T00:00:00Z");
  const end = new Date(last + "-01T00:00:00Z");
  while (cur <= end) {
    monthKeys.push(cur.toISOString().slice(0, 7));
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-4 flex items-center gap-2 text-xs text-muted">
        <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Vue mensuelle — chaque case représente un mois. Cliquez pour voir les évènements.
      </p>
      <ul
        role="list"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
      >
        {monthKeys.map((k) => {
          const evs = map.get(k) ?? [];
          const date = new Date(k + "-01T00:00:00Z");
          const label = date.toLocaleDateString("fr-FR", {
            month: "short",
            year: "2-digit",
            timeZone: "UTC",
          });
          const hasEvents = evs.length > 0;
          return (
            <li key={k} className="list-none">
              <details
                className={`group rounded-xl border p-3 transition-colors ${
                  hasEvents
                    ? "border-primary/30 bg-primary/5 hover:border-primary/60"
                    : "border-border/60 bg-elevated/40"
                }`}
              >
                <summary
                  className="flex items-center justify-between gap-2 cursor-pointer list-none
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded"
                  aria-disabled={!hasEvents}
                >
                  <span className="text-xs font-mono uppercase tracking-wider text-fg/85">
                    {label}
                  </span>
                  {hasEvents && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-background px-1.5">
                      {evs.length}
                    </span>
                  )}
                </summary>
                {hasEvents && (
                  <ul role="list" className="mt-3 space-y-1.5">
                    {evs.map((e) => (
                      <li key={e.id} className="text-xs text-fg/85 leading-snug">
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${impactDotColor(e.impact)}`} aria-hidden="true" />
                        {e.title}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function impactDotColor(impact: EventImpact): string {
  switch (impact) {
    case "high":   return "bg-danger-fg";
    case "medium": return "bg-warning-fg";
    default:       return "bg-muted";
  }
}

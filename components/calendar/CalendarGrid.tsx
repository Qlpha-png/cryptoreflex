"use client";

/**
 * components/calendar/CalendarGrid.tsx — Vue calendrier mensuel.
 *
 * Affiche un mois complet (semaines lundi → dimanche), navigation prev/next.
 * Cellules jours :
 *  - dot coloré par event (couleur = importance)
 *  - tooltip au hover : titre + crypto
 *  - click ouvre une modal listant les events du jour
 *
 * Responsive :
 *  - >= md : grille 7 colonnes classique
 *  - < md  : on bascule sur une liste compacte des jours avec events
 *
 * Accessibility :
 *  - <table> avec scope="col" pour les jours de semaine
 *  - aria-label sur chaque cellule (date + count events)
 *  - Modal avec focus trap basique (focus auto sur close)
 *  - Navigation prev/next clavier-friendly
 */

import { useEffect, useMemo, useState, useRef } from "react";
import EventCard from "./EventCard";
import { IMPORTANCE_COLOR, type CryptoEvent } from "@/lib/events-types";
import { useFocusTrap } from "@/lib/use-focus-trap";

interface CalendarGridProps {
  events: CryptoEvent[];
}

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Construit la matrice des cellules (semaines × 7 jours) du mois affiché.
 * Inclut les jours overflow du mois précédent/suivant pour combler la grille.
 */
function buildMonthMatrix(year: number, month: number): Array<Date | null> {
  const firstDay = new Date(Date.UTC(year, month, 1));
  // 0 = dimanche → on convertit en index lundi (0 = lundi … 6 = dimanche)
  const firstWeekday = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(Date.UTC(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function CalendarGrid({ events }: CalendarGridProps) {
  // BUG FIX CRITIQUE 26/04/2026 (Agent 2 hydration audit) : `new Date()` au
  // render initial créait un mismatch SSR (UTC server) vs CSR (client local TZ).
  // Si le client était dans un fuseau positif et qu'il chargeait pile au
  // changement de jour, isoFromDate(today) divergeait → React bail-out
  // hydration → TOUS les event handlers de toutes les pages sharing
  // app/layout.tsx étaient détachés (notamment burger menu Navbar).
  //
  // Fix : initial state à null, puis on hydrate `today` dans useEffect.
  // Pendant le 1er render (server + client matched), on affiche le mois
  // basé sur les events futurs (premier event upcoming), puis useEffect
  // recalcule la valeur cliente correcte.
  const firstEventDate = events.length > 0 ? new Date(events[0].date) : new Date(Date.UTC(2026, 0, 1));
  const [today, setToday] = useState<Date | null>(null);
  const [view, setView] = useState({
    year: firstEventDate.getUTCFullYear(),
    month: firstEventDate.getUTCMonth(),
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Hydrate `today` côté client uniquement (post-hydration) puis recale `view`
  // sur le mois courant client (geste utilisateur attendu).
  useEffect(() => {
    const now = new Date();
    setToday(now);
    setView({ year: now.getUTCFullYear(), month: now.getUTCMonth() });
  }, []);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Focus trap actif tant qu'un jour est sélectionné (modale ouverte).
  // WCAG 2.4.3 — Tab ne doit pas sortir de la modale vers le contenu masqué.
  const dialogRef = useFocusTrap<HTMLDivElement>(selectedDay !== null);

  // Index events par date "YYYY-MM-DD" pour lookup O(1).
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CryptoEvent[]>();
    for (const e of events) {
      const arr = map.get(e.date);
      if (arr) arr.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [events]);

  const cells = useMemo(
    () => buildMonthMatrix(view.year, view.month),
    [view.year, view.month]
  );

  function goPrev() {
    setView((v) => {
      const m = v.month - 1;
      return m < 0 ? { year: v.year - 1, month: 11 } : { ...v, month: m };
    });
  }

  function goNext() {
    setView((v) => {
      const m = v.month + 1;
      return m > 11 ? { year: v.year + 1, month: 0 } : { ...v, month: m };
    });
  }

  function goToday() {
    const now = new Date();
    setView({ year: now.getUTCFullYear(), month: now.getUTCMonth() });
  }

  // Focus initial sur le bouton close à l'ouverture (en complément du
  // useFocusTrap qui se chargera ensuite du cycle Tab et de la restauration
  // au unmount). Garde la garantie qu'on ne se retrouve pas avec le focus sur
  // un élément non-pertinent si l'ordre DOM change.
  useEffect(() => {
    if (selectedDay && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [selectedDay]);

  // Échap pour fermer la modal.
  useEffect(() => {
    if (!selectedDay) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedDay(null);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedDay]);

  const monthLabel = `${MONTH_NAMES[view.month].charAt(0).toUpperCase()}${MONTH_NAMES[view.month].slice(1)} ${view.year}`;
  // todayIso = "" tant que today n'est pas hydraté → `isToday` sera false sur
  // toutes les cellules (acceptable pour le 1er render, devient correct après).
  const todayIso = today ? isoFromDate(today) : "";
  const selectedEvents = selectedDay ? eventsByDate.get(selectedDay) ?? [] : [];

  return (
    <div>
      {/* Toolbar nav */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-h5 font-bold text-fg" aria-live="polite">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg bg-elevated px-3 py-1.5 text-small font-medium text-fg ring-1 ring-border hover:bg-background hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Mois précédent"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg bg-elevated px-3 py-1.5 text-small font-medium text-fg ring-1 ring-border hover:bg-background hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Revenir au mois actuel"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-elevated px-3 py-1.5 text-small font-medium text-fg ring-1 ring-border hover:bg-background hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Mois suivant"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* Desktop grid — md+ */}
      <div
        className="hidden overflow-hidden rounded-2xl border border-border bg-surface/40 shadow-e2 md:block"
        role="grid"
        aria-label={`Calendrier ${monthLabel}`}
      >
        <div className="grid grid-cols-7 border-b border-border bg-background/60">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="px-2 py-2 text-center text-caption font-semibold uppercase tracking-wide text-muted"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${idx}`}
                  role="gridcell"
                  className="min-h-[88px] border-b border-r border-border/60 bg-background/40 last:border-r-0"
                />
              );
            }
            const iso = isoFromDate(cell);
            const dayEvents = eventsByDate.get(iso) ?? [];
            const isToday = iso === todayIso;
            const dayNum = cell.getUTCDate();
            const cellLabel =
              dayEvents.length > 0
                ? `${dayNum} ${MONTH_NAMES[view.month]} — ${dayEvents.length} événement${dayEvents.length > 1 ? "s" : ""}`
                : `${dayNum} ${MONTH_NAMES[view.month]} — aucun événement`;

            const hasEvents = dayEvents.length > 0;
            const Component = hasEvents ? "button" : "div";

            return (
              <Component
                key={iso}
                role="gridcell"
                {...(hasEvents
                  ? {
                      type: "button" as const,
                      onClick: () => setSelectedDay(iso),
                      "aria-label": cellLabel,
                    }
                  : { "aria-label": cellLabel })}
                className={`group relative min-h-[88px] border-b border-r border-border/60 p-2 text-left transition last:border-r-0 ${
                  hasEvents
                    ? "cursor-pointer hover:bg-elevated/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                    : ""
                } ${isToday ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-small font-semibold tabular-nums ${
                      isToday ? "text-primary-glow" : "text-fg"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {hasEvents && (
                    <span className="text-caption text-muted">{dayEvents.length}</span>
                  )}
                </div>
                {hasEvents && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {dayEvents.slice(0, 4).map((e) => (
                      <span
                        key={e.id}
                        className={`h-2 w-2 rounded-full ${IMPORTANCE_COLOR[e.importance]}`}
                        title={`${e.title} (${e.crypto})`}
                        aria-hidden="true"
                      />
                    ))}
                    {dayEvents.length > 4 && (
                      <span className="text-caption text-muted">+{dayEvents.length - 4}</span>
                    )}
                  </div>
                )}
                {/* Hover tooltip avec premier titre */}
                {hasEvents && (
                  <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-background/95 px-2 py-1 text-caption text-fg ring-1 ring-border shadow-e3 group-hover:block">
                    {dayEvents[0].title}
                    {dayEvents.length > 1 && ` +${dayEvents.length - 1}`}
                  </span>
                )}
              </Component>
            );
          })}
        </div>
      </div>

      {/* Mobile fallback : liste compacte des jours-avec-events du mois */}
      <div className="md:hidden">
        <ul className="space-y-2">
          {cells
            .filter((c): c is Date => c !== null)
            .map((cell) => {
              const iso = isoFromDate(cell);
              const dayEvents = eventsByDate.get(iso);
              if (!dayEvents) return null;
              return (
                <li key={iso}>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(iso)}
                    className="flex w-full items-center gap-3 rounded-xl bg-elevated/60 p-3 text-left ring-1 ring-border transition hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`${cell.getUTCDate()} ${MONTH_NAMES[view.month]} — ${dayEvents.length} événement${dayEvents.length > 1 ? "s" : ""}`}
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-background text-center">
                      <span className="text-h6 font-bold tabular-nums text-fg">
                        {cell.getUTCDate()}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-small font-medium text-fg">
                        {dayEvents[0].title}
                      </span>
                      <span className="text-caption text-muted">
                        {dayEvents.length > 1
                          ? `+${dayEvents.length - 1} autre${dayEvents.length > 2 ? "s" : ""}`
                          : dayEvents[0].crypto}
                      </span>
                    </span>
                    <span className="flex flex-shrink-0 gap-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={`h-2 w-2 rounded-full ${IMPORTANCE_COLOR[e.importance]}`}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      </div>

      {/* Modal */}
      {selectedDay && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm md:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDay(null);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-e5">
            <div className="flex items-start justify-between gap-4 border-b border-border bg-elevated/60 px-5 py-4">
              <h3 id="day-modal-title" className="text-h6 font-bold text-fg">
                {(() => {
                  const d = new Date(selectedDay + "T00:00:00Z");
                  return d
                    .toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                    .replace(/\b1 /, "1er ");
                })()}
              </h3>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-md bg-background p-1 text-muted ring-1 ring-border hover:text-fg focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Fermer la fenêtre"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
              {selectedEvents.map((e) => (
                <EventCard key={e.id} event={e} hideDate />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

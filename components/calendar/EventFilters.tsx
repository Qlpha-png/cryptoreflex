"use client";

/**
 * components/calendar/EventFilters.tsx — Filtres locaux du calendrier.
 *
 * Client Component piloté par état parent (controlled). Émet un nouvel objet
 * `EventsFilterState` à chaque changement via `onChange`. Pas de state
 * interne (= filtre = source unique de vérité côté parent).
 *
 * Accessibility :
 *  - Tous les contrôles ont aria-labels.
 *  - Les chips de catégories sont des <button role="switch">.
 *  - Le slider importance est un <input type="range"> natif (clavier-friendly).
 *  - Le multi-select crypto est un menu accessible avec checkboxes.
 */

import { useState, useRef, useEffect } from "react";
import {
  CATEGORY_DESCRIPTION,
  EVENT_CATEGORIES,
  IMPORTANCE_LABEL,
  type EventCategory,
  type EventsFilterState,
  type Importance,
  type PeriodFilter,
} from "@/lib/events-types";

interface EventFiltersProps {
  filters: EventsFilterState;
  onChange: (next: EventsFilterState) => void;
  /** Cryptos disponibles dans le dataset courant. */
  availableCryptos: string[];
}

const PERIOD_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "30d", label: "30 jours" },
  { value: "7d", label: "7 jours" },
];

export default function EventFilters({
  filters,
  onChange,
  availableCryptos,
}: EventFiltersProps) {
  const [cryptoMenuOpen, setCryptoMenuOpen] = useState(false);
  const cryptoMenuRef = useRef<HTMLDivElement>(null);

  // Click-outside pour fermer le menu crypto.
  useEffect(() => {
    if (!cryptoMenuOpen) return;
    function handler(e: MouseEvent) {
      if (cryptoMenuRef.current && !cryptoMenuRef.current.contains(e.target as Node)) {
        setCryptoMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cryptoMenuOpen]);

  function toggleCategory(cat: EventCategory) {
    const present = filters.categories.includes(cat);
    onChange({
      ...filters,
      categories: present
        ? filters.categories.filter((c) => c !== cat)
        : [...filters.categories, cat],
    });
  }

  function toggleCrypto(symbol: string) {
    const present = filters.cryptos.includes(symbol);
    onChange({
      ...filters,
      cryptos: present
        ? filters.cryptos.filter((c) => c !== symbol)
        : [...filters.cryptos, symbol],
    });
  }

  function setImportance(value: Importance) {
    onChange({ ...filters, minImportance: value });
  }

  function setPeriod(value: PeriodFilter) {
    onChange({ ...filters, period: value });
  }

  function reset() {
    onChange({ cryptos: [], categories: [], minImportance: 1, period: "all" });
  }

  const hasActiveFilters =
    filters.cryptos.length > 0 ||
    filters.categories.length > 0 ||
    filters.minImportance > 1 ||
    filters.period !== "all";

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5 shadow-e2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-h6 font-semibold text-fg">Filtres</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={reset}
            className="text-small text-muted underline-offset-2 hover:text-fg hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
            aria-label="Réinitialiser tous les filtres"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Crypto multi-select */}
      <div className="mb-5">
        <label className="mb-2 block text-caption font-semibold uppercase tracking-wide text-muted">
          Crypto
        </label>
        <div className="relative" ref={cryptoMenuRef}>
          <button
            type="button"
            onClick={() => setCryptoMenuOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg bg-elevated px-3 py-2 text-small text-fg ring-1 ring-border hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-haspopup="listbox"
            aria-expanded={cryptoMenuOpen}
            aria-label="Sélectionner les cryptos à afficher"
          >
            <span>
              {filters.cryptos.length === 0
                ? "Toutes"
                : `${filters.cryptos.length} sélectionnée${filters.cryptos.length > 1 ? "s" : ""}`}
            </span>
            <svg
              className={`h-4 w-4 transition-transform ${cryptoMenuOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {cryptoMenuOpen && (
            <div
              role="listbox"
              aria-multiselectable="true"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-elevated p-1 shadow-e4"
            >
              {availableCryptos.map((symbol) => {
                const checked = filters.cryptos.includes(symbol);
                return (
                  <button
                    key={symbol}
                    role="option"
                    aria-selected={checked}
                    type="button"
                    onClick={() => toggleCrypto(symbol)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-small focus:outline-none focus:ring-2 focus:ring-primary ${
                      checked ? "bg-primary/10 text-primary-glow" : "text-fg hover:bg-background/60"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-4 w-4 rounded border ${checked ? "border-primary bg-primary" : "border-border"}`}
                    >
                      {checked && (
                        <svg viewBox="0 0 20 20" fill="white" className="h-full w-full">
                          <path
                            fillRule="evenodd"
                            d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 111.42-1.42L8 12.585l7.29-7.295a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>
                    {symbol}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Catégories chips */}
      <div className="mb-5">
        <label className="mb-2 block text-caption font-semibold uppercase tracking-wide text-muted">
          Catégorie
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Catégories d'événements">
          {EVENT_CATEGORIES.map((cat) => {
            const active = filters.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                role="switch"
                aria-checked={active}
                aria-label={`${cat} — ${CATEGORY_DESCRIPTION[cat]}`}
                onClick={() => toggleCategory(cat)}
                className={`rounded-full px-3 py-1 text-caption font-medium ring-1 transition focus:outline-none focus:ring-2 focus:ring-primary ${
                  active
                    ? "bg-primary/15 text-primary-glow ring-primary/50"
                    : "bg-elevated text-muted ring-border hover:text-fg hover:ring-primary/30"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Importance slider */}
      <div className="mb-5">
        <label
          htmlFor="filter-importance"
          className="mb-2 flex items-center justify-between text-caption font-semibold uppercase tracking-wide text-muted"
        >
          <span>Importance min.</span>
          <span className="text-fg">{IMPORTANCE_LABEL[filters.minImportance]}</span>
        </label>
        <input
          id="filter-importance"
          type="range"
          min={1}
          max={3}
          step={1}
          value={filters.minImportance}
          onChange={(e) => setImportance(Number(e.target.value) as Importance)}
          className="w-full accent-primary"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={filters.minImportance}
          aria-valuetext={IMPORTANCE_LABEL[filters.minImportance]}
        />
        <div className="mt-1 flex justify-between text-caption text-muted">
          <span>Mineur</span>
          <span>Significatif</span>
          <span>Majeur</span>
        </div>
      </div>

      {/* Période radio */}
      <div>
        <label className="mb-2 block text-caption font-semibold uppercase tracking-wide text-muted">
          Période
        </label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Période">
          {PERIOD_OPTIONS.map((opt) => {
            const active = filters.period === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPeriod(opt.value)}
                className={`rounded-lg px-3 py-2 text-small font-medium ring-1 transition focus:outline-none focus:ring-2 focus:ring-primary ${
                  active
                    ? "bg-primary/15 text-primary-glow ring-primary/50"
                    : "bg-elevated text-muted ring-border hover:text-fg"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

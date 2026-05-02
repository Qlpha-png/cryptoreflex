"use client";

import { useEffect, useState, useCallback } from "react";
import { Keyboard, X } from "lucide-react";

/**
 * components/KeyboardShortcutsHelp.tsx — Mini dialog "Raccourcis clavier".
 *
 * Ajout étude 02/05/2026 — proposition #6.
 *
 * Déclenchement :
 *   - Touche "?" (Shift+/ sur clavier FR/US) — hors input/textarea/cmdk
 *
 * Pas de portail, pas de focus-trap lourd : c'est un mini-dialog informatif
 * qui se ferme avec Esc ou clic backdrop. Les raccourcis listés sont passés
 * via la prop `shortcuts` pour rester contextuel à la page.
 */

export interface ShortcutItem {
  /** Combinaison à afficher dans une <kbd>, ex: "J", "Shift+/", "⌘K". */
  keys: string;
  /** Description courte de l'action. */
  description: string;
}

interface Props {
  /** Liste des raccourcis disponibles sur la page courante. */
  shortcuts: ShortcutItem[];
  /** Titre du dialog (ex : "Raccourcis — Portefeuille"). */
  title?: string;
}

export default function KeyboardShortcutsHelp({
  shortcuts,
  title = "Raccourcis clavier",
}: Props) {
  const [open, setOpen] = useState(false);

  /* --------- Listener "?" ----------------------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ? = Shift + / sur la plupart des claviers
      if (e.key !== "?") return;
      // Ignore si focus dans un input
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (target.isContentEditable) return;
      }
      // Ignore si une cmdk est ouverte
      if (typeof document !== "undefined") {
        if (document.body?.dataset?.cmdkOpen === "true") return;
        const openCmdk = document.querySelector<HTMLElement>(
          '[cmdk-root][data-state="open"]'
        );
        if (openCmdk) return;
      }
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* --------- Esc to close ----------------------------------------------- */
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-help-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={close}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <header className="flex items-center justify-between gap-3 mb-4">
          <h2
            id="kbd-help-title"
            className="text-base font-bold text-fg flex items-center gap-2"
          >
            <Keyboard className="h-4 w-4 text-primary" aria-hidden="true" />
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 text-muted hover:text-fg hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </header>

        <ul className="space-y-2">
          {shortcuts.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-fg/85">{s.description}</span>
              <kbd className="inline-flex items-center justify-center rounded-md border border-border bg-elevated px-2 py-0.5 font-mono text-[11px] text-fg/90 min-w-[2rem]">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[11px] text-muted">
          Astuce : appuie à nouveau sur <kbd className="rounded border border-border bg-elevated px-1 font-mono">?</kbd> pour fermer.
        </p>
      </div>
    </div>
  );
}

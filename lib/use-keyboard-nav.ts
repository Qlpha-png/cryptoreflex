/**
 * lib/use-keyboard-nav.ts — Hook clavier pour navigation type Linear/Superhuman.
 *
 * Ajout étude 02/05/2026 — proposition #6 (DnD portfolio + raccourcis clavier).
 *
 * Comportement :
 *   - J / ↓ : sélection suivante
 *   - K / ↑ : sélection précédente
 *   - X     : delete (avec window.confirm si fourni par le caller)
 *   - E     : edit (ouvre dialog d'édition)
 *   - A     : add (ouvre dialog d'ajout)
 *   - Esc   : clear sélection
 *
 * Garde-fous (anti-conflit) :
 *   - Aucun input/textarea/contenteditable focus
 *   - Pas de modificateur (Ctrl/Meta/Alt) — pour ne pas voler ⌘+K, ⌘+A, etc.
 *   - Pas de cmdk palette ouverte (heuristique : `body[data-cmdk-open="true"]`
 *     OU présence d'un élément `[role="dialog"][data-state="open"]`).
 *
 * Retourne `{ selectedId, selectedIndex }` pour permettre au composant de
 * surligner la ligne courante.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

export interface KeyboardNavHandlers {
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onAdd?: () => void;
  /** Optionnel : appelé sur Enter/Space (consultation). */
  onActivate?: (id: string) => void;
}

export interface UseKeyboardNavReturn {
  /** ID de l'élément sélectionné, ou null si aucun. */
  selectedId: string | null;
  /** Index 0-based de l'élément sélectionné, ou -1. */
  selectedIndex: number;
  /** Setter exposé pour permettre au caller de sélectionner par clic souris. */
  setSelectedId: (id: string | null) => void;
}

interface KeyboardNavOptions {
  /** Désactive complètement le hook (utile pour pages vides ou guard plan). */
  enabled?: boolean;
}

/**
 * Détermine si on doit ignorer un évènement keydown selon le contexte.
 * - Champ texte focus → ne pas voler la frappe
 * - cmdk palette ouverte → la palette gère sa propre nav
 * - Modale ouverte → laisser passer
 */
function shouldIgnoreEvent(e: KeyboardEvent): boolean {
  // 1. Modificateur — réservé aux raccourcis système (⌘K, Ctrl+S, etc.)
  if (e.metaKey || e.ctrlKey || e.altKey) return true;

  // 2. Focus dans un input
  const target = e.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (target.isContentEditable) return true;
  }
  if (typeof document !== "undefined") {
    const active = document.activeElement as HTMLElement | null;
    if (active) {
      const tag = active.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (active.isContentEditable) return true;
    }
    // 3. cmdk palette ouverte (heuristique : data-cmdk-open OU dialog open)
    if (document.body?.dataset?.cmdkOpen === "true") return true;
    if (document.body?.classList?.contains("modal-open")) return true;
    // Cherche un dialog cmdk ouvert (le composant cmdk pose data-state="open")
    const openDialog = document.querySelector<HTMLElement>(
      '[role="dialog"][data-state="open"], [cmdk-root][data-state="open"]'
    );
    if (openDialog) return true;
  }

  return false;
}

/**
 * Hook navigation clavier pour listes (portfolio, watchlist, alertes).
 *
 * @param items Tableau d'items avec id stable (l'ordre détermine la nav J/K).
 * @param handlers Callbacks pour les actions (delete/edit/add).
 * @param options { enabled } — set à false pour désactiver complètement.
 */
export function useKeyboardNav(
  items: { id: string }[],
  handlers: KeyboardNavHandlers,
  options: KeyboardNavOptions = {}
): UseKeyboardNavReturn {
  const { enabled = true } = options;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Si la sélection courante n'existe plus dans items → reset
  useEffect(() => {
    if (selectedId === null) return;
    if (!items.some((it) => it.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  const moveSelection = useCallback(
    (delta: 1 | -1) => {
      if (items.length === 0) return;
      setSelectedId((current) => {
        if (current === null) {
          // 1ère sélection : start au début (J) ou à la fin (K)
          const start = delta > 0 ? 0 : items.length - 1;
          return items[start]?.id ?? null;
        }
        const idx = items.findIndex((it) => it.id === current);
        if (idx === -1) return items[0]?.id ?? null;
        const nextIdx = (idx + delta + items.length) % items.length;
        return items[nextIdx]?.id ?? null;
      });
    },
    [items]
  );

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (shouldIgnoreEvent(e)) return;

      // Touches non-modifiées
      const key = e.key;

      // Navigation
      if (key === "j" || key === "J" || key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1);
        return;
      }
      if (key === "k" || key === "K" || key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1);
        return;
      }

      // Escape → clear sélection
      if (key === "Escape") {
        // Ne preventDefault que si on avait quelque chose à clear (ne pas
        // voler Esc si rien n'est sélectionné — ex. ferme la modale parente).
        setSelectedId((current) => {
          if (current !== null) e.preventDefault();
          return null;
        });
        return;
      }

      // Add (A) — possible même sans sélection
      if ((key === "a" || key === "A") && handlers.onAdd) {
        e.preventDefault();
        handlers.onAdd();
        return;
      }

      // Actions qui requièrent une sélection
      if (selectedId === null) return;

      if ((key === "x" || key === "X") && handlers.onDelete) {
        e.preventDefault();
        handlers.onDelete(selectedId);
        return;
      }
      if ((key === "e" || key === "E") && handlers.onEdit) {
        e.preventDefault();
        handlers.onEdit(selectedId);
        return;
      }
      if ((key === "Enter" || key === " ") && handlers.onActivate) {
        e.preventDefault();
        handlers.onActivate(selectedId);
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, moveSelection, selectedId, handlers]);

  const selectedIndex = selectedId
    ? items.findIndex((it) => it.id === selectedId)
    : -1;

  return { selectedId, selectedIndex, setSelectedId };
}

"use client";

/**
 * useFocusTrap — Hook réutilisable pour piéger le focus clavier dans un
 * conteneur (modale, drawer, overlay) tant qu'il est actif.
 *
 * WCAG 2.4.3 (Focus Order) : sans focus trap, Tab depuis le dernier élément
 * focusable d'une modale envoie le focus dans le contenu masqué derrière le
 * backdrop, ce qui casse l'expérience clavier et lecteur d'écran.
 *
 * Comportement :
 *  - À l'activation : sauvegarde le focus précédent puis focus le 1er élément
 *    focusable du conteneur.
 *  - Sur Tab depuis le dernier focusable → cycle vers le premier.
 *  - Sur Shift+Tab depuis le premier focusable → cycle vers le dernier.
 *  - À la désactivation : restaure le focus sur l'élément qui avait le focus
 *    avant l'ouverture (UX critique pour les utilisateurs clavier).
 *
 * Usage :
 *   const ref = useFocusTrap<HTMLDivElement>(open);
 *   return <div ref={ref} role="dialog">…</div>;
 */

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    // Récupère les focusables au moment du mount du trap. Si la modale a un
    // contenu très dynamique, l'appelant peut forcer un re-mount via key={}.
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusables.length === 0) {
      // Fallback : focus le conteneur lui-même (devrait avoir tabIndex={-1})
      container.focus();
      return;
    }

    // Focus initial sur le 1er focusable (le composant peut sur-écrire après).
    focusables[0].focus();

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      // Re-query à chaque Tab pour gérer les ajouts dynamiques (ex. step change).
      const live = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (live.length === 0) return;
      const first = live[0];
      const last = live[live.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeydown);
    return () => {
      container.removeEventListener("keydown", onKeydown);
      // Restaure le focus précédent (ex. bouton qui a ouvert la modale).
      // requestAnimationFrame pour éviter un focus pendant un unmount React.
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function") {
        requestAnimationFrame(() => prev.focus());
      }
    };
  }, [active]);

  return containerRef;
}

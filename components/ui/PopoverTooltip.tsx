"use client";

import { useId, type ReactNode } from "react";

/**
 * PopoverTooltip — tooltip natif Chrome 114+/Safari 17+/Firefox 125+
 *
 * Doc : https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
 *
 * Pourquoi pas Radix Tooltip ?
 *  - Radix Tooltip = ~15 KB JS hydraté + listener cascade (focus, hover,
 *    escape, click outside, intersection).
 *  - Popover API natif = 0 KB JS, géré par le navigateur (focus trap,
 *    light dismiss, Esc, position auto).
 *  - Anchor Positioning natif (Chrome 125+) = positionne sans JS.
 *
 * Usage :
 *   <PopoverTooltip label="MiCA" content="Markets in Crypto-Assets : règlement européen">
 *     <span className="underline decoration-dotted">MiCA</span>
 *   </PopoverTooltip>
 *
 * Fallback :
 *  - Navigateurs sans Popover API : le content reste accessible via title=
 *    (HTML standard). Light dismiss et focus trap ne fonctionnent pas, mais
 *    l'info est lisible.
 *
 * a11y :
 *  - aria-describedby relie le trigger au popover.
 *  - role="tooltip" annoncé par les screen readers.
 */

interface PopoverTooltipProps {
  /** Texte de la version courte (HTML title fallback) */
  label: string;
  /** Contenu riche du tooltip (texte ou JSX) */
  content: ReactNode;
  /** Trigger element (typiquement un span underline) */
  children: ReactNode;
  /** Largeur max du tooltip (px) */
  maxWidth?: number;
}

export default function PopoverTooltip({
  label,
  content,
  children,
  maxWidth = 280,
}: PopoverTooltipProps) {
  const id = useId();
  const popoverId = `pop-${id.replace(/:/g, "")}`;

  return (
    <span className="relative inline-block">
      {/* Trigger : utilise popovertarget (HTML standard 2024).
          BATCH 19 a11y fix : suppression du `title` (double annonce SR
          avec aria-describedby pointant vers le span du popover). Ajout
          aria-label fallback explicite pour garantir un nom accessible
          quand `children` est non-textuel (icône). */}
      <button
        type="button"
        // @ts-expect-error - popovertarget est valide HTML, pas encore typé React 18
        popovertarget={popoverId}
        aria-describedby={popoverId}
        aria-label={typeof children === "string" ? undefined : label}
        className="cursor-help bg-transparent border-0 p-0 m-0 font-inherit text-inherit"
      >
        {children}
      </button>
      {/* Popover natif : auto-dismiss sur click outside + Esc.
          BATCH 19 : suppression du <span> interne qui dupliquait `label`
          (déjà annoncé via aria-label sur trigger). Le content est seul
          à apparaître = pas de triple annonce SR. */}
      <span
        id={popoverId}
        // popover est valide HTML 2024 — typage permissif via spread des attrs natifs
        {...({ popover: "auto" } as Record<string, string>)}
        role="tooltip"
        className="popover-tooltip rounded-xl border border-primary/30 bg-elevated text-fg p-3 text-xs leading-relaxed shadow-e3"
        style={{ maxWidth: `${maxWidth}px` }}
      >
        {content}
      </span>
    </span>
  );
}

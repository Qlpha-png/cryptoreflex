"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { findGlossaryTerm } from "@/lib/crypto-glossary";

/**
 * <TermTooltip term="RSI">RSI</TermTooltip> — wrapper inline pour mots
 * techniques à l'intérieur du flow de texte (MDX article, descriptions).
 *
 * Comportement :
 *  - Souligne pointillé (style "info" classique web) le mot wrappé.
 *  - Au hover/focus : popover affiche définition courte + lien "détail".
 *  - Au tap mobile : 1er tap ouvre, 2ème tap suit le lien (pattern iOS Safari).
 *  - Termes inconnus du glossaire : render simple <span> sans interactivité
 *    (zero side-effect, pas d'erreur silencieuse).
 *
 * A11y :
 *  - role="button" tabIndex={0} (focusable clavier)
 *  - aria-describedby={tooltipId} → annonce le contenu au screen reader
 *  - Esc ferme le tooltip (focus trap minimal)
 *  - prefers-reduced-motion : pas d'animation
 *  - Le tooltip est rendu dans un Portal-like (position absolute) ancré
 *    sur le span, avec collision detection minimal (ouverture en haut si
 *    pas de place en bas).
 *
 * Performance :
 *  - useState lazy : 0 popover state pour les termes inconnus.
 *  - useEffect listener uniquement quand open=true (pas de listener parasite).
 *  - Pas de Floating UI / Popper (overhead 12kB) — collision check maison
 *    en getBoundingClientRect() à l'ouverture (un seul reflow).
 */

interface TermTooltipProps {
  /** Terme canonique OU alias (ex: "RSI", "Relative Strength Index"). */
  term: string;
  /** Texte affiché dans le flow (souvent identique à `term` mais peut différer). */
  children: ReactNode;
  /** Désactive la souligne pointillée (utile dans titres ou cas custom). */
  noUnderline?: boolean;
}

export default function TermTooltip({
  term,
  children,
  noUnderline = false,
}: TermTooltipProps) {
  const def = findGlossaryTerm(term);

  // Terme inconnu : on rend juste le contenu sans wrapping (fail-soft)
  if (!def) {
    return <>{children}</>;
  }

  return <TooltipInner def={def} noUnderline={noUnderline}>{children}</TooltipInner>;
}

/* -------------------------------------------------------------------------- */
/* Inner — séparé pour ne pas allouer de hooks aux termes inconnus            */
/* -------------------------------------------------------------------------- */

function TooltipInner({
  def,
  noUnderline,
  children,
}: {
  def: NonNullable<ReturnType<typeof findGlossaryTerm>>;
  noUnderline: boolean;
  children: ReactNode;
}) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<"bottom" | "top">("bottom");
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Collision detection minimal au moment de l'ouverture
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const SAFE_TOOLTIP_HEIGHT = 180; // estimation
    if (spaceBelow < SAFE_TOOLTIP_HEIGHT) {
      setPosition("top");
    } else {
      setPosition("bottom");
    }
  }, [open]);

  // Esc + outside click → close (uniquement quand open)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClickOutside, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClickOutside, true);
    };
  }, [open]);

  // Pattern hover desktop : open au hover, close au unhover (avec léger delay
  // pour permettre au curseur d'aller dans le tooltip si besoin de cliquer un lien)
  const closeTimer = useRef<number | null>(null);
  const handleEnter = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };
  const handleLeave = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  return (
    <span className="relative inline-block">
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        className={
          noUnderline
            ? "cursor-help text-amber-200 hover:text-amber-100 transition-colors"
            : "cursor-help text-amber-200 hover:text-amber-100 underline decoration-dotted decoration-amber-300/60 underline-offset-[3px] transition-colors"
        }
      >
        {children}
      </span>

      {open && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className={`absolute z-50 left-1/2 -translate-x-1/2 ${
            position === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          } w-[min(280px,80vw)] motion-safe:animate-fade-in`}
        >
          {/* Petite pointe (arrow) */}
          <div
            aria-hidden="true"
            className={`absolute left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-elevated border border-border/60 ${
              position === "bottom"
                ? "-top-1 border-r-0 border-b-0"
                : "-bottom-1 border-l-0 border-t-0"
            }`}
          />
          <div className="relative rounded-lg border border-border/60 bg-elevated/95 backdrop-blur-md shadow-xl shadow-black/40 p-3 text-left">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="font-bold text-[13px] text-amber-200">
                {def.term}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-fg/55">
                {def.category}
              </span>
            </div>
            <p className="text-[12.5px] leading-snug text-fg/90">
              {def.short}
            </p>
            <a
              href="/outils/glossaire-crypto"
              className="mt-2 inline-block text-[11px] font-semibold text-primary-soft hover:text-primary transition-colors"
              aria-label={`Voir la définition complète de ${def.term} dans le glossaire`}
            >
              Détail complet →
            </a>
          </div>
        </div>
      )}
    </span>
  );
}

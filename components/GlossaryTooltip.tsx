"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { getTermById, type GlossaryTerm } from "@/lib/glossary";

type Variant = "underline" | "subtle" | "badge";

interface GlossaryTooltipProps {
  /** ID du terme dans data/glossary.json (ex: "blockchain"). */
  termId: string;
  /** Texte affiché. Si omis, utilise le `term` du glossaire. */
  children?: React.ReactNode;
  /** Style visuel. `underline` par défaut (souligné pointillé sobre). */
  variant?: Variant;
  /** Forcer une classe d'ancre custom si besoin. */
  className?: string;
}

/**
 * Tooltip de glossaire — accessible (focus + hover + tap mobile).
 *
 * Usage dans un article :
 *   <GlossaryTooltip termId="blockchain">la blockchain</GlossaryTooltip>
 *
 * - Survol souris    → tooltip apparaît
 * - Focus clavier    → tooltip apparaît
 * - Tap mobile       → 1er tap = ouvre, 2e tap = navigue
 * - Lien permanent   → /glossaire/[id]
 */
export default function GlossaryTooltip({
  termId,
  children,
  variant = "underline",
  className = "",
}: GlossaryTooltipProps) {
  const term = getTermById(termId);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Fermer le tooltip si on clique ailleurs (utile sur mobile).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Si l'ID est inconnu, on rend juste le texte sans casser la page.
  if (!term) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[GlossaryTooltip] termId inconnu: "${termId}"`);
    }
    return <span className={className}>{children ?? termId}</span>;
  }

  const anchorClasses = anchorClass(variant);

  return (
    <span
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <Link
        href={`/glossaire/${term.id}`}
        aria-describedby={tooltipId}
        className={`${anchorClasses} ${className}`}
      >
        {children ?? term.term}
      </Link>

      {open && <TooltipCard id={tooltipId} term={term} />}
    </span>
  );
}

function TooltipCard({ id, term }: { id: string; term: GlossaryTerm }) {
  return (
    <span
      id={id}
      role="tooltip"
      className="
        absolute z-40 left-1/2 -translate-x-1/2 bottom-full mb-2
        w-72 max-w-[calc(100vw-2rem)]
        rounded-xl border border-border bg-elevated/95 backdrop-blur-xl
        shadow-xl shadow-black/40
        p-3 text-left
        animate-fade-in-up
      "
    >
      <span className="flex items-center gap-2 mb-1.5">
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-primary-soft">
          {term.category}
        </span>
      </span>
      <span className="block font-semibold text-white text-sm leading-tight mb-1">
        {term.term}
      </span>
      <span className="block text-xs leading-relaxed text-white/80">
        {term.shortDefinition}
      </span>
      <span className="block mt-2 text-[11px] text-primary hover:text-primary-glow underline-offset-2 underline">
        Voir la définition complète →
      </span>
    </span>
  );
}

function anchorClass(variant: Variant) {
  switch (variant) {
    case "subtle":
      return "text-primary-soft hover:text-primary cursor-help underline-offset-2 hover:underline decoration-dotted";
    case "badge":
      return "inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary-soft hover:border-primary/60 cursor-help";
    case "underline":
    default:
      return "underline decoration-dotted decoration-primary/60 underline-offset-4 hover:decoration-primary cursor-help";
  }
}

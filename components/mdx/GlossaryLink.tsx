"use client";

/**
 * <GlossaryLink> — lien vers un terme du glossaire avec INFOBULLE de définition.
 *
 * Utilisé par <MdxContent> pour les liens auto-générés vers le glossaire :
 * au lieu de quitter la leçon pour lire la définition, le lecteur la voit au
 * survol (souris) ou au focus clavier (accessible). Le clic mène quand même à
 * la fiche complète du glossaire.
 */

import Link from "next/link";
import { useId, useState } from "react";

interface GlossaryLinkProps {
  href: string;
  term: string;
  /** Définition (déjà tronquée par l'appelant). */
  definition: string;
  children: React.ReactNode;
}

export default function GlossaryLink({
  href,
  term,
  definition,
  children,
}: GlossaryLinkProps) {
  const [open, setOpen] = useState(false);
  const tipId = useId();

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={href}
        className="text-primary-glow underline decoration-dotted decoration-primary/50 underline-offset-2 hover:decoration-primary"
        aria-describedby={open ? tipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </Link>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="not-prose absolute left-0 top-full z-30 mt-1.5 block w-72 max-w-[78vw] rounded-xl border border-border bg-surface p-3 text-left text-xs font-normal not-italic leading-relaxed text-fg/85 shadow-xl"
        >
          <span className="mb-1 block text-[13px] font-semibold text-fg">
            {term}
          </span>
          {definition}
          <span className="mt-1.5 block text-[11px] text-primary-soft">
            Cliquer pour la définition complète →
          </span>
        </span>
      )}
    </span>
  );
}

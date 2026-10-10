"use client";

/**
 * <GlossaryLink> — lien vers un terme du glossaire avec INFOBULLE de définition.
 *
 * Utilisé par <MdxContent> pour les liens auto-générés vers le glossaire :
 * au lieu de quitter la leçon pour lire la définition, le lecteur la voit au
 * survol (souris) ou au focus clavier (accessible). Le clic mène quand même à
 * la fiche complète du glossaire.
 *
 * Passe finale B4 (10/10/2026, jury ronde 2) : l'infobulle était `absolute left-0` sans recalage : sur téléphone, 7 liens
 * sur 9 la faisaient sortir de l'écran à 390 px (définition coupée à droite). Elle est maintenant en `position: fixed`,
 * placée à l'ouverture d'après la position réelle du lien : toujours entièrement dans la fenêtre (marge de 12 px), sous le
 * lien ou au-dessus s'il n'y a pas la place. Échap la ferme (WCAG 1.4.13), le défilement aussi.
 */

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

interface GlossaryLinkProps {
  href: string;
  term: string;
  /** Définition (déjà tronquée par l'appelant). */
  definition: string;
  children: React.ReactNode;
}

const MARGE = 12;

export default function GlossaryLink({
  href,
  term,
  definition,
  children,
}: GlossaryLinkProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; largeur: number } | null>(null);
  const tipId = useId();
  const racine = useRef<HTMLSpanElement>(null);
  const bulle = useRef<HTMLSpanElement>(null);

  // Placement : après le rendu (hauteur connue), avant la peinture (pas de saut visible).
  useLayoutEffect(() => {
    if (!open || !racine.current || !bulle.current) {
      setPos(null);
      return;
    }
    const r = racine.current.getBoundingClientRect();
    const largeur = bulle.current.offsetWidth;
    const h = Math.min(bulle.current.offsetHeight, window.innerHeight - 2 * MARGE);
    const left = Math.min(Math.max(MARGE, r.left), window.innerWidth - largeur - MARGE);
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - MARGE) top = r.top - h - 6;
    top = Math.min(Math.max(MARGE, top), window.innerHeight - h - MARGE); // texte très agrandi : jamais hors de l'écran
    setPos({ left, top, largeur });
  }, [open]);

  // Échap et défilement ferment l'infobulle
  useEffect(() => {
    if (!open) return;
    const fermer = () => setOpen(false);
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", touche);
    window.addEventListener("scroll", fermer, { passive: true });
    window.addEventListener("resize", fermer);
    return () => {
      window.removeEventListener("keydown", touche);
      window.removeEventListener("scroll", fermer);
      window.removeEventListener("resize", fermer);
    };
  }, [open]);

  return (
    <span
      ref={racine}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={href}
        className="text-link underline decoration-dotted decoration-link-line decoration-2 underline-offset-[0.28em] hover:text-link-hover"
        aria-describedby={open ? tipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </Link>
      {open && (
        <span
          ref={bulle}
          id={tipId}
          role="tooltip"
          style={{
            position: "fixed",
            left: pos ? pos.left : 0,
            top: pos ? pos.top : 0,
            width: "min(18rem, calc(100vw - 24px))",
            maxHeight: "calc(100vh - 24px)",
            overflowY: "auto",
            visibility: pos ? "visible" : "hidden",
          }}
          className="not-prose z-30 block max-w-[calc(100vw-24px)] rounded-xl border border-border bg-elevated p-3 text-left text-sm font-normal not-italic leading-relaxed text-fg-2 shadow-e3 [overflow-wrap:normal]"
        >
          <span className="mb-1 block text-sm font-semibold text-fg">
            {term}
          </span>
          {definition}
          <span className="mt-1.5 block text-sm text-primary">
            Cliquer pour la définition complète →
          </span>
        </span>
      )}
    </span>
  );
}

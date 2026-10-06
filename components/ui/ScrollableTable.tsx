"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/**
 * ScrollableTable — conteneur à défilement horizontal pour tableaux larges.
 *
 * Design lot 0 (06/10/2026) — audit : tableaux rognés à droite sur mobile
 * (« Hardwa », « Sauveg ») sans rien qui indique qu'on peut faire défiler.
 * Ajoute un dégradé de bord du côté où du contenu est masqué + un rond
 * chevron à droite tant qu'il reste du contenu à voir. Les calques sont en
 * absolute (aucun décalage de mise en page) ; sans JS, simple overflow-x-auto.
 * Le rond chevron reste DANS la zone du dégradé (48 px) pour ne jamais masquer
 * une cellule visible ; un clic fait défiler (utile à la souris).
 */

interface Props {
  children: ReactNode;
  /** Classes du cadre extérieur (marges, bordure, rayon, fond). */
  className?: string;
  /** Couleur de départ du dégradé de bord = fond réel derrière le tableau. */
  fadeFrom?: string;
  /** Nom accessible de la zone défilante (lu quand elle reçoit le focus). */
  label?: string;
}

export default function ScrollableTable({
  children,
  className = "",
  fadeFrom = "from-background",
  label = "Tableau défilant horizontalement",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setCanLeft(el.scrollLeft > 2);
      setCanRight(max - el.scrollLeft > 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, []);

  const scrollable = canLeft || canRight;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        ref={ref}
        className="overflow-x-auto overscroll-x-contain focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        {...(scrollable ? { tabIndex: 0, role: "region", "aria-label": label } : {})}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r ${fadeFrom} to-transparent transition-opacity duration-200 ${
          canLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l ${fadeFrom} to-transparent transition-opacity duration-200 ${
          canRight ? "opacity-100" : "opacity-0"
        }`}
      />
      {canRight && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => {
            const el = ref.current;
            if (el) el.scrollBy({ left: Math.round(el.clientWidth * 0.8), behavior: "smooth" });
          }}
          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border border-primary/50 bg-elevated text-primary-soft shadow-e2 transition-colors hover:bg-surface"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

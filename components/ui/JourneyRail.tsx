"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

/**
 * <JourneyRail /> — barre sticky qui montre les 3-5 étapes du parcours
 * en cours et où le user en est. Pattern Brilliant.org / Duolingo : *« Je
 * sais où je vais. »*
 *
 * Mantra UX 2026-05-02 : *« Chaque page répond à 'Et maintenant ?' avant
 * que l'utilisateur ne le demande. »* — JourneyRail répond visuellement.
 *
 * Comportement :
 *  - Apparaît après ~200px de scroll (n'encombre pas le hero).
 *  - Sticky top sur desktop, bottom-only sur mobile (au-dessus de
 *    MobileBottomNav).
 *  - Étape actuelle = highlight gold + label visible
 *  - Étapes passées = check vert
 *  - Étapes futures = numéro grisé
 *  - Click sur une étape = navigate vers son href
 *
 * Usage :
 *
 *   <JourneyRail
 *     steps={[
 *       { label: "Comprendre", href: "/blog/qu-est-ce-que-bitcoin" },
 *       { label: "Évaluer le risque", href: "/cryptos/bitcoin", current: true },
 *       { label: "Choisir une plateforme", href: "/comparatif" },
 *       { label: "Acheter", href: "/wizard/premier-achat" },
 *     ]}
 *   />
 *
 * Client Component : besoin du `useEffect` pour scroll + persistance
 * localStorage du parcours actif (futur upgrade : auto-detect par pathname).
 */

export interface JourneyStep {
  /** Libellé court (1-3 mots, scannable). */
  label: string;
  /** URL canonique de l'étape. */
  href: string;
  /** Marquer comme étape courante. Une seule par parcours. */
  current?: boolean;
  /** Marquer comme étape déjà visitée. */
  done?: boolean;
}

export interface JourneyRailProps {
  /** Liste des 3-5 étapes du parcours. */
  steps: JourneyStep[];
  /** Titre du parcours (affiché à gauche, optionnel). */
  title?: string;
  /** Délai en pixels avant apparition (défaut 200). */
  showAfterPx?: number;
}

export default function JourneyRail({
  steps,
  title,
  showAfterPx = 200,
}: JourneyRailProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > showAfterPx);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAfterPx]);

  const currentIdx = steps.findIndex((s) => s.current);

  return (
    <nav
      aria-label={title ? `Parcours : ${title}` : "Parcours"}
      className={`hidden sm:block fixed top-16 left-0 right-0 z-30 transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-2">
        <div className="rounded-full border border-border/70 bg-elevated/95 backdrop-blur-sm shadow-lg shadow-black/30 px-3 py-2 flex items-center gap-2">
          {title && (
            <span className="hidden lg:inline text-[11px] uppercase tracking-wider text-muted font-semibold pr-2 border-r border-border/50">
              {title}
            </span>
          )}
          <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none flex-1">
            {steps.map((step, i) => {
              const isCurrent = step.current;
              const isDone = step.done || (currentIdx >= 0 && i < currentIdx);
              const isFuture = !isCurrent && !isDone;
              return (
                <li key={step.href} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <Link
                    href={step.href}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isCurrent
                        ? "bg-primary/15 text-primary border border-primary/40"
                        : isDone
                          ? "text-success hover:text-success-fg"
                          : "text-muted hover:text-fg"
                    }`}
                  >
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                        isCurrent
                          ? "bg-primary text-background"
                          : isDone
                            ? "bg-success/20 text-success"
                            : "bg-muted/20 text-muted"
                      }`}
                      aria-hidden="true"
                    >
                      {isDone ? <Check className="h-2.5 w-2.5" /> : i + 1}
                    </span>
                    <span
                      className={`${isFuture ? "hidden md:inline" : ""}`}
                    >
                      {step.label}
                    </span>
                  </Link>
                  {i < steps.length - 1 && (
                    <ArrowRight
                      className="h-3 w-3 text-muted/50 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </nav>
  );
}

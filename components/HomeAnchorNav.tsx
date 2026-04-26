"use client";

import { useEffect, useState } from "react";
import {
  Target,
  BarChart3,
  Lightbulb,
  Newspaper,
  Wrench,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * HomeAnchorNav — chips horizontales sticky sous le Hero, type onglets.
 *
 * Pourquoi (feedback utilisateur 26/04/2026 "faire des onglets pour faire
 * respirer + pas se perdre") :
 *  - La home a 6 catégories d'info (Démarrer, Comparer, Apprendre, Actu,
 *    Outils, Newsletter). Sans nav d'ancre, le visiteur scrolle 5 viewports
 *    avant de comprendre l'offre.
 *  - Ces chips agissent comme une "table des matières" sticky : 1 clic =
 *    scroll fluide vers la section. Plus dynamique qu'un sommaire statique.
 *
 * Implémentation :
 *  - Sticky sous la nav principale (top-16 = sous le Navbar h-16).
 *  - Détecte la section active via IntersectionObserver pour highlight.
 *  - Scroll-snap horizontal sur mobile (overflow-x-auto + snap-x).
 *  - Pas d'anchor href={"#cat-..."} pour préserver le scrollIntoView smooth
 *    (les browsers respectent scroll-margin-top défini en CSS).
 */

interface ChipDef {
  href: string; // anchor (#cat-X)
  label: string;
  Icon: LucideIcon;
}

const CHIPS: ChipDef[] = [
  { href: "#cat-demarrer", label: "Démarrer", Icon: Target },
  { href: "#cat-comparer", label: "Comparer", Icon: BarChart3 },
  { href: "#cat-apprendre", label: "Apprendre", Icon: Lightbulb },
  { href: "#cat-actu", label: "Actualités", Icon: Newspaper },
  { href: "#cat-outils", label: "Outils", Icon: Wrench },
  { href: "#cat-informe", label: "Newsletter", Icon: Mail },
];

export default function HomeAnchorNav() {
  const [activeId, setActiveId] = useState<string>(CHIPS[0].href);

  useEffect(() => {
    // Detect quelle section est dans le viewport (intersection au-dessus de
    // la moitié de la page = active). Permet de highlight la chip courante.
    const ids = CHIPS.map((c) => c.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Prend la section la plus visible (la plus haute parmi celles intersecting)
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(`#${visible[0].target.id}`);
        }
      },
      {
        // top:-100px pour que la section soit "active" quand son haut depasse
        // sous la nav sticky (chips~52px + navbar~64px = ~120px buffer)
        rootMargin: "-120px 0px -50% 0px",
        threshold: 0,
      },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  function handleClick(href: string) {
    setActiveId(href);
    // Scroll smooth via scrollIntoView pour cohérence cross-browser
    const el = document.getElementById(href.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <nav
      aria-label="Navigation interne de la page"
      className="sticky top-16 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60 shadow-[0_4px_16px_-12px_rgba(0,0,0,0.4)]"
    >
      {/* Audit visuel mobile 26/04/2026 : avant le inner flex sans `w-full` +
          `min-w-0` propageait sa largeur intrinsèque (1394px avec 6 chips)
          au body via flex grow, créant un overflow horizontal global ~37px.
          Fix : wrapper `w-full overflow-x-auto` + `min-w-max` sur la flex
          row pour que le scroll horizontal reste contenu DANS le wrapper. */}
      <div className="mx-auto max-w-7xl w-full overflow-x-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-max items-center gap-2 py-2.5 snap-x snap-mandatory scrollbar-thin">
          {CHIPS.map((chip) => {
            const isActive = activeId === chip.href;
            return (
              <button
                key={chip.href}
                type="button"
                onClick={() => handleClick(chip.href)}
                aria-current={isActive ? "true" : undefined}
                className={`group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-fast snap-start whitespace-nowrap
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                           ${
                             isActive
                               ? "border-primary bg-primary/15 text-primary-glow shadow-[0_0_20px_-8px_rgba(245,165,36,0.5)]"
                               : "border-border bg-elevated/40 text-fg/75 hover:border-primary/40 hover:text-fg hover:bg-elevated"
                           }`}
              >
                <chip.Icon
                  className={`h-3.5 w-3.5 transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

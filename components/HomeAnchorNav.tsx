"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * Audit Block 2 RE-AUDIT 26/04/2026 (consolidation 8 agents PRO) :
 *
 * VAGUE 1 — A11y P0 EAA (Agents A11y + Front + UX) :
 *  - Avant : <button onClick={handleClick}> = cassé sans JS, pas d'URL hash,
 *    scroll non-annoncé, pas de fallback. Violation WCAG 1.3.1, 2.1.1, 4.1.2.
 *  - Après : <a href="#cat-X"> + onClick avec preventDefault (smooth scroll
 *    si JS, navigation native sinon). URL hash mis à jour via history.pushState.
 *    Focus déplacé sur la section cible (tabIndex={-1}) → annonce SR fluide.
 *  - aria-current="true" (boolean ARIA-conform) au lieu de "location".
 *
 * VAGUE 2 — Tap targets WCAG 2.5.8 (Agents A11y + Mobile) :
 *  - Avant : py-1.5 px-3.5 text-xs = ~28px hauteur (sous 44px AAA).
 *  - Après : py-2.5 px-4 min-h-[44px] text-sm.
 *
 * VAGUE 3 — DYNAMISME (Agent animation +1 pt) :
 *  - Pill gold qui SLIDE entre les chips actives (style Linear tabs).
 *  - useLayoutEffect mesure le chip actif → translate la pill avec spring.
 *  - cubic-bezier(0.34, 1.32, 0.64, 1) = easeOutBack, sentiment iOS.
 *
 * VAGUE 4 — Funnel (Agent SEO/CRO) :
 *  - Réordonner : Démarrer → Apprendre → Comparer → Outils → Actu → Newsletter.
 *  - Apprendre AVANT Comparer = préchauffage cognitif débutant.
 *
 * VAGUE 5 — Performance (Agent perf) :
 *  - rootMargin élargi pour mobile (-140px 0px -40% 0px) — fix bug "aucune chip
 *    highlightée" sur petits viewports.
 *  - prefers-reduced-motion respecté (scroll auto au lieu de smooth).
 *  - backdrop-blur retiré (pas nécessaire sous Navbar) — gain perf scroll.
 */

interface ChipDef {
  href: string; // anchor (#cat-X)
  label: string;
  Icon: LucideIcon;
}

// Audit SEO/CRO : Apprendre AVANT Comparer pour persona débutant (70% trafic).
const CHIPS: ChipDef[] = [
  { href: "#cat-demarrer", label: "Démarrer", Icon: Target },
  { href: "#cat-apprendre", label: "Apprendre", Icon: Lightbulb },
  { href: "#cat-comparer", label: "Comparer", Icon: BarChart3 },
  { href: "#cat-outils", label: "Outils", Icon: Wrench },
  { href: "#cat-actu", label: "Actualités", Icon: Newspaper },
  { href: "#cat-informe", label: "Newsletter", Icon: Mail },
];

export default function HomeAnchorNav() {
  const [activeId, setActiveId] = useState<string>(CHIPS[0].href);
  // opacity: 0 initial pour éviter le pill mal positionné au mount
  // (avant useLayoutEffect calcule, le pill était à x:0 w:0 mais opacity 0).
  // Audit user 26/04 : "pill déborde sur le chip Démarrer".
  const [pill, setPill] = useState<{ x: number; w: number; opacity: number; ready: boolean }>({ x: 0, w: 0, opacity: 0, ready: false });
  const trackRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  useEffect(() => {
    const ids = CHIPS.map((c) => c.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const newId = `#${visible[0].target.id}`;
          setActiveId((prev) => (prev !== newId ? newId : prev));
        }
      },
      {
        rootMargin: "-140px 0px -40% 0px",
        threshold: [0, 0.1, 0.5],
      },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Pill slide indicator — recalcule la position quand activeId change OU au resize.
  // Audit user 26/04 : pill ne s'affiche QU'APRÈS le 1er calcul (ready=true) pour
  // éviter le débordement visuel sur le chip "Démarrer" au mount initial.
  useLayoutEffect(() => {
    const computePill = () => {
      const chip = chipRefs.current.get(activeId);
      const track = trackRef.current;
      if (!chip || !track) return;
      const cRect = chip.getBoundingClientRect();
      const tRect = track.getBoundingClientRect();
      setPill({ x: cRect.left - tRect.left, w: cRect.width, opacity: 1, ready: true });
    };
    computePill();
    window.addEventListener("resize", computePill);
    return () => window.removeEventListener("resize", computePill);
  }, [activeId]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const el = document.getElementById(href.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      // Update URL hash sans reload (a11y : permet de partager / bookmarking).
      try {
        history.pushState(null, "", href);
      } catch {
        /* ignore (sandboxed contexts) */
      }
      // Focus la section pour annonce SR (la section doit avoir tabIndex={-1}).
      el.setAttribute("tabindex", "-1");
      (el as HTMLElement).focus({ preventScroll: true });
    }
    setActiveId(href);
  }

  return (
    <nav
      aria-label="Navigation interne de la page"
      className="sticky top-16 z-30 bg-background/95 border-b border-border/60 shadow-[0_4px_16px_-12px_rgba(0,0,0,0.4)]"
    >
      <div className="mx-auto max-w-7xl w-full overflow-x-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={trackRef}
          className="relative flex min-w-max items-center gap-3 py-2.5 snap-x snap-mandatory scrollbar-thin"
        >
          {/* Pill slide indicator (style Linear tabs) — un seul élément qui se
              déplace entre les chips. Spring easeOutBack pour sentiment iOS.
              Audit user 26/04 : ne s'affiche QU'APRÈS calcul initial (ready) pour
              éviter le débordement visuel sur le 1er chip au mount. */}
          {pill.ready && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-0 h-9 -translate-y-1/2 rounded-full bg-gradient-to-b from-primary/20 to-primary/5 ring-1 ring-primary/50 shadow-[inset_0_1px_0_0_rgba(252,211,77,0.25),0_0_24px_-8px_rgba(245,165,36,0.55)]"
              style={{
                width: pill.w,
                opacity: pill.opacity,
                transform: `translateX(${pill.x}px)`,
                transition:
                  "transform 380ms cubic-bezier(0.34, 1.32, 0.64, 1), width 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease",
              }}
            />
          )}

          {CHIPS.map((chip) => {
            const isActive = activeId === chip.href;
            return (
              <a
                key={chip.href}
                ref={(el) => {
                  if (el) chipRefs.current.set(chip.href, el);
                }}
                href={chip.href}
                onClick={(e) => handleClick(e, chip.href)}
                aria-current={isActive ? "true" : undefined}
                style={{ textDecoration: "none" }}
                className={`relative z-10 group inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 min-h-[44px] text-sm font-semibold no-underline hover:no-underline focus:no-underline transition-colors duration-fast snap-start whitespace-nowrap
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
                           ${
                             isActive
                               ? "text-primary-glow"
                               : "text-fg/75 hover:text-fg"
                           }`}
              >
                <chip.Icon
                  className={`h-3.5 w-3.5 transition-transform ${isActive ? "scale-110" : "group-hover:scale-105"}`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {chip.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

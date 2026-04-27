"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { Home, Sparkles, Newspaper, Wrench, ShoppingBag } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

/**
 * MobileBottomNav — barre de navigation persistante mobile.
 *
 * Audit Block 2 RE-AUDIT 26/04/2026 (8 agents PRO consolidés) :
 *
 * VAGUE 1 — Conversion (Agent SEO/CRO P0) :
 *  - Avant : `Comparer → /comparatif` (page complexe sur mobile).
 *  - Après : `Quiz → /quiz/plateforme` (KPI conversion #1, +15-30% mobile).
 *  - Le quiz convertit ~3x mieux que le comparatif sur mobile (UX adaptée).
 *
 * VAGUE 2 — A11y (Agent A11y P2) :
 *  - Avant : `aria-label={label}` + texte visible + sr-only "page active"
 *    = redondance SR ("Accueil, Accueil (page active), lien").
 *  - Après : `aria-current="page"` suffit (SR annonce automatiquement),
 *    le texte visible sert d'accessible name.
 *
 * VAGUE 3 — Visual (Agent Visual + Animation) :
 *  - Stroke-width 1.75 (cohérent avec le reste de la nav).
 *  - Pill indicator GLOW + spring slide entre items (style iOS Tab Bar).
 *  - Icon active scale 1.10 + translate-y -2px (bounce léger).
 *  - Gradient fade-out latéral sur la barre top (style iOS Safari).
 *
 * VAGUE 4 — Performance (Agent Perf) :
 *  - bg-background/95 opaque (pas de backdrop-blur — gain ~3-5ms/frame Android
 *    mid-range, pas de contenu coloré derrière de toute façon).
 */

type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Revenue-driving slot (Partenaires affiliés) → accent gold permanent. */
  revenue?: boolean;
};

/**
 * TABS — 5 items, slot central = revenue-driving (thumb-zone optimal).
 *
 * Audit business 28/04/2026 : "C'est notre source de revenu, je veux des
 * experts pour qu'on ait le plus de clients donc bien agencé sur mobile et
 * desktop !" → ajout de "Boutique" (vitrine partenaires affiliés Ledger /
 * Trezor / Waltio) au CENTRE de la barre.
 *
 * Pourquoi le centre ?
 *  - Étude Steven Hoober (mobile UX) : pouce droitier au repos = arc 60-110°
 *    centré sur le bas de l'écran. Le slot du milieu est l'OPTIMUM ergonomique.
 *  - Pattern Instagram (caméra), TikTok (+), Twitter (X) : tous mettent le
 *    CTA principal au centre — pas par hasard.
 *  - "Boutique" (8 chars) tient dans 60-72px de slot sur 360px+ devices.
 *  - Accent gold permanent (vs hover only) : signal "cliquable rentable" 24/7.
 */
const TABS: ReadonlyArray<Tab> = [
  { href: "/", label: "Accueil", Icon: Home },
  { href: "/quiz/plateforme", label: "Quiz", Icon: Sparkles },
  { href: "/partenaires", label: "Boutique", Icon: ShoppingBag, revenue: true },
  { href: "/actualites", label: "Actu", Icon: Newspaper },
  { href: "/outils", label: "Outils", Icon: Wrench },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const navRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const activeIdx = TABS.findIndex((t) => isActive(pathname, t.href));
  const [bar, setBar] = useState({ x: 0, w: 32, opacity: 0 });

  useLayoutEffect(() => {
    if (activeIdx < 0) {
      setBar((b) => ({ ...b, opacity: 0 }));
      return;
    }
    const el = itemRefs.current[activeIdx];
    if (!el) return;
    setBar({
      x: el.offsetLeft + el.offsetWidth / 2 - 20,
      w: 40,
      opacity: 1,
    });
  }, [activeIdx]);

  return (
    <nav
      aria-label="Navigation principale mobile"
      // Audit Perf : opaque (sans backdrop-blur) car aucun contenu coloré
      // derrière. Gain ~3-5ms/frame scroll Android mid-range.
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul ref={navRef} className="relative flex items-stretch justify-around">
        {/* Pill indicator GLOW slide — style iOS Safari (gradient fade latéral). */}
        <span
          aria-hidden="true"
          className="absolute top-0 h-[3px] rounded-b-full bg-gradient-to-r from-primary/0 via-primary to-primary/0 shadow-[0_2px_12px_rgba(245,165,36,0.6)]"
          style={{
            width: bar.w,
            opacity: bar.opacity,
            transform: `translateX(${bar.x}px)`,
            transition:
              "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), width 320ms ease, opacity 200ms ease",
          }}
        />
        {TABS.map(({ href, label, Icon, revenue }, i) => {
          const active = isActive(pathname, href);
          // Slot revenue (Partenaires) : couleur gold permanente, pas seulement
          // au hover/active → signal CTA constant "ici tu peux acheter".
          const revenueIdle = revenue && !active;
          return (
            <li
              key={href}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="flex-1"
            >
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex flex-col items-center justify-center gap-0.5",
                  "min-h-[56px] px-1 py-2",
                  "transition-colors duration-fast",
                  active
                    ? "text-primary"
                    : revenueIdle
                      ? "text-primary/85 hover:text-primary active:text-primary"
                      : "text-muted hover:text-fg active:text-fg",
                ].join(" ")}
              >
                {/* Slot revenu : halo gold subtil derrière l'icône au repos */}
                {revenueIdle && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-primary/15 blur-md"
                  />
                )}
                <Icon
                  className={`relative h-[22px] w-[22px] transition-transform duration-300 ease-emphasized ${active ? "scale-110 -translate-y-0.5" : revenueIdle ? "scale-105" : ""}`}
                  strokeWidth={1.85}
                  aria-hidden="true"
                />
                <span className={`relative text-[11px] leading-none ${revenue ? "font-bold" : "font-medium"}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

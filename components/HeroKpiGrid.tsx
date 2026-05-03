"use client";

import { Children, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

interface HeroKpiGridProps {
  /** Cellules KPI (KpiCell server components — passées en composition). */
  children: ReactNode;
  className?: string;
}

/**
 * Wrap client pour staggered fade-up des cellules KPI du Hero.
 *
 * Hero.tsx est un server component : on l'appelle via composition pour ne pas
 * casser sa stratégie SSR (les `KpiCell` restent rendues côté serveur). Ce
 * wrapper se contente de mapper sur Children pour ajouter une animation Motion
 * staggered (delay = i * 0.1s) à chaque cellule.
 *
 * BATCH 56#5 (2026-05-03) — FIX React #425 home (BISECTION confirme HERO
 * coupable, audit code identifie HeroKpiGrid).
 *
 * Bug racine : `initial={reduce ? false : { y: 20, opacity: 0 }}` rend
 * differemment selon `useReducedMotion()` :
 * - SSR : useReducedMotion() = null/false (pas de window/matchMedia) ->
 *   initial = { y: 20, opacity: 0 } -> DOM rend style="opacity:0;transform:..."
 * - Client (user avec prefers-reduced-motion: reduce) : useReducedMotion()
 *   = true -> initial = false -> DOM rend SANS style initial
 * = ATTRIBUTE MISMATCH (style differe) -> React #425 -> #422.
 *
 * Fix : `initial` stable indépendant de `reduce`. Pour reduce users, on
 * ajuste UNIQUEMENT `duration: 0` qui fait que le animate state est atteint
 * immediatement (pas de flash perceptible vs sans animation du tout).
 *
 * - prefers-reduced-motion : duration 0 (snap instant a l'animate state).
 */
export default function HeroKpiGrid({ children, className }: HeroKpiGridProps) {
  const reduce = useReducedMotion();
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          // Initial STABLE des 2 cotes (SSR + client) : pas de dependance a
          // useReducedMotion qui differe entre serveur et client.
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={
            reduce
              ? { duration: 0 }
              : {
                  delay: i * 0.1,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }
          }
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

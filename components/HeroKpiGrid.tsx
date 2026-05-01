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
 * - prefers-reduced-motion : duration 0 (pas de fade, contenu visible direct).
 */
export default function HeroKpiGrid({ children, className }: HeroKpiGridProps) {
  const reduce = useReducedMotion();
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={reduce ? false : { y: 20, opacity: 0 }}
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

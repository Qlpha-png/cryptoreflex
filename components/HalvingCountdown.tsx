"use client";

import { useEffect, useState } from "react";

/**
 * HalvingCountdown — compte à rebours JJ / HH / MM / SS jusqu'au halving Bitcoin.
 *
 * Architecture :
 *  - Composant Client : la mécanique d'horloge tourne uniquement après hydration.
 *  - Pour éviter tout mismatch SSR/CSR, on rend "—" en initial state puis on
 *    démarre l'intervalle dans useEffect.
 *  - Respect prefers-reduced-motion : update toutes les minutes au lieu de
 *    chaque seconde (réduit la charge perceptuelle + GPU).
 *
 * Accessibilité :
 *  - role="timer" + aria-live="polite" + aria-atomic="true"
 *  - chiffres en tabular-nums (police mono) pour pas que la largeur sautille.
 */

interface Props {
  /** Date cible — passée depuis le Server en ISO string puis parsed. */
  targetDate: Date;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function computeRemaining(target: Date): Remaining {
  const now = Date.now();
  const total = target.getTime() - now;
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { days, hours, minutes, seconds, total };
}

export default function HalvingCountdown({ targetDate }: Props) {
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Détection prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Tick interval
  useEffect(() => {
    setRemaining(computeRemaining(targetDate));
    const interval = reducedMotion ? 60_000 : 1_000;
    const id = window.setInterval(() => {
      setRemaining(computeRemaining(targetDate));
    }, interval);
    return () => window.clearInterval(id);
  }, [targetDate, reducedMotion]);

  // Date passée → message terminé
  if (remaining && remaining.total <= 0) {
    return (
      <div
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        className="rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center"
      >
        <p className="text-lg font-bold text-fg">
          Halving terminé — voir le suivant
        </p>
        <p className="mt-2 text-sm text-muted">
          Le halving Bitcoin de cette estimation a eu lieu. Page mise à jour
          prochainement avec la prochaine échéance.
        </p>
      </div>
    );
  }

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={
        remaining
          ? `Compte à rebours du prochain halving Bitcoin : ${remaining.days} jours, ${remaining.hours} heures, ${remaining.minutes} minutes, ${remaining.seconds} secondes restantes.`
          : "Initialisation du compte à rebours du prochain halving Bitcoin."
      }
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
    >
      <Cell value={remaining?.days} label="Jours" />
      <Cell value={remaining?.hours} label="Heures" pad={2} />
      <Cell value={remaining?.minutes} label="Minutes" pad={2} />
      <Cell
        value={remaining?.seconds}
        label="Secondes"
        pad={2}
        pulse={!reducedMotion}
      />
    </div>
  );
}

function Cell({
  value,
  label,
  pad = 0,
  pulse = false,
}: {
  value: number | undefined;
  label: string;
  pad?: number;
  pulse?: boolean;
}) {
  const display =
    value === undefined ? "—" : pad ? String(value).padStart(pad, "0") : String(value);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 text-center shadow-e2">
      <div
        className={[
          "font-mono font-extrabold tabular-nums text-fg",
          "text-3xl sm:text-4xl md:text-5xl tracking-tight",
          pulse ? "transition-opacity duration-fast" : "",
        ].join(" ")}
        aria-hidden="true"
      >
        {display}
      </div>
      <div className="mt-1 text-[11px] sm:text-xs uppercase tracking-wider text-muted font-semibold">
        {label}
      </div>
    </div>
  );
}

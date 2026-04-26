"use client";

import { useEffect, useState } from "react";
import { formatRelativeFr } from "@/lib/news-aggregator";

/**
 * NewsRelativeTime — affiche "il y a 12 min" et auto-refresh toutes les 30s.
 *
 * Audit Block 6 RE-AUDIT 26/04/2026 (Agent dynamism + Front #2) :
 *  - Avant : `formatRelativeFr(date)` exécuté côté SSR → label figé pour
 *    toujours, risque hydration mismatch ("il y a 1h" vs "il y a 2h").
 *  - Après : SSR rend l'initial label, client refresh chaque 30s.
 *  - Pause via Page Visibility API (économie batterie mobile).
 *  - prefers-reduced-motion ne désactive pas (juste un texte qui change).
 *
 * Coût : ~1.5 KB JS (chunk séparé via dynamic possible si besoin), 0 IO,
 * 1 setInterval throttled. Acceptable pour un composant info.
 */
export default function NewsRelativeTime({ date }: { date: string }) {
  const [label, setLabel] = useState(() => formatRelativeFr(date) ?? "");

  useEffect(() => {
    const tick = () => setLabel(formatRelativeFr(date) ?? "");
    tick();
    const interval = setInterval(tick, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [date]);

  return (
    <time dateTime={date} className="tabular-nums">
      {label}
    </time>
  );
}

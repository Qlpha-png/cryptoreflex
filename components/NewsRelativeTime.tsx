"use client";

import { useEffect, useState } from "react";
import { formatRelativeFr } from "@/lib/news-aggregator";

/**
 * NewsRelativeTime — affiche "il y a 12 min" et auto-refresh toutes les 30s.
 *
 * BATCH 55 (2026-05-03) — FIX React #425 home (audit live post-BATCH 54).
 *
 * Bug : useState(() => formatRelativeFr(date)) calcule Date.now() au render
 * initial. SSR cache (revalidate 60s) -> label "il y a 5min". Hydration
 * client X secondes plus tard -> label "il y a 6min". React detecte text
 * mismatch -> #425 -> #422.
 *
 * Pattern sentinel (deja applique a LiveAge / useMicaCountdown / useRelativeTime
 * dans BATCH 53 + 54) : label initial "" garanti identique SSR + 1er render
 * client. useEffect tick() remplit la valeur reelle apres montage.
 *
 * Tradeoff UX : flash vide ~16ms a l'hydration. Acceptable car :
 * - Le composant rend dans <time> qui reserve l'espace (tabular-nums)
 * - Pas de CLS car le wrapper a une largeur stable
 * - Mieux qu'une console pleine d'erreurs React
 *
 * Coût : ~1.5 KB JS, 1 setInterval throttled.
 */
export default function NewsRelativeTime({ date }: { date: string }) {
  // Sentinel : "" garanti identique SSR + 1er render client = no mismatch.
  const [label, setLabel] = useState<string>("");

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

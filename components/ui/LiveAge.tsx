"use client";

import { useEffect, useState } from "react";

/**
 * LiveAge — countdown 1s du temps écoulé depuis `since` (ISO timestamp).
 *
 * Affiche "Xs" sous 60s, "Xmin" sous 60min, sinon "Xh".
 * Re-render chaque seconde via setInterval, pause via Page Visibility API
 * (économie batterie + cache sur mobile).
 *
 * Pourquoi (audit Block 1 RE-AUDIT 26/04/2026, Agent dynamism) :
 *  - Remplace un label statique "MAJ 12s" par un compteur qui tourne.
 *  - Preuve visuelle "data temps réel" — analogue au blinking cursor terminal.
 *  - Dynamism +0.8 (estimation agent), ressenti "vivant comme news".
 *
 * Coût : 1 setInterval, ~3 KB JS chunk client. Acceptable pour un islet leaf.
 */
export default function LiveAge({ since }: { since: string }) {
  // BUG FIX 2026-05-03 (BATCH 44e) — `Date.now()` dans useState initializer
  // s'execute server-side (SSR cache) ET client-side (hydration) avec
  // VALEURS DIFFERENTES (timestamp server cache vs timestamp client hydrate).
  // React #425 text-content-mismatch -> #418 hydration crash -> tout le root
  // bascule en client-rendering MAIS Next.js Link onClick reste casse :
  // preventDefault appele mais router.push jamais call -> "clic = rien".
  // Symptome user : aucun lien fonctionne sur la home + fiches crypto
  // (Hero rendu partout). Reproduction confirmee Chrome MCP 03/05/2026.
  //
  // Fix : age=null pendant SSR + 1er render client (placeholder identique
  // serveur+client = match parfait), puis useEffect client-only fait
  // setAge() = re-render avec vrai compteur. 1ere frame = "live", apres
  // ~16ms le compteur prend le relais.
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setAge(Date.now() - new Date(since).getTime());
    tick();
    const interval = setInterval(tick, 1000);
    // Pause when tab is hidden (économie batterie).
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [since]);

  // SSR + 1er render client : placeholder neutre identique des 2 cotes
  // -> hydration parfaite, pas de mismatch React #425.
  if (age === null) return <span>live</span>;

  const s = Math.max(0, Math.floor(age / 1000));
  if (s < 60) return <span>{s}s</span>;
  const m = Math.floor(s / 60);
  if (m < 60) return <span>{m}min</span>;
  const h = Math.floor(m / 60);
  return <span>{h}h</span>;
}

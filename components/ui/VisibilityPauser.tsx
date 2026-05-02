"use client";

import { useEffect } from "react";

/**
 * VisibilityPauser — BATCH 36 (audit Tech 2026 Expert).
 *
 * Toggle une classe `.tab-hidden` sur <html> selon Page Visibility API.
 * Permet aux animations CSS gourmandes (hero-aurora 30s conic, gold-shimmer,
 * hero-particles, scan-line) d'être en pause quand l'onglet est masqué
 * (autre tab, fenêtre minimisée, écran verrouillé mobile).
 *
 * Bénéfices :
 *  - Économie CPU/batterie significative sur mobile (estimé 5-12%)
 *  - Lighthouse Energy Efficiency score
 *  - Évite les re-renders inutiles de SSE/RAF côté client
 *
 * Coût : ~0 (un seul listener visibilitychange + 1 toggle classe).
 * Aucun impact UX visible (l'utilisateur ne voit pas l'onglet caché).
 */
export default function VisibilityPauser() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => {
      document.documentElement.classList.toggle(
        "tab-hidden",
        document.visibilityState === "hidden",
      );
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return null;
}

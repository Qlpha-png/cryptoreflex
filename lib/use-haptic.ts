"use client";

/**
 * lib/use-haptic.ts — Hook minimal pour vibration haptique mobile.
 *
 * Pattern UX 2026-05-02 #18 (audit dynamisme expert) : tout CTA mobile
 * doit donner un feedback haptique discret au tap (8ms = "light",
 * 12ms = "medium", 20ms = "strong"). C'est ce qui fait la différence
 * entre une app "morte" et une app "vivante" sur smartphone.
 *
 * `navigator.vibrate()` est supporté sur 95%+ des Android, partiellement
 * sur iOS Safari (16.4+ via WebKit haptic). Sur les browsers qui ne
 * supportent pas, l'appel est no-op silencieux — aucun risque.
 *
 * Usage :
 *
 *   const haptic = useHaptic();
 *
 *   <button onClick={() => { haptic("light"); doAction(); }}>
 *     Action
 *   </button>
 *
 *   // Ou directement sans hook :
 *   import { triggerHaptic } from "@/lib/use-haptic";
 *   triggerHaptic("medium");
 *
 * Respect des préférences user :
 *  - Si `prefers-reduced-motion: reduce`, on suppose aussi que le user
 *    ne veut pas de feedback sensoriel. On skip.
 *  - Si le browser ne supporte pas `vibrate`, no-op.
 */

export type HapticIntensity = "light" | "medium" | "strong";

const DURATION_MS: Record<HapticIntensity, number> = {
  light: 8,
  medium: 12,
  strong: 20,
};

/** Trigger direct (sans hook). Utile dans les event handlers inline. */
export function triggerHaptic(intensity: HapticIntensity = "light"): void {
  if (typeof window === "undefined") return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  // Respect prefers-reduced-motion (a11y).
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
  } catch {
    // matchMedia indisponible (très vieux browsers) — on continue prudemment.
  }
  try {
    navigator.vibrate(DURATION_MS[intensity]);
  } catch {
    // navigator.vibrate peut throw sur certains browsers strict mode (iframe).
  }
}

/**
 * Hook React qui retourne une fonction trigger stable.
 * Utile dans les composants où l'on veut appeler haptic dans plusieurs
 * handlers sans recréer la closure à chaque render.
 */
export function useHaptic() {
  // Pas besoin de useCallback : la fonction est déjà stable (référence module).
  return triggerHaptic;
}

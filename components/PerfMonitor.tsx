"use client";

/**
 * <PerfMonitor /> — Mesure passive des Core Web Vitals (LCP, INP, CLS, FCP, TTFB).
 *
 * Audit Performance 26-04-2026 — V1 légère :
 *  - Zéro dépendance externe (web-vitals) → pas de bundle penalty.
 *  - PerformanceObserver natif (supporté Chrome / Edge / Safari TP / FF Nightly).
 *  - Envoie les métriques à Plausible si dispo (custom events) ; sinon log.
 *  - Throttlé : un seul send par métrique par session (le plus haut LCP, le
 *    plus haut CLS cumulé, etc.).
 *  - Lazy-monté côté layout via dynamic({ ssr: false }) pour ne pas bloquer
 *    le first paint.
 *
 * Cibles (Core Web Vitals "Good") :
 *  - LCP < 2500 ms
 *  - INP < 200 ms (remplace FID depuis mars 2024)
 *  - CLS < 0.1
 *
 * RGPD : seuls les chiffres sont envoyés (aucun PII), via Plausible (déjà
 * opt-in via le bandeau cookies "Mesure d'audience"). Si Plausible n'est pas
 * encore chargé (refus utilisateur), le composant ne fait rien.
 */

import { useEffect } from "react";

// `window.plausible` est déjà déclaré globalement dans lib/analytics.ts
// (PlausibleEventOptions accepte string | number | boolean). On n'augmente
// pas une seconde fois le type Window pour éviter le clash de signature.

/** Round helper (1 décimale pour CLS, entier pour ms). */
function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function send(name: string, value: number, decimals = 0): void {
  const v = round(value, decimals);
  if (typeof window === "undefined") return;
  if (typeof window.plausible === "function") {
    window.plausible("WebVitals", { props: { metric: name, value: String(v) } });
  } else if (process.env.NODE_ENV !== "production") {
    // En dev seulement : visibilité immédiate sans dépendre de Plausible.
    console.info(`[PerfMonitor] ${name} = ${v}`);
  }
}

export default function PerfMonitor() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof PerformanceObserver === "undefined") return;

    const sentOnce = new Set<string>();

    /* -------------------------- LCP -------------------------- */
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & {
          startTime: number;
        };
        if (!last) return;
        // Le LCP "définitif" est celui à la première interaction utilisateur ;
        // on send sur visibilitychange + beforeunload (cf. plus bas).
        (window as unknown as { __lcp?: number }).__lcp = last.startTime;
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* navigateur trop ancien — silencieux */
    }

    /* -------------------------- CLS -------------------------- */
    let cls = 0;
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!e.hadRecentInput) cls += e.value;
        }
        (window as unknown as { __cls?: number }).__cls = cls;
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {
      /* idem */
    }

    /* -------------------------- INP -------------------------- */
    let worstInp = 0;
    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & { duration: number };
          if (e.duration > worstInp) worstInp = e.duration;
        }
        (window as unknown as { __inp?: number }).__inp = worstInp;
      });
      // `event` regroupe pointer/keyboard/click events ; durationThreshold
      // 40ms est le minimum (filtre le bruit). INP = pire valeur observée.
      inpObserver.observe({
        type: "event",
        buffered: true,
        durationThreshold: 40,
      } as PerformanceObserverInit);
    } catch {
      /* idem */
    }

    /* ----------------- FCP / TTFB (one-shot) ----------------- */
    try {
      const navEntry = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming | undefined;
      if (navEntry && !sentOnce.has("ttfb")) {
        send("ttfb", navEntry.responseStart - navEntry.requestStart);
        sentOnce.add("ttfb");
      }
      const paintEntries = performance.getEntriesByType("paint");
      const fcp = paintEntries.find((p) => p.name === "first-contentful-paint");
      if (fcp && !sentOnce.has("fcp")) {
        send("fcp", fcp.startTime);
        sentOnce.add("fcp");
      }
    } catch {
      /* idem */
    }

    /* ------ Flush LCP / CLS / INP au unload / hide ----- */
    const flush = () => {
      const w = window as unknown as {
        __lcp?: number;
        __cls?: number;
        __inp?: number;
      };
      if (w.__lcp && !sentOnce.has("lcp")) {
        send("lcp", w.__lcp);
        sentOnce.add("lcp");
      }
      if (typeof w.__cls === "number" && !sentOnce.has("cls")) {
        send("cls", w.__cls, 3);
        sentOnce.add("cls");
      }
      if (w.__inp && !sentOnce.has("inp")) {
        send("inp", w.__inp);
        sentOnce.add("inp");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}

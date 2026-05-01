"use client";

/**
 * <WebVitalsReporter /> — Collecte les Core Web Vitals (LCP/CLS/INP/FCP/TTFB)
 * et les envoie à /api/analytics/vitals pour stockage KV + dashboard
 * /admin/vitals.
 *
 * Distinction avec PerfMonitor :
 *  - PerfMonitor : envoie à Plausible (custom event "WebVitals") → vu dans
 *    Plausible Stats. Lecture rapide mais pas d'historique p75 propre.
 *  - WebVitalsReporter : envoie à notre KV → on calcule p75 nous-mêmes,
 *    on a un dashboard custom exploitable par /admin/vitals.
 *
 * Les deux coexistent (5-10 KB JS combiné, négligeable). On peut décommissionner
 * PerfMonitor si le dashboard /admin/vitals devient suffisant.
 *
 * Transport : navigator.sendBeacon prioritaire (survit au unload, queue OS),
 * fallback fetch keepalive si Beacon API indisponible (Safari < 12 etc.).
 *
 * Sampling : 100% pour démarrer (volume site V1 est faible). À ajuster via
 * SAMPLE_RATE si le quota Upstash explose.
 */

import { useReportWebVitals } from "next/web-vitals";

const ENDPOINT = "/api/analytics/vitals";
const SAMPLE_RATE = 1.0;

interface WebVitalMetric {
  name: string;
  value: number;
  id: string;
  rating?: "good" | "needs-improvement" | "poor";
}

function postBeacon(payload: string): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    } catch {
      /* fall back below */
    }
  }
  // Fallback : fetch keepalive (survit au navigation/unload sur la plupart
  // des browsers récents).
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  } catch {
    /* silent — analytics ne doit jamais casser l'UX */
  }
}

export default function WebVitalsReporter(): null {
  useReportWebVitals((metric: WebVitalMetric) => {
    // Sampling client-side avant tout calcul/network.
    if (Math.random() > SAMPLE_RATE) return;

    // Whitelist pour éviter d'envoyer des métriques exotiques (TTFB est
    // déjà dans la whitelist côté serveur, mais Next peut un jour exposer
    // des nouvelles métriques expérimentales qu'on ne veut pas stocker).
    const allowed = ["LCP", "CLS", "INP", "FCP", "TTFB"];
    if (!allowed.includes(metric.name)) return;

    // Rating : Next/web-vitals ne fournit `rating` qu'à partir de v3.
    // On garde un fallback "needs-improvement" si absent (l'agrégation p75
    // côté dashboard reste correcte, le rating du sample brut est secondaire).
    const rating = metric.rating ?? "needs-improvement";

    const payload = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating,
      url:
        typeof window !== "undefined"
          ? window.location.pathname
          : "",
    });

    postBeacon(payload);
  });

  return null;
}

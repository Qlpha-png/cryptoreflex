/**
 * useLivePrices — Hook React pour consommer `/api/prices/stream` (SSE).
 *
 * Pattern :
 *   1. Au mount → ouvre EventSource('/api/prices/stream?ids=...')
 *   2. onmessage → parse JSON, update state (Record par coingeckoId)
 *   3. onerror   → ferme + retry exponentiel (2s → 5s → 15s)
 *   4. Après 3 échecs consécutifs → bascule en mode "fallback" (poll
 *      /api/prices?ids=... toutes les 30s, JSON classique)
 *   5. Cleanup → close EventSource au démontage
 *
 * Pas de dépendance externe. Volontairement résilient :
 *   - `ids.length === 0` → state vide, aucune connexion ouverte.
 *   - SSR-safe : pas de référence à `window` au top-level.
 *   - Page Visibility : on ne ferme PAS la connexion en background
 *     (les events SSE arrivent throttled mais le browser garde la
 *     conn ouverte ; éviter de provoquer un reconnect storm en
 *     revenant rapidement au tab).
 */

"use client";

import { useEffect, useRef, useState } from "react";

export type LivePriceStatus = "connecting" | "live" | "fallback" | "error";

export interface LivePrice {
  price: number;
  change24h: number;
  ts: number;
}

export interface UseLivePricesResult {
  prices: Record<string, LivePrice>;
  status: LivePriceStatus;
  lastUpdate: Date | null;
}

interface SSEPayload {
  id: string;
  price: number;
  change24h: number;
  ts: number;
}

interface RestPayload {
  prices: Array<{
    id: string;
    price: number;
    change24h: number;
  }>;
  updatedAt: string;
}

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000];
const MAX_FAILURES_BEFORE_FALLBACK = 3;
const FALLBACK_POLL_MS = 30_000;

export function useLivePrices(ids: string[]): UseLivePricesResult {
  // On clé le useEffect sur la version normalisée (sorted + joined) pour
  // éviter les reconnects intempestifs si le parent passe un nouveau tableau
  // référentiellement différent mais sémantiquement identique.
  const idsKey = ids.length === 0 ? "" : [...ids].sort().join(",");

  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [status, setStatus] = useState<LivePriceStatus>(
    ids.length === 0 ? "error" : "connecting",
  );
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs pour le cycle de vie (close, retry, fallback timer).
  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureCountRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (idsKey === "") {
      setStatus("error");
      setPrices({});
      setLastUpdate(null);
      return;
    }

    // Garde SSR / Edge cases : EventSource n'existe que dans le browser.
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setStatus("error");
      return;
    }

    cancelledRef.current = false;
    failureCountRef.current = 0;
    setStatus("connecting");

    const url = `/api/prices/stream?ids=${encodeURIComponent(idsKey)}`;

    const cleanupTimers = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    const closeEventSource = () => {
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {
          /* noop */
        }
        esRef.current = null;
      }
    };

    const applyUpdate = (payload: SSEPayload) => {
      setPrices((prev) => {
        const existing = prev[payload.id];
        if (
          existing &&
          existing.price === payload.price &&
          existing.change24h === payload.change24h
        ) {
          return prev; // pas de changement → pas de re-render
        }
        return {
          ...prev,
          [payload.id]: {
            price: payload.price,
            change24h: payload.change24h,
            ts: payload.ts,
          },
        };
      });
      setLastUpdate(new Date());
    };

    const startFallbackPolling = () => {
      if (cancelledRef.current) return;
      setStatus("fallback");

      const pollOnce = async () => {
        try {
          const res = await fetch(`/api/prices?ids=${encodeURIComponent(idsKey)}`, {
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = (await res.json()) as RestPayload;
          if (cancelledRef.current) return;
          if (Array.isArray(data.prices)) {
            const ts = Date.parse(data.updatedAt) || Date.now();
            for (const p of data.prices) {
              applyUpdate({
                id: p.id,
                price: p.price,
                change24h: p.change24h,
                ts,
              });
            }
          }
        } catch {
          /* keep last known state */
        }
      };

      // Tick initial immédiat puis polling régulier.
      void pollOnce();
      fallbackTimerRef.current = setInterval(pollOnce, FALLBACK_POLL_MS);
    };

    const scheduleRetry = () => {
      if (cancelledRef.current) return;
      const attemptIdx = Math.min(
        failureCountRef.current - 1,
        RETRY_DELAYS_MS.length - 1,
      );
      const delay = RETRY_DELAYS_MS[attemptIdx] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      retryTimerRef.current = setTimeout(() => {
        if (cancelledRef.current) return;
        connect();
      }, delay);
    };

    const connect = () => {
      if (cancelledRef.current) return;
      closeEventSource();

      let es: EventSource;
      try {
        es = new EventSource(url);
      } catch {
        failureCountRef.current += 1;
        if (failureCountRef.current >= MAX_FAILURES_BEFORE_FALLBACK) {
          startFallbackPolling();
        } else {
          setStatus("error");
          scheduleRetry();
        }
        return;
      }
      esRef.current = es;

      es.onopen = () => {
        if (cancelledRef.current) return;
        failureCountRef.current = 0;
        setStatus("live");
      };

      es.onmessage = (ev) => {
        if (cancelledRef.current) return;
        if (!ev.data || typeof ev.data !== "string") return;
        try {
          const payload = JSON.parse(ev.data) as SSEPayload;
          if (payload && typeof payload.id === "string" && typeof payload.price === "number") {
            applyUpdate(payload);
          }
        } catch {
          /* ignore malformed event */
        }
      };

      es.onerror = () => {
        if (cancelledRef.current) return;
        // EventSource auto-reconnect par défaut, mais ce comportement est
        // imprévisible (latence variable, pas de cap). On force la reprise
        // manuelle pour avoir le backoff exponentiel sous contrôle.
        closeEventSource();
        failureCountRef.current += 1;
        if (failureCountRef.current >= MAX_FAILURES_BEFORE_FALLBACK) {
          startFallbackPolling();
        } else {
          setStatus("error");
          scheduleRetry();
        }
      };
    };

    connect();

    return () => {
      cancelledRef.current = true;
      cleanupTimers();
      closeEventSource();
    };
  }, [idsKey]);

  return { prices, status, lastUpdate };
}

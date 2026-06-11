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
import { COINGECKO_TO_BINANCE } from "@/lib/binance-mapping";

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
// /api/prices rejette > 50 ids (400 anti-DoS, cf. MAX_IDS route). On cape
// ici pour protéger TOUS les consommateurs : un parent qui passe 60 coins
// (heatmap top 60 du dashboard /marche) reste live sur les 50 plus gros au
// lieu de perdre le live entièrement sur un 400.
const MAX_POLL_IDS = 50;

export function useLivePrices(ids: string[]): UseLivePricesResult {
  // On clé le useEffect sur la version normalisée (sorted + joined) pour
  // éviter les reconnects intempestifs si le parent passe un nouveau tableau
  // référentiellement différent mais sémantiquement identique.
  // NB : on tronque AVANT le sort pour préserver la priorité du parent
  // (les listes arrivent triées par market cap → on garde les plus gros).
  const cappedIds = ids.length > MAX_POLL_IDS ? ids.slice(0, MAX_POLL_IDS) : ids;
  const idsKey = cappedIds.length === 0 ? "" : [...cappedIds].sort().join(",");

  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [status, setStatus] = useState<LivePriceStatus>(
    ids.length === 0 ? "error" : "connecting",
  );
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs pour le cycle de vie (close, retry, fallback timer).
  const esRef = useRef<EventSource | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
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

      // FIX 2026-05-08 — la route /api/prices/stream renvoie un event
      // `disabled` (200 OK + immediate close) quand le SSE est volontairement
      // off. On le detecte pour basculer DIRECT en REST polling sans retry
      // (sinon 3 console errors par audit Lighthouse).
      es.addEventListener("disabled", () => {
        if (cancelledRef.current) return;
        closeEventSource();
        startFallbackPolling();
      });

      es.onmessage = (ev) => {
        if (cancelledRef.current) return;
        if (!ev.data || typeof ev.data !== "string") return;
        try {
          const payload = JSON.parse(ev.data);
          // Cas serveur SSE off : payload `{disabled: true}` → fallback direct.
          if (payload && payload.disabled === true) {
            closeEventSource();
            startFallbackPolling();
            return;
          }
          if (
            payload &&
            typeof payload.id === "string" &&
            typeof payload.price === "number"
          ) {
            applyUpdate(payload as SSEPayload);
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

    /* ------------------------------------------------------------------
     * VOIE 0 (2026-06-12) — WebSocket Binance DIRECT côté navigateur.
     * Binance bloque les IP serveur Vercel mais PAS les clients : le
     * navigateur du visiteur se connecte à wss://stream.binance.com →
     * vrai temps réel tick-par-tick, zéro coût serveur, zéro quota.
     * miniTicker fournit close (c) + open 24h (o) → change24h dérivée.
     * Les ids sans paire Binance (ex. tether ≡ 1 $) gardent leur valeur
     * seed SSR. Si le WS échoue (réseau d'entreprise, extension), on
     * retombe sur la chaîne existante SSE → poll REST, inchangée.
     * ------------------------------------------------------------------ */
    const symbolToId = new Map<string, string>();
    for (const id of cappedIds) {
      const sym = COINGECKO_TO_BINANCE[id];
      if (sym) symbolToId.set(sym, id);
    }

    const startBinanceWs = (): boolean => {
      if (typeof WebSocket === "undefined" || symbolToId.size === 0) {
        return false;
      }
      try {
        const streams = [...symbolToId.keys()]
          .map((s) => `${s.toLowerCase()}@miniTicker`)
          .join("/");
        // Port 443 standard (PAS :9443) : le 9443 est filtré par beaucoup
        // de pare-feux/réseaux (constaté au contrôle local), et la CSP
        // wss://stream.binance.com ne couvre que le port par défaut.
        const ws = new WebSocket(
          `wss://stream.binance.com/stream?streams=${streams}`,
        );
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelledRef.current) return;
          setStatus("live");
        };
        ws.onmessage = (ev) => {
          if (cancelledRef.current) return;
          try {
            const msg = JSON.parse(ev.data as string) as {
              data?: { s?: string; c?: string; o?: string; E?: number };
            };
            const d = msg.data;
            const id = d?.s ? symbolToId.get(d.s) : undefined;
            if (!id || !d?.c || !d?.o) return;
            const price = parseFloat(d.c);
            const open = parseFloat(d.o);
            if (!Number.isFinite(price) || !Number.isFinite(open) || open <= 0) {
              return;
            }
            applyUpdate({
              id,
              price,
              change24h: ((price - open) / open) * 100,
              ts: d.E ?? Date.now(),
            });
          } catch {
            /* message malformé : on ignore */
          }
        };
        const failover = () => {
          if (cancelledRef.current) return;
          wsRef.current = null;
          // WS indisponible → chaîne historique (SSE désactivé → poll REST)
          connect();
        };
        ws.onerror = failover;
        ws.onclose = (ev) => {
          // Fermeture propre par nous (cleanup) → cancelledRef coupe tout.
          if (!cancelledRef.current && wsRef.current === ws) failover();
        };
        return true;
      } catch {
        wsRef.current = null;
        return false;
      }
    };

    if (!startBinanceWs()) {
      connect();
    }

    return () => {
      cancelledRef.current = true;
      cleanupTimers();
      closeEventSource();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* noop */
        }
        wsRef.current = null;
      }
    };
  }, [idsKey]);

  return { prices, status, lastUpdate };
}

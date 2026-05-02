"use client";

import { useEffect, useState } from "react";

/**
 * MiniOrderBook — Order book miniature live "trading desk" (innovation 2026).
 *
 * Affiche les 5 meilleurs bids (vert) et 5 meilleurs asks (rouge) d'une paire
 * Binance Spot, sous forme de barres horizontales dont la longueur reflète
 * le volume. Refresh toutes les 5s via REST `/api/v3/depth`.
 *
 * Pourquoi pas WebSocket ?
 *  - Le WS Binance est puissant mais coûte une connexion permanente par
 *    visiteur, ce qui scale mal sur prod (limite WS Binance + pollue les
 *    Vercel logs).
 *  - REST polling 5s = compromis raisonnable : une requête CDN-cached côté
 *    Binance, pas de connexion stateful, retry simple.
 *  - V2 (sprint suivant) : passer en WS via un endpoint serveur SSE qui fan-out
 *    les ticks à tous les visiteurs depuis 1 seul WS partagé.
 *
 * Différenciant FR :
 *  - Cryptoast affiche un bouton "Voir sur Binance" mais aucun order book live.
 *  - Coin Academy / Journal du Coin : zéro données on-chain ou trading temps réel.
 *  - Cryptoreflex = première fiche crypto FR avec ressenti "trading terminal".
 *
 * a11y :
 *  - role="region" + aria-label
 *  - Tous les chiffres utilisent tabular-nums + aria-live="polite" sur le total
 *
 * Performance :
 *  - Fetch annulé via AbortController au unmount.
 *  - Skip refresh si onglet inactif (Page Visibility API).
 *  - Skeleton loader 80px height = aucun CLS.
 */

interface Order {
  /** Prix en USDT */
  price: number;
  /** Quantité (token) */
  qty: number;
}

interface MiniOrderBookProps {
  /** Symbol du token (BTC, ETH, SOL…). Sera mappé vers paire BinanceUSDT. */
  symbol: string;
  /** Nombre d'ordres affichés de chaque côté (bids/asks). Default 5. */
  depth?: number;
  /** Intervalle refresh en ms. Default 5000 (5s). */
  refreshMs?: number;
}

export default function MiniOrderBook({
  symbol,
  depth = 5,
  refreshMs = 5000,
}: MiniOrderBookProps) {
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  useEffect(() => {
    const pair = `${symbol.toUpperCase()}USDT`;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let aborter: AbortController | null = null;

    const fetchDepth = async () => {
      // Skip si onglet inactif (économie batterie/data)
      if (typeof document !== "undefined" && document.hidden) return;

      aborter?.abort();
      aborter = new AbortController();

      try {
        // BATCH 20 — passe par notre proxy /api/binance/depth (cache edge
        // 3s + SWR 15s) au lieu d'attaquer Binance direct. Économise CSP
        // pollution + rate-limit upstream + 90% cache hit edge.
        const res = await fetch(
          `/api/binance/depth?symbol=${symbol.toUpperCase()}&limit=${depth}`,
          { signal: aborter.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { bids: [string, string][]; asks: [string, string][] } = await res.json();
        if (cancelled) return;
        setBids(
          data.bids.slice(0, depth).map(([p, q]) => ({ price: +p, qty: +q })),
        );
        setAsks(
          data.asks.slice(0, depth).map(([p, q]) => ({ price: +p, qty: +q })),
        );
        setError(null);
        setLastUpdate(Date.now());
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (cancelled) return;
        // Si Binance ne supporte pas la paire (ex: token français exotique)
        // on n'affiche rien plutôt qu'un message d'erreur.
        setError("unsupported");
      }
    };

    const startInterval = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(fetchDepth, refreshMs);
    };
    const stopInterval = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // BATCH 19 perf P1 #3 — Page Visibility API : pause TOTAL de l'interval
    // quand l'onglet devient invisible (vs juste skip dans fetchDepth).
    // Économie de l'event-loop overhead du setInterval inactif.
    const handleVisibility = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        // À la reprise de l'onglet : refresh immédiat puis remet l'interval.
        fetchDepth();
        startInterval();
      }
    };

    fetchDepth();
    startInterval();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      cancelled = true;
      stopInterval();
      aborter?.abort();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [symbol, depth, refreshMs]);

  // Si la paire n'existe pas sur Binance, on ne render rien (pas d'erreur visible).
  if (error === "unsupported") return null;

  // Skeleton pendant le 1er fetch
  // BATCH 19 a11y — motion-safe:animate-pulse (au lieu de animate-pulse seul)
  // pour respecter prefers-reduced-motion (le bloc CSS reduced-motion ne
  // neutralise pas spécifiquement la classe Tailwind animate-pulse).
  if (bids.length === 0 && asks.length === 0) {
    return (
      <div
        role="region"
        aria-label="Carnet d'ordres en chargement"
        className="rounded-xl border border-border bg-elevated/40 p-3 h-[112px] motion-safe:animate-pulse"
        style={{ minHeight: 112 }}
      >
        <div className="text-[10px] uppercase tracking-wider text-muted font-bold">
          Carnet d&apos;ordres · chargement
        </div>
      </div>
    );
  }

  // Calcul du volume max pour normaliser la longueur des barres (échelle commune)
  const maxQty = Math.max(
    ...bids.map((b) => b.qty),
    ...asks.map((a) => a.qty),
    1,
  );

  // Mid-price : moyenne entre meilleur bid et meilleur ask (référence)
  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const midPrice = (bestBid + bestAsk) / 2;
  const spreadPct = midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 100 : 0;

  const formatPrice = (p: number) =>
    p.toLocaleString("fr-FR", {
      minimumFractionDigits: p < 10 ? 4 : 2,
      maximumFractionDigits: p < 10 ? 6 : 2,
    });

  return (
    <div
      role="region"
      aria-label={`Carnet d'ordres ${symbol.toUpperCase()}/USDT en temps réel`}
      className="rounded-xl border border-border bg-elevated/40 p-3 font-mono text-[11px]"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[10px] uppercase tracking-wider text-muted font-bold flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" aria-hidden />
          Carnet d&apos;ordres · Binance
        </div>
        <div
          className="text-[10px] text-muted tabular-nums"
          aria-live="polite"
        >
          spread {spreadPct.toFixed(3)} %
        </div>
      </div>

      {/* BATCH 20 a11y WCAG 1.3.1 — vraie structure tabulaire <table>.
          NVDA/JAWS annoncent désormais "Tableau, ligne 1 de 5" + navigation
          tableau native (Ctrl+Alt+Flèches). aria-live="off" sur tbody car
          les bids/asks changent toutes les 5s (trop bruyant pour SR) ; le
          spread reste annoncé via aria-live="polite" en haut. */}
      <table
        className="w-full border-collapse text-[11px] tabular-nums"
        aria-live="off"
      >
        <caption className="sr-only">
          Top {depth} bids et asks {symbol.toUpperCase()}/USDT, mis à jour
          toutes les {Math.round(refreshMs / 1000)} secondes
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Quantité bid</th>
            <th scope="col">Prix bid</th>
            <th scope="col">Prix ask</th>
            <th scope="col">Quantité ask</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: depth }).map((_, i) => {
            const b = bids[i];
            const a = asks[i];
            const bWidthPct = b ? (b.qty / maxQty) * 100 : 0;
            const aWidthPct = a ? (a.qty / maxQty) * 100 : 0;
            return (
              <tr key={i} className="h-4">
                {/* Bid qty */}
                <td className="relative w-[24%] px-1">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-success/15 transition-all duration-500 ease-out"
                    style={{ width: `${bWidthPct}%` }}
                    aria-hidden="true"
                  />
                  <span className="relative text-success">
                    {b ? b.qty.toFixed(b.qty < 1 ? 4 : 2) : ""}
                  </span>
                </td>
                {/* Bid price */}
                <td className="relative w-[26%] px-1 text-right">
                  <span className="relative text-success">
                    {b ? formatPrice(b.price) : ""}
                  </span>
                </td>
                {/* Ask price */}
                <td className="relative w-[26%] px-1">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-danger/15 transition-all duration-500 ease-out"
                    style={{ width: `${aWidthPct}%` }}
                    aria-hidden="true"
                  />
                  <span className="relative text-danger">
                    {a ? formatPrice(a.price) : ""}
                  </span>
                </td>
                {/* Ask qty */}
                <td className="relative w-[24%] px-1 text-right">
                  <span className="relative text-danger">
                    {a ? a.qty.toFixed(a.qty < 1 ? 4 : 2) : ""}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mid-price footer */}
      <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
        <span className="text-[9px] text-muted uppercase tracking-wider">
          Mid-price
        </span>
        <span className="text-[12px] font-bold text-fg tabular-nums">
          {formatPrice(midPrice)} USDT
        </span>
      </div>
    </div>
  );
}

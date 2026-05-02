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
        const res = await fetch(
          `https://api.binance.com/api/v3/depth?symbol=${pair}&limit=${depth}`,
          { signal: aborter.signal, cache: "no-store" },
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

    fetchDepth();
    intervalId = setInterval(fetchDepth, refreshMs);

    return () => {
      cancelled = true;
      if (intervalId !== null) clearInterval(intervalId);
      aborter?.abort();
    };
  }, [symbol, depth, refreshMs]);

  // Si la paire n'existe pas sur Binance, on ne render rien (pas d'erreur visible).
  if (error === "unsupported") return null;

  // Skeleton pendant le 1er fetch
  if (bids.length === 0 && asks.length === 0) {
    return (
      <div
        role="region"
        aria-label="Carnet d'ordres en chargement"
        className="rounded-xl border border-border bg-elevated/40 p-3 h-[112px] animate-pulse"
        style={{ minHeight: 112 }}
      >
        <div className="text-[10px] uppercase tracking-wider text-muted font-bold">
          Carnet d&apos;ordres ·  chargement
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

      <div className="grid grid-cols-2 gap-1">
        {/* Bids (vert) — gauche */}
        <div className="space-y-0.5">
          {bids.map((b, i) => {
            const widthPct = (b.qty / maxQty) * 100;
            return (
              <div key={i} className="relative h-4">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-success/15 transition-all duration-500 ease-out"
                  style={{ width: `${widthPct}%` }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between px-1 h-full">
                  <span className="text-success tabular-nums">
                    {b.qty.toFixed(b.qty < 1 ? 4 : 2)}
                  </span>
                  <span className="text-success tabular-nums">
                    {formatPrice(b.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Asks (rouge) — droite */}
        <div className="space-y-0.5">
          {asks.map((a, i) => {
            const widthPct = (a.qty / maxQty) * 100;
            return (
              <div key={i} className="relative h-4">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-danger/15 transition-all duration-500 ease-out"
                  style={{ width: `${widthPct}%` }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between px-1 h-full">
                  <span className="text-danger tabular-nums">
                    {formatPrice(a.price)}
                  </span>
                  <span className="text-danger tabular-nums">
                    {a.qty.toFixed(a.qty < 1 ? 4 : 2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

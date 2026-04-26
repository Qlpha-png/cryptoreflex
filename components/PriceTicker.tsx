"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { type CoinPrice, formatPct, formatUsd } from "@/lib/coingecko";
import CryptoLogo from "@/components/ui/CryptoLogo";

interface Props {
  initial: CoinPrice[];
}

const REFRESH_MS = 120_000; // 120 s : ménage l'API CoinGecko (50 calls/min free tier).

/**
 * Auto-scrolling price ticker. Hydrate avec les données serveur, puis
 * refresh toutes les 120 s via /api/prices — uniquement quand l'onglet
 * est visible (économie batterie + quotas API).
 *
 * Audit Block 1 RE-AUDIT 26/04/2026 (Agent A11y P0) :
 *  - WCAG 2.2.2 Pause/Stop/Hide : ajout d'un bouton pause visible + pause au
 *    hover (CSS .animate-ticker-scroll:hover) + pause au touchstart mobile.
 *  - WCAG 2.5.8 Target Size : tap target 44×44 (min-h-tap min-w-tap).
 *  - aria-pressed sur le toggle, aria-label clair.
 */
export default function PriceTicker({ initial }: Props) {
  const [prices, setPrices] = useState<CoinPrice[]>(initial);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const tick = async () => {
      try {
        const ac = new AbortController();
        const timeout = setTimeout(() => ac.abort(), 4000);
        const res = await fetch("/api/prices", { cache: "no-store", signal: ac.signal });
        clearTimeout(timeout);
        if (!res.ok) return;
        const data = (await res.json()) as { prices: CoinPrice[] };
        if (!cancelledRef.current && data.prices?.length) {
          setPrices(data.prices);
        }
      } catch {
        /* keep previous data */
      }
    };

    const start = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(tick, REFRESH_MS);
    };
    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Refresh immédiat au retour, puis reprise du polling.
        tick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") {
      start();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelledRef.current = true;
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Duplicate the list for a seamless infinite scroll loop.
  const loop = [...prices, ...prices];

  return (
    <div
      role="region"
      aria-label="Prix des cryptomonnaies en direct"
      className="relative overflow-hidden border-y border-border/60 bg-surface/60 backdrop-blur group/ticker"
    >
      {/*
        aria-live="off" : on coupe les annonces continues du ticker (scroll
        infini → spam pour les lecteurs d'écran). Les utilisateurs AT pourront
        consulter les prix précis dans MarketTable juste en dessous.

        Audit Block 1 RE-AUDIT (A11y P0) : pause au hover/focus-within + pause
        manuelle via bouton — conforme WCAG 2.2.2 Pause/Stop/Hide.
      */}
      <div
        aria-live="off"
        aria-atomic="false"
        className={`flex animate-ticker-scroll whitespace-nowrap py-3 ${paused ? "[animation-play-state:paused]" : ""} group-hover/ticker:[animation-play-state:paused] group-focus-within/ticker:[animation-play-state:paused]`}
      >
        {loop.map((coin, idx) => {
          const up = coin.change24h >= 0;
          return (
            <div
              key={`${coin.id}-${idx}`}
              className="flex items-center gap-3 px-8 border-r border-border/40 last:border-r-0"
            >
              <CryptoLogo
                symbol={coin.symbol}
                coingeckoId={coin.id}
                imageUrl={coin.image}
                size={24}
              />
              <span className="font-semibold text-white/90">{coin.symbol}</span>
              <span className="font-mono text-white">{formatUsd(coin.price)}</span>
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium ${
                  up ? "text-accent-green" : "text-accent-rose"
                }`}
              >
                {up ? (
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="sr-only">
                  {up ? "Hausse de" : "Baisse de"}
                </span>
                {formatPct(coin.change24h)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Edge fade for polish */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />

      {/* Bouton Pause/Play — WCAG 2.2.2. Tap target 44×44 (min-h-tap min-w-tap).
          z-10 pour passer au-dessus des edge fades. */}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? "Reprendre le défilement des prix" : "Mettre en pause le défilement des prix"}
        className="absolute top-1/2 right-2 -translate-y-1/2 z-10 inline-flex items-center justify-center min-h-tap min-w-tap rounded-full bg-elevated/90 text-fg/80 hover:text-fg border border-border/60 hover:border-primary/40 transition-colors backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {paused ? (
          <Play className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Pause className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

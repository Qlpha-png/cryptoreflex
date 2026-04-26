"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
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
 */
export default function PriceTicker({ initial }: Props) {
  const [prices, setPrices] = useState<CoinPrice[]>(initial);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/prices", { cache: "no-store" });
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

    // Démarrage : poll seulement si l'onglet est visible à l'init.
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
      className="relative overflow-hidden border-y border-border/60 bg-surface/60 backdrop-blur"
    >
      {/*
        aria-live="off" : on coupe les annonces continues du ticker (scroll
        infini → spam pour les lecteurs d'écran). Les utilisateurs AT pourront
        consulter les prix précis dans MarketTable juste en dessous.
      */}
      <div
        aria-live="off"
        aria-atomic="false"
        className="flex animate-ticker-scroll whitespace-nowrap py-3"
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
    </div>
  );
}

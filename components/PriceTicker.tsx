"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type CoinPrice, formatPct, formatUsd } from "@/lib/coingecko";

interface Props {
  initial: CoinPrice[];
}

/**
 * Auto-scrolling price ticker. Hydrates with server-fetched data,
 * then refreshes every 60s from /api/prices to stay live.
 */
export default function PriceTicker({ initial }: Props) {
  const [prices, setPrices] = useState<CoinPrice[]>(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/prices", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { prices: CoinPrice[] };
        if (!cancelled && data.prices?.length) setPrices(data.prices);
      } catch {
        /* keep previous data */
      }
    };

    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Duplicate the list for a seamless infinite scroll loop.
  const loop = [...prices, ...prices];

  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-surface/60 backdrop-blur">
      <div className="flex animate-ticker-scroll whitespace-nowrap py-3">
        {loop.map((coin, idx) => {
          const up = coin.change24h >= 0;
          return (
            <div
              key={`${coin.id}-${idx}`}
              className="flex items-center gap-3 px-8 border-r border-border/40 last:border-r-0"
            >
              {coin.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coin.image}
                  alt={coin.name}
                  className="h-6 w-6 rounded-full"
                  loading="lazy"
                />
              ) : (
                <span className="h-6 w-6 rounded-full bg-elevated" />
              )}
              <span className="font-semibold text-white/90">{coin.symbol}</span>
              <span className="font-mono text-white">{formatUsd(coin.price)}</span>
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium ${
                  up ? "text-accent-green" : "text-accent-rose"
                }`}
              >
                {up ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
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

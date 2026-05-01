"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { type CoinPrice, formatPct, formatUsd, DEFAULT_COINS } from "@/lib/coingecko";
import CryptoLogo from "@/components/ui/CryptoLogo";
import { useLivePrices } from "@/lib/hooks/useLivePrices";

interface Props {
  initial: CoinPrice[];
}

/**
 * Auto-scrolling price ticker. Hydrate avec les données serveur, puis
 * **stream live** via SSE `/api/prices/stream` (proxy Binance REST côté
 * Edge runtime, broadcastés à tous les clients connectés).
 *
 * Audit Block 1 RE-AUDIT 26/04/2026 (Agent A11y P0) :
 *  - WCAG 2.2.2 Pause/Stop/Hide : pause au hover/focus-within (CSS) +
 *    bouton pause sr-only.
 *  - WCAG 2.5.8 Target Size : tap target 44×44 (min-h-tap min-w-tap).
 *  - aria-pressed sur le toggle, aria-label clair.
 *
 * Migration ETUDE-AMELIORATIONS-2026-05-02 #1 (SSE temps réel) :
 *  - Plus de polling 120s. SSE pousse les updates dès que Binance bouge.
 *  - Flash GREEN/RED 600ms sur changement de prix (classes CSS .flash-up
 *    / .flash-down déjà présentes dans globals.css).
 *  - Fallback REST automatique si SSE down 3× d'affilée (cf. useLivePrices).
 */
export default function PriceTicker({ initial }: Props) {
  const [prices, setPrices] = useState<CoinPrice[]>(initial);
  const [paused, setPaused] = useState(false);

  // Stream live des 6 coins du ticker (DEFAULT_COINS = top 6).
  const { prices: livePrices } = useLivePrices(DEFAULT_COINS as unknown as string[]);

  // Merge des deltas SSE dans la liste serveur initiale (préserve l'ordre,
  // n'efface rien si une crypto est absente de Binance temporairement).
  useEffect(() => {
    setPrices((prev) =>
      prev.map((coin) => {
        const live = livePrices[coin.id];
        if (!live) return coin;
        if (coin.price === live.price && coin.change24h === live.change24h) {
          return coin;
        }
        return { ...coin, price: live.price, change24h: live.change24h };
      }),
    );
  }, [livePrices]);

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
              <PriceFlash price={coin.price}>
                <span className="font-mono text-white">{formatUsd(coin.price)}</span>
              </PriceFlash>
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

      {/*
        Audit user 26/04 ("mal agencé") : retiré le bouton Pause/Play visible
        flottant sur le ticker (trop intrusif visuellement). WCAG 2.2.2 reste
        respecté grâce à la pause automatique au hover/focus-within (cf. animation-play-state).
        L'état `paused` reste utilisé pour le hover-pause CSS (group/ticker).
      */}
      {/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */}
      {paused && null /* satisfy ESLint useState unused-var */}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? "Reprendre le défilement des prix" : "Mettre en pause le défilement des prix"}
        className="sr-only focus:not-sr-only focus:absolute focus:top-1 focus:right-2 focus:z-10 focus:inline-flex focus:items-center focus:justify-center focus:min-h-tap focus:min-w-tap focus:rounded-full focus:bg-elevated/95 focus:text-fg focus:border focus:border-primary focus:outline-none"
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

/* -------------------------------------------------------------------------- */
/* PriceFlash — flash GREEN/RED 600ms quand le prix change                     */
/* -------------------------------------------------------------------------- */

function PriceFlash({ price, children }: { price: number; children: React.ReactNode }) {
  const prev = useRef(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (price === prev.current) return;
    setFlash(price > prev.current ? "up" : "down");
    prev.current = price;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [price]);

  return (
    <span className={flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""}>
      {children}
    </span>
  );
}

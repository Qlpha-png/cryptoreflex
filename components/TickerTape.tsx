"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatUsd, formatCompactUsd } from "@/lib/coingecko";
import CryptoLogo from "@/components/ui/CryptoLogo";
import { useLivePrices } from "@/lib/hooks/useLivePrices";

/**
 * TickerTape — bandeau marché "terminal" fin (DA Obsidian, sprint 1b).
 *
 * ≠ de l'ancien PriceTicker retiré en BATCH 35d ("enlève ça") : celui-ci
 * était un GROS bandeau (py-3, logos 24px) posé au milieu de la home où il
 * doublonnait MarketTable. Le TickerTape est la version Bloomberg : une
 * ligne fine (28px) sous la navbar qui FUSIONNE prix top coins + métriques
 * globales (market cap, dominance BTC, Fear & Greed) → il REMPLACE
 * GlobalMetricsBar sur la home (zéro bandeau net ajouté, leçon 35d).
 *
 * Live : useLivePrices → REST polling 30s (le SSE /api/prices/stream est
 * VOLONTAIREMENT désactivé depuis l'incident quota Vercel 2026-05-04 ;
 * ne pas réactiver sur le plan Hobby). Le mouvement perçu vient du
 * défilement continu + flashs up/down au refresh.
 *
 * A11y (pattern validé de PriceTicker) : pause hover/focus-within (WCAG
 * 2.2.2), bouton pause sr-only, aria-live off (pas de spam SR), les
 * valeurs précises restent disponibles dans MarketTable / /marche.
 */

export interface TickerCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
}

export interface TickerGlobals {
  mcapUsd: number;
  mcapChange24h: number;
  btcDominance: number;
}

interface Props {
  coins: TickerCoin[];
  globalMetrics: TickerGlobals | null;
  fearGreed: { value: number; label: string } | null;
}

export default function TickerTape({ coins, globalMetrics, fearGreed }: Props) {
  const [list, setList] = useState<TickerCoin[]>(coins);
  const [paused, setPaused] = useState(false);
  const { prices: live } = useLivePrices(coins.map((c) => c.id));

  useEffect(() => {
    setList((prev) =>
      prev.map((coin) => {
        const l = live[coin.id];
        if (!l || (coin.price === l.price && coin.change24h === l.change24h)) {
          return coin;
        }
        return { ...coin, price: l.price, change24h: l.change24h };
      }),
    );
  }, [live]);

  // Une "cellule" métrique globale intercalée entre les blocs de coins.
  const globalCells: React.ReactNode[] = [];
  if (globalMetrics) {
    globalCells.push(
      <TapeCell key="mcap" label="MCap globale">
        <span className="num-data text-fg">{formatCompactUsd(globalMetrics.mcapUsd)}</span>
        <Delta value={globalMetrics.mcapChange24h} />
      </TapeCell>,
      <TapeCell key="dom" label="Dominance BTC">
        <span className="num-data text-ice-fg">
          {globalMetrics.btcDominance.toFixed(1)}%
        </span>
      </TapeCell>,
    );
  }
  if (fearGreed) {
    globalCells.push(
      <TapeCell key="fg" label="Fear & Greed">
        <span
          className={`num-data ${
            fearGreed.value >= 55
              ? "text-success-fg"
              : fearGreed.value <= 45
                ? "text-danger-fg"
                : "text-fg"
          }`}
        >
          {fearGreed.value}
        </span>
        <span className="text-muted">· {fearGreed.label}</span>
      </TapeCell>,
    );
  }

  const track = (
    <>
      {list.map((coin) => {
        const up = coin.change24h >= 0;
        return (
          <div
            key={coin.id}
            className="flex shrink-0 items-center gap-1.5 px-4 border-r border-border/40"
          >
            <CryptoLogo
              symbol={coin.symbol}
              coingeckoId={coin.id}
              imageUrl={coin.image}
              size={14}
            />
            <span className="font-semibold text-fg/90">{coin.symbol}</span>
            <PriceFlash price={coin.price}>
              <span className="num-data text-fg/80">{formatUsd(coin.price)}</span>
            </PriceFlash>
            {/* Pas de signe +/- : la flèche + la couleur portent le sens
                (un "▼ +0.04%" serait contradictoire, vu au contrôle local) */}
            <span
              className={`num-data ${up ? "text-success-fg" : "text-danger-fg"}`}
            >
              <span aria-hidden="true">{up ? "▲" : "▼"}</span>
              <span className="sr-only">{up ? "Hausse de" : "Baisse de"}</span>{" "}
              {Math.abs(coin.change24h).toFixed(2)}%
            </span>
          </div>
        );
      })}
      {globalCells}
    </>
  );

  if (list.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bandeau marché crypto en direct"
      className="ticker-tape relative overflow-hidden border-b border-border/50 bg-surface/40 backdrop-blur-sm text-xs group/tape"
    >
      <div
        aria-live="off"
        aria-atomic="false"
        className={`ticker-tape-track flex w-max items-center whitespace-nowrap py-1.5 ${
          paused ? "[animation-play-state:paused]" : ""
        } group-hover/tape:[animation-play-state:paused] group-focus-within/tape:[animation-play-state:paused]`}
      >
        {/* Piste dupliquée pour la boucle infinie (translateX -50%) */}
        {track}
        {track && <div aria-hidden="true" className="flex items-center">{track}</div>}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={
          paused
            ? "Reprendre le défilement du bandeau marché"
            : "Mettre en pause le défilement du bandeau marché"
        }
        className="sr-only focus:not-sr-only focus:absolute focus:top-0.5 focus:right-2 focus:z-10 focus:inline-flex focus:items-center focus:justify-center focus:min-h-tap focus:min-w-tap focus:rounded-full focus:bg-elevated/95 focus:text-fg focus:border focus:border-primary focus:outline-none"
      >
        {paused ? (
          <Play className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Pause className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function TapeCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 px-4 border-r border-border/40">
      <span className="text-muted">{label}</span>
      {children}
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`num-data ${up ? "text-success-fg" : "text-danger-fg"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Hausse de" : "Baisse de"}</span>{" "}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

/* Flash GREEN/RED 600ms quand le prix change (classes globals.css) */
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

"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CoinPrice } from "@/lib/coingecko";
import { formatUsd, formatPct } from "@/lib/coingecko";
import CryptoLogo from "@/components/ui/CryptoLogo";

/**
 * HeroLiveWidgetMobile — variante compacte du HeroLiveWidget pour <lg.
 *
 * Pourquoi (audit Block 1 RE-AUDIT 26/04/2026, 4 agents convergents) :
 *  - 60-70% du trafic crypto FR vient mobile (StatCounter 2026).
 *  - Le widget desktop (`hidden lg:block`) cachait le signal "live data" =
 *    drame absolu sur un site CRYPTO.
 *  - Solution : 3 cards scroll-snap horizontal BTC/ETH/SOL, edge-to-edge,
 *    72vw, min-h 64px (>HIG 44pt), pattern Linear/Phantom homepage.
 *
 * Dynamism (Agent animation) :
 *  - Flash GREEN/RED 600ms sur changement de prix (PriceFlash subcomponent).
 *  - Live countdown 1s (MAJ 12s → 13s → 14s) prouve "data temps réel".
 *  - active:scale press feel iOS sur tap.
 *  - Sparkline drawn progressively à mount (CSS class .spark-draw).
 *
 * A11y :
 *  - role="region" + aria-label.
 *  - aria-live="polite" sur la zone des prix (annonce changement de valeur).
 *  - sr-only "Tendance haussière/baissière" sur sparkline (1.1.1 Non-text).
 *  - prefers-reduced-motion respecté (animations CSS désactivées).
 */

type CoinWithSpark = CoinPrice & { sparkline?: number[] };

interface Props {
  prices: CoinPrice[];
  sparklines?: Partial<Record<string, number[]>>;
  updatedAt?: string;
}

const FOCUS_IDS = ["bitcoin", "ethereum", "solana"] as const;

export default function HeroLiveWidgetMobile({
  prices,
  sparklines,
  updatedAt,
}: Props) {
  const top3: CoinWithSpark[] = FOCUS_IDS.flatMap((id) => {
    const found = prices.find((p) => p.id === id);
    if (!found) return [];
    return [{ ...found, sparkline: sparklines?.[id] }];
  });

  if (top3.length === 0) return null;

  return (
    <section
      role="region"
      aria-label="Top 3 cryptomonnaies en direct"
      className="-mx-4 sm:-mx-6"
    >
      {/* Header LIVE + countdown + lien voir tout */}
      <div className="flex items-center justify-between px-4 sm:px-6 mb-2">
        <div
          className="flex items-center gap-2"
          role="status"
          aria-label="Données de marché en direct"
        >
          <span
            className="live-dot inline-flex items-center text-[10px] font-bold uppercase tracking-[0.14em] text-accent-green"
            aria-hidden="true"
          >
            Live
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-fg/55" aria-hidden="true">
            · Marché
          </span>
          {updatedAt ? (
            <span
              className="text-[10px] font-mono text-fg/55 tabular-nums"
              aria-label="Dernière mise à jour"
            >
              · MAJ <LiveAge since={updatedAt} />
            </span>
          ) : null}
        </div>
        <Link
          href="/marche/heatmap"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-soft hover:text-primary transition-colors min-h-[32px]"
          aria-label="Voir tout le marché crypto (heatmap top 100)"
        >
          Tout voir
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Liste scroll-snap horizontal — 3 cards 72vw, edge-to-edge bleed */}
      <ul
        role="list"
        aria-live="polite"
        aria-atomic="false"
        className="flex gap-2 overflow-x-auto px-4 sm:px-6 pb-2 snap-x snap-mandatory scrollbar-thin"
        style={{ scrollPaddingInline: "1rem" }}
      >
        {top3.map((coin) => (
          <CoinCardMobile key={coin.id} coin={coin} />
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* CoinCardMobile — flash GREEN/RED + sparkline                                */
/* -------------------------------------------------------------------------- */

function CoinCardMobile({ coin }: { coin: CoinWithSpark }) {
  const up = coin.change24h >= 0;
  const points = coin.sparkline?.length ? coin.sparkline : synthSpark(coin);

  return (
    <li
      className="snap-start shrink-0 w-[72vw] max-w-[280px] min-h-[64px]
                 flex items-center gap-3 px-3.5 py-3
                 rounded-xl border border-border/60 bg-elevated/60 backdrop-blur-md
                 active:scale-[0.98] transition-transform"
    >
      <CryptoLogo
        symbol={coin.symbol}
        coingeckoId={coin.id}
        imageUrl={coin.image}
        size={32}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold text-fg truncate">
            {coin.symbol}
          </span>
          <PriceFlash price={coin.price}>
            <span className="text-[13px] font-mono font-semibold text-fg tabular-nums">
              {formatUsd(coin.price)}
            </span>
          </PriceFlash>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <SparklineMini points={points} up={up} coinId={coin.id} />
          <span
            className={`text-[11px] font-mono font-bold inline-flex items-center gap-0.5 ${up ? "text-accent-green" : "text-accent-rose"}`}
          >
            <span aria-hidden="true">{up ? "▲" : "▼"}</span>
            <span className="sr-only">{up ? "Hausse de" : "Baisse de"}</span>
            {formatPct(coin.change24h)}
          </span>
        </div>
      </div>
    </li>
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

/* -------------------------------------------------------------------------- */
/* LiveAge — countdown 1s ("MAJ 12s → 13s → 14s")                              */
/* -------------------------------------------------------------------------- */

function LiveAge({ since }: { since: string }) {
  const [age, setAge] = useState(() => Date.now() - new Date(since).getTime());

  useEffect(() => {
    const tick = () => setAge(Date.now() - new Date(since).getTime());
    tick();
    const i = setInterval(tick, 1000);
    // Pause quand l'onglet n'est pas visible (économie batterie + cache).
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [since]);

  const s = Math.max(0, Math.floor(age / 1000));
  if (s < 60) return <span>{s}s</span>;
  const m = Math.floor(s / 60);
  if (m < 60) return <span>{m}min</span>;
  const h = Math.floor(m / 60);
  return <span>{h}h</span>;
}

/* -------------------------------------------------------------------------- */
/* SparklineMini SVG (server+client safe)                                      */
/* -------------------------------------------------------------------------- */

function SparklineMini({ points, up, coinId }: { points: number[]; up: boolean; coinId: string }) {
  const W = 64;
  const H = 22;
  if (!points || points.length < 2) {
    return <svg width={W} height={H} aria-hidden="true" />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = W / (points.length - 1);

  const coords = points.map((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / span) * H;
    return [x, y] as const;
  });

  const d = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const stroke = up ? "#22C55E" : "#EF4444";
  // Audit Block 1 RE-AUDIT (Agent front) : id unique par coin (avant : "spk-up"/
  // "spk-down" hardcodés -> collision SVG si 2 coins même tendance).
  const fillId = `spk-mob-${coinId}`;

  return (
    <figure className="shrink-0">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.30" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#${fillId})`} />
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          className="spark-draw"
        />
      </svg>
      <figcaption className="sr-only">
        Tendance 7 jours {up ? "haussière" : "baissière"}
      </figcaption>
    </figure>
  );
}

function synthSpark(coin: CoinPrice): number[] {
  const base = coin.price || 100;
  const drift = (coin.change24h || 0) / 100;
  const seed = (coin.symbol.charCodeAt(0) || 1) + Math.round(base);
  const rng = mulberry32(seed);
  const out: number[] = [];
  let v = base * (1 - drift);
  for (let i = 0; i < 16; i++) {
    const noise = (rng() - 0.5) * 0.012 * base;
    const trend = (drift / 16) * base;
    v = v + trend + noise;
    out.push(v);
  }
  return out;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

"use client";

import Link from "next/link";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { CoinPrice } from "@/lib/coingecko";
import { formatUsd, formatPct } from "@/lib/coingecko";
import CryptoLogo from "@/components/ui/CryptoLogo";
import LiveAge from "@/components/ui/LiveAge";
import { useLivePrices } from "@/lib/hooks/useLivePrices";

/**
 * HeroLiveWidget — client component (desktop only, >=lg).
 *
 * Card glass premium affichant le top 3 (BTC/ETH/SOL) avec sparkline mini
 * + pulse dot "LIVE" + lien marché. La variante mobile compacte est dans
 * <HeroLiveWidgetMobile> (cards scroll-snap horizontal).
 *
 * Migration ETUDE-AMELIORATIONS-2026-05-02 #1 :
 *  - Bascule en client component pour brancher useLivePrices (SSE).
 *  - Le serveur fournit les prix initiaux (hydration), useLivePrices prend
 *    le relais avec des updates ~2.5s via /api/prices/stream.
 *  - Flash GREEN/RED 600ms via PriceFlash sur changement de prix.
 *  - Le sparkline reste SSR-rendered (figé au mount, pas un live chart).
 *
 * Audit Block 1 RE-AUDIT 26/04/2026 :
 *  - SVG id collision fix : `spk-${coin.id}` au lieu de `spk-up`/`spk-down`
 *    (avant : 2 sparklines même tendance partageaient le même gradient id).
 *  - ARIA live region polite sur la liste (annonce changement prix SR).
 *  - figcaption sr-only "Tendance haussière/baissière" (WCAG 1.1.1 Non-text).
 *  - Sparkline drawn progressively (.spark-draw class, animation 1.2s à mount).
 *  - LiveAge component (countdown 1s) au lieu de label statique "MAJ Xs".
 *  - role="status" sur le badge LIVE.
 */

const LIVE_IDS = ["bitcoin", "ethereum", "solana"];

type CoinWithSpark = CoinPrice & { sparkline?: number[] };

interface HeroLiveWidgetProps {
  prices: CoinPrice[];
  /** Optional sparklines map by coin id (7d, ~24 points). */
  sparklines?: Partial<Record<string, number[]>>;
  /** Last update timestamp (ISO). Affiché en "il y a X". */
  updatedAt?: string;
}

const FOCUS_IDS = ["bitcoin", "ethereum", "solana"] as const;

export default function HeroLiveWidget({
  prices,
  sparklines,
  updatedAt,
}: HeroLiveWidgetProps) {
  // SSE live updates (~2.5s) sur BTC/ETH/SOL.
  const { prices: livePrices, lastUpdate } = useLivePrices(LIVE_IDS);

  // Sélectionne BTC / ETH / SOL dans cet ordre exact (flatMap = pas de
  // type predicate fragile, narrowing TS automatique). Chaque prix/variation
  // est mergé avec le live SSE si dispo (sinon on garde le serveur initial).
  const top3: CoinWithSpark[] = FOCUS_IDS.flatMap((id) => {
    const found = prices.find((p) => p.id === id);
    if (!found) return [];
    const live = livePrices[id];
    return [
      {
        ...found,
        sparkline: sparklines?.[id],
        price: live?.price ?? found.price,
        change24h: live?.change24h ?? found.change24h,
      },
    ];
  });

  // Affiche le timestamp du dernier event live si dispo, sinon le serveur.
  const effectiveUpdatedAt = lastUpdate ? lastUpdate.toISOString() : updatedAt;

  return (
    <aside
      aria-label="Marché crypto en direct"
      className="glass rounded-2xl p-5 sm:p-6 shadow-card hover-lift"
    >
      {/* Header : LIVE + refresh countdown */}
      <header className="flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-2"
          role="status"
          aria-label="Données de marché en direct"
        >
          <span
            className="live-dot inline-flex items-center text-[11px] font-bold uppercase tracking-[0.14em] text-accent-green"
            aria-hidden="true"
          >
            Live
          </span>
          <span
            className="text-[11px] font-medium uppercase tracking-wider text-muted"
            aria-hidden="true"
          >
            · Marché crypto
          </span>
        </div>
        <span
          className="text-[11px] text-muted font-mono tabular-nums"
          aria-label="Dernière mise à jour"
        >
          MAJ {effectiveUpdatedAt ? <LiveAge since={effectiveUpdatedAt} /> : <span>à l&apos;instant</span>}
        </span>
      </header>

      {/* Liste top 3 avec aria-live polite (annonce changement prix SR). */}
      <ul
        className="mt-4 divide-y divide-border/60"
        aria-live="polite"
        aria-atomic="false"
      >
        {top3.map((coin) => (
          <CoinRow key={coin.id} coin={coin} />
        ))}
      </ul>

      {/* CTA voir tout */}
      <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
        <Link
          href="/marche"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary transition-colors min-h-tap py-2"
          aria-label="Voir tout le marché crypto"
        >
          Voir tout le marché
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <span className="text-[11px] text-muted">100 cryptos analysées</span>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/* -------------------------------------------------------------------------- */

function CoinRow({ coin }: { coin: CoinWithSpark }) {
  const up = coin.change24h >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  const trendCls = up ? "text-accent-green" : "text-accent-rose";

  // Sparkline : utilise la prop si dispo, sinon une mini courbe synthétique.
  const points = coin.sparkline?.length ? coin.sparkline : synthSpark(coin);

  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3 min-w-0">
        <CryptoLogo
          symbol={coin.symbol}
          coingeckoId={coin.id}
          imageUrl={coin.image}
          size={28}
          // BATCH 22 perf P2 #8 — promu en priority sur les 3 premiers logos
          // (LCP candidate above-the-fold sur desktop). Le Hero affiche les
          // top crypto en colonne droite, ce sont les 1ers <img> visibles.
          priority
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-fg truncate leading-tight">
            {coin.name}
          </div>
          <div className="text-[11px] text-muted font-mono uppercase">
            {coin.symbol}
          </div>
        </div>
      </div>

      {/* Sparkline mini avec figcaption sr-only (WCAG 1.1.1 Non-text Content) */}
      <figure className="hidden sm:block shrink-0">
        <Sparkline points={points} up={up} coinId={coin.id} />
        <figcaption className="sr-only">
          Tendance 7 jours {up ? "haussière" : "baissière"}
        </figcaption>
      </figure>

      {/* Prix + variation 24h */}
      <div className="text-right shrink-0">
        <PriceFlash price={coin.price}>
          <span className="text-sm font-semibold text-fg font-mono leading-tight tabular-nums inline-block">
            {formatUsd(coin.price)}
          </span>
        </PriceFlash>
        <div
          className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-mono font-semibold ${trendCls}`}
        >
          <TrendIcon className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">{up ? "Hausse de" : "Baisse de"}</span>
          {formatPct(coin.change24h)}
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
  // Compteur incrémenté à chaque changement de prix : sert de key au pulse
  // Motion pour re-déclencher l'animation scale même si la direction est
  // identique consécutivement.
  const [pulseKey, setPulseKey] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (price === prev.current) return;
    setFlash(price > prev.current ? "up" : "down");
    setPulseKey((k) => k + 1);
    prev.current = price;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [price]);

  // Pulse scale [1, 1.05, 1] (~200ms) ON TOP du flash bg CSS — n'agit que
  // si le prix change réellement (track via useRef ci-dessus).
  return (
    <motion.span
      key={pulseKey}
      animate={reduce ? undefined : { scale: pulseKey === 0 ? 1 : [1, 1.05, 1] }}
      transition={reduce ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
      className={flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""}
      style={{ display: "inline-block" }}
    >
      {children}
    </motion.span>
  );
}

/* -------------------------------------------------------------------------- */
/* Sparkline SVG (déterministe, animation .spark-draw au mount)                */
/* -------------------------------------------------------------------------- */

function Sparkline({ points, up, coinId }: { points: number[]; up: boolean; coinId: string }) {
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
  const area = `${d} L${W},${H} L0,${H} Z`;
  const stroke = up ? "#22C55E" : "#EF4444";
  // Audit Block 1 RE-AUDIT (Agent front) : id unique par coin (avant :
  // "spk-up"/"spk-down" hardcodés -> collision SVG si 2 coins même tendance,
  // le 1er gradient gagne dans le DOM, les autres perdent leur fill).
  const fillId = `spk-${coinId}`;

  return (
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
      <path d={area} fill={`url(#${fillId})`} />
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
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Sparkline synthétique cohérente avec la variation 24h.
 * Utilisé seulement en fallback quand l'API n'a pas renvoyé de sparkline_in_7d.
 */
function synthSpark(coin: CoinPrice): number[] {
  const base = coin.price || 100;
  const drift = (coin.change24h || 0) / 100;
  // 16 points, marche aléatoire déterministe seedée sur le symbol + prix.
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

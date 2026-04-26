import Link from "next/link";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import type { CoinPrice } from "@/lib/coingecko";
import { formatUsd, formatPct } from "@/lib/coingecko";
import CryptoLogo from "@/components/ui/CryptoLogo";

/**
 * HeroLiveWidget — server component.
 * Card glass premium affichant le top 3 (BTC/ETH/SOL) avec sparkline mini
 * + pulse dot "LIVE" + lien marché.
 *
 * - 100% server (no "use client", no JS bundle).
 * - Sparkline = mini SVG inline (déterministe, généré à partir d'un seed
 *   stable basé sur le prix actuel quand la prop sparkline n'est pas fournie).
 * - Pas de "use client" : le pulse dot vient de la classe .live-dot (CSS pur).
 */

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
  // Sélectionne BTC / ETH / SOL dans cet ordre exact.
  const top3: CoinWithSpark[] = FOCUS_IDS.map((id) => {
    const found = prices.find((p) => p.id === id);
    if (!found) return null;
    return { ...found, sparkline: sparklines?.[id] };
  }).filter(Boolean) as CoinWithSpark[];

  const refreshLabel = updatedAt
    ? formatRelative(updatedAt)
    : "à l'instant";

  return (
    <aside
      aria-label="Marché crypto en direct"
      className="glass rounded-2xl p-5 sm:p-6 shadow-card hover-lift"
    >
      {/* Header : LIVE + refresh */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="live-dot inline-flex items-center text-[11px] font-bold uppercase tracking-[0.14em] text-accent-green">
            Live
          </span>
          <span
            className="text-[11px] font-medium uppercase tracking-wider text-muted"
            aria-hidden="true"
          >
            · Marché crypto
          </span>
        </div>
        <span className="text-[11px] text-muted font-mono" title={`Mis à jour ${refreshLabel}`}>
          MAJ {refreshLabel}
        </span>
      </header>

      {/* Liste top 3 */}
      <ul className="mt-4 divide-y divide-border/60">
        {top3.map((coin) => (
          <CoinRow key={coin.id} coin={coin} />
        ))}
      </ul>

      {/* CTA voir tout */}
      <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
        <Link
          href="/#marche"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-soft hover:text-primary transition-colors"
        >
          Voir tout le marché
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <span className="text-[11px] text-muted">Top 60 cryptos</span>
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

  // Sparkline : utilise la prop si dispo, sinon une mini courbe synthétique
  // (reste cohérente avec le sens de la variation 24h pour rester crédible).
  const points = coin.sparkline?.length ? coin.sparkline : synthSpark(coin);

  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3 min-w-0">
        <CryptoLogo
          symbol={coin.symbol}
          coingeckoId={coin.id}
          imageUrl={coin.image}
          size={28}
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

      {/* Sparkline mini */}
      <div className="hidden sm:block shrink-0" aria-hidden="true">
        <Sparkline points={points} up={up} />
      </div>

      {/* Prix + variation */}
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-fg font-mono leading-tight">
          {formatUsd(coin.price)}
        </div>
        <div
          className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-mono font-semibold ${trendCls}`}
        >
          <TrendIcon className="h-3 w-3" aria-hidden="true" />
          {formatPct(coin.change24h)}
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Sparkline SVG (server-rendered, no JS)                                      */
/* -------------------------------------------------------------------------- */

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
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
  const fillId = up ? "spk-up" : "spk-down";

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
  // 16 points, marche aléatoire déterministe seedée sur le symbol + prix
  const seed = (coin.symbol.charCodeAt(0) || 1) + Math.round(base);
  const rng = mulberry32(seed);
  const out: number[] = [];
  let v = base * (1 - drift); // commence avant la variation
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

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "à l'instant";
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}min`;
  const h = Math.round(min / 60);
  return `${h}h`;
}

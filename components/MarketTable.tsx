import { ArrowDownRight, ArrowUpRight, Star } from "lucide-react";
import {
  fetchTopMarket,
  formatCompactUsd,
  formatPct,
  formatUsd,
  type MarketCoin,
} from "@/lib/coingecko";

/**
 * Tableau "marché" style CoinMarketCap : top N cryptos par market cap
 * avec prix, variation 1h/24h/7j, market cap, volume, sparkline.
 *
 * Server component + ISR 2 min (les prix bougent vite mais pas la composition top 20).
 */
export default async function MarketTable({ limit = 20 }: { limit?: number }) {
  const coins = await fetchTopMarket(limit);

  if (!coins.length) {
    return (
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-muted text-sm">Données marché temporairement indisponibles.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="marche" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <span className="badge-info">Marché en direct</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Top {limit} <span className="gradient-text">cryptomonnaies</span>
            </h2>
            <p className="mt-2 text-sm text-muted">
              Capitalisation, volume, variations en temps réel via CoinGecko. Mis à jour toutes les 2 min.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium">Crypto</th>
                  <th className="text-right px-4 py-3 font-medium">Prix</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">1h</th>
                  <th className="text-right px-4 py-3 font-medium">24h</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">7j</th>
                  <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Market Cap</th>
                  <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Volume 24h</th>
                  <th className="text-center px-2 py-3 font-medium hidden xl:table-cell w-32">7 jours</th>
                </tr>
              </thead>
              <tbody>
                {coins.map((coin) => (
                  <CoinRow key={coin.id} coin={coin} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted text-right">
          Données : <a href="https://www.coingecko.com" className="hover:text-fg underline">CoinGecko</a>
        </p>
      </div>
    </section>
  );
}

function CoinRow({ coin }: { coin: MarketCoin }) {
  return (
    <tr className="border-t border-border hover:bg-elevated/50 transition-colors">
      <td className="px-4 py-3 text-muted font-mono text-xs">{coin.marketCapRank}</td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coin.image} alt={coin.name} className="h-7 w-7 rounded-full shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-fg truncate">{coin.name}</div>
            <div className="text-xs text-muted font-mono uppercase">{coin.symbol}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-right font-mono font-semibold text-fg">
        {formatUsd(coin.currentPrice)}
      </td>

      <td className="px-4 py-3 text-right hidden sm:table-cell">
        <PctCell value={coin.priceChange1h} />
      </td>

      <td className="px-4 py-3 text-right">
        <PctCell value={coin.priceChange24h} />
      </td>

      <td className="px-4 py-3 text-right hidden md:table-cell">
        <PctCell value={coin.priceChange7d} />
      </td>

      <td className="px-4 py-3 text-right font-mono text-muted hidden lg:table-cell">
        {formatCompactUsd(coin.marketCap)}
      </td>

      <td className="px-4 py-3 text-right font-mono text-muted hidden lg:table-cell">
        {formatCompactUsd(coin.totalVolume)}
      </td>

      <td className="px-2 py-3 hidden xl:table-cell">
        <Sparkline points={coin.sparkline7d} positive={(coin.priceChange7d ?? 0) >= 0} />
      </td>
    </tr>
  );
}

function PctCell({ value }: { value: number | null }) {
  if (value === null || value === undefined)
    return <span className="text-muted text-xs">—</span>;
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold ${
        up ? "text-accent-green" : "text-accent-rose"
      }`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {formatPct(value)}
    </span>
  );
}

/**
 * Sparkline SVG ultra-léger (pas de lib externe).
 * Trace les 168 points de prix 7j en une polyline normalisée.
 */
function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  if (!points || points.length < 2) return null;
  const w = 100;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(2)},${(h - ((p - min) / range) * h).toFixed(2)}`)
    .join(" ");
  const stroke = positive ? "#22C55E" : "#EF4444";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block" aria-hidden="true">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

import Link from "next/link";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import {
  fetchGlobalMetrics,
  fetchFearGreed,
  formatCompactUsd,
  formatPct,
} from "@/lib/coingecko";

/**
 * Bandeau métriques globales du marché crypto.
 * Inspiré CoinMarketCap home : market cap total, volume 24h, dominance BTC/ETH, Fear & Greed.
 * Server component avec ISR 5 min (les métriques globales bougent peu).
 */
export default async function GlobalMetricsBar() {
  const [metrics, fearGreed] = await Promise.all([
    fetchGlobalMetrics(),
    fetchFearGreed(),
  ]);

  if (!metrics) return null;

  const up = metrics.marketCapChange24h >= 0;

  const fearColor =
    !fearGreed
      ? "text-muted"
      : fearGreed.value <= 25
      ? "text-accent-rose"
      : fearGreed.value <= 45
      ? "text-amber-400"
      : fearGreed.value <= 55
      ? "text-muted"
      : fearGreed.value <= 75
      ? "text-accent-green"
      : "text-emerald-400";

  return (
    <div className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <Metric label="Market Cap">
            <span className="font-mono text-fg font-semibold">
              {formatCompactUsd(metrics.totalMarketCapUsd)}
            </span>
            <span
              className={`ml-1 inline-flex items-center gap-0.5 ${
                up ? "text-accent-green" : "text-accent-rose"
              }`}
            >
              {up ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatPct(metrics.marketCapChange24h)}
            </span>
          </Metric>

          <Metric label="Volume 24h">
            <span className="font-mono text-fg font-semibold">
              {formatCompactUsd(metrics.totalVolume24hUsd)}
            </span>
          </Metric>

          <Metric label="Dominance BTC">
            <span className="font-mono text-fg font-semibold">
              {metrics.btcDominance.toFixed(1)}%
            </span>
          </Metric>

          <Metric label="Dominance ETH">
            <span className="font-mono text-fg font-semibold">
              {metrics.ethDominance.toFixed(1)}%
            </span>
          </Metric>

          <Metric label="Cryptos actives">
            <span className="font-mono text-fg font-semibold">
              {metrics.activeCryptos.toLocaleString("fr-FR")}
            </span>
          </Metric>

          {fearGreed && (
            <Metric label="Fear & Greed">
              <Link
                href="/marche/fear-greed"
                className={`font-mono font-semibold ${fearColor} inline-flex items-center gap-1 rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
                aria-label={`Fear and Greed Index ${fearGreed.value} sur 100, ${fearGreed.classification}, voir la page détaillée`}
              >
                <Activity className="h-3 w-3 live-pulse" />
                <span className="live-pulse">{fearGreed.value}/100</span>
                <span className="text-muted font-normal">· {fearGreed.classification}</span>
                {/* BATCH 29C — delta vs hier (signal momentum sentiment).
                    Coloration locale au delta (pas à la valeur absolue). */}
                {fearGreed.deltaVsYesterday !== null && fearGreed.deltaVsYesterday !== undefined && fearGreed.deltaVsYesterday !== 0 && (
                  <span
                    className={`ml-1 text-[10px] font-mono font-bold ${
                      fearGreed.deltaVsYesterday > 0 ? "text-accent-green" : "text-accent-rose"
                    }`}
                    aria-label={`${fearGreed.deltaVsYesterday > 0 ? "Hausse" : "Baisse"} de ${Math.abs(fearGreed.deltaVsYesterday)} points par rapport à hier`}
                  >
                    {fearGreed.deltaVsYesterday > 0 ? "+" : ""}
                    {fearGreed.deltaVsYesterday} vs hier
                  </span>
                )}
                <span className="text-muted font-normal text-[10px] ml-1">voir détail →</span>
              </Link>
            </Metric>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-muted">{label}</span>
      <span>{children}</span>
    </div>
  );
}

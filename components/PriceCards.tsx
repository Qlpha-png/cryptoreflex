import Image from "next/image";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type CoinPrice, formatPct, formatUsd } from "@/lib/coingecko";

interface Props {
  prices: CoinPrice[];
}

/**
 * Larger cards for the hero / featured coins (BTC, ETH, SOL).
 * Layout: header row (icon + name) → price → footer row (% + market cap).
 */
export default function PriceCards({ prices }: Props) {
  const featured = prices.filter((p) =>
    ["bitcoin", "ethereum", "solana"].includes(p.id)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {featured.map((coin) => {
        const up = coin.change24h >= 0;
        return (
          <div
            key={coin.id}
            className="glass glow-border rounded-2xl p-5 hover:translate-y-[-2px] transition-transform"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              {coin.image ? (
                <Image
                  src={coin.image}
                  alt={coin.name}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full"
                  // Hero / above-the-fold : pas de lazy.
                  priority
                  sizes="36px"
                  unoptimized
                />
              ) : (
                <span className="h-9 w-9 rounded-full bg-elevated" />
              )}
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">{coin.name}</div>
                <div className="text-xs text-muted font-mono">{coin.symbol}/USD</div>
              </div>
            </div>

            {/* Price */}
            <div className="mt-4 font-mono text-2xl font-bold text-white tracking-tight">
              {formatUsd(coin.price)}
            </div>

            {/* Footer: % change + market cap */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-1 ${
                  up
                    ? "bg-accent-green/10 text-accent-green"
                    : "bg-accent-rose/10 text-accent-rose"
                }`}
              >
                {up ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {formatPct(coin.change24h)}
              </span>
              <span className="text-[11px] text-muted whitespace-nowrap">
                MC {compactUsd(coin.marketCap)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function compactUsd(value: number): string {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);
}

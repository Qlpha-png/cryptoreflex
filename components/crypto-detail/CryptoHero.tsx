import { TrendingUp, TrendingDown } from "lucide-react";
import Sparkline from "./Sparkline";
import { formatPct, formatUsd, type CoinDetail } from "@/lib/coingecko";
import WatchlistButton from "@/components/WatchlistButton";
import CryptoLogo from "@/components/ui/CryptoLogo";
import { getCategoryTheme } from "@/lib/category-theme";
import AnimatedStat from "./AnimatedStat";

interface Props {
  name: string;
  symbol: string;
  category: string;
  tagline: string;
  yearCreated: number;
  detail: CoinDetail | null;
  /** Optionnel : badge "TOP 10" / "HIDDEN GEM" affiché en haut à gauche. */
  kindLabel?: string;
  /**
   * ID CoinGecko (= ID watchlist) — passé par la page parente. Si absent,
   * le bouton watchlist n'est pas rendu (ex: route preview / canary).
   */
  cryptoId?: string;
}

/**
 * Hero d'une fiche crypto :
 * logo + nom + ticker + prix temps réel + variation 24h + sparkline 7j.
 * Server Component — données déjà fetch côté page parente via fetchCoinDetail().
 */
export default function CryptoHero({
  name,
  symbol,
  category,
  tagline,
  yearCreated,
  detail,
  kindLabel,
  cryptoId,
}: Props) {
  const price = detail?.currentPrice ?? 0;
  const change24h = detail?.priceChange24h ?? 0;
  const positive = change24h >= 0;
  const positive7d = (detail?.priceChange7d ?? 0) >= 0;
  const theme = getCategoryTheme(category);

  return (
    <header className="grid gap-8 lg:grid-cols-[1fr_auto] items-start">
      <div>
        {kindLabel && (
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{
              borderColor: `${theme.accent}55`,
              backgroundColor: theme.accentSoft,
              color: theme.accent,
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: theme.accent }}
              aria-hidden="true"
            />
            {kindLabel}
            <span className="text-muted/80 normal-case font-normal">· {theme.label}</span>
          </span>
        )}
        <div className="mt-3 flex items-center gap-4">
          <CryptoLogo
            symbol={symbol}
            coingeckoId={cryptoId}
            imageUrl={detail?.image}
            size={64}
            shape="rounded"
            className="ring-1 ring-border"
            alt={`Logo ${name}`}
            priority
          />
          <div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight flex items-center gap-3 flex-wrap">
              <span>
                {name}{" "}
                <span className="font-mono text-2xl text-muted">{symbol}</span>
              </span>
              {cryptoId && (
                <WatchlistButton
                  cryptoId={cryptoId}
                  cryptoName={name}
                  size="md"
                />
              )}
            </h1>
            <p className="mt-1 text-xs text-muted">
              {category} · Lancée en {yearCreated}
              {detail?.marketCapRank ? ` · Rang #${detail.marketCapRank} mondial` : ""}
            </p>
          </div>
        </div>

        {/* Séparateur gradient hérité du thème de catégorie */}
        <div
          aria-hidden="true"
          className="mt-4 h-[2px] w-24 rounded-full"
          style={{ backgroundImage: theme.gradient }}
        />

        <p className="mt-5 text-lg text-fg/85 italic max-w-2xl">{tagline}</p>

        {/* Prix temps réel */}
        <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Prix actuel</div>
            <div className="mt-1 font-mono text-3xl sm:text-4xl font-bold text-fg tabular-nums">
              {price > 0 ? (
                <AnimatedStat
                  value={price}
                  format="usd"
                  duration={1100}
                />
              ) : (
                formatUsd(price)
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold ${
                positive
                  ? "bg-accent-green/10 text-accent-green border border-accent-green/30"
                  : "bg-accent-rose/10 text-accent-rose border border-accent-rose/30"
              }`}
            >
              {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {formatPct(change24h)} <span className="opacity-70">24h</span>
            </span>
            {detail?.priceChange7d !== null && detail?.priceChange7d !== undefined && (
              <span className="text-xs text-muted">
                7j :{" "}
                <span className={positive7d ? "text-accent-green" : "text-accent-rose"}>
                  {formatPct(detail.priceChange7d)}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sparkline 7j */}
      <div className="rounded-2xl border border-border bg-surface p-4 min-w-[260px]">
        <div className="text-xs uppercase tracking-wider text-muted mb-2">7 derniers jours</div>
        <Sparkline points={detail?.sparkline7d ?? []} positive={positive7d} width={240} height={70} />
        <p className="mt-2 text-[11px] text-muted">
          Données CoinGecko — mises à jour toutes les 5 minutes.
        </p>
      </div>
    </header>
  );
}

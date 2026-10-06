import CryptoLogo from "@/components/ui/CryptoLogo";
import Link from "next/link";
import { cryptoPagePath } from "@/lib/crypto-page-slug";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { MarketCoin } from "@/lib/coingecko";
import { formatPct } from "@/lib/coingecko";

/**
 * 06/10/2026 — prix en chiffres significatifs, LOCAL à ce composant :
 * formatCompactUsd arrondissait les petites cryptos à « 0 $ », formatUsd
 * sort jusqu'à 8 décimales (« 0,00629335 $ »). Ici : 0,0498 $ · 0,006293 $.
 */
function formatPrice(value: number): string {
  if (!value || !Number.isFinite(value)) return "—";
  const opts: Intl.NumberFormatOptions =
    value >= 1000
      ? { maximumFractionDigits: 0 }
      : value >= 1
        ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        : { maximumSignificantDigits: 4 };
  return `${value.toLocaleString("fr-FR", opts)} $`;
}

interface Props {
  /** Liste pré-triée (gainers desc ou losers asc). */
  coins: MarketCoin[];
  /** "gainers" → vert, "losers" → rouge. Affecte la couleur du badge. */
  variant: "gainers" | "losers";
  /** Titre de la colonne (H2). */
  title: string;
  /** Slugs des cryptos disposant d'une fiche éditoriale interne. */
  internalSlugs?: string[];
}

/**
 * GainerLoserList — Server Component, liste verticale des top gainers ou losers.
 *
 * Affichage compact : 1 ligne par crypto avec avatar + symbol + nom + prix +
 * variation 24h (badge gros vert ou rouge selon variant).
 *
 * Si la crypto a une fiche interne (présente dans `internalSlugs`), on
 * enveloppe la ligne dans un Link → /cryptos/[slug]. Sinon ligne statique
 * (pas de lien externe vers CoinGecko pour éviter de dégrader le PageRank).
 */
export default function GainerLoserList({
  coins,
  variant,
  title,
  internalSlugs = [],
}: Props) {
  const isGainers = variant === "gainers";
  const Icon = isGainers ? TrendingUp : TrendingDown;
  const tone = isGainers
    ? {
        ring: "border-accent-green/30",
        bg: "bg-accent-green/5",
        text: "text-accent-green",
        badgeBg: "bg-accent-green/15",
      }
    : {
        ring: "border-accent-rose/30",
        bg: "bg-accent-rose/5",
        text: "text-danger-fg",
        badgeBg: "bg-accent-rose/15",
      };

  return (
    <section
      className={`rounded-2xl border ${tone.ring} ${tone.bg} p-4 sm:p-6`}
      aria-label={title}
    >
      <header className="flex items-center gap-2 mb-4">
        <Icon className={`h-5 w-5 ${tone.text}`} aria-hidden="true" />
        <h2 className={`text-lg sm:text-xl font-bold ${tone.text}`}>{title}</h2>
      </header>

      {coins.length === 0 ? (
        <p className="text-sm text-muted">Aucune donnée disponible pour le moment.</p>
      ) : (
        <ol className="space-y-2">
          {coins.map((c, idx) => {
            const hasInternal = internalSlugs.includes(c.id);
            // 06/10/2026 — grille 2×2 : ticker / nom à gauche, variation / prix
            // à droite. Avant, ticker + nom + badge sur une ligne de ~75 px à
            // 390 px : le reset overflow-wrap:anywhere coupait « ZR / O ».
            const Inner = (
              <div className="flex items-center gap-2.5 sm:gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 hover:border-primary/40 transition-colors">
                <span
                  className="font-mono text-xs text-muted w-5 shrink-0 text-right"
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>
                <CryptoLogo
                  symbol={c.symbol}
                  coingeckoId={c.id}
                  imageUrl={c.image}
                  size={28}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono font-bold text-sm text-fg">
                    {c.symbol}
                  </div>
                  <div className="truncate text-xs text-muted">{c.name}</div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center whitespace-nowrap rounded-lg ${tone.badgeBg} ${tone.text} font-mono font-bold text-sm tabular-nums px-2.5 py-0.5`}
                    aria-label={`Variation 24h ${formatPct(c.priceChange24h)}`}
                  >
                    {formatPct(c.priceChange24h)}
                  </span>
                  {/* Prix en chiffres significatifs (0,0123 $) : formatCompactUsd
                      arrondissait les petites cryptos à « 0 $ ». */}
                  <span className="whitespace-nowrap font-mono text-[11px] text-muted tabular-nums">
                    {formatPrice(c.currentPrice)}
                  </span>
                </div>
              </div>
            );
            return (
              <li key={c.id}>
                {hasInternal ? (
                  <Link
                    href={cryptoPagePath(c.id)}
                    className="block rounded-xl
                               focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                               focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {Inner}
                  </Link>
                ) : (
                  Inner
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

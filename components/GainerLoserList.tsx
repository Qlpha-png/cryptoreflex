import Image from "next/image";
import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { MarketCoin } from "@/lib/coingecko";
import { formatCompactUsd, formatPct } from "@/lib/coingecko";

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
        text: "text-accent-rose",
        badgeBg: "bg-accent-rose/15",
      };

  return (
    <section
      className={`rounded-2xl border ${tone.ring} ${tone.bg} p-5 sm:p-6`}
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
            const Inner = (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 hover:border-primary/40 transition-colors">
                <span
                  className="font-mono text-xs text-muted w-5 shrink-0 text-right"
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>
                {c.image ? (
                  <Image
                    src={c.image}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full shrink-0"
                    loading="lazy"
                    sizes="28px"
                    unoptimized
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-elevated shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-bold text-sm text-fg">
                      {c.symbol}
                    </span>
                    <span className="text-xs text-muted truncate">{c.name}</span>
                  </div>
                  <div className="text-[11px] text-muted font-mono">
                    {formatCompactUsd(c.currentPrice)}
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-lg ${tone.badgeBg} ${tone.text} font-mono font-bold text-sm px-2.5 py-1`}
                  aria-label={`Variation 24h ${formatPct(c.priceChange24h)}`}
                >
                  {formatPct(c.priceChange24h)}
                </span>
              </div>
            );
            return (
              <li key={c.id}>
                {hasInternal ? (
                  <Link
                    href={`/cryptos/${c.id}`}
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

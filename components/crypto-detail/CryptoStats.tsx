import {
  formatCompactUsd,
  formatCompactNumber,
  formatUsd,
  type CoinDetail,
} from "@/lib/coingecko";

interface Props {
  symbol: string;
  detail: CoinDetail | null;
  /** Fallback texte (depuis JSON éditorial) si le ATH/ATL n'est pas remonté. */
  fallbackMaxSupply?: string;
}

/**
 * Bloc "stats clés" : market cap, volume 24h, supply, ATH, ATL.
 * Tolère un detail null (CoinGecko down) en affichant des "—".
 */
export default function CryptoStats({ symbol, detail, fallbackMaxSupply }: Props) {
  const items: Array<{ label: string; value: string; sub?: string }> = [
    {
      label: "Capitalisation",
      value: formatCompactUsd(detail?.marketCap ?? 0),
      sub: detail?.marketCapRank ? `Rang #${detail.marketCapRank}` : undefined,
    },
    {
      label: "Volume 24h",
      value: formatCompactUsd(detail?.totalVolume ?? 0),
    },
    {
      label: "Supply en circulation",
      value: detail
        ? `${formatCompactNumber(detail.circulatingSupply)} ${symbol}`
        : "—",
      sub: detail?.maxSupply
        ? `Sur ${formatCompactNumber(detail.maxSupply)} max`
        : fallbackMaxSupply,
    },
    {
      label: "ATH (sommet historique)",
      value: detail ? formatUsd(detail.ath) : "—",
      sub: detail?.athDate
        ? new Date(detail.athDate).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : undefined,
    },
    {
      label: "ATL (plus bas historique)",
      value: detail ? formatUsd(detail.atl) : "—",
      sub: detail?.atlDate
        ? new Date(detail.atlDate).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : undefined,
    },
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <div className="text-[11px] uppercase tracking-wider text-muted">
            {it.label}
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-fg tabular-nums truncate">
            {it.value}
          </div>
          {it.sub && (
            <div className="mt-0.5 text-[11px] text-muted truncate">{it.sub}</div>
          )}
        </div>
      ))}
    </section>
  );
}

import {
  formatCompactUsd,
  formatCompactNumber,
  formatUsd,
  type CoinDetail,
} from "@/lib/coingecko";
import AnimatedStat from "./AnimatedStat";

interface Props {
  symbol: string;
  detail: CoinDetail | null;
  /** Fallback texte (depuis JSON éditorial) si le ATH/ATL n'est pas remonté. */
  fallbackMaxSupply?: string;
}

/**
 * Bloc "stats clés" : market cap, volume 24h, supply, ATH, ATL.
 * Tolère un detail null (CoinGecko down) en affichant des "—".
 *
 * Les KPIs principaux (market cap, volume 24h, supply) sont animés via
 * <AnimatedStat /> avec un IntersectionObserver — déclenchement au scroll
 * dans le viewport, durée 1000ms easeOutCubic.
 */
export default function CryptoStats({
  symbol,
  detail,
  fallbackMaxSupply,
}: Props) {
  // Helpers de format réutilisés à la fois pour SSR (display final si detail
  // est null) et pour AnimatedStat (qui anime de 0 jusqu'à la valeur cible).
  //
  // Note importante : formatCompactUsd / formatCompactNumber retournent "—"
  // quand value === 0. Pendant l'animation count-up qui démarre à 0, ça
  // ferait flasher "—" au 1er frame. On wrappe pour formater "0" au lieu
  // dès que la cible est connue > 0.
  const fmtUsd = (n: number) =>
    n === 0
      ? new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "USD",
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(0)
      : formatCompactUsd(n);
  const fmtCompactNumber = (n: number) =>
    n === 0
      ? new Intl.NumberFormat("en-US", {
          notation: "compact",
          maximumFractionDigits: 2,
        }).format(0)
      : formatCompactNumber(n);
  const formatSupplyWithSymbol = (n: number) =>
    `${fmtCompactNumber(n)} ${symbol}`;

  const athDate = detail?.athDate
    ? new Date(detail.athDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : undefined;
  const atlDate = detail?.atlDate
    ? new Date(detail.atlDate).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : undefined;

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Market cap — animé */}
      <StatCard
        label="Capitalisation"
        sub={detail?.marketCapRank ? `Rang #${detail.marketCapRank}` : undefined}
      >
        {detail ? (
          <AnimatedStat
            value={detail.marketCap}
            format={fmtUsd}
            duration={1100}
          />
        ) : (
          "—"
        )}
      </StatCard>

      {/* Volume 24h — animé */}
      <StatCard label="Volume 24h">
        {detail ? (
          <AnimatedStat
            value={detail.totalVolume}
            format={fmtUsd}
            duration={900}
          />
        ) : (
          "—"
        )}
      </StatCard>

      {/* Supply — animé (le nombre seulement, suffix symbol) */}
      <StatCard
        label="Supply en circulation"
        sub={
          detail?.maxSupply
            ? `Sur ${formatCompactNumber(detail.maxSupply)} max`
            : fallbackMaxSupply
        }
      >
        {detail ? (
          <AnimatedStat
            value={detail.circulatingSupply}
            format={formatSupplyWithSymbol}
            duration={1000}
          />
        ) : (
          "—"
        )}
      </StatCard>

      {/* ATH — pas animé (date contextuelle, valeur "froide") */}
      <StatCard label="ATH (sommet historique)" sub={athDate}>
        {detail ? formatUsd(detail.ath) : "—"}
      </StatCard>

      {/* ATL — pas animé */}
      <StatCard label="ATL (plus bas historique)" sub={atlDate}>
        {detail ? formatUsd(detail.atl) : "—"}
      </StatCard>
    </section>
  );
}

function StatCard({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-bold text-fg tabular-nums truncate">
        {children}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-muted truncate">{sub}</div>
      )}
    </div>
  );
}

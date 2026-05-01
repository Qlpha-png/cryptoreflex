import {
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
 *
 * Note RSC : on passe `format` en STRING preset à AnimatedStat (pas une
 * fonction). Les fonctions ne traversent pas la frontière Server → Client
 * Component (Next 14 RSC).
 */
export default function CryptoStats({
  symbol,
  detail,
  fallbackMaxSupply,
}: Props) {
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

  // Si CoinGecko down/rate-limited → afficher un message clair plutôt qu'une
  // grille de "—" muette (fix UX user feedback 2026-05-01).
  if (!detail) {
    return (
      <section
        aria-label="Statistiques temporairement indisponibles"
        className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-amber-500/15 text-amber-400">
            ⏱
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-fg">
              Données live temporairement indisponibles
            </h3>
            <p className="mt-1 text-xs text-fg/75 leading-relaxed">
              L&apos;API CoinGecko est en cours de mise à jour ou a atteint sa limite
              gratuite. Les statistiques (capitalisation, volume, supply, ATH/ATL)
              reviennent automatiquement dans quelques minutes — rafraîchis la page.
            </p>
          </div>
        </div>
      </section>
    );
  }

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
            format="compact-usd"
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
            format="compact-usd"
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
            format="compact-number"
            suffix={` ${symbol}`}
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

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
              Données en temps réel temporairement indisponibles
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
        label="Offre en circulation"
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

      {/* ATH — distance % depuis le sommet (BATCH 28 — innovation expert agents
          quick win #1). On enrichit le label avec un badge "à -X% du sommet"
          immédiatement perceptible : signal contexte ROI > simple valeur USD.
          Color tokens sémantiques (success/warning/danger) selon la distance. */}
      <StatCard
        label="ATH (sommet historique)"
        sub={athDate}
        badge={
          detail && detail.ath > 0 ? (
            <DistanceBadge
              current={detail.currentPrice}
              reference={detail.ath}
              kind="ath"
            />
          ) : undefined
        }
      >
        {detail ? formatUsd(detail.ath) : "—"}
      </StatCard>

      {/* ATL — multiplicateur depuis le plancher (innovation : "x47 depuis ATL"
          beaucoup plus parlant que "+4700%" pour un retail français). */}
      <StatCard
        label="ATL (plus bas historique)"
        sub={atlDate}
        badge={
          detail && detail.atl > 0 ? (
            <DistanceBadge
              current={detail.currentPrice}
              reference={detail.atl}
              kind="atl"
            />
          ) : undefined
        }
      >
        {detail ? formatUsd(detail.atl) : "—"}
      </StatCard>
    </section>
  );
}

/**
 * DistanceBadge — innovation BATCH 28 (quick win expert agents).
 * Affiche en un coup d'œil la distance du prix actuel vs ATH ou ATL.
 *
 * Logique :
 *  - kind="ath" : current < ath (typique). Badge "à -X%" warning/danger selon
 *    profondeur (ex: -5% green, -25% amber, -67% red). Si current ≥ ath (rare,
 *    pump en cours), badge "🚀 Nouveau sommet" success.
 *  - kind="atl" : current > atl (typique). Badge "x47" ou "+450%" success ;
 *    multiplicateur si > 10x, % sinon (lisibilité retail).
 */
function DistanceBadge({
  current,
  reference,
  kind,
}: {
  current: number;
  reference: number;
  kind: "ath" | "atl";
}) {
  if (!Number.isFinite(current) || !Number.isFinite(reference) || reference <= 0) {
    return null;
  }

  if (kind === "ath") {
    const distance = ((current - reference) / reference) * 100;
    // Cas pump : current ≥ ATH (à epsilon près) → badge "Nouveau sommet"
    if (distance >= -0.5) {
      return (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-success-soft border border-success-border px-1.5 py-0.5 text-[10px] font-mono font-bold text-success-fg">
          <span aria-hidden="true">▲</span>
          Au sommet
        </span>
      );
    }
    const abs = Math.abs(distance);
    // Threshold UX : <10% green, 10-40% warning, >40% danger
    const palette =
      abs < 10
        ? "bg-success-soft border-success-border text-success-fg"
        : abs < 40
          ? "bg-warning-soft border-warning-border text-warning-fg"
          : "bg-danger-soft border-danger-border text-danger-fg";
    return (
      <span
        className={`mt-1.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-bold ${palette}`}
        title={`Le prix actuel est à ${distance.toFixed(1)}% de son sommet historique`}
      >
        <span aria-hidden="true">▼</span>
        {distance.toFixed(1)}%
      </span>
    );
  }

  // kind === "atl"
  const ratio = current / reference;
  const distance = (ratio - 1) * 100;
  if (distance <= 0.5) {
    // Cas crash extrême : current ≤ ATL (à epsilon près)
    return (
      <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-danger-soft border border-danger-border px-1.5 py-0.5 text-[10px] font-mono font-bold text-danger-fg">
        <span aria-hidden="true">▼</span>
        Au plancher
      </span>
    );
  }
  // Multiplicateur si > 10x (plus lisible que "+10000%"), % sinon
  const display = ratio >= 10 ? `×${ratio.toFixed(1)}` : `+${distance.toFixed(0)}%`;
  return (
    <span
      className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-success-soft border border-success-border px-1.5 py-0.5 text-[10px] font-mono font-bold text-success-fg"
      title={`Le prix actuel est ${ratio.toFixed(1)}× supérieur à son plancher historique`}
    >
      <span aria-hidden="true">▲</span>
      {display}
    </span>
  );
}

function StatCard({
  label,
  sub,
  badge,
  children,
}: {
  label: string;
  sub?: string;
  badge?: React.ReactNode;
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
      {badge}
    </div>
  );
}

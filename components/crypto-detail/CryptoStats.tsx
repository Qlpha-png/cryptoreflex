import {
  formatCompactNumber,
  formatUsd,
  type CoinDetail,
} from "@/lib/coingecko";
import AnimatedStat from "./AnimatedStat";

interface Props {
  symbol: string;
  detail: CoinDetail | null;
  /** Catégorie éditoriale (data JSON). Sert à détecter les stablecoins
   *  (=== "Stablecoin" STRICT) dont les cartes ATH/ATL n'ont aucun sens. */
  category?: string;
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
  category,
  fallbackMaxSupply,
}: Props) {
  // Détection stablecoin : ÉGALITÉ STRICTE sur "Stablecoin" — JAMAIS un
  // includes("stablecoin"), sinon TRON ("Smart contracts / stablecoins"),
  // MKR ("DeFi / Stablecoin & RWA") et FXS ("DeFi / Stablecoin & Ecosystem"),
  // qui sont des cryptos VOLATILES, seraient masqués à tort. Seuls USDT/USDC/DAI
  // portent exactement cette catégorie. Pour eux, ATH/ATL (peg ~1$) sont absurdes
  // (ex USDT "ATL 0,57$ +74%") → on affiche l'écart au peg à la place.
  const isStablecoin = (category ?? "").trim().toLowerCase() === "stablecoin";
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

      {/* Volume 24h — animé (fallback "—" si donnée absente ou 0 pour éviter
          d'afficher "0,0 $US" qui donne l'impression d'une crypto morte) */}
      <StatCard label="Volume 24h">
        {detail && detail.totalVolume > 0 ? (
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

      {isStablecoin ? (
        /* Stablecoin (USDT/USDC/DAI) : ATH/ATL sont hors-sol pour un actif
           ancré ~1$ (ex USDT "ATL 0,57$ +74%" / "ATH 1,32$ -24%"). On masque
           les deux cartes et on affiche l'écart au peg — la seule métrique
           pertinente pour un stablecoin. */
        <StatCard
          label="Ancrage (peg)"
          sub="Cible 1,00 $ (stablecoin)"
          badge={
            detail && detail.currentPrice > 0 ? (
              <PegBadge current={detail.currentPrice} />
            ) : undefined
          }
        >
          {detail ? formatUsd(detail.currentPrice) : "—"}
        </StatCard>
      ) : (
        <>
          {/* ATH — distance % depuis le sommet (BATCH 28 — innovation expert
              agents quick win #1). Badge "à -X% du sommet" : signal contexte ROI
              > simple valeur USD. Color tokens sémantiques selon la distance.
              NB : l'ATH (sommet post-2013) est fiable, contrairement à l'ATL. */}
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

          {/* ATL — "plus bas LISTÉ", pas "historique" : la série CoinGecko
              démarre ~2013 et rate le vrai plancher (BTC ~0,05$ en 2010 → badge
              ×940 trompeur). Libellé honnête + tooltip qui le précise. */}
          <StatCard
            label="ATL (plus bas listé)"
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
        </>
      )}
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
        title={`Le prix actuel est à ${distance.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % de son sommet historique`}
      >
        <span aria-hidden="true">▼</span>
        {distance.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
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
  const display =
    ratio >= 10
      ? `×${ratio.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`
      : `+${distance.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %`;
  return (
    <span
      className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-success-soft border border-success-border px-1.5 py-0.5 text-[10px] font-mono font-bold text-success-fg"
      title={`Le prix actuel est ${ratio.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}× supérieur à son plus bas listé (historique CoinGecko depuis ~2013, pas forcément le plancher absolu)`}
    >
      <span aria-hidden="true">▲</span>
      {display}
    </span>
  );
}

/**
 * PegBadge — stablecoins uniquement : écart au peg (cible 1,00 $) en %.
 * Vert si quasi-ancré (<0,5%), ambre si <2%, rouge au-delà (dé-peg).
 */
function PegBadge({ current }: { current: number }) {
  if (!Number.isFinite(current) || current <= 0) return null;
  const dev = (current - 1) * 100; // écart vs peg 1 USD, en %
  const abs = Math.abs(dev);
  const palette =
    abs < 0.5
      ? "bg-success-soft border-success-border text-success-fg"
      : abs < 2
        ? "bg-warning-soft border-warning-border text-warning-fg"
        : "bg-danger-soft border-danger-border text-danger-fg";
  const sign = dev >= 0 ? "+" : "";
  return (
    <span
      className={`mt-1.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-bold ${palette}`}
      title={`Écart au peg (1,00 $) : ${sign}${dev.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`}
    >
      <span aria-hidden="true">⚓</span>
      {sign}
      {dev.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
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

import Link from "next/link";
import { Sparkles, TrendingUp } from "lucide-react";

interface Props {
  cryptoName: string;
  symbol: string;
  currentPrice: number;
  ath: number;
}

/**
 * AthAlertBanner — BATCH 29C innovation expert agents.
 *
 * Bandeau narratif qui ne se déclenche QUE quand la crypto est proche
 * (≤ 5%) ou au-dessus de son ATH. Storytelling fort : "BTC à 2.1% de
 * son sommet historique" capte l'attention immédiatement.
 *
 * 3 états :
 *  - distance > 0 (current >= ATH) : "Nouveau sommet historique 🔥"
 *  - distance entre -1.5% et 0 : "À X% du sommet historique"
 *  - distance entre -5% et -1.5% : "Pas loin du sommet (-X%)"
 *  - sinon : render null (pas pertinent)
 *
 * Render server-side, pas de JS. Mis à jour à chaque ISR (fiches
 * crypto = revalidate 3600s).
 */
export default function AthAlertBanner({
  cryptoName,
  symbol,
  currentPrice,
  ath,
}: Props) {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(ath) || ath <= 0) {
    return null;
  }
  const distancePct = ((currentPrice - ath) / ath) * 100;
  // Si on est à plus de -5% de l'ATH = pas pertinent comme signal narratif
  if (distancePct < -5) return null;

  const isNewAth = distancePct >= 0;
  const isVeryClose = distancePct >= -1.5;

  let title: string;
  let badge: string;
  let palette: string;

  if (isNewAth) {
    title = `${cryptoName} vient de signer un nouveau sommet historique`;
    badge = `+${distancePct.toFixed(2)}% au-dessus de l'ancien ATH`;
    palette = "border-success-border bg-success-soft text-success-fg";
  } else if (isVeryClose) {
    title = `${cryptoName} à ${Math.abs(distancePct).toFixed(2)}% de son sommet historique`;
    badge = "ATH potentiel imminent";
    palette = "border-warning-border bg-warning-soft text-warning-fg";
  } else {
    title = `${cryptoName} se rapproche de son sommet historique`;
    badge = `Plus que ${Math.abs(distancePct).toFixed(2)}% à parcourir`;
    palette = "border-warning-border bg-warning-soft text-warning-fg";
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className={`rounded-2xl border ${palette} p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 grid place-items-center h-10 w-10 rounded-xl ${
          isNewAth ? "bg-success/20 text-success-fg" : "bg-warning/20 text-warning-fg"
        }`}
      >
        {isNewAth ? (
          <Sparkles className="h-5 w-5" strokeWidth={2.25} />
        ) : (
          <TrendingUp className="h-5 w-5" strokeWidth={2.25} />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base font-bold leading-tight">{title}</p>
        <p className="mt-0.5 text-[12px] sm:text-[13px] opacity-90 font-mono">
          {badge} · prix actuel calculé en USD (CoinGecko)
        </p>
      </div>
      <Link
        href={`/cryptos/${symbol.toLowerCase()}/historique`}
        className="shrink-0 text-[12px] font-semibold underline underline-offset-2 hover:no-underline"
      >
        Voir l&apos;historique
      </Link>
    </aside>
  );
}

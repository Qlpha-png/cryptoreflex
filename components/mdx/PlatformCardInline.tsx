import Link from "next/link";
import { Star, ShieldCheck, Sparkles } from "lucide-react";
import { getPlatformById } from "@/lib/platforms";
import AffiliateLink from "./AffiliateLink";
import PlatformLogo from "@/components/PlatformLogo";

interface PlatformCardInlineProps {
  /** ID dans `data/platforms.json` (ex: "bitpanda"). */
  id: string;
  /** Force un libellé pour le CTA d'affiliation. */
  ctaLabel?: string;
  /** Affiche les forces / faiblesses. */
  showProsCons?: boolean;
}

/**
 * Encart "plateforme" insérable dans un MDX.
 *
 * Usage MDX :
 *   <PlatformCardInline id="bitpanda" />
 *   <PlatformCardInline id="binance" ctaLabel="Tester Binance" showProsCons />
 */
export default function PlatformCardInline({
  id,
  ctaLabel,
  showProsCons = false,
}: PlatformCardInlineProps) {
  const p = getPlatformById(id);

  if (!p) {
    return (
      <div className="not-prose my-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
        <strong>PlatformCardInline :</strong> aucune plateforme trouvée pour l'id{" "}
        <code className="rounded bg-rose-500/20 px-1.5 py-0.5">{id}</code>.
      </div>
    );
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex shrink-0 items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-elevated flex items-center justify-center">
            {/* PlatformLogo : logo SVG officiel + fallback Lucide si id inconnu */}
            <PlatformLogo id={p.id} name={p.name} size={44} rounded={false} />
          </div>
          <div>
            <Link
              href={`/avis/${p.id}`}
              className="text-base font-semibold text-white hover:text-primary-glow"
            >
              {p.name}
            </Link>
            <p className="text-xs text-muted">{p.tagline}</p>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-3 text-xs text-white/80 sm:justify-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2.5 py-1 font-semibold">
            <Star className="h-3.5 w-3.5 text-primary-glow" aria-hidden />
            {p.scoring.global.toFixed(1)} / 5
          </span>
          {p.mica.micaCompliant && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              MiCA
            </span>
          )}
          {p.bonus.welcome && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 font-semibold text-primary-glow">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Bonus
            </span>
          )}
        </div>

        <AffiliateLink platform={p.id} variant="button">
          {ctaLabel ?? `Voir ${p.name}`}
        </AffiliateLink>
      </div>

      <dl className="grid grid-cols-2 gap-px border-t border-border bg-border text-xs sm:grid-cols-4">
        <Stat label="Frais spot" value={`${p.fees.spotMaker}%`} />
        <Stat label="Dépôt min" value={`${p.deposit.minEur}€`} />
        <Stat label="Cryptos" value={`${p.cryptos.totalCount}+`} />
        <Stat
          label="Support FR"
          value={p.support.frenchChat ? "Oui" : "Non"}
        />
      </dl>

      {showProsCons && (
        <div className="grid gap-4 border-t border-border p-5 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Points forts
            </p>
            <ul className="space-y-1 text-white/80">
              {p.strengths.slice(0, 3).map((s) => (
                <li key={s}>+ {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-300">
              Points faibles
            </p>
            <ul className="space-y-1 text-white/80">
              {p.weaknesses.slice(0, 3).map((s) => (
                <li key={s}>− {s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {p.bonus.welcome && (
        <div className="border-t border-border bg-primary/5 px-5 py-3 text-xs text-primary-glow">
          <strong className="font-semibold">Bonus actuel :</strong> {p.bonus.welcome}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-2.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-white tabular-nums">{value}</dd>
    </div>
  );
}

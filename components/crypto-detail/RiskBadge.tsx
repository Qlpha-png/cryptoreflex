import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import type { RiskLevel } from "@/lib/cryptos";

interface Props {
  /** Pour Top10 : niveau de risque éditorial. */
  riskLevel?: RiskLevel;
  /** Pour Hidden Gems : score de fiabilité 0..10. */
  reliabilityScore?: number;
  /** Pour Top10 : score "beginner-friendly" 1..5. */
  beginnerFriendly?: number;
  className?: string;
}

/**
 * Badge composite affiché en page fiche crypto.
 *
 * - Top10 : montre le risque éditorial + un score "facile pour débutant" 1-5
 * - Hidden Gem : montre le score de fiabilité 0-10 (méthodologie publique)
 *
 * Coloration :
 *   reliability >= 8.5 → vert (équipe + audits + années)
 *   reliability 7-8.5  → ambre
 *   reliability < 7    → rose
 */
export default function RiskBadge({
  riskLevel,
  reliabilityScore,
  beginnerFriendly,
  className = "",
}: Props) {
  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-${
        reliabilityScore !== undefined && beginnerFriendly !== undefined ? 3 : 2
      } ${className}`}
    >
      {riskLevel && <RiskTile riskLevel={riskLevel} />}
      {reliabilityScore !== undefined && (
        <ReliabilityTile score={reliabilityScore} />
      )}
      {beginnerFriendly !== undefined && (
        <BeginnerTile score={beginnerFriendly} />
      )}
    </div>
  );
}

function RiskTile({ riskLevel }: { riskLevel: RiskLevel }) {
  const colors: Record<RiskLevel, string> = {
    "Très faible": "border-accent-green/30 bg-accent-green/5 text-accent-green",
    Faible: "border-accent-green/30 bg-accent-green/5 text-accent-green",
    Modéré: "border-amber-400/30 bg-amber-400/5 text-amber-300",
    Élevé: "border-accent-rose/30 bg-accent-rose/5 text-accent-rose",
    "Très élevé": "border-accent-rose/30 bg-accent-rose/5 text-accent-rose",
  };

  return (
    <div className={`rounded-2xl border p-4 ${colors[riskLevel]}`}>
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" />
        <div className="text-[11px] uppercase tracking-wider opacity-80">Niveau de risque</div>
      </div>
      <div className="mt-2 text-xl font-bold">{riskLevel}</div>
      <p className="mt-1 text-xs text-fg/70 leading-snug">
        Volatilité, taille de marché et liquidité combinées.
      </p>
    </div>
  );
}

function ReliabilityTile({ score }: { score: number }) {
  const tone =
    score >= 8.5
      ? "border-accent-green/30 bg-accent-green/5 text-accent-green"
      : score >= 7
      ? "border-amber-400/30 bg-amber-400/5 text-amber-300"
      : "border-accent-rose/30 bg-accent-rose/5 text-accent-rose";

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" />
        <div className="text-[11px] uppercase tracking-wider opacity-80">Score fiabilité</div>
      </div>
      <div className="mt-2 font-mono text-2xl font-bold tabular-nums">
        {score.toFixed(1)}<span className="text-base text-fg/60">/10</span>
      </div>
      <p className="mt-1 text-xs text-fg/70 leading-snug">
        Équipe + open source + audits + années + incidents.
      </p>
    </div>
  );
}

function BeginnerTile({ score }: { score: number }) {
  const dots = Array.from({ length: 5 });
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-primary-soft">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <div className="text-[11px] uppercase tracking-wider opacity-80">Beginner-friendly</div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {dots.map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-6 rounded-full ${
              i < score ? "bg-primary" : "bg-elevated border border-border"
            }`}
            aria-hidden
          />
        ))}
        <span className="ml-2 font-mono text-sm font-semibold">{score}/5</span>
      </div>
      <p className="mt-1 text-xs text-fg/70 leading-snug">
        Facilité d'achat et de compréhension pour un débutant.
      </p>
    </div>
  );
}

import hiddenGemsData from "@/data/hidden-gems.json";
import { Gem, ShieldCheck, AlertTriangle, ExternalLink, Activity } from "lucide-react";

interface HiddenGem {
  rank: number;
  id: string;
  name: string;
  symbol: string;
  marketCapRange: string;
  yearCreated: number;
  category: string;
  tagline: string;
  what: string;
  whyHiddenGem: string;
  reliability: {
    score: number;
    teamIdentified: boolean;
    openSource: boolean;
    auditedBy: string[];
    lastAuditDate: string;
    yearsActive: number;
    majorIncidents: string;
    fundingRaised: string;
    backers: string[];
  };
  risks: string[];
  whereToBuy: string[];
  officialUrl: string;
  monitoringSignals: string[];
}

/**
 * "10 hidden gems" — cryptos moins connues mais avec fondamentaux solides.
 *
 * IMPORTANT — disclaimer affiché : ce n'est PAS un conseil en investissement.
 * Chaque carte affiche un score de fiabilité 0-10 calculé sur :
 * équipe identifiée + open source + audits + années d'activité + incidents.
 */
export default function HiddenGemsSection() {
  const gems = hiddenGemsData.hiddenGems as HiddenGem[];

  return (
    <section id="hidden-gems" className="py-16 sm:py-20 bg-surface/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="badge-info">
            <Gem className="h-3.5 w-3.5" />
            Pépites cachées
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            10 cryptos prometteuses, <span className="gradient-text">moins connues</span>
          </h2>
          <p className="mt-2 text-muted text-sm max-w-2xl">
            Notre sélection de projets crypto avec fondamentaux solides : équipe identifiée,
            audit récent, code open-source, sans scandale majeur. Chaque carte affiche un score
            de fiabilité calculé selon une méthode publique.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {gems.map((g) => (
            <GemCard key={g.id} gem={g} />
          ))}
        </div>

        {/* Disclaimer obligatoire */}
        <div className="mt-10 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200/80 leading-relaxed">
          <strong className="text-amber-300">⚠️ Disclaimer obligatoire</strong> — Cette sélection
          ne constitue PAS un conseil en investissement. Investir dans les cryptomonnaies comporte
          un risque élevé de perte en capital. La capitalisation, l'équipe et les fondamentaux d'un
          projet peuvent évoluer rapidement. Ne placez que ce que vous êtes prêt à perdre. Consultez
          un conseiller en investissement financier (CIF) enregistré ORIAS pour toute décision
          patrimoniale significative.
        </div>
      </div>
    </section>
  );
}

function GemCard({ gem }: { gem: HiddenGem }) {
  const score = gem.reliability.score;
  const scoreColor =
    score >= 8.5
      ? "text-accent-green border-accent-green/40 bg-accent-green/10"
      : score >= 7
      ? "text-amber-300 border-amber-400/40 bg-amber-400/10"
      : "text-accent-rose border-accent-rose/40 bg-accent-rose/10";

  return (
    <article className="glass rounded-2xl p-6 hover:border-primary/40 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted mb-1">
            <span className="font-mono">#{gem.rank}</span>
            <span>·</span>
            <span>{gem.category}</span>
            <span>·</span>
            <span>{gem.yearCreated}</span>
          </div>
          <h3 className="font-bold text-lg text-fg truncate">
            {gem.name}{" "}
            <span className="text-muted font-mono text-sm">{gem.symbol}</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">{gem.marketCapRange}</p>
        </div>

        <div className={`shrink-0 rounded-xl border px-3 py-2 text-center ${scoreColor}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
            Fiabilité
          </div>
          <div className="font-mono font-bold text-lg leading-none mt-0.5">
            {score.toFixed(1)}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-primary-soft italic">{gem.tagline}</p>
      <p className="mt-3 text-sm text-fg/80 leading-relaxed">{gem.what}</p>

      {/* Why hidden gem */}
      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-soft mb-1">
          Pourquoi c'est intéressant
        </div>
        <p className="text-xs text-fg/80 leading-relaxed">{gem.whyHiddenGem}</p>
      </div>

      {/* Reliability indicators */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Indicator
          label="Équipe identifiée"
          value={gem.reliability.teamIdentified ? "Oui" : "Anonyme"}
          ok={gem.reliability.teamIdentified}
        />
        <Indicator
          label="Open source"
          value={gem.reliability.openSource ? "Oui" : "Non"}
          ok={gem.reliability.openSource}
        />
        <Indicator
          label="Années actives"
          value={`${gem.reliability.yearsActive} ans`}
          ok={gem.reliability.yearsActive >= 3}
        />
        <Indicator
          label="Incidents"
          value={gem.reliability.majorIncidents.startsWith("Aucun") ? "Aucun" : "Oui"}
          ok={gem.reliability.majorIncidents.startsWith("Aucun")}
        />
      </div>

      {gem.reliability.auditedBy.length > 0 && (
        <div className="mt-3 text-xs text-muted">
          <ShieldCheck className="inline h-3.5 w-3.5 text-accent-green mr-1" />
          Audité par : <span className="text-fg">{gem.reliability.auditedBy.join(", ")}</span>{" "}
          <span className="text-muted/70">({gem.reliability.lastAuditDate})</span>
        </div>
      )}

      {/* Risks - critical transparency */}
      <details className="mt-4 group">
        <summary className="cursor-pointer text-xs font-semibold text-amber-300 hover:text-amber-200 inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Voir les risques ({gem.risks.length})
        </summary>
        <ul className="mt-2 space-y-1 text-xs text-fg/70 pl-5 list-disc marker:text-amber-400/60">
          {gem.risks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </details>

      {/* Monitoring signals */}
      <details className="mt-2 group">
        <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-fg inline-flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          Indicateurs à surveiller
        </summary>
        <ul className="mt-2 space-y-1 text-xs text-fg/70 pl-5 list-disc marker:text-primary/60">
          {gem.monitoringSignals.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3 text-xs">
        <div className="text-muted">
          <span>Disponible sur : </span>
          <span className="text-fg font-medium">{gem.whereToBuy.slice(0, 3).join(", ")}</span>
        </div>
        <a
          href={gem.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-soft hover:text-primary font-semibold"
        >
          Site officiel
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}

function Indicator({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-elevated/30 px-2.5 py-1.5">
      <span className="text-muted">{label}</span>
      <span
        className={`font-medium ${
          ok ? "text-accent-green" : "text-accent-rose"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

import hiddenGemsData from "@/data/hidden-gems.json";
import { Gem, ShieldCheck, AlertTriangle, ExternalLink, Activity } from "lucide-react";
import AmfDisclaimer from "./AmfDisclaimer";
import ScrollReveal from "./ui/ScrollReveal";
import CryptoLogo from "./ui/CryptoLogo";

interface HiddenGem {
  rank: number;
  id: string;
  name: string;
  symbol: string;
  /** ID CoinGecko (utilisé pour le logo officiel via lib/crypto-logos.ts). */
  coingeckoId?: string;
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
    <section id="hidden-gems" className="py-12 sm:py-20 bg-surface/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="badge-info">
            <Gem className="h-3.5 w-3.5" aria-hidden="true" />
            Pépites cachées
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            10 cryptos prometteuses, <span className="gradient-text">moins connues</span>
          </h2>
          <p className="mt-2 text-muted text-sm max-w-2xl leading-relaxed">
            Notre sélection de projets crypto avec fondamentaux solides : équipe identifiée,
            audit récent, code open-source, sans scandale majeur. Chaque carte affiche un score
            de fiabilité calculé selon une méthode publique.
          </p>
        </div>

        <div className="mt-8 sm:mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {gems.map((g, i) => (
            <ScrollReveal key={g.id} delay={i * 80} direction="up">
              <GemCard gem={g} />
            </ScrollReveal>
          ))}
        </div>

        {/* Disclaimer obligatoire — conforme article 222-15 AMF */}
        <AmfDisclaimer variant="speculation" className="mt-10" />
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
    <article className="glass rounded-2xl p-5 sm:p-6 hover:border-primary/40 hover-lift">
      {/* Header — mobile : score gauge plus gros (min 64px) pour lisibilité */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 flex items-start gap-3">
          <CryptoLogo
            symbol={gem.symbol}
            coingeckoId={gem.coingeckoId ?? gem.id}
            size={44}
            className="ring-1 ring-border"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-muted mb-1 flex-wrap">
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
        </div>

        <div
          className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-center min-w-[64px] ${scoreColor}`}
          role="img"
          aria-label={`Score de fiabilité : ${score.toFixed(1)} sur 10`}
        >
          <div
            aria-hidden="true"
            className="text-[10px] font-semibold uppercase tracking-wider opacity-70"
          >
            Fiabilité
          </div>
          <div
            aria-hidden="true"
            className="font-mono font-bold text-2xl sm:text-xl leading-none mt-1"
          >
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
          <ShieldCheck
            className="inline h-3.5 w-3.5 text-accent-green mr-1"
            aria-hidden="true"
          />
          Audité par : <span className="text-fg">{gem.reliability.auditedBy.join(", ")}</span>{" "}
          <span className="text-muted/70">({gem.reliability.lastAuditDate})</span>
        </div>
      )}

      {/*
        Risks — <details>/<summary> est nativement keyboard-accessible :
        Tab focus + Enter/Space pour ouvrir/fermer (WCAG 2.1.1).
        focus-visible:ring pour le visuel de focus (WCAG 2.4.7).
      */}
      <details className="mt-4 group">
        <summary
          className="cursor-pointer text-sm font-semibold text-amber-300 hover:text-amber-200
                     inline-flex items-center gap-1.5 min-h-[44px] py-2 px-1 -mx-1 rounded-lg
                     active:bg-amber-500/10
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Voir les risques ({gem.risks.length})
        </summary>
        <ul className="mt-2 space-y-1.5 text-sm text-fg/75 pl-5 list-disc marker:text-amber-400/60 leading-relaxed">
          {gem.risks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </details>

      {/* Monitoring signals */}
      <details className="mt-1 group">
        <summary
          className="cursor-pointer text-sm font-semibold text-muted hover:text-fg
                     inline-flex items-center gap-1.5 min-h-[44px] py-2 px-1 -mx-1 rounded-lg
                     active:bg-elevated/50
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Activity className="h-4 w-4" aria-hidden="true" />
          Indicateurs à surveiller
        </summary>
        <ul className="mt-2 space-y-1.5 text-sm text-fg/75 pl-5 list-disc marker:text-primary/60 leading-relaxed">
          {gem.monitoringSignals.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>

      {/* Footer — empilé sur mobile pour éviter compression */}
      <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="text-muted">
          <span>Disponible sur : </span>
          <span className="text-fg font-medium">{gem.whereToBuy.slice(0, 3).join(", ")}</span>
        </div>
        <a
          href={gem.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Site officiel de ${gem.name} (ouvre un nouvel onglet)`}
          className="inline-flex items-center gap-1 text-primary-soft hover:text-primary font-semibold
                     min-h-[44px] py-2 rounded
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Site officiel
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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

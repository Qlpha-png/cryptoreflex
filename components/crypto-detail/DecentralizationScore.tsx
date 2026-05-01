import { ShieldCheck, Users, Globe, Layers, GitBranch, Code2 } from "lucide-react";
import {
  getDecentralizationScore,
  formatDecentralizationVerdict,
  decentralizationColor,
  DECENTRALIZATION_LAST_UPDATED,
  DECENTRALIZATION_METHODOLOGY,
} from "@/lib/decentralization-scores";

interface Props {
  cryptoId: string;
  cryptoName: string;
}

/**
 * DecentralizationScore — score composite 0-10 affiché à côté du Reliability.
 * Server Component (data statique). Render null si pas de score éditorial.
 */
export default function DecentralizationScore({ cryptoId, cryptoName }: Props) {
  const score = getDecentralizationScore(cryptoId);
  if (!score) return null;

  const colorClass = decentralizationColor(score.score);
  const verdict = formatDecentralizationVerdict(score.score);
  const b = score.breakdown;

  const criteria = [
    {
      Icon: Layers,
      label: "Nakamoto coefficient",
      value: `${b.nakamotoCoefficient} entité${b.nakamotoCoefficient > 1 ? "s" : ""}`,
      score: b.nakamotoScore,
      sub: "Nombre minimum d'acteurs pour contrôler 33% du réseau",
      weight: 30,
    },
    {
      Icon: Users,
      label: "Validateurs / mineurs",
      value: b.validatorsCount.toLocaleString("fr-FR"),
      score: b.validatorsScore,
      sub: "Nombre d'acteurs sécurisant le réseau",
      weight: 25,
    },
    {
      Icon: Globe,
      label: "Diversité géographique",
      value: `${b.geographicDiversity}%`,
      score: b.geographicScore,
      sub: "Score de répartition mondiale des nodes",
      weight: 15,
    },
    {
      Icon: GitBranch,
      label: "Diversité client logiciel",
      value: `${b.clientDiversity} client${b.clientDiversity > 1 ? "s" : ""}`,
      score: b.clientScore,
      sub: "Implémentations majeures du protocole",
      weight: 15,
    },
    {
      Icon: Code2,
      label: "Open source",
      value: b.openSource ? "Oui" : "Non",
      score: b.openSourceScore,
      sub: "Code public, auditable par tous",
      weight: 15,
    },
  ];

  return (
    <section id="decentralization" className="scroll-mt-24">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0 grid place-items-center h-11 w-11 rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
              Score de décentralisation Cryptoreflex
            </h2>
            <p className="mt-2 text-sm text-fg/75">
              Calculé sur 5 critères techniques pondérés. Méthodologie publique,
              vérifiable.
            </p>
          </div>
        </div>
        <div
          className={`shrink-0 inline-flex items-baseline gap-2 rounded-2xl border px-5 py-3 ${colorClass}`}
        >
          <span className="font-mono text-3xl font-extrabold tabular-nums">
            {score.score.toFixed(1)}
          </span>
          <span className="text-sm font-semibold">/ 10</span>
        </div>
      </div>

      <p
        className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${colorClass}`}
      >
        {verdict}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {criteria.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-muted">
                <c.Icon className="h-4 w-4" aria-hidden />
                <span className="text-[11px] uppercase tracking-wider">
                  {c.label}
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted">
                {c.weight}%
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-base font-bold text-fg">{c.value}</span>
              <span className="text-xs font-mono text-fg/70">
                {c.score} / 10
              </span>
            </div>
            <div
              className="mt-2 h-1 rounded-full bg-elevated overflow-hidden"
              aria-hidden
            >
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-glow"
                style={{ width: `${c.score * 10}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted leading-snug">{c.sub}</p>
          </div>
        ))}
      </div>

      {score.notes && (
        <div className="mt-4 rounded-xl border border-border bg-elevated/40 p-4 text-sm text-fg/85 leading-relaxed">
          <strong className="text-fg">Notes éditoriales : </strong>
          {score.notes}
        </div>
      )}

      <details className="mt-4 rounded-xl border border-border bg-surface/40 p-4 text-sm text-fg/85">
        <summary className="cursor-pointer font-semibold text-fg">
          Méthodologie complète
        </summary>
        <p className="mt-3 leading-relaxed">{DECENTRALIZATION_METHODOLOGY}</p>
        <p className="mt-2 text-xs text-muted">
          Vérification : {score.lastVerified} · Dernière MAJ globale :{" "}
          {DECENTRALIZATION_LAST_UPDATED}.
        </p>
      </details>

      <p className="sr-only">
        Le score de décentralisation Cryptoreflex de {cryptoName} est de{" "}
        {score.score} sur 10.
      </p>
    </section>
  );
}

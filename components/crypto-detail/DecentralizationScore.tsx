import { avecTypoSync } from "@/components/ui/Typo";
import Link from "next/link";
import { ShieldCheck, Users, Globe, Layers, GitBranch, Code2, Info } from "lucide-react";
import {
  getDecentralizationScore,
  formatDecentralizationVerdict,
  decentralizationColor,
  DECENTRALIZATION_LAST_UPDATED,
  DECENTRALIZATION_METHODOLOGY,
} from "@/lib/decentralization-scores";
import VerifieLe from "@/components/ui/VerifieLe";

interface Props {
  cryptoId: string;
  cryptoName: string;
}

/**
 * DecentralizationScore — score composite 0-10 affiché à côté du Reliability.
 * Server Component (data statique).
 *
 * Pour les cryptos non encore couvertes (hors top 30) on affiche un placeholder
 * honnête (« pas encore couvert ») au lieu de rendre null silencieusement —
 * fix audit UX 2026-05-01 (Karim friction 2/3).
 */
function DecentralizationScore({ cryptoId, cryptoName }: Props) {
  const score = getDecentralizationScore(cryptoId);
  if (!score) {
    return (
      <section
        id="decentralization"
        className="scroll-mt-24 rounded-2xl border border-border bg-surface/40 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 grid place-items-center h-9 w-9 rounded-xl bg-elevated text-muted">
            <Info className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-fg/85">
              Score de décentralisation Cryptoreflex
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">
              Pas encore couvert pour {cryptoName}. Notre score composite (Nakamoto
              coefficient + validateurs + diversité géo + diversité client + open source)
              est calculé pour une partie des cryptos les plus liquides ; les
              autres ne sont pas encore couvertes, sans date prévue.{" "}
              <Link
                href="/methodologie#decentralisation"
                className="text-primary-soft hover:text-primary underline"
              >
                Voir la méthodologie →
              </Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

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
      value: `${b.geographicDiversity} %`,
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
        {/* Base de 16rem : sous ~400 px la pastille de note passe sous le titre au lieu de l'écraser (jury B1 : « décentralisati / on » à 360 px). */}
        <div className="flex items-center gap-3 flex-[1_1_16rem] min-w-0">
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
            {score.score.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
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
                <span className="text-xs uppercase tracking-wider">
                  {c.label}
                </span>
              </div>
              {/* Reprise B1-bis : « 30 % » sur une ligne (insécable + nowrap) ; avant, « 30 / % » à 320 px. */}
              <span className="text-xs font-mono text-muted whitespace-nowrap">
                {c.weight}&nbsp;%
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
            <p className="mt-2 text-xs text-muted leading-snug">{c.sub}</p>
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
          {/* FIX B cohérence dates (2026-05-09) — uniformise sur DD/MM/YYYY
              avec .toLocaleDateString("fr-FR"). Avant : YYYY-MM-DD brut. */}
          {/* 08/10/2026 (lot fraîcheur A) : lastVerified vaut « 2026-04 » (mois seul) ; new Date().toLocaleDateString
              affichait un jour inventé (« 01/04/2026 »). Le mois seul s'affiche désormais tel quel (« avril 2026 »). */}
          {/* 08/10/2026 (lot fraîcheur A2) : dates via <VerifieLe> (au-delà de 120 jours : « à revérifier ») */}
          <VerifieLe date={score.lastVerified} famille="decentralisation" label="Score vérifié" inconnue="Vérification : date inconnue" /> ·{" "}
          <VerifieLe date={DECENTRALIZATION_LAST_UPDATED} famille="decentralisation" label="jeu de données mis à jour" inconnue="mise à jour du jeu : date inconnue" age={false} />.
        </p>
      </details>

      <p className="sr-only">
        Le score de décentralisation Cryptoreflex de {cryptoName} est de{" "}
        {score.score} sur 10.
      </p>
    </section>
  );
}

export default avecTypoSync(DecentralizationScore);

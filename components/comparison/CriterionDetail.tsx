/**
 * CriterionDetail — détail comparatif d'UN critère donné.
 *
 * Bloc structuré : titre + texte d'analyse + 2 panneaux (A vs B) avec
 * leurs metrics + verdict 1-ligne. Réutilisable pour Frais, Sécurité,
 * MiCA, UX, Support, Catalogue, etc.
 *
 * Reçoit déjà du JSX dans `analysis` pour permettre un contenu unique
 * par critère par page (≠ template figé).
 */

import type { ReactNode } from "react";
import { Trophy } from "lucide-react";

interface PlatformPanel {
  name: string;
  /** Lignes de metrics (label + valeur). */
  metrics: Array<{ label: string; value: ReactNode }>;
  /** Court verdict pour cette plateforme sur ce critère (1 phrase). */
  oneLiner: ReactNode;
}

interface Props {
  /** Slug d'ancrage HTML (ex: "frais", "securite") */
  id: string;
  /** Icône Lucide à gauche du titre */
  icon: ReactNode;
  title: string;
  /** Sous-titre vendeur (1 phrase, focus utilisateur) */
  subtitle?: string;
  /** Bloc d'analyse rédigé (markdown / JSX riche). */
  analysis: ReactNode;
  /** Panneau plateforme A */
  a: PlatformPanel;
  /** Panneau plateforme B */
  b: PlatformPanel;
  /** "a" | "b" | "tie" */
  winner: "a" | "b" | "tie";
  /** Texte du verdict (1-2 phrases) */
  verdict: ReactNode;
}

export default function CriterionDetail({
  id,
  icon,
  title,
  subtitle,
  analysis,
  a,
  b,
  winner,
  verdict,
}: Props) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-border/60 pt-10 first:border-t-0 first:pt-0"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>

      <div className="mt-6 prose prose-invert max-w-none text-sm leading-relaxed text-white/85 prose-strong:text-white prose-a:text-primary">
        {analysis}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[a, b].map((panel, idx) => {
          const isWinner = (idx === 0 && winner === "a") || (idx === 1 && winner === "b");
          return (
            <div
              key={panel.name}
              className={`relative rounded-2xl border p-5 ${
                isWinner
                  ? "border-accent-green/50 bg-accent-green/5"
                  : "border-border bg-surface/50"
              }`}
            >
              {isWinner && (
                <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full border border-accent-green/50 bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-green">
                  <Trophy className="h-3 w-3" />
                  Gagnant
                </span>
              )}
              <div className="text-sm font-bold text-white">{panel.name}</div>
              <dl className="mt-3 space-y-1.5 text-xs">
                {panel.metrics.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">{m.label}</dt>
                    <dd className="font-mono font-medium text-white">{m.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 border-t border-border/60 pt-3 text-sm text-white/85">
                {panel.oneLiner}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-white/90">
        <span className="font-semibold text-primary">Verdict — </span>
        {verdict}
      </div>
    </section>
  );
}

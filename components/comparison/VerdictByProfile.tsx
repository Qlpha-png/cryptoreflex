/**
 * VerdictByProfile — bloc "Quelle plateforme pour quel profil ?"
 *
 * 4 profils standards utilisés sur tous les comparatifs :
 *   - debutant
 *   - long_terme (HODL passif, DCA)
 *   - trader_actif (frais bas, dérivés)
 *   - investisseur_francais (prime à PSAN FR / support FR)
 *
 * Le caller passe la recommandation ("a" | "b" | "tie") + 1 phrase d'argumentaire
 * pour chaque profil — pas de logique générique pour éviter le contenu duplicate.
 */

import Link from "next/link";
import { ExternalLink, GraduationCap, PiggyBank, Activity, Flag } from "lucide-react";
import type { ReactNode } from "react";
import type { Platform } from "@/lib/platforms";

export type ProfileKey = "debutant" | "long_terme" | "trader_actif" | "investisseur_francais";

export interface ProfileVerdict {
  profile: ProfileKey;
  /** "a" si A gagne pour ce profil, "b" sinon, "tie" si à égalité */
  winner: "a" | "b" | "tie";
  /** Argumentaire 1-2 phrases (texte ou JSX riche). */
  reasoning: ReactNode;
}

interface Props {
  a: Platform;
  b: Platform;
  verdicts: ProfileVerdict[];
}

const PROFILE_META: Record<ProfileKey, { label: string; icon: ReactNode; sub: string }> = {
  debutant: {
    label: "Débutant total",
    icon: <GraduationCap className="h-5 w-5" />,
    sub: "1er achat crypto, simplicité avant tout",
  },
  long_terme: {
    label: "Investisseur long terme",
    icon: <PiggyBank className="h-5 w-5" />,
    sub: "DCA, HODL, accumulation passive",
  },
  trader_actif: {
    label: "Trader actif",
    icon: <Activity className="h-5 w-5" />,
    sub: "Frais bas, profondeur de marché, dérivés",
  },
  investisseur_francais: {
    label: "Investisseur FR",
    icon: <Flag className="h-5 w-5" />,
    sub: "Priorité PSAN AMF, support FR, fiscalité claire",
  },
};

export default function VerdictByProfile({ a, b, verdicts }: Props) {
  return (
    <section id="verdict-profil" className="scroll-mt-24">
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Quelle plateforme selon ton profil ?
      </h2>
      <p className="mt-2 text-sm text-muted">
        Notre recommandation dépend de ce que tu cherches. 4 profils types, 4 verdicts
        argumentés.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {verdicts.map((v) => {
          const meta = PROFILE_META[v.profile];
          const winnerPlatform = v.winner === "a" ? a : v.winner === "b" ? b : null;
          return (
            <article
              key={v.profile}
              className="flex flex-col rounded-2xl border border-border bg-surface/40 p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  {meta.icon}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">{meta.label}</h3>
                  <p className="mt-0.5 text-xs text-muted">{meta.sub}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="text-muted">Notre choix :</span>
                {winnerPlatform ? (
                  <Link
                    href={`/avis/${winnerPlatform.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-accent-green/40 bg-accent-green/10 px-2.5 py-1 font-semibold text-accent-green hover:bg-accent-green/20"
                  >
                    {winnerPlatform.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-semibold text-primary-soft">
                    Égalité — selon tes préférences
                  </span>
                )}
              </div>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-white/85">{v.reasoning}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

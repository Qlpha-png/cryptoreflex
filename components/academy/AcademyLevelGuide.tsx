"use client";

/**
 * <AcademyLevelGuide /> — sélecteur de niveau (SOFT gating).
 *
 * L'utilisateur indique où il en est (« Je débute / J'ai déjà investi / Je
 * maîtrise »). On lui RECOMMANDE alors un point de départ + les parcours
 * suivants adaptés — sans rien cacher ni verrouiller : la grille complète des
 * parcours reste affichée et indexable juste en dessous (bon pour le SEO + la
 * liberté de navigation). Le niveau est mémorisé en localStorage.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sprout, Target, Rocket, ArrowRight } from "lucide-react";
import { getTrack, type Track, type TrackId } from "@/lib/academy-tracks";
import {
  getAcademyLevel,
  setAcademyLevel,
  type AcademyLevel,
} from "@/lib/academy-progress";

const LEVELS: {
  id: AcademyLevel;
  label: string;
  sub: string;
  Icon: typeof Sprout;
}[] = [
  { id: "debutant", label: "Je débute", sub: "Jamais (ou presque) investi", Icon: Sprout },
  { id: "intermediaire", label: "J'ai déjà investi", sub: "Je veux structurer", Icon: Target },
  { id: "avance", label: "Je maîtrise", sub: "Je veux les sujets pointus", Icon: Rocket },
];

// Point de départ + parcours suivants recommandés selon le niveau déclaré.
const RECO: Record<AcademyLevel, TrackId[]> = {
  debutant: ["debutant", "securite", "arnaques"],
  intermediaire: ["intermediaire", "marche", "plateformes", "fiscalite"],
  avance: ["avance", "trading", "defi", "nft-web3"],
};

export default function AcademyLevelGuide() {
  const [hydrated, setHydrated] = useState(false);
  const [level, setLevel] = useState<AcademyLevel | null>(null);

  useEffect(() => {
    setHydrated(true);
    setLevel(getAcademyLevel());
  }, []);

  function choose(l: AcademyLevel) {
    setLevel(l);
    setAcademyLevel(l);
  }

  const reco: Track[] =
    hydrated && level
      ? RECO[level].map((id) => getTrack(id)).filter((t): t is Track => t !== null)
      : [];
  const entry = reco[0] ?? null;
  const nextOnes = reco.slice(1);

  return (
    <section
      aria-labelledby="level-h"
      className="rounded-2xl border border-border bg-surface/60 p-6 sm:p-8"
    >
      <h2 id="level-h" className="text-xl font-bold tracking-tight text-fg">
        Par où commencer ?
      </h2>
      <p className="mt-1 text-sm text-muted">
        Dites-nous où vous en êtes — on vous montre votre point de départ idéal. Vous restez
        libre de suivre n&apos;importe quel parcours : rien n&apos;est verrouillé.
      </p>

      {/* Sélecteur de niveau */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {LEVELS.map(({ id, label, sub, Icon }) => {
          const active = hydrated && level === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              aria-pressed={active}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                active
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-elevated/40 hover:border-primary/30"
              }`}
            >
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  active
                    ? "bg-primary text-background"
                    : "bg-primary/10 text-primary-glow"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-fg">
                  {label}
                </span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Recommandation selon le niveau */}
      {hydrated && entry && (
        <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-soft">
            Votre point de départ recommandé
          </p>
          <Link
            href={`/academie/${entry.id}`}
            className="mt-1 inline-flex items-center gap-2 text-lg font-bold text-fg transition-colors hover:text-primary-glow"
          >
            Parcours {entry.title}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {nextOnes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted">Puis, à votre rythme :</p>
              <ul role="list" className="mt-2 flex flex-wrap gap-2">
                {nextOnes.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/academie/${t.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-medium text-fg/80 transition-colors hover:border-primary/40 hover:text-fg"
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

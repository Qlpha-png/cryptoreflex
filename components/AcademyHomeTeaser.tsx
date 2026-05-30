/**
 * <AcademyHomeTeaser /> — encart Académie sur la home.
 *
 * Refonte 30/05/2026 (feedback Kev « range la home, les doublons sont
 * inutiles ») : remplace l'ancien <BeginnerJourney /> (parcours débutant en
 * 4 étapes) qui doublonnait désormais le parcours « Débutant » de l'Académie.
 * La home n'expose plus qu'UNE porte d'entrée propre vers /academie — le lieu
 * unique de l'apprentissage structuré.
 *
 * Server Component pur (0 KB JS shippé). Le titre + l'intro + le CTA principal
 * vers /academie sont portés par le <CategoryHeader /> de la home ; ce
 * composant ne rend que le contenu : stats globales, 4 parcours phares, et la
 * réassurance pédagogique (quiz, progression, certificat).
 */

import Link from "next/link";
import {
  ArrowRight,
  Sprout,
  Target,
  Rocket,
  Shield,
  Landmark,
  Scale,
  Coins,
  BadgeCheck,
  ListChecks,
  Save,
} from "lucide-react";
import { TRACKS, getTrack, type Track } from "@/lib/academy-tracks";

// Même mapping que <TrackCard /> — garde la cohérence visuelle des parcours.
const ICONS = {
  sprout: Sprout,
  target: Target,
  rocket: Rocket,
  shield: Shield,
  landmark: Landmark,
  scale: Scale,
  coins: Coins,
} as const;

const LEVEL_LABELS: Record<Track["level"], string> = {
  Beginner: "Débutant",
  Intermediate: "Intermédiaire",
  Advanced: "Avancé",
};

// Parcours phares mis en avant sur la home : le chemin FR le plus utile
// (démarrer → où acheter → se protéger → déclarer). Le reste des parcours
// est accessible via le CTA « Découvrir l'académie » du CategoryHeader.
const FEATURED_IDS = ["debutant", "plateformes", "securite", "fiscalite"] as const;

export default function AcademyHomeTeaser() {
  const trackCount = TRACKS.length;
  const lessonCount = TRACKS.reduce((sum, t) => sum + t.lessons.length, 0);
  const totalHours = Math.round(
    TRACKS.reduce((sum, t) => sum + t.estimatedHours, 0)
  );

  const featured = FEATURED_IDS.map((id) => getTrack(id)).filter(
    (t): t is Track => t !== null
  );

  const stats: { value: string; label: string }[] = [
    { value: String(trackCount), label: "parcours" },
    { value: String(lessonCount), label: "leçons" },
    { value: `~${totalHours}h`, label: "de contenu" },
    { value: "0 €", label: "toujours gratuit" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
      {/* Stats globales de l'académie */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-elevated/40 p-4 text-center"
          >
            <dt className="sr-only">{s.label}</dt>
            <dd>
              <span className="block text-2xl font-extrabold tabular-nums gradient-text sm:text-3xl">
                {s.value}
              </span>
              <span className="mt-1 block text-xs uppercase tracking-wider text-muted">
                {s.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      {/* 4 parcours phares */}
      <ul role="list" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((track) => {
          const Icon = ICONS[track.iconKey];
          return (
            <li key={track.id}>
              <Link
                href={`/academie/${track.id}`}
                aria-label={`Parcours ${track.title} — ${track.lessons.length} leçons, niveau ${LEVEL_LABELS[track.level]}`}
                className={`group relative flex h-full flex-col rounded-2xl border bg-gradient-to-br p-5 transition-all hover:shadow-glow-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${track.accentClass}`}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-background/40 text-primary-glow">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold tracking-tight text-fg">
                  {track.title}
                </h3>
                <p className="mt-1 font-mono text-xs text-muted">
                  {track.lessons.length} leçons · {LEVEL_LABELS[track.level]}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow">
                  Commencer
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Réassurance pédagogique — ce qui rend ça « académie » et pas un blog */}
      <ul
        role="list"
        className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-fg/70"
      >
        <li className="inline-flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary-soft" aria-hidden="true" />
          Quiz de validation par parcours
        </li>
        <li className="inline-flex items-center gap-2">
          <Save className="h-4 w-4 text-primary-soft" aria-hidden="true" />
          Progression sauvegardée, sans compte
        </li>
        <li className="inline-flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-primary-soft" aria-hidden="true" />
          Certificat téléchargeable
        </li>
      </ul>
    </div>
  );
}

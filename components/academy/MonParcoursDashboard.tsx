"use client";

/**
 * <MonParcoursDashboard /> — tableau de bord personnel de l'académie (Client).
 *
 * Agrège la progression locale (localStorage) sur TOUS les parcours :
 * anneau de progression global, tuiles de stats, grille des parcours avec
 * barre + statut, section certificats. Aucune donnée envoyée à un serveur,
 * aucune PII — tout vit dans le navigateur.
 *
 * Hydratation safe : valeurs neutres (0) au SSR/1er rendu, puis lecture réelle
 * du localStorage après montage (même pattern que <ProgressTracker />).
 */

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Flame,
  GraduationCap,
  Trophy,
  Sprout,
  Target,
  Rocket,
  Shield,
  Landmark,
  Scale,
  Coins,
  ShieldAlert,
  BarChart3,
  CandlestickChart,
  Palette,
} from "lucide-react";
import {
  TRACKS,
  getTrack,
  CURSUS_ORDER,
  type Track,
} from "@/lib/academy-tracks";
import {
  calculateProgress,
  getProgress,
  isQuizPassed,
  getStreak,
  touchStreak,
} from "@/lib/academy-progress";
import ProgressBackupCard from "@/components/academy/ProgressBackupCard";

const ICONS = {
  sprout: Sprout,
  target: Target,
  rocket: Rocket,
  shield: Shield,
  landmark: Landmark,
  scale: Scale,
  coins: Coins,
  alert: ShieldAlert,
  chart: BarChart3,
  candlestick: CandlestickChart,
  palette: Palette,
} as const;

const LEVEL_LABELS = {
  Beginner: "Débutant",
  Intermediate: "Intermédiaire",
  Advanced: "Avancé",
} as const;

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

export default function MonParcoursDashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [streak, setStreak] = useState({ current: 0, best: 0 });

  useEffect(() => {
    setHydrated(true);
    // Mise à jour du streak si au moins 1 leçon déjà complétée
    const today = new Date().toISOString().slice(0, 10);
    const s = touchStreak(today);
    setStreak({ current: s.current, best: s.best });
  }, []);

  // Parcours dans l'ordre pédagogique du cursus.
  const ordered = CURSUS_ORDER.map((id) => getTrack(id)).filter(
    (t): t is Track => t !== null
  );

  const rows = ordered.map((track) => {
    const pct = hydrated ? calculateProgress(track.id, track.lessons) : 0;
    const certified = hydrated ? isQuizPassed(track.id) : false;
    const doneCount = hydrated
      ? getProgress(track.id).completedLessons.filter((s) =>
          track.lessons.some((l) => l.articleSlug === s)
        ).length
      : 0;
    return { track, pct, certified, doneCount };
  });

  const totalLessons = ordered.reduce((a, t) => a + t.lessons.length, 0);
  const lessonsDone = rows.reduce((a, r) => a + r.doneCount, 0);
  const tracksDone = rows.filter((r) => r.pct === 100).length;
  const certifiedCount = rows.filter((r) => r.certified).length;
  const globalPct = totalLessons
    ? Math.round((lessonsDone / totalLessons) * 100)
    : 0;
  const resume = rows.find((r) => r.pct > 0 && r.pct < 100)?.track
    ?? rows.find((r) => r.pct === 0)?.track
    ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
        <Link href="/" className="hover:text-fg">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <Link href="/academie" className="hover:text-fg">
          Académie
        </Link>
        <span className="mx-2">/</span>
        <span className="text-fg/80">Mon parcours</span>
      </nav>

      {/* Hero */}
      <header className="mt-6 max-w-3xl">
        <span className="badge-info">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          Tableau de bord · 100% local
        </span>
        <h1 className="mt-3 ds-h1 leading-[1.1]">
          Mon <span className="text-gradient-gold">parcours</span>
        </h1>
        <p className="mt-4 ds-lead">
          Ta progression sur les {TRACKS.length} parcours de l&apos;académie,
          suivie dans ton navigateur — sans compte, sans email.
        </p>
      </header>

      {/* Carte résumé : anneau global + tuiles */}
      <section
        aria-labelledby="resume-h"
        className="mt-8 grid items-center gap-6 rounded-2xl border border-border bg-surface/60 p-6 sm:p-8 lg:grid-cols-[auto_1fr]"
      >
        <h2 id="resume-h" className="sr-only">
          Résumé de ta progression
        </h2>

        {/* Anneau de progression global */}
        <div className="relative mx-auto h-36 w-36 shrink-0">
          <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={RING_R}
              fill="none"
              strokeWidth="10"
              className="stroke-elevated"
            />
            <circle
              cx="60"
              cy="60"
              r={RING_R}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              stroke="url(#ringGold)"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - globalPct / 100)}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="ringGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="rgb(245 165 36)" />
                <stop offset="1" stopColor="rgb(250 204 21)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-extrabold text-fg tabular-nums">
              {globalPct}%
            </span>
            <span className="text-[11px] uppercase tracking-wider text-muted">
              du cursus
            </span>
          </div>
        </div>

        {/* Tuiles de stats */}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
            value={`${tracksDone}/${ordered.length}`}
            label="Parcours terminés"
          />
          <StatTile
            icon={<Award className="h-5 w-5" aria-hidden="true" />}
            value={String(certifiedCount)}
            label="Certificats validés"
          />
          <StatTile
            icon={<BookOpenCheck className="h-5 w-5" aria-hidden="true" />}
            value={`${lessonsDone}/${totalLessons}`}
            label="Leçons terminées"
          />
          <StatTile
            icon={
              <Flame
                className={`h-5 w-5 ${hydrated && streak.current >= 3 ? "text-orange-400" : ""}`}
                aria-hidden="true"
              />
            }
            value={hydrated ? `${streak.current}j` : "0j"}
            label={`Série (record ${hydrated ? streak.best : 0}j)`}
          />
        </dl>
      </section>

      {/* Reprendre */}
      {resume && (
        <Link
          href={`/academie/${resume.id}`}
          className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-5 py-3.5 text-sm font-semibold text-primary-glow transition-colors hover:bg-primary/20"
        >
          <span>
            {lessonsDone > 0 ? "Reprendre" : "Commencer"} — parcours {resume.title}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      )}

      {/* Grille des parcours */}
      <section aria-labelledby="tracks-h" className="mt-10">
        <h2
          id="tracks-h"
          className="text-2xl font-bold tracking-tight text-fg"
        >
          Tes {ordered.length} parcours
        </h2>
        <ul role="list" className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ track, pct, certified, doneCount }) => {
            const Icon = ICONS[track.iconKey];
            const status = certified
              ? { label: "Certifié", cls: "text-amber-300 border-amber-400/40 bg-amber-400/10" }
              : pct === 100
                ? { label: "Terminé", cls: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10" }
                : pct > 0
                  ? { label: "En cours", cls: "text-primary-glow border-primary/40 bg-primary/10" }
                  : { label: "À commencer", cls: "text-muted border-border bg-elevated/40" };
            return (
              <li key={track.id}>
                <Link
                  href={`/academie/${track.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-glow">
                      {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.cls}`}
                    >
                      {(certified || pct === 100) && (
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      )}
                      {status.label}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-fg group-hover:text-primary-glow transition-colors">
                    {track.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">
                    {LEVEL_LABELS[track.level]}
                  </p>

                  {/* Barre de progression */}
                  <div className="mt-auto pt-4">
                    <div
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progression ${track.title} : ${pct}%`}
                      className="h-2 w-full overflow-hidden rounded-full bg-elevated"
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                      <span>
                        {doneCount}/{track.lessons.length} leçons
                      </span>
                      <span className="font-mono font-semibold text-fg/80">
                        {pct}%
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Certificats obtenus */}
      {certifiedCount > 0 && (
        <section
          aria-labelledby="certs-h"
          className="mt-10 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6"
        >
          <h2
            id="certs-h"
            className="flex items-center gap-2 text-lg font-bold text-fg"
          >
            <Award className="h-5 w-5 text-amber-300" aria-hidden="true" />
            Tes certificats ({certifiedCount})
          </h2>
          <ul role="list" className="mt-4 grid gap-2 sm:grid-cols-2">
            {rows
              .filter((r) => r.certified)
              .map(({ track }) => (
                <li key={track.id}>
                  <Link
                    href={`/academie/${track.id}/quiz`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-4 py-2.5 text-sm text-fg/90 transition-colors hover:border-amber-400/40"
                  >
                    <span>Certificat — {track.title}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Sauvegarde / restauration */}
      <ProgressBackupCard />

      {/* Note + lien retour */}
      <p className="mt-8 text-center text-xs text-muted">
        Ta progression est sauvegardée localement (localStorage), sur cet
        appareil et ce navigateur.{" "}
        <Link
          href="/academie"
          className="text-primary-soft underline underline-offset-2 hover:text-primary"
        >
          Voir tous les parcours
        </Link>
      </p>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary-glow">
        {icon}
      </div>
      <dd className="mt-2 font-mono text-xl font-extrabold text-fg tabular-nums">
        {value}
      </dd>
      <dt className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </dt>
    </div>
  );
}

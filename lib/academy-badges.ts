/**
 * academy-badges — badges de paliers de l'académie (DA Obsidian sprint 3).
 *
 * Philosophie : ZÉRO nouveau stockage. Tous les badges sont DÉRIVÉS de
 * l'état existant (lib/academy-progress : leçons complétées, quiz passés,
 * streak). Pas de table, pas de clé localStorage en plus, pas de risque
 * de désynchronisation — on calcule à l'affichage.
 *
 * Client-only par nature (localStorage) : appeler depuis un composant
 * client après mount (même contrat que getProgress/getStreak qui
 * renvoient l'état vide côté serveur).
 */

import type { Track } from "@/lib/academy-tracks";
import {
  getProgress,
  getStreak,
  isQuizPassed,
  isTrackComplete,
} from "@/lib/academy-progress";

export interface AcademyBadge {
  id: string;
  /** Libellé court (affiché sous l'icône). */
  label: string;
  /** Condition d'obtention, formulée à la 2e personne (vouvoiement). */
  description: string;
  /** Clé d'icône lucide résolue par le composant d'affichage. */
  iconKey: "sprout" | "compass" | "flame" | "trophy" | "star" | "zap" | "crown" | "target";
  earned: boolean;
}

export interface BadgeInputs {
  totalCompletedLessons: number;
  startedTracks: number;
  completedTracks: number;
  totalTracks: number;
  globalProgressPct: number;
  quizzesPassed: number;
  bestStreak: number;
}

/**
 * Cœur PUR du calcul (testable sans localStorage) : reçoit les agrégats,
 * renvoie la liste ordonnée des badges avec leur statut.
 */
export function computeBadgesFromInputs(inputs: BadgeInputs): AcademyBadge[] {
  const {
    totalCompletedLessons,
    startedTracks,
    completedTracks,
    totalTracks,
    globalProgressPct,
    quizzesPassed,
    bestStreak,
  } = inputs;

  return [
    {
      id: "premier-pas",
      label: "Premier pas",
      description: "Terminez votre première leçon.",
      iconKey: "sprout",
      earned: totalCompletedLessons >= 1,
    },
    {
      id: "explorateur",
      label: "Explorateur",
      description: "Entamez 3 parcours différents.",
      iconKey: "compass",
      earned: startedTracks >= 3,
    },
    {
      id: "serie-3",
      label: "Série de 3",
      description: "Apprenez 3 jours d'affilée.",
      iconKey: "flame",
      earned: bestStreak >= 3,
    },
    {
      id: "quiz-valide",
      label: "Quiz validé",
      description: "Réussissez le quiz d'un parcours.",
      iconKey: "target",
      earned: quizzesPassed >= 1,
    },
    {
      id: "premier-parcours",
      label: "Parcours complet",
      description: "Terminez toutes les leçons d'un parcours.",
      iconKey: "trophy",
      earned: completedTracks >= 1,
    },
    {
      id: "mi-chemin",
      label: "Mi-chemin",
      description: "Atteignez 50 % de progression globale.",
      iconKey: "star",
      earned: globalProgressPct >= 50,
    },
    {
      id: "serie-7",
      label: "Semaine parfaite",
      description: "Apprenez 7 jours d'affilée.",
      iconKey: "zap",
      earned: bestStreak >= 7,
    },
    {
      id: "maitre",
      label: "Maître Académie",
      description: "Terminez tous les parcours.",
      iconKey: "crown",
      earned: totalTracks > 0 && completedTracks >= totalTracks,
    },
  ];
}

/**
 * Agrège l'état localStorage des tracks fournis puis délègue au calcul pur.
 */
export function computeBadges(tracks: Track[]): AcademyBadge[] {
  let totalCompletedLessons = 0;
  let startedTracks = 0;
  let completedTracks = 0;
  let totalLessons = 0;
  let quizzesPassed = 0;

  for (const track of tracks) {
    const progress = getProgress(track.id);
    totalCompletedLessons += progress.completedLessons.length;
    totalLessons += track.lessons.length;
    if (progress.completedLessons.length > 0) startedTracks += 1;
    if (isTrackComplete(track.id, track.lessons)) completedTracks += 1;
    if (isQuizPassed(track.id)) quizzesPassed += 1;
  }

  const streak = getStreak();

  return computeBadgesFromInputs({
    totalCompletedLessons,
    startedTracks,
    completedTracks,
    totalTracks: tracks.length,
    globalProgressPct:
      totalLessons > 0
        ? Math.round((totalCompletedLessons / totalLessons) * 100)
        : 0,
    quizzesPassed,
    bestStreak: streak.best,
  });
}

/**
 * lib/academy-progress.ts — Helpers de progression Académie (localStorage).
 *
 * Ce module est PURE et CLIENT-SIDE :
 *   - Aucune dépendance Next.js / React.
 *   - Toutes les fonctions vérifient `typeof window` avant tout accès au
 *     localStorage. Importable depuis un Server Component sans crash, même
 *     si l'appel réel (lecture/écriture) doit se faire côté client.
 *   - Aucune PII stockée : on n'enregistre que des slugs et un timestamp.
 *
 * Schéma localStorage :
 *   key   : `cr.academy.progress.<trackId>`
 *   value : { completedLessons: string[]; lastLessonAt: number; v: 1 }
 *
 * Le préfixe `cr.academy.progress.` permet un cleanup ciblé sans
 * collision avec d'autres features (watchlist, portfolio, abtest…).
 */

import type { Lesson } from "./academy-tracks";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

const STORAGE_PREFIX = "cr.academy.progress.";
const SCHEMA_VERSION = 1 as const;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface TrackProgress {
  /** Slugs d'articles marqués comme terminés dans ce track. */
  completedLessons: string[];
  /** Timestamp ms (Date.now()) du dernier marquage de leçon. 0 si jamais. */
  lastLessonAt: number;
  /** Version du schéma — utile pour migrations futures. */
  v: typeof SCHEMA_VERSION;
}

const EMPTY_PROGRESS: TrackProgress = {
  completedLessons: [],
  lastLessonAt: 0,
  v: SCHEMA_VERSION,
};

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

function storageKey(trackId: string): string {
  return `${STORAGE_PREFIX}${trackId}`;
}

/** True si on est dans un environnement avec localStorage utilisable. */
function hasStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Safari private mode peut throw sur l'accès — on teste défensivement.
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

/** Parse + valide la valeur stockée ; renvoie une copie de EMPTY_PROGRESS sinon. */
function parseStored(raw: string | null): TrackProgress {
  if (!raw) return { ...EMPTY_PROGRESS, completedLessons: [] };
  try {
    const obj = JSON.parse(raw) as Partial<TrackProgress>;
    if (
      obj &&
      Array.isArray(obj.completedLessons) &&
      typeof obj.lastLessonAt === "number"
    ) {
      // On filtre les valeurs invalides pour rester defensive.
      const cleanLessons = obj.completedLessons.filter(
        (s): s is string => typeof s === "string" && s.length > 0
      );
      return {
        completedLessons: Array.from(new Set(cleanLessons)),
        lastLessonAt: obj.lastLessonAt,
        v: SCHEMA_VERSION,
      };
    }
  } catch {
    // JSON invalide → on reset proprement.
  }
  return { ...EMPTY_PROGRESS, completedLessons: [] };
}

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Lit la progression d'un track. Renvoie un objet vide si aucun storage
 * n'est dispo (SSR, Safari private…) ou si rien n'a encore été enregistré.
 */
export function getProgress(trackId: string): TrackProgress {
  if (!hasStorage()) return { ...EMPTY_PROGRESS, completedLessons: [] };
  try {
    return parseStored(window.localStorage.getItem(storageKey(trackId)));
  } catch {
    return { ...EMPTY_PROGRESS, completedLessons: [] };
  }
}

/**
 * Marque une leçon comme terminée. Idempotent : appeler plusieurs fois
 * avec le même slug ne fait rien (mais met `lastLessonAt` à jour).
 *
 * Renvoie l'état après écriture pour faciliter le setState() côté React.
 */
export function markLessonComplete(
  trackId: string,
  lessonSlug: string
): TrackProgress {
  if (!hasStorage()) return { ...EMPTY_PROGRESS, completedLessons: [] };
  const current = getProgress(trackId);
  const set = new Set(current.completedLessons);
  set.add(lessonSlug);
  const updated: TrackProgress = {
    completedLessons: Array.from(set),
    lastLessonAt: Date.now(),
    v: SCHEMA_VERSION,
  };
  try {
    window.localStorage.setItem(storageKey(trackId), JSON.stringify(updated));
  } catch {
    // Quota plein ou storage off → on retourne quand même l'état "voulu".
  }
  return updated;
}

/**
 * Inverse de `markLessonComplete` — retire une leçon de la progression.
 * Utile pour permettre à l'utilisateur de "re-faire" une leçon.
 */
export function unmarkLessonComplete(
  trackId: string,
  lessonSlug: string
): TrackProgress {
  if (!hasStorage()) return { ...EMPTY_PROGRESS, completedLessons: [] };
  const current = getProgress(trackId);
  const filtered = current.completedLessons.filter((s) => s !== lessonSlug);
  const updated: TrackProgress = {
    completedLessons: filtered,
    lastLessonAt: filtered.length > 0 ? current.lastLessonAt : 0,
    v: SCHEMA_VERSION,
  };
  try {
    window.localStorage.setItem(storageKey(trackId), JSON.stringify(updated));
  } catch {
    /* noop */
  }
  return updated;
}

/**
 * Calcule la progression en pourcentage (0–100) d'un track donné.
 *
 * Le caller passe la liste des leçons "officielles" du track, ce qui évite
 * de coupler ce module à `academy-tracks.ts` et permet de tester sans
 * dépendance circulaire. Les leçons "completed" qui n'existent plus dans
 * le track (ex: lesson supprimée) ne comptent PAS dans le pourcentage.
 */
export function calculateProgress(trackId: string, lessons: Lesson[]): number {
  if (lessons.length === 0) return 0;
  const progress = getProgress(trackId);
  const validSlugs = new Set(lessons.map((l) => l.articleSlug));
  const completedInTrack = progress.completedLessons.filter((s) =>
    validSlugs.has(s)
  ).length;
  return Math.round((completedInTrack / lessons.length) * 100);
}

/**
 * True si TOUTES les leçons du track sont marquées comme terminées.
 * Utilisé pour débloquer le quiz et le certificat.
 */
export function isTrackComplete(trackId: string, lessons: Lesson[]): boolean {
  if (lessons.length === 0) return false;
  return calculateProgress(trackId, lessons) === 100;
}

/** Reset d'un track. Renvoie un état vide. */
export function resetProgress(trackId: string): TrackProgress {
  if (!hasStorage()) return { ...EMPTY_PROGRESS, completedLessons: [] };
  try {
    window.localStorage.removeItem(storageKey(trackId));
  } catch {
    /* noop */
  }
  return { ...EMPTY_PROGRESS, completedLessons: [] };
}

/** Index de la prochaine leçon non-complétée (ou -1 si tout fait). */
export function getNextLessonIndex(
  trackId: string,
  lessons: Lesson[]
): number {
  const progress = getProgress(trackId);
  const done = new Set(progress.completedLessons);
  return lessons.findIndex((l) => !done.has(l.articleSlug));
}

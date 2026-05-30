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

/* -------------------------------------------------------------------------- */
/*  Quiz / certificat — persistance légère (localStorage, aucune PII)         */
/* -------------------------------------------------------------------------- */

const QUIZ_PREFIX = "cr.academy.quiz.";

/** Enregistre la réussite du quiz d'un parcours (score, timestamp). */
export function markQuizPassed(trackId: string, score: number): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(
      `${QUIZ_PREFIX}${trackId}`,
      JSON.stringify({ passed: true, score, at: Date.now() })
    );
  } catch {
    /* quota/off → noop */
  }
}

/** True si le quiz du parcours a déjà été validé sur cet appareil. */
export function isQuizPassed(trackId: string): boolean {
  if (!hasStorage()) return false;
  try {
    const raw = window.localStorage.getItem(`${QUIZ_PREFIX}${trackId}`);
    if (!raw) return false;
    const obj = JSON.parse(raw) as { passed?: boolean };
    return obj?.passed === true;
  } catch {
    return false;
  }
}

/** Infos de quiz (passed, score, timestamp ms) — null si jamais passé. */
export function getQuizInfo(
  trackId: string
): { passed: boolean; score: number; at: number } | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(`${QUIZ_PREFIX}${trackId}`);
    if (!raw) return null;
    const obj = JSON.parse(raw) as {
      passed?: boolean;
      score?: number;
      at?: number;
    };
    return {
      passed: obj?.passed === true,
      score: typeof obj?.score === "number" ? obj.score : 0,
      at: typeof obj?.at === "number" ? obj.at : 0,
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Niveau auto-déclaré — guide (SOFT) le point de départ du cursus           */
/*  Ne cache/verrouille RIEN : sert juste à recommander un parcours d'entrée. */
/* -------------------------------------------------------------------------- */

export type AcademyLevel = "debutant" | "intermediaire" | "avance";
const LEVEL_KEY = "cr.academy.level";

/** Niveau choisi par l'utilisateur (null si non renseigné). */
export function getAcademyLevel(): AcademyLevel | null {
  if (!hasStorage()) return null;
  try {
    const v = window.localStorage.getItem(LEVEL_KEY);
    return v === "debutant" || v === "intermediaire" || v === "avance"
      ? v
      : null;
  } catch {
    return null;
  }
}

/** Mémorise le niveau auto-déclaré (localStorage). */
export function setAcademyLevel(level: AcademyLevel): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(LEVEL_KEY, level);
  } catch {
    /* noop */
  }
}

/* -------------------------------------------------------------------------- */
/*  Streak — compteur de jours consécutifs d'activité (gamification légère)   */
/*  Clé localStorage : "cr.academy.streak"                                    */
/*  { current: number; best: number; lastActiveDate: string (YYYY-MM-DD) }    */
/* -------------------------------------------------------------------------- */

const STREAK_KEY = "cr.academy.streak";

interface StreakData {
  current: number;
  best: number;
  lastActiveDate: string; // "YYYY-MM-DD"
}

/** Lit le streak actuel (0 si jamais initié). */
export function getStreak(): StreakData {
  if (!hasStorage()) return { current: 0, best: 0, lastActiveDate: "" };
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, best: 0, lastActiveDate: "" };
    const obj = JSON.parse(raw) as Partial<StreakData>;
    return {
      current: typeof obj.current === "number" ? obj.current : 0,
      best: typeof obj.best === "number" ? obj.best : 0,
      lastActiveDate: typeof obj.lastActiveDate === "string" ? obj.lastActiveDate : "",
    };
  } catch {
    return { current: 0, best: 0, lastActiveDate: "" };
  }
}

/**
 * À appeler quand l'utilisateur accomplit une action (leçon complétée, quiz…).
 * Met à jour le streak selon la date du jour passée en paramètre (format
 * YYYY-MM-DD). On passe la date en argument pour éviter Date.now() dans un
 * contexte potentiellement SSR.
 */
export function touchStreak(todayISO: string): StreakData {
  if (!hasStorage()) return { current: 0, best: 0, lastActiveDate: "" };
  const prev = getStreak();

  if (prev.lastActiveDate === todayISO) {
    // Déjà actif aujourd'hui — pas de changement
    return prev;
  }

  // Vérifie si hier était le dernier jour actif
  const prevDate = prev.lastActiveDate ? new Date(prev.lastActiveDate) : null;
  const today = new Date(todayISO);
  const diff = prevDate
    ? Math.round((today.getTime() - prevDate.getTime()) / 86_400_000)
    : 0;

  const newCurrent = diff === 1 ? prev.current + 1 : 1;
  const newBest = Math.max(newCurrent, prev.best);
  const updated: StreakData = {
    current: newCurrent,
    best: newBest,
    lastActiveDate: todayISO,
  };
  try {
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  } catch {
    /* noop */
  }
  return updated;
}

/* -------------------------------------------------------------------------- */
/*  Sauvegarde / restauration — anti-perte, sans compte (code à copier)       */
/*  Permet de transférer sa progression vers un autre appareil/navigateur ou  */
/*  de la récupérer après un vidage de cache.                                 */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Notes personnelles par leçon — carnet privé (localStorage, jamais envoyé) */
/*  Clé : "cr.academy.notes.<slug>"                                           */
/* -------------------------------------------------------------------------- */

const NOTES_PREFIX = "cr.academy.notes.";

/** Lit la note personnelle d'une leçon (chaîne vide si aucune). */
export function getLessonNote(slug: string): string {
  if (!hasStorage()) return "";
  try {
    return window.localStorage.getItem(`${NOTES_PREFIX}${slug}`) ?? "";
  } catch {
    return "";
  }
}

/** Enregistre (ou efface si vide) la note personnelle d'une leçon. */
export function setLessonNote(slug: string, text: string): void {
  if (!hasStorage()) return;
  try {
    if (text.trim().length === 0) {
      window.localStorage.removeItem(`${NOTES_PREFIX}${slug}`);
    } else {
      window.localStorage.setItem(`${NOTES_PREFIX}${slug}`, text);
    }
  } catch {
    /* quota/off → noop */
  }
}

/** True si la clé localStorage appartient à l'académie (progress/quiz/niveau/streak/notes). */
function isAcademyKey(k: string): boolean {
  return (
    k.startsWith(STORAGE_PREFIX) ||
    k.startsWith(QUIZ_PREFIX) ||
    k === LEVEL_KEY ||
    k === STREAK_KEY ||
    k.startsWith(NOTES_PREFIX)
  );
}

/** Exporte toute la progression académie en un code (base64) à copier/sauver. */
export function exportAcademyData(): string {
  if (!hasStorage()) return "";
  try {
    const data: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && isAcademyKey(k)) {
        const val = window.localStorage.getItem(k);
        if (val != null) data[k] = val;
      }
    }
    return btoa(JSON.stringify({ v: 1, data }));
  } catch {
    return "";
  }
}

/* -------------------------------------------------------------------------- */
/*  Partage de certificats — lien encodé, 0 backend, 0 PII obligatoire        */
/*  Payload : { v:1, t: trackIds[], n?: prénom optionnel saisi par l'user }   */
/* -------------------------------------------------------------------------- */

export interface CertSharePayload {
  v: 1;
  t: string[];
  n?: string;
}

/** Encode la liste des parcours validés (+ prénom optionnel) en code base64. */
export function encodeCertShare(trackIds: string[], name?: string): string {
  const clean = trackIds.filter((x) => typeof x === "string" && x.length > 0);
  const payload: CertSharePayload = { v: 1, t: clean };
  const trimmed = name?.trim();
  if (trimmed) payload.n = trimmed.slice(0, 40);
  try {
    // encodeURIComponent + unescape : btoa() ne gère pas l'UTF-8 (accents) seul.
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch {
    return "";
  }
}

/** Décode un code de partage. Renvoie null si invalide. */
export function decodeCertShare(code: string): CertSharePayload | null {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const obj = JSON.parse(json) as CertSharePayload;
    if (!obj || !Array.isArray(obj.t)) return null;
    return {
      v: 1,
      t: obj.t.filter((x) => typeof x === "string"),
      n: typeof obj.n === "string" ? obj.n.slice(0, 40) : undefined,
    };
  } catch {
    return null;
  }
}

/** Restaure la progression depuis un code exporté. Renvoie true si au moins une clé restaurée. */
export function importAcademyData(code: string): boolean {
  if (!hasStorage()) return false;
  try {
    const parsed = JSON.parse(atob(code.trim())) as {
      data?: Record<string, string>;
    };
    if (!parsed || typeof parsed.data !== "object" || parsed.data === null) {
      return false;
    }
    let restored = 0;
    for (const [k, val] of Object.entries(parsed.data)) {
      if (typeof val === "string" && isAcademyKey(k)) {
        window.localStorage.setItem(k, val);
        restored++;
      }
    }
    return restored > 0;
  } catch {
    return false;
  }
}

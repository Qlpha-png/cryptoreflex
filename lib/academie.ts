/**
 * lib/academie.ts — Loader & API publique de l'Académie crypto Cryptoreflex.
 *
 * V1 minimale (Sprint 3) :
 *   - 15 leçons hardcodées dans `data/academie.json`
 *   - 3 niveaux : débutant / intermédiaire / avancé (5 leçons par niveau)
 *   - Chaque leçon pointe vers une URL existante du site (article blog,
 *     outil, glossaire, fiche crypto…)
 *
 * V2 prévue (cf. plan) : ajouter des leçons natives /academie/[slug] avec
 * MDX dédié, progress utilisateur en localStorage, mini-quiz par leçon.
 *
 * Toutes les fonctions sont synchrones et SSR-friendly (pas de fetch/IO).
 */

import academieData from "@/data/academie.json";

export type AcademyLevel = "debutant" | "intermediaire" | "avance";

export interface AcademyLesson {
  /** Identifiant unique stable. Sert de key React + ancre éventuelle. */
  id: string;
  /** Niveau pédagogique (3 tiers). */
  level: AcademyLevel;
  /** Titre court affiché sur la card. */
  title: string;
  /** Slug kebab-case. Pour l'instant identique à `id`, séparé pour évolution V2. */
  slug: string;
  /**
   * URL cible — peut être une route blog (`/blog/xxx`), un outil
   * (`/outils/xxx`), une page glossaire (`/glossaire/xxx`), une fiche crypto…
   * Tout ce qui existe DÉJÀ dans le site, pour éviter les liens cassés en V1.
   */
  targetUrl: string;
  /** Résumé 1-2 phrases pour la card. */
  summary: string;
  /** Temps de lecture estimé (minutes). */
  readingTime: number;
  /** Ordre d'affichage global (1 → 15). Utilisé pour tri stable. */
  order: number;
}

interface AcademieFile {
  lessons: AcademyLesson[];
}

const DATA = academieData as AcademieFile;

/** Garde anti-faute de frappe : niveaux autorisés. */
const VALID_LEVELS: ReadonlySet<AcademyLevel> = new Set([
  "debutant",
  "intermediaire",
  "avance",
]);

/** Validation runtime — au cas où qq'un édite mal le JSON. */
function isLesson(x: unknown): x is AcademyLesson {
  if (!x || typeof x !== "object") return false;
  const l = x as Record<string, unknown>;
  return (
    typeof l.id === "string" &&
    typeof l.level === "string" &&
    VALID_LEVELS.has(l.level as AcademyLevel) &&
    typeof l.title === "string" &&
    typeof l.slug === "string" &&
    typeof l.targetUrl === "string" &&
    typeof l.summary === "string" &&
    typeof l.readingTime === "number" &&
    typeof l.order === "number"
  );
}

const LESSONS: AcademyLesson[] = (DATA.lessons ?? [])
  .filter(isLesson)
  // Tri stable par order croissant (puis id pour ties).
  .sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/** Toutes les leçons triées par order. */
export function getAcademyLessons(): AcademyLesson[] {
  return LESSONS;
}

/** Sous-ensemble par niveau. */
export function getLessonsByLevel(level: AcademyLevel): AcademyLesson[] {
  return LESSONS.filter((l) => l.level === level);
}

/** Compteur global par niveau (pour les progress bars de la page index). */
export function getLessonCounts(): Record<AcademyLevel, number> {
  const out: Record<AcademyLevel, number> = {
    debutant: 0,
    intermediaire: 0,
    avance: 0,
  };
  for (const l of LESSONS) out[l.level]++;
  return out;
}

/** Métadonnées affichables d'un niveau (label FR + couleur thématique). */
export interface LevelMeta {
  level: AcademyLevel;
  label: string;
  badge: string;
  description: string;
}

export const LEVEL_META: Record<AcademyLevel, LevelMeta> = {
  debutant: {
    level: "debutant",
    label: "Débutant",
    badge: "1",
    description:
      "Tu n'as jamais acheté de crypto. On part de zéro : c'est quoi, comment acheter, comment sécuriser.",
  },
  intermediaire: {
    level: "intermediaire",
    label: "Intermédiaire",
    badge: "2",
    description:
      "Tu détiens déjà quelques cryptos. On va plus loin : DCA, staking, fiscalité, MiCA, choix de stratégie.",
  },
  avance: {
    level: "avance",
    label: "Avancé",
    badge: "3",
    description:
      "Tu maîtrises les bases. On creuse les sujets pointus : L2, DeFi, restaking, stablecoins, allocation portefeuille.",
  },
};

export const LEVELS_ORDER: AcademyLevel[] = [
  "debutant",
  "intermediaire",
  "avance",
];

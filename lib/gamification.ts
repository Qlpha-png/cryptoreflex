/**
 * lib/gamification.ts — XP / Level / Streak / Badges (étude #16 ETUDE-2026-05-02).
 *
 * Architecture :
 *  - Storage : table Supabase `public.user_progress` (1 row par user).
 *  - Anti-spam : KV rate-limit par (userId, action) avant award (cf. award route).
 *  - Course de levée : tous les writes passent par la service role (bypass RLS).
 *    Le client lit via /api/gamification/me (SELECT propre via RLS).
 *
 * Progression douce :
 *  - level = floor(sqrt(xp / 100)) + 1
 *    Lv 1 :     0 XP (start)
 *    Lv 2 :   100 XP   (≈ 20 actions moyennes)
 *    Lv 3 :   400 XP
 *    Lv 5 :  1600 XP
 *    Lv 10 : 8100 XP
 *    Lv 20 : 36 100 XP
 *  - Pas de cap volontaire — l'objectif est la rétention long-terme.
 *
 * Streak :
 *  - +1 si last_seen_date == today - 1 jour
 *  - inchangé si last_seen_date == today (idempotent)
 *  - reset à 1 si gap > 1 jour
 *  - bestStreak = max(bestStreak, streakDays)
 */

import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface UserProgress {
  userId: string;
  xp: number;
  level: number;
  streakDays: number;
  lastSeenDate: string; // ISO YYYY-MM-DD
  bestStreak: number;
  badges: string[];
  updatedAt: string;
}

export interface ProgressDelta {
  /** XP gagnée par cette action. */
  xpDelta: number;
  /** Nouveau total XP. */
  xp: number;
  /** Nouveau niveau (peut être identique au précédent). */
  level: number;
  /** True si le user vient de level-up. */
  levelUp: boolean;
  /** Badges débloqués lors de cette opération (vide si rien de neuf). */
  newBadges: Badge[];
  /** Nouveau streak (jours). */
  streakDays: number;
  /** True si streak vient de se reset (était > 1, repart à 1). */
  streakReset: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name (string, importé côté UI). */
  icon: string;
  /** Critère d'unlock — évalué par checkAndAwardBadges. */
  unlock: (p: UserProgress) => boolean;
}

/* -------------------------------------------------------------------------- */
/*  XP rewards par action                                                     */
/* -------------------------------------------------------------------------- */

export const XP_REWARDS = {
  daily_login: 5,
  quiz_complete: 20,
  portfolio_update: 10,
  alert_create: 5,
  article_read: 3,
  cerfa_generated: 50,
  first_pro_subscription: 100,
} as const satisfies Record<string, number>;

export type XpAction = keyof typeof XP_REWARDS;

/* -------------------------------------------------------------------------- */
/*  Catalogue badges                                                          */
/* -------------------------------------------------------------------------- */

export const BADGES: Badge[] = [
  {
    id: "first_steps",
    name: "Premier Pas",
    description: "Tu as gagné tes 10 premiers XP — bienvenue dans l'aventure.",
    icon: "Sparkles",
    unlock: (p) => p.xp >= 10,
  },
  {
    id: "curious",
    name: "Curieux",
    description: "5 articles lus — la culture crypto se construit jour après jour.",
    icon: "BookOpen",
    unlock: (p) => p.xp >= 15, // proxy : 5 articles × 3 XP = 15
  },
  {
    id: "strategist",
    name: "Stratège",
    description: "Premier portfolio créé — tu suis ton patrimoine sereinement.",
    icon: "Briefcase",
    // Heuristique : portfolio_update donne 10 XP ; ce badge devrait être
    // attribué directement par le code de portfolio (TODO : on évalue ici sur xp ≥ 10).
    unlock: (p) => p.xp >= 10,
  },
  {
    id: "watcher",
    name: "Veilleur",
    description: "10 alertes prix actives — la vigilance avant tout.",
    icon: "Bell",
    unlock: (p) => p.xp >= 50, // proxy : 10 alertes × 5 XP = 50
  },
  {
    id: "tax_pro",
    name: "Tax Pro",
    description: "Cerfa 2086 généré — la fiscalité crypto sans douleur.",
    icon: "FileCheck",
    unlock: (p) => p.xp >= 50, // unique award cerfa = 50 XP (badge auto)
  },
  {
    id: "hodler",
    name: "Hodler",
    description: "90 jours consécutifs — c'est ça, la vraie discipline.",
    icon: "Diamond",
    unlock: (p) => p.bestStreak >= 90,
  },
  {
    id: "diamond_hands",
    name: "Diamond Hands",
    description: "180 jours consécutifs. Tu es au-delà du marché.",
    icon: "Gem",
    unlock: (p) => p.bestStreak >= 180,
  },
  {
    id: "insider",
    name: "Cryptoreflex Insider",
    description: "1 an consécutif. Tu fais partie du noyau dur.",
    icon: "Crown",
    unlock: (p) => p.bestStreak >= 365,
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers level / xp                                                        */
/* -------------------------------------------------------------------------- */

/** Niveau dérivé du total XP. */
export function levelFromXp(xp: number): number {
  if (xp < 0) return 1;
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/** XP requis pour atteindre un niveau donné (inverse de levelFromXp). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * (level - 1) * 100;
}

/** XP restant pour atteindre le niveau suivant. */
export function xpToNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  return Math.max(0, xpForLevel(level + 1) - xp);
}

/** Pourcentage 0-100 de progression vers le niveau suivant. */
export function percentToNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  const xpStart = xpForLevel(level);
  const xpEnd = xpForLevel(level + 1);
  if (xpEnd === xpStart) return 100;
  return Math.min(100, Math.max(0, ((xp - xpStart) / (xpEnd - xpStart)) * 100));
}

/* -------------------------------------------------------------------------- */
/*  Storage Supabase                                                          */
/* -------------------------------------------------------------------------- */

interface ProgressRow {
  user_id: string;
  xp: number;
  level: number;
  streak_days: number;
  last_seen_date: string;
  best_streak: number;
  badges: string[];
  updated_at: string;
}

function rowToProgress(row: ProgressRow): UserProgress {
  return {
    userId: row.user_id,
    xp: row.xp,
    level: row.level,
    streakDays: row.streak_days,
    lastSeenDate: row.last_seen_date,
    bestStreak: row.best_streak,
    badges: Array.isArray(row.badges) ? row.badges : [],
    updatedAt: row.updated_at,
  };
}

/** Crée la row si absente, sinon la retourne. */
export async function getOrCreateProgress(
  userId: string,
): Promise<UserProgress | null> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return null;

  const { data: existing, error: selectErr } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectErr) {
    console.warn("[gamification] select error:", selectErr.message);
    return null;
  }
  if (existing) return rowToProgress(existing as ProgressRow);

  // Insert avec defaults
  const { data: inserted, error: insertErr } = await supabase
    .from("user_progress")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    console.warn("[gamification] insert error:", insertErr?.message);
    return null;
  }
  return rowToProgress(inserted as ProgressRow);
}

/* -------------------------------------------------------------------------- */
/*  Logique principale : awardXp                                              */
/* -------------------------------------------------------------------------- */

/**
 * Award XP pour une action donnée + met à jour streak + check badges.
 *
 * Anti-spam : NON implémenté ici, à faire côté caller (route API) avec
 * KV rate-limit par (userId, action). Cette fonction ne fait que du write DB.
 */
export async function awardXp(
  userId: string,
  action: XpAction,
  customAmount?: number,
): Promise<ProgressDelta | null> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return null;

  const current = await getOrCreateProgress(userId);
  if (!current) return null;

  const xpDelta = customAmount ?? XP_REWARDS[action];
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // --- Streak logic ---
  const lastSeen = current.lastSeenDate;
  let newStreak = current.streakDays;
  let streakReset = false;
  if (lastSeen === today) {
    // Idempotent — pas de changement
  } else {
    const lastSeenMs = new Date(lastSeen).getTime();
    const todayMs = new Date(today).getTime();
    const diffDays = Math.round((todayMs - lastSeenMs) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      newStreak = current.streakDays + 1;
    } else if (diffDays > 1) {
      streakReset = current.streakDays > 1;
      newStreak = 1; // nouvelle visite après break = day 1
    }
    // diffDays === 0 ne devrait pas arriver (déjà couvert par lastSeen===today)
  }
  const newBestStreak = Math.max(current.bestStreak, newStreak);

  // --- XP + level ---
  const newXp = current.xp + Math.max(0, xpDelta);
  const newLevel = levelFromXp(newXp);
  const levelUp = newLevel > current.level;

  // --- Badges ---
  const futureProgress: UserProgress = {
    ...current,
    xp: newXp,
    level: newLevel,
    streakDays: newStreak,
    bestStreak: newBestStreak,
    lastSeenDate: today,
  };
  const previouslyUnlocked = new Set(current.badges);
  const newBadges: Badge[] = [];
  for (const b of BADGES) {
    if (previouslyUnlocked.has(b.id)) continue;
    if (b.unlock(futureProgress)) newBadges.push(b);
  }
  const updatedBadgeIds = [
    ...current.badges,
    ...newBadges.map((b) => b.id),
  ];

  // --- Persist ---
  const { error: updateErr } = await supabase
    .from("user_progress")
    .update({
      xp: newXp,
      level: newLevel,
      streak_days: newStreak,
      best_streak: newBestStreak,
      last_seen_date: today,
      badges: updatedBadgeIds,
    })
    .eq("user_id", userId);

  if (updateErr) {
    console.warn("[gamification] update error:", updateErr.message);
    return null;
  }

  return {
    xpDelta,
    xp: newXp,
    level: newLevel,
    levelUp,
    newBadges,
    streakDays: newStreak,
    streakReset,
  };
}

/**
 * Ping daily visit — met à jour le streak sans donner d'XP supplémentaire si
 * l'user a déjà loggé aujourd'hui. Utilisé par /api/gamification/me au load.
 */
export async function pingDailyVisit(
  userId: string,
): Promise<UserProgress | null> {
  const current = await getOrCreateProgress(userId);
  if (!current) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (current.lastSeenDate === today) {
    // Déjà ping aujourd'hui — return as-is
    return current;
  }
  // Sinon → award daily_login (incrémente streak + 5 XP)
  const delta = await awardXp(userId, "daily_login");
  if (!delta) return current;
  return {
    ...current,
    xp: delta.xp,
    level: delta.level,
    streakDays: delta.streakDays,
    bestStreak: Math.max(current.bestStreak, delta.streakDays),
    lastSeenDate: today,
    badges: [...current.badges, ...delta.newBadges.map((b) => b.id)],
  };
}

/**
 * lib/community-stats.ts — Agrégation "preuve sociale" en source de vérité unique.
 *
 * Audit Kev Phase 4 (19/05/2026) — cause racine du build fail Phase 3 :
 *
 *  Avant cette refonte :
 *    1. `components/LiveCommunityStats.tsx` (Server Component, dans le Footer)
 *       faisait `fetch("$NEXT_PUBLIC_SITE_URL/api/community-stats")` à chaque render.
 *    2. Footer = rendu sur ~1191 pages SSG → 1191 invocations du fetch pendant build.
 *    3. La route API faisait à son tour des queries Supabase.
 *    4. Si Supabase rate-limit / timeout / RLS denied → "Supabase error", propagé
 *       potentiellement à Next.js qui considérait la génération de la page comme
 *       en échec (même si le composant a un try/catch, Next.js peut faire crasher
 *       le build sur `fetch` qui retourne 5xx avec certains patterns).
 *    5. Combiné à la pression mémoire Hetzner CCX13 (8 GB RAM), le build a planté
 *       à 297/1191 pages.
 *
 *  Après cette refonte :
 *    - Ce module devient la source unique d'agrégation. Plus de fetch HTTP interne.
 *    - Server Component appelle DIRECTEMENT `getCommunityStatsSafe()` (in-process).
 *    - La route API `/api/community-stats` réutilise la même lib (pour les
 *      consommateurs externes : widgets embed, future API publique).
 *    - Timeout explicite (5 s) Promise.race → impossible de bloquer un render.
 *    - Toute exception est attrapée → fallback `earlyAccess`. Le build ne crashe
 *      jamais pour cette donnée non critique.
 *
 * Anti-PII : aucun champ user n'est exposé, juste des COUNT(*) agrégés.
 */

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getKv } from "@/lib/kv";

/* -------------------------------------------------------------------------- */
/*  Types & fallback                                                          */
/* -------------------------------------------------------------------------- */

export interface CommunityStats {
  proCount: number;
  newProThisMonth: number;
  alertsTriggered7d: number;
  generatedAt: string;
  /** True si la donnée n'a PAS pu être récupérée (Supabase down, RLS, etc.). */
  fallback: boolean;
  /**
   * True si les chiffres sont des vrais zéros (early access, pas encore
   * d'abonnés Pro) OU si on est en fallback. Le frontend doit afficher un
   * message "early access" élégant plutôt qu'un "0 abonnés" brutal.
   */
  earlyAccess: boolean;
}

/**
 * Fallback éditorial sobre — jamais de chiffres fake (charte éthique Kev).
 *
 * Utilisé quand :
 *   - Supabase down / rate-limited / RLS denied
 *   - Env vars manquantes (createSupabaseServiceRoleClient retourne null)
 *   - Timeout > 5 s
 *   - Exception inattendue
 *
 * Le composant <LiveCommunityStats /> détecte `earlyAccess:true` et rend
 * le bandeau "Communauté en construction" plutôt qu'une grille de zéros.
 */
export const COMMUNITY_STATS_FALLBACK: Omit<CommunityStats, "generatedAt"> = {
  proCount: 0,
  newProThisMonth: 0,
  alertsTriggered7d: 0,
  fallback: true,
  earlyAccess: true,
};

/** Build le fallback avec timestamp courant (snapshot reproductible côté caller). */
export function buildFallbackStats(): CommunityStats {
  return {
    ...COMMUNITY_STATS_FALLBACK,
    generatedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers internes (KV + Supabase) — tous capturent leurs erreurs           */
/* -------------------------------------------------------------------------- */

/**
 * countAlertsTriggered7d — V1 best-effort : scanne les markers `alerts:fired:*`
 * (TTL 24h) et extrapole sur 7 jours. Approximatif, documenté, borné.
 * V2 idéale = table Supabase `alerts_history` avec `triggered_at` indexé.
 */
async function countAlertsTriggered7d(): Promise<number> {
  try {
    const kv = getKv();
    const keys = await kv.keys("alerts:fired:*");
    const today = Array.isArray(keys) ? keys.length : 0;
    if (today <= 0) return 0;
    const estimate = Math.round((today * 7) / 10) * 10; // arrondi à la dizaine
    return Math.min(9999, Math.max(today, estimate));
  } catch {
    return 0;
  }
}

async function fetchStatsFromSupabase(): Promise<CommunityStats | null> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return null;

  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
  );
  const nowIso = now.toISOString();
  const startOfMonthIso = startOfMonth.toISOString();

  const proCountReq = supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .in("plan", ["pro_monthly", "pro_annual", "pro_plus_monthly", "pro_plus_annual"])
    .or(`plan_expires_at.is.null,plan_expires_at.gt.${nowIso}`);

  const newProReq = supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .in("plan", ["pro_monthly", "pro_annual", "pro_plus_monthly", "pro_plus_annual"])
    .gte("created_at", startOfMonthIso);

  const [proRes, newRes, alerts7d] = await Promise.all([
    proCountReq,
    newProReq,
    countAlertsTriggered7d(),
  ]);

  if (proRes.error || newRes.error) {
    // Log d'observabilité minimal — message uniquement, pas le payload complet
    // (anti-leak de potentiels secrets dans les erreurs Supabase).
    console.warn(
      "[community-stats] Supabase error:",
      proRes.error?.message ?? newRes.error?.message ?? "unknown",
    );
    return null;
  }

  const proCount = proRes.count ?? 0;
  const newProThisMonth = newRes.count ?? 0;
  const earlyAccess = proCount === 0 && newProThisMonth === 0 && alerts7d === 0;

  return {
    proCount,
    newProThisMonth,
    alertsTriggered7d: alerts7d,
    generatedAt: nowIso,
    fallback: false,
    earlyAccess,
  };
}

/* -------------------------------------------------------------------------- */
/*  API publique safe                                                         */
/* -------------------------------------------------------------------------- */

const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * Promesse qui se rejette après `ms` millisecondes — utilisé en Promise.race
 * pour borner le temps de fetch Supabase pendant un build (où un Supabase lent
 * peut bloquer la génération de page indéfiniment).
 */
function timeoutAfter(ms: number, label = "timeout"): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`[community-stats] ${label} after ${ms}ms`)), ms);
  });
}

/**
 * getCommunityStatsSafe — point d'entrée robuste pour le composant + la route API.
 *
 * Garanties :
 *   - Jamais ne throw (try/catch global).
 *   - Jamais ne bloque > timeoutMs (Promise.race).
 *   - Si Supabase indisponible (env manquante, network, RLS, query error),
 *     retourne `buildFallbackStats()` avec `earlyAccess:true`.
 *   - Log warn discret (1 ligne, sans payload sensible).
 *
 * Utilisable en pleine confiance dans un Server Component d'un Footer SSG
 * rendu sur 1000+ pages : aucune chance de crasher le build.
 */
export async function getCommunityStatsSafe(
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CommunityStats> {
  try {
    const stats = await Promise.race([
      fetchStatsFromSupabase(),
      timeoutAfter(timeoutMs),
    ]);
    if (stats) return stats;
    return buildFallbackStats();
  } catch (err) {
    // Erreur réseau / timeout / autre — fallback honnête (pas de chiffres fake).
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[community-stats] fallback:", msg);
    return buildFallbackStats();
  }
}

/**
 * normalizeCommunityStats — utile si un caller external (ex: widget embed)
 * reçoit une réponse JSON ancienne version (champs manquants). Garantit la
 * shape `CommunityStats` complète quelle que soit l'origine.
 */
export function normalizeCommunityStats(input: unknown): CommunityStats {
  const fallback = buildFallbackStats();
  if (!input || typeof input !== "object") return fallback;
  const obj = input as Record<string, unknown>;
  const num = (v: unknown, def: number): number => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return def;
    return Math.floor(v);
  };
  const proCount = num(obj.proCount, 0);
  const newProThisMonth = num(obj.newProThisMonth, 0);
  const alertsTriggered7d = num(obj.alertsTriggered7d, 0);
  const fallbackFlag =
    typeof obj.fallback === "boolean" ? obj.fallback : true;
  const earlyAccess =
    typeof obj.earlyAccess === "boolean"
      ? obj.earlyAccess
      : proCount === 0 && newProThisMonth === 0 && alertsTriggered7d === 0;
  const generatedAt =
    typeof obj.generatedAt === "string" && obj.generatedAt
      ? obj.generatedAt
      : new Date().toISOString();
  return {
    proCount,
    newProThisMonth,
    alertsTriggered7d,
    generatedAt,
    fallback: fallbackFlag,
    earlyAccess,
  };
}

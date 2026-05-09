/**
 * GET /api/community-stats
 *
 * Étude 02/05/2026 — Proposition #18 (LiveCommunityStats + social proof).
 *
 * Renvoie 3 KPI agrégés "vivants" pour le composant <LiveCommunityStats /> :
 *   - proCount             : abonnés Pro actifs (plan IN pro_*, pas expiré)
 *   - newProThisMonth      : abonnés Pro qui se sont inscrits depuis le 1er du mois
 *   - alertsTriggered7d    : alertes prix triggered ces 7 derniers jours (best-effort)
 *
 * Cache :
 *  - `unstable_cache(..., 300)` : invalidation par tag "community-stats" + TTL 5 min.
 *  - Header `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
 *    pour aussi cacher au niveau du CDN Vercel.
 *
 * Honnêteté éditoriale (FIX 2026-05-09) :
 *  - On affichait avant un FALLBACK hardcodé (42 / 7 / 38) quand la base
 *    était à 0 (DB vide en early access). Trompeur car le site annonçait
 *    "42 abonnés Soutien" alors qu'il n'y en avait aucun → contraire à la
 *    Charte Éthique commit récente ("transparence sur les chiffres").
 *  - Maintenant : on retourne les VRAIS chiffres (0 inclus). Le frontend
 *    sait afficher un état "early access" élégant grâce au flag `earlyAccess`
 *    quand proCount === 0.
 *  - Le flag `fallback:true` reste sur les vraies pannes (Supabase indispo,
 *    RLS denied, table missing) car là on ne peut PAS afficher les vrais
 *    chiffres — mais on retourne 0/0/0, plus 42/7/38.
 *
 * Anti-PII : aucun champ user n'est exposé, juste des COUNT(*).
 */

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getKv } from "@/lib/kv";

export const runtime = "nodejs";
// On laisse Next gérer le caching via unstable_cache (5 min) ; pas besoin de
// `force-dynamic`. La route reste dynamique côté contrat (compte le temps).
export const revalidate = 300;

/* -------------------------------------------------------------------------- */
/*  Types & fallbacks                                                         */
/* -------------------------------------------------------------------------- */

export interface CommunityStats {
  proCount: number;
  newProThisMonth: number;
  alertsTriggered7d: number;
  generatedAt: string;
  /** True si la donnée n'a PAS pu être récupérée (Supabase indispo, RLS, etc.). */
  fallback: boolean;
  /**
   * True si les chiffres sont des vrais zéros (early access, pas encore
   * d'abonnés Pro). Le frontend doit afficher un message "early access"
   * élégant plutôt qu'un "0 abonnés" brutal.
   */
  earlyAccess: boolean;
}

/**
 * Plus de FALLBACK hardcodé (42/7/38). Si Supabase est down on retourne
 * 0/0/0 + `fallback:true`, le composant gère l'affichage propre
 * (cf. <LiveCommunityStats /> qui rend un bandeau "early access").
 */
const ZERO: Omit<CommunityStats, "generatedAt" | "fallback" | "earlyAccess"> = {
  proCount: 0,
  newProThisMonth: 0,
  alertsTriggered7d: 0,
};

/* -------------------------------------------------------------------------- */
/*  Aggregation                                                               */
/* -------------------------------------------------------------------------- */

async function countAlertsTriggered7d(): Promise<number> {
  // V1 best-effort : on scanne les markers `alerts:fired:*` (TTL 24h donc
  // limité aux dernières 24h en pratique) et on multiplie par 7 pour
  // approximer la semaine. Cette heuristique est documentée et bornée.
  // V2 idéale : table Supabase `alerts_history` avec `triggered_at` indexé.
  try {
    const kv = getKv();
    const keys = await kv.keys("alerts:fired:*");
    const today = Array.isArray(keys) ? keys.length : 0;
    // Borne anti-aberration : 0 si rien, sinon estimation mais cap à 9999.
    if (today <= 0) return 0;
    const estimate = Math.round((today * 7) / 10) * 10; // arrondi à la dizaine
    return Math.min(9999, Math.max(today, estimate));
  } catch {
    return 0;
  }
}

async function fetchStatsFromSupabase(): Promise<CommunityStats | null> {
  // On utilise le service role client : pas d'utilisateur connecté côté API,
  // mais on ne renvoie QUE des COUNT(*) → aucune fuite PII.
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return null;

  // Calcul start of month (UTC) — on aligne sur UTC pour éviter les écarts
  // de fuseau dev/prod (Vercel = UTC).
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  );
  const nowIso = now.toISOString();
  const startOfMonthIso = startOfMonth.toISOString();

  // 1) proCount : abonnés Pro actifs (plan IN ('pro_monthly','pro_annual')
  //    ET (plan_expires_at IS NULL OR plan_expires_at > now())).
  //    Note : on accepte plan_expires_at NULL = abonnement perpétuel (admins).
  const proCountReq = supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .in("plan", ["pro_monthly", "pro_annual", "pro_plus_monthly", "pro_plus_annual"])
    .or(`plan_expires_at.is.null,plan_expires_at.gt.${nowIso}`);

  // 2) newProThisMonth : Pro inscrits ce mois-ci.
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
    // Log côté serveur pour observabilité, mais on ne crash pas le user.
    console.warn(
      "[community-stats] Supabase error",
      proRes.error?.message ?? newRes.error?.message
    );
    return null;
  }

  const proCount = proRes.count ?? 0;
  const newProThisMonth = newRes.count ?? 0;

  // FIX 2026-05-09 — on ne masque PLUS les vrais zéros derrière un fallback
  // fake (42/7/38). On retourne les vraies données + un flag earlyAccess que
  // le frontend utilise pour afficher un état "no data yet" propre.
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

/**
 * Cached wrapper — 5 min TTL, tag "community-stats" pour invalidation manuelle
 * (ex: après upgrade Stripe success on peut bumper via revalidateTag).
 */
const getCachedStats = unstable_cache(
  async (): Promise<CommunityStats> => {
    const stats = await fetchStatsFromSupabase().catch((err) => {
      console.warn("[community-stats] fetch failed", err);
      return null;
    });
    if (stats) return stats;
    // Supabase indispo : on retourne 0/0/0 + fallback:true + earlyAccess:true.
    // Le frontend affiche le bandeau "Communauté en construction" plutôt que
    // de mentir avec des chiffres fake.
    return {
      ...ZERO,
      generatedAt: new Date().toISOString(),
      fallback: true,
      earlyAccess: true,
    };
  },
  ["community-stats-v2"],
  { revalidate: 300, tags: ["community-stats"] }
);

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

export async function GET() {
  const stats = await getCachedStats();
  return NextResponse.json(stats, {
    headers: {
      // CDN cache 5 min, stale-while-revalidate 10 min supplémentaires.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

/**
 * GET /api/community-stats
 *
 * Étude 02/05/2026 — Proposition #18 (LiveCommunityStats + social proof).
 *
 * Renvoie 3 KPI agrégés "vivants" :
 *   - proCount             : abonnés Pro actifs (plan IN pro_*, pas expiré)
 *   - newProThisMonth      : abonnés Pro qui se sont inscrits depuis le 1er du mois
 *   - alertsTriggered7d    : alertes prix triggered ces 7 derniers jours (best-effort)
 *
 * Audit Kev Phase 4 (19/05/2026) — REFACTOR :
 *   - Logique d'agrégation déplacée dans `lib/community-stats.ts` (single
 *     source of truth) avec `getCommunityStatsSafe()` qui inclut un timeout
 *     5 s + try/catch + fallback `earlyAccess`.
 *   - Le composant Server `<LiveCommunityStats />` n'appelle PLUS cet endpoint
 *     via HTTP. Il appelle directement la lib en in-process → plus de spam
 *     de 1191 fetches HTTP pendant le build SSG, plus de risque de crash
 *     en cascade quand Supabase rate-limit.
 *   - Cet endpoint reste exposé pour les consommateurs externes (widget
 *     embed, future API publique).
 *
 * Cache :
 *  - `unstable_cache(..., 300)` : invalidation par tag "community-stats" + TTL 5 min.
 *  - Header `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
 *
 * Anti-PII : aucun champ user n'est exposé, juste des COUNT(*).
 */

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import {
  buildFallbackStats,
  getCommunityStatsSafe,
  type CommunityStats,
} from "@/lib/community-stats";

// Re-export pour ne pas casser les imports existants (`import type { CommunityStats }
// from "@/app/api/community-stats/route"`). Le type vit maintenant dans la lib.
export type { CommunityStats };

export const runtime = "nodejs";
// On laisse Next gérer le caching via unstable_cache (5 min) ; pas besoin de
// `force-dynamic`. La route reste dynamique côté contrat (compte le temps).
export const revalidate = 300;

/**
 * Cached wrapper — 5 min TTL, tag "community-stats" pour invalidation manuelle
 * (ex: après upgrade Stripe success on peut bumper via revalidateTag).
 *
 * getCommunityStatsSafe garantit déjà no-throw + timeout 5 s ; on n'enrobe
 * pas d'un try/catch supplémentaire (redondant). Si le fetch retourne un
 * fallback `earlyAccess`, on le cache 5 min aussi — pas de tempête de retry.
 */
const getCachedStats = unstable_cache(
  async (): Promise<CommunityStats> => {
    // Filet de sécurité supplémentaire au cas où getCommunityStatsSafe se met
    // à throw dans une future version : on retombe sur le fallback.
    try {
      return await getCommunityStatsSafe();
    } catch {
      return buildFallbackStats();
    }
  },
  ["community-stats-v3"],
  { revalidate: 300, tags: ["community-stats"] },
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

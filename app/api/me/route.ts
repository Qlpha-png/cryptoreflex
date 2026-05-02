/**
 * GET /api/me — Renvoie le plan + les limites Free/Pro de l'utilisateur courant.
 *
 * Endpoint client-readable utilisé par les composants (PortfolioView,
 * WatchlistButton, AlertsManager) pour récupérer la limite à appliquer côté
 * UX selon le plan de l'utilisateur.
 *
 * Réponse :
 *  {
 *    plan: "free" | "pro_monthly" | "pro_annual",
 *    isPro: boolean,
 *    isAuthenticated: boolean,
 *    email: string | null,
 *    limits: { portfolio: number, alerts: number, watchlist: number }
 *  }
 *
 * Cas non-authentifié :
 *  Renvoie le plan Free + limites Free (200 OK, pas 401). Le composant client
 *  applique la limite Free sans pousser à la connexion (UX douce).
 *
 * Cache (étude #12 ETUDE-2026-05-02) :
 *  - Anonyme (pas de session Supabase) : la réponse est identique pour tous les
 *    visiteurs anonymes (= Free + limites Free). Cachable Edge 30s + SWR 60s.
 *    Soulage la latence du cold-start auth pour la majorité du trafic.
 *  - Authentifié : `private, no-store` strict (données user-specific, surtout
 *    `email` qui ne doit JAMAIS fuiter via cache CDN).
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getLimits, FREE_LIMITS } from "@/lib/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();

  // Cas non-authentifié OU Supabase non configuré → on renvoie Free par défaut.
  // L'UI applique les limites Free sans pousser à la connexion.
  // Cachable 30s côté CDN + 60s SWR : la réponse anonyme est identique pour
  // tous, donc on évite les cold-starts auth Supabase pour 90% du trafic.
  if (!user) {
    return NextResponse.json(
      {
        plan: "free" as const,
        isPro: false,
        isAuthenticated: false,
        email: null,
        limits: { ...FREE_LIMITS },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  }

  const isPro = user.plan === "pro_monthly" || user.plan === "pro_annual";
  const limits = getLimits(user.plan);

  return NextResponse.json(
    {
      plan: user.plan,
      isPro,
      isAuthenticated: true,
      email: user.email,
      limits,
    },
    {
      headers: {
        // Authentifié : `private` interdit le cache CDN (l'email + plan ne
        // doivent JAMAIS fuiter), juste le cache navigateur du même user.
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Vary": "Cookie",
      },
    }
  );
}

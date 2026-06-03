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
import { PRO_LIMITS } from "@/lib/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DÉMONÉTISATION (juin 2026) : Cryptoreflex est 100 % gratuit.
 * Tous les utilisateurs — anonymes ou authentifiés — sont traités comme « Pro » :
 * plus aucun paywall. Les caps techniques de PRO_LIMITS restent (anti-abus :
 * nb d'alertes, taille portfolio… pour éviter le DoS), mais ne sont plus un
 * gating commercial. Le « Soutien » est désormais une contribution volontaire.
 */
export async function GET() {
  const user = await getUser();

  const grant = {
    isPro: true,
    isProPlus: true,
    limits: { ...PRO_LIMITS },
  };

  // Anonyme : réponse identique pour tous → cachable Edge (pas d'email).
  if (!user) {
    return NextResponse.json(
      { plan: "free" as const, isAuthenticated: false, email: null, ...grant },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  }

  // Authentifié : `private` (l'email ne doit jamais fuiter via CDN).
  return NextResponse.json(
    { plan: user.plan, isAuthenticated: true, email: user.email, ...grant },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Vary": "Cookie",
      },
    }
  );
}

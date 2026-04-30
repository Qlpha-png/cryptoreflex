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
 * Cache :
 *  Aucun cache CDN (les données sont user-specific). Les composants client
 *  peuvent cacher avec SWR pendant la session.
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
          "Cache-Control": "no-store, no-cache, must-revalidate",
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
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

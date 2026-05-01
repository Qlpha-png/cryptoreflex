/**
 * GET /api/me/ask-quota
 * ---------------------
 * Renvoie le quota IA Q&A restant pour l'utilisateur courant.
 * Lit le compteur dans Vercel KV (clé `rl:ask-daily:user:{userId}`).
 *
 * Réponse :
 *   { plan: "pro_monthly" | "pro_annual" | "free",
 *     dailyLimit: 20,
 *     used: number,
 *     remaining: number,
 *     resetIn: number  // secondes avant reset 24h
 *   }
 *
 * Cas non-Pro : on renvoie quand même la structure avec dailyLimit=0,
 * used=0, remaining=0 — le composant /mon-compte affichera un CTA Pro.
 */

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getKv } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY_LIMIT = 20;
const WINDOW_SECONDS = 24 * 60 * 60;

interface QuotaResponse {
  plan: string;
  dailyLimit: number;
  used: number;
  remaining: number;
  /** Secondes avant reset (approximation : on n'a pas le TTL exact via getKv standard) */
  resetIn: number;
  isPro: boolean;
}

export async function GET(): Promise<NextResponse<QuotaResponse>> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      {
        plan: "free",
        dailyLimit: 0,
        used: 0,
        remaining: 0,
        resetIn: 0,
        isPro: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const isPro = user.plan === "pro_monthly" || user.plan === "pro_annual";
  if (!isPro) {
    return NextResponse.json(
      {
        plan: user.plan,
        dailyLimit: 0,
        used: 0,
        remaining: 0,
        resetIn: 0,
        isPro: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Lit le compteur quotidien IA Q&A (même clé namespace que /api/ask)
  const kv = getKv();
  const key = `rl:ask-daily:${user.id}`;
  let used = 0;
  try {
    const raw = await kv.get<number>(key);
    used = typeof raw === "number" ? raw : 0;
  } catch {
    // Si KV down → on reporte 0 utilisé (fail-open, cohérent avec rate-limit.ts)
    used = 0;
  }

  const remaining = Math.max(0, DAILY_LIMIT - used);

  return NextResponse.json(
    {
      plan: user.plan,
      dailyLimit: DAILY_LIMIT,
      used,
      remaining,
      // On ne connaît pas le TTL exact via le wrapper KV → on renvoie la
      // fenêtre complète comme borne supérieure. Le composant peut afficher
      // "reset dans <24h" sans précision exacte.
      resetIn: WINDOW_SECONDS,
      isPro: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

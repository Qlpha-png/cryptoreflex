/**
 * GET /api/health
 *
 * Liveness/readiness endpoint pour les sondes de monitoring (Coolify,
 * UptimeRobot, etc.). Réponse JSON minimale, jamais cachée.
 *
 * Avant ce fix : la route n'existait pas, Next.js renvoyait son 404 HTML
 * (~194KB) à chaque hit du monitoring → bande passante gaspillée + faux
 * négatifs dans les outils qui parsent un payload JSON.
 *
 * Comportement :
 *  - 200 + { ok:true, ts, uptime_s, version, db } si tout va bien
 *  - 200 + db:"unknown" si Supabase non configuré ou timeout
 *  - 503 + db:"down" si Supabase configuré mais ping échoue
 *  - JAMAIS de crash : toute exception du check DB est avalée et logged
 *
 * Sécurité : pas de secret requis (endpoint public par design pour les
 * sondes externes). Aucune donnée sensible exposée.
 */

import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Timeout court pour le check DB — si la base ne répond pas en 1s on
 *  ne bloque pas la sonde de monitoring. */
const DB_CHECK_TIMEOUT_MS = 1_000;

type DbStatus = "ok" | "down" | "unknown";

interface HealthPayload {
  ok: boolean;
  ts: string;
  uptime_s: number;
  version: string;
  db: DbStatus;
}

/**
 * Ping Supabase avec un timeout strict. Retourne :
 *  - "ok" si la requête réussit
 *  - "down" si elle échoue (erreur réseau, auth, table absente, etc.)
 *  - "unknown" si Supabase n'est pas configuré ou si le timeout déclenche
 *
 * Best-effort : aucune exception ne remonte au caller.
 */
async function checkDb(): Promise<DbStatus> {
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) return "unknown";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DB_CHECK_TIMEOUT_MS);

  try {
    // Race : query légère vs AbortSignal. On utilise une requête HEAD-style
    // (count only, limit 1) sur une table système Supabase qui existe toujours.
    // Si la table n'existe pas, on tombe en "down" — au pire le monitoring
    // alerte pour rien, jamais de faux "ok".
    const queryPromise = supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .limit(1);

    const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) => {
      controller.signal.addEventListener("abort", () => {
        resolve({ error: { message: "timeout" } });
      });
    });

    const result = (await Promise.race([queryPromise, timeoutPromise])) as {
      error: { message: string } | null;
    };

    if (controller.signal.aborted) return "unknown";
    if (result.error) {
      console.warn("[health] db check error:", result.error.message);
      return "down";
    }
    return "ok";
  } catch (err) {
    console.warn(
      "[health] db check threw:",
      err instanceof Error ? err.message : String(err),
    );
    return controller.signal.aborted ? "unknown" : "down";
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(): Promise<NextResponse<HealthPayload>> {
  const db = await checkDb().catch(() => "unknown" as DbStatus);

  const payload: HealthPayload = {
    ok: db !== "down",
    ts: new Date().toISOString(),
    uptime_s: Math.round(process.uptime()),
    version: process.env.NEXT_PUBLIC_BUILD_VERSION || "unknown",
    db,
  };

  // 503 uniquement si DB down (configurée mais injoignable). "unknown" reste
  // un état acceptable pour le monitoring (pas d'alerte si Supabase pas en jeu).
  const status = db === "down" ? 503 : 200;

  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

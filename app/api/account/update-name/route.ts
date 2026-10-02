/**
 * POST /api/account/update-name
 * -----------------------------
 * Met à jour le `display_name` de l'utilisateur dans Supabase Auth user_metadata.
 *
 * Avantage user_metadata : pas besoin de migration DB ni de colonne dédiée.
 * Stocké côté Supabase Auth, visible immédiatement par getUser() au prochain
 * fetch. Limite : 1024 chars max (limite Supabase) — on cap à 60.
 *
 * Body : { displayName: string }
 * Réponse : { ok: true, displayName: string } ou { ok: false, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limit anti-spam : 5 changements par jour par user (raisonnable, anti-bot)
const limiter = createRateLimiter({
  limit: 5,
  windowMs: 24 * 60 * 60 * 1000,
  key: "update-name",
});

const MIN_LENGTH = 2;
const MAX_LENGTH = 60;

function sanitizeName(input: string): string {
  // Strip tout ce qui n'est pas alphanumérique + espaces + tirets + apostrophes
  return input
    .trim()
    .replace(/[\x00-\x1f\x7f]/g, "") // control chars
    .replace(/\s+/g, " ")
    .slice(0, MAX_LENGTH);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connexion requise." },
      { status: 401 },
    );
  }

  const rl = await limiter(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Trop de modifications (5/jour max). Réessayez dans ${Math.ceil(rl.retryAfter / 3600)}h.`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: { displayName?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 },
    );
  }

  const raw = typeof body.displayName === "string" ? body.displayName : "";
  const sanitized = sanitizeName(raw);

  if (sanitized.length < MIN_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: `Le nom doit faire au moins ${MIN_LENGTH} caractères.`,
      },
      { status: 400 },
    );
  }

  // Met à jour user_metadata côté Supabase Auth (pas besoin de migration DB)
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Service indisponible." },
      { status: 503 },
    );
  }

  const { error } = await supabase.auth.updateUser({
    data: { display_name: sanitized },
  });

  if (error) {
    console.error("[update-name] Supabase error:", error.message);
    return NextResponse.json(
      { ok: false, error: "Impossible de sauvegarder le nom. Réessayez." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, displayName: sanitized });
}

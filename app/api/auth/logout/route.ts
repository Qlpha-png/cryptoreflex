/**
 * /api/auth/logout — Déconnecte le user.
 *
 * P1 FIX (audit backend 30/04/2026) :
 * Avant : on appelait `supabase.auth.signOut()` puis on retournait directement
 * `NextResponse.redirect(...)` SANS `applyCookies(response)` — donc le cookie
 * de suppression posé par signOut ne se propageait JAMAIS au browser, et le
 * user restait connecté côté client jusqu'à expiration JWT (1h).
 *
 * Maintenant : on utilise `createRouteHandlerClient(req)` qui expose
 * `applyCookies()` puis on l'applique à la réponse de redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.cryptoreflex.fr";

  const client = createRouteHandlerClient(req);
  if (!client) {
    return NextResponse.redirect(new URL("/", siteUrl));
  }

  const { supabase, applyCookies } = client;
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/", siteUrl));
  return applyCookies(response);
}

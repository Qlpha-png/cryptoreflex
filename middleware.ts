/**
 * Middleware Next.js — refresh JWT Supabase + headers de sécurité.
 *
 * RÉÉCRIT 2026-05-01 (fix bug user "ça déconnecte en naviguant") :
 *
 * AVANT : on créait `res = NextResponse.next({ request: { headers: req.headers } })`
 * UNE SEULE FOIS, puis dans `setAll` on faisait `res.cookies.set(...)`. Le
 * problème : NextResponse.next() capture les headers à un instant T. Quand
 * Supabase refresh le JWT et appelle setAll, les nouveaux cookies sont bien
 * écrits dans `res.cookies` MAIS `req.cookies` n'est pas reflété dans la
 * Request finale envoyée au Server Component → getUser() côté server lit
 * l'ANCIEN cookie expiré → null → user déconnecté à chaque navigation.
 *
 * APRÈS : pattern OFFICIEL Supabase SSR documenté
 * (https://supabase.com/docs/guides/auth/server-side/nextjs) :
 *   1. Créer `supabaseResponse = NextResponse.next({ request })`
 *   2. Dans setAll : (a) écrire dans request.cookies, (b) RECRÉER
 *      `supabaseResponse = NextResponse.next({ request })` pour propager
 *      les nouveaux cookies au Server Component, (c) écrire aussi dans
 *      supabaseResponse.cookies pour le navigateur.
 *   3. Appeler `supabase.auth.getUser()` IMMÉDIATEMENT après createServerClient
 *      (ne JAMAIS y mettre de logique entre les deux).
 *   4. Renvoyer `supabaseResponse` (pas un nouveau NextResponse).
 *
 * Headers de sécurité : ajoutés au supabaseResponse après le refresh JWT
 * (sinon ils sont perdus au .next() recréé).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Étape 1 : créer la response initiale qu'on va renvoyer (et potentiellement
  // recréer dans setAll pour propager les cookies refresh).
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // (a) Écrire les nouveaux cookies dans request.cookies (pour que
          //     le Server Component qui suit lise la session refresh).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // (b) RECRÉER la response pour propager le nouveau request.cookies.
          //     C'est l'étape MANQUANTE dans l'ancien middleware qui causait
          //     les déconnexions silencieuses en navigation.
          supabaseResponse = NextResponse.next({ request });
          // (c) Écrire aussi dans supabaseResponse.cookies pour que le navigateur
          //     reçoive les nouveaux cookies (Set-Cookie header).
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    // CRITIQUE : appel getUser() IMMÉDIATEMENT après createServerClient.
    // Ne RIEN mettre entre les deux (sinon le pattern setAll peut louper
    // une mise à jour de cookie). Doc Supabase explicite sur ce point.
    await supabase.auth.getUser();
  }

  // Headers de sécurité globaux — ajoutés APRÈS supabase pour ne pas être
  // perdus si setAll a recréé supabaseResponse.
  supabaseResponse.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set(
    "Permissions-Policy",
    "geolocation=(), camera=(), microphone=(), payment=(self)",
  );

  return supabaseResponse;
}

/**
 * Le middleware s'applique à toutes les routes SAUF :
 *  - /_next/static (assets statiques Next.js)
 *  - /_next/image (optimisation images)
 *  - /favicon.ico, robots.txt, sitemap.xml, manifest
 *  - /api/stripe/webhook (signature HMAC vérifiée séparément, body raw requis)
 *  - /embed/* (widgets iframe destinés à être hostés sur des sites tiers —
 *    le middleware injecte X-Frame-Options: DENY qui bloquerait l'iframing.
 *    Pas d'auth Supabase nécessaire sur les pages embed (pages publiques).)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|api/stripe/webhook|embed/).*)",
  ],
};

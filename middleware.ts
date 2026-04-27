/**
 * Middleware Next.js — refresh des cookies Supabase + headers de sécurité.
 *
 * 1. Refresh du JWT Supabase à chaque request (sinon il expire après 1h
 *    et le user est déconnecté silencieusement)
 * 2. Headers de sécurité globaux (CSP, HSTS, X-Frame-Options, etc.)
 * 3. Pas de redirect dans le middleware — les guards sont dans les pages
 *    elles-mêmes via requireAuth() / requirePro()
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  // Refresh du cookie session Supabase (si configuré)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANT : appel getUser() refresh automatiquement le JWT côté Supabase
    await supabase.auth.getUser();
  }

  // Headers de sécurité globaux (P0 security agent)
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "geolocation=(), camera=(), microphone=(), payment=(self)"
  );

  return res;
}

/**
 * Le middleware s'applique à toutes les routes SAUF :
 *  - /_next/static (assets statiques Next.js)
 *  - /_next/image (optimisation images)
 *  - /favicon.ico, fichiers publics
 *  - /api/stripe/webhook (signature HMAC vérifiée séparément, body raw requis)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|api/stripe/webhook).*)",
  ],
};

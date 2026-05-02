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

/**
 * BATCH 21 — Defense-in-depth CSRF : check Origin/Referer sur les mutations
 * (POST/PUT/PATCH/DELETE). Cookies Supabase reposent sur SameSite=Lax par
 * défaut, mais une exfiltration cross-site via `<form>` POST reste
 * théoriquement possible. Ce check refuse les requêtes mutation venant
 * d'un Origin qui n'est pas le nôtre.
 *
 * Note : on whitelist le wildcard `*` pour /api/embed/* (widgets cross-domain
 * légitimes). On exclut /api/stripe/webhook (signature HMAC déjà vérifiée).
 */
const ALLOWED_ORIGINS = new Set([
  "https://www.cryptoreflex.fr",
  "https://cryptoreflex.fr",
  // Vercel preview deployments
  "https://cryptoreflex.vercel.app",
]);

function isCrossSiteMutation(request: NextRequest): boolean {
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  const path = request.nextUrl.pathname;
  // Stripe webhook : vérifié par signature HMAC, pas Origin (bot upstream).
  if (path.startsWith("/api/stripe/webhook")) return false;
  // Embed widgets : intentionnellement cross-origin (frame-ancestors *).
  if (path.startsWith("/api/embed/")) return false;

  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin POST / fetch SSR : pas d'Origin sent, on accepte.
    return false;
  }
  // Vercel preview : *.vercel.app pour les branches non-prod.
  if (origin.endsWith(".vercel.app") && origin.includes("cryptoreflex")) {
    return false;
  }
  return !ALLOWED_ORIGINS.has(origin);
}

export async function middleware(request: NextRequest) {
  // BATCH 21 — CSRF check avant toute autre logique (early return si mutation
  // cross-site bloquée).
  if (isCrossSiteMutation(request)) {
    return new NextResponse(
      JSON.stringify({ error: "Cross-site mutation blocked" }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }

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
 *
 * FIX 2026-05-02 #4 — quick win scaling (PLAN-OPTIMISATION-SCALING #2/P0).
 * On exclut aussi les routes SEO programmatic massives qui sont 100 %
 * read-only (pas d'auth, pas de session) : `/cryptos`, `/blog`, `/comparer`,
 * `/vs`, `/comparatif`, `/glossaire`, `/avis`, `/staking`, `/acheter`,
 * `/convertisseur`, `/analyses-techniques`, `/actualites`, `/academie`,
 * `/marche`, `/outils`. Ces routes représentent ~80 % du trafic SEO et
 * n'ont JAMAIS besoin du refresh JWT Supabase. Avant : 100 % des req
 * passaient par `supabase.auth.getUser()` (un round-trip Supabase à chaque
 * page vue). Après : seules les routes auth-aware (mon-compte, admin, pro,
 * portefeuille, alertes, etc.) déclenchent le middleware.
 *
 * Impact attendu :
 *  - −60 à −80 % d'invocations Edge facturées sur Vercel
 *  - Latence p50 −30 à −60 ms sur les pages SEO (élimination du Supabase RTT)
 *  - Headers de sécurité (HSTS, CSP, etc.) sont déjà gérés via next.config.js
 *    `headers()` côté CDN — donc pas perdus quand on bypass le middleware.
 *
 * NB : si on ajoute une feature auth-aware sur une page SEO listée ici (ex:
 * watchlist sur /cryptos/[slug]), il faudra retirer `cryptos` du matcher OU
 * faire le check côté Server Component avec `createSupabaseServerClient()`.
 */
export const config = {
  matcher: [
    // FIX PERF 2026-05-02 #8 (audit expert deep-dive) — extension du matcher
    // pour couvrir 7 routes oubliées qui restaient soumises au middleware
    // Supabase alors qu'elles sont 100% read-only public :
    // /quiz, /calendrier, /halving-bitcoin, /recherche, /transparence,
    // /sponsoring, /a-propos, /methodologie, /accessibilite, /contact,
    // /confidentialite, /mentions-legales, /cgv-abonnement, /partenaires,
    // /merci, /newsletter, /impact, /ambassadeurs, /go (affiliate redirector).
    // Avant : ces routes faisaient un Supabase JWT round-trip à chaque hit
    // (TTFB +30 à +60ms inutile). Maintenant : middleware skipped, latence
    // p50 alignée sur le reste des SEO routes déjà exclues.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|api/stripe/webhook|embed/|cryptos/|blog/|comparer/|vs/|comparatif/|glossaire/|avis/|staking/|acheter/|convertisseur/|analyses-techniques/|actualites/|academie/|marche/|outils/|monitoring/|api/public/|api/historical|api/prices|api/search|api/news|api/whales|api/onchain|api/convert|quiz/|calendrier|halving-bitcoin|recherche|transparence|sponsoring|a-propos|methodologie|accessibilite|contact|confidentialite|mentions-legales|cgv-abonnement|partenaires|merci|newsletter|impact|ambassadeurs|go/).*)",
  ],
};

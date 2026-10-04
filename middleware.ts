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
import removedNews from "@/lib/news-removed-slugs.json";
import { UNIVERS_IDS } from "@/lib/reflex-cards/univers-ids";

/* REFLEX CARDS UNIVERS (04/10/2026) : /cartes/<id> est rendu à la demande (27 711 cartes, dynamicParams) ; un notFound() dans
   une page rendue à la demande répond 200 (loading racine). Le middleware tranche AVANT le rendu : identifiant hors de la liste
   exportée (lib/reflex-cards/univers-ids.ts, ≈ 390 Ko) = vrai 404. Construit une fois par isolat. */
const UNIVERS_ON = process.env.REFLEX_CARDS_UNIVERS?.trim() === "true";
let UNIVERS_SET: Set<string> | null = null;
const universHas = (id: string) => (UNIVERS_SET ??= new Set(UNIVERS_IDS.split("\n"))).has(id);
const CARTES_PASS = new Set(["jouer", "manifest.webmanifest"]);
const NOT_FOUND_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Carte introuvable · Reflex Cards</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07090f;color:#e8ecf3;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}a{color:#f5b52a}</style></head><body><div><p style="font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#9aa4b2">Reflex Cards</p><h1>Cette carte n'existe pas</h1><p>Aucune carte ne porte cet identifiant. <a href="/cartes">Voir le jeu</a> · <a href="/cartes/jouer">Ouvrir un booster</a></p></div></body></html>`;

/* AUDIT 03/10/2026 — anciennes actus supprimées (mai 2026) : 308 vers le hub au lieu d'un 404 (263 erreurs Search Console). */
const REMOVED_NEWS = new Set<string>(removedNews.slugs);

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

  // Liens signés HMAC (désinscription / suppression d'alerte depuis un email) :
  // le jeton est la preuve, l'Origin n'apporte rien (et vaut parfois « null »).
  // Jeton NON vide exigé ; pour les alertes, uniquement le POST de suppression
  // (pas /create ni /by-email).
  // AUDIT 2026-10-02 : pour les désinscriptions, `email` NON vide exigé AUSSI.
  // Les liens signés (pied d'email, List-Unsubscribe, bouton de la page de
  // confirmation) portent toujours email ET token dans l'URL ; avec
  // `?token=x` seul, /api/newsletter/unsubscribe retombait sur sa branche
  // « formulaire » (envoi d'un email de confirmation à l'adresse du body) →
  // un site tiers pouvait la déclencher en contournant ce contrôle.
  const params = request.nextUrl.searchParams;
  const token = params.get("token")?.trim();
  const email = params.get("email")?.trim();
  if (
    token &&
    (((path === "/api/email/unsubscribe" ||
      path === "/api/newsletter/unsubscribe") &&
      email) ||
      (method === "POST" &&
        params.get("action") === "delete" &&
        /^\/api\/alerts\/(?!create$|by-email$)[^/]+$/.test(path)))
  ) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin POST / fetch SSR : pas d'Origin sent, on accepte.
    return false;
  }
  // AUDIT 2026-10-01 : plus de joker *.vercel.app — un tiers peut réserver
  // « cryptoreflex-xxx.vercel.app ». Liste exacte, ou même hôte que la requête
  // (déploiements de préproduction) : un site tiers ne peut pas forger ça.
  if (ALLOWED_ORIGINS.has(origin)) return false;
  try {
    if (new URL(origin).host === request.headers.get("host")) return false;
  } catch {
    // Origin « null » ou mal formé → traité comme cross-site.
  }
  return true;
}

export async function middleware(request: NextRequest) {
  // Actus supprimées : redirection permanente vers /actualites, sans toucher à Supabase (branche la moins chère possible).
  const { pathname } = request.nextUrl;
  /* page d'une carte Reflex : vrai 404 si l'identifiant n'existe pas dans l'Univers (sans Supabase, branche la moins chère) */
  if (pathname.startsWith("/cartes/")) {
    const id = decodeURIComponent(pathname.slice("/cartes/".length)).replace(/\/+$/, "");
    if (UNIVERS_ON && id && !id.includes("/") && !id.includes(".") && !CARTES_PASS.has(id) && !universHas(id)) {
      return new NextResponse(NOT_FOUND_HTML, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
    }
    return NextResponse.next();
  }
  if (pathname.startsWith("/actualites/")) {
    const slug = decodeURIComponent(pathname.slice("/actualites/".length)).replace(/\/+$/, "");
    if (REMOVED_NEWS.has(slug)) return NextResponse.redirect(new URL("/actualites", request.url), 308);
    return NextResponse.next();
  }

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

  // FIX 2026-05-06 — DÉDUPLIQUÉ. Les headers de sécurité (HSTS, X-Frame-Options,
  // X-Content-Type-Options, Referrer-Policy, Permissions-Policy) sont déjà
  // servis par `next.config.js -> headers()` côté CDN sur toutes les routes
  // (cf. blocs `headers()` dans next.config.js).
  //
  // Avant : on les re-settait ICI dans le middleware Edge → DOUBLE-set sur les
  // routes auth-aware (mon-compte, admin, pro, portefeuille, alertes, etc.) =
  // headers identiques mais 5 lignes de CPU Edge inutiles à chaque invocation.
  //
  // Maintenant : on laisse next.config.js gérer (CDN-served, gratuit). Le
  // middleware ne fait que ce qui est SPÉCIFIQUE Edge : Supabase refresh JWT
  // + CSRF check. Économie : ~2-5ms par invocation Edge.

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
    // anciennes actus supprimées → 308 (voir REMOVED_NEWS) ; le hub /actualites reste hors middleware
    "/actualites/:slug+",
    // Reflex Cards Univers (04/10/2026) : /cartes/<id> → vrai 404 si l'identifiant n'existe pas (voir universHas) ; aucun appel Supabase
    "/cartes/:id",
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
    // AUDIT 2026-10-01 : `api/news/` AVEC le slash — sans lui, le préfixe
    // excluait aussi /api/newsletter/* (POST abonnement/désabonnement) du
    // contrôle CSRF ci-dessus.
    // REFLEX CARDS (02/10/2026) : /cartes et /cartes/* sont 100 % publics en lecture (phase A, sans comptes) :
    // pas de refresh JWT Supabase. À revoir en phase B (comptes) si une page /cartes devient auth-aware.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|api/stripe/webhook|embed/|cartes|cryptos/|blog/|comparer/|vs/|comparatif/|glossaire/|avis/|staking/|acheter/|convertisseur/|analyses-techniques/|actualites/|academie/|marche/|outils/|monitoring/|api/public/|api/historical|api/prices|api/search|api/news/|api/whales|api/onchain|api/convert|quiz/|calendrier|halving-bitcoin|recherche|transparence|sponsoring|a-propos|methodologie|accessibilite|contact|confidentialite|mentions-legales|cgv-abonnement|partenaires|merci|newsletter|impact|ambassadeurs|go/).*)",
  ],
};

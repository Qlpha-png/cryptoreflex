/**
 * Supabase client pour Route Handlers (POST/GET API routes).
 *
 * Different de createSupabaseServerClient (cookies() de next/headers) parce
 * que dans certains cas Next.js 14 ne propage pas les cookies set via
 * cookies().set() vers la NextResponse.json() retournee → le user pense
 * etre connecte mais le cookie n'arrive jamais au navigateur → /mon-compte
 * redirect vers /connexion.
 *
 * Pattern bulletproof : on bind les cookies directement sur la NextResponse
 * qu'on retournera. Caller doit appeler bindCookiesToResponse(supabase, res)
 * APRES avoir cree la NextResponse mais AVANT de la return.
 *
 * Usage :
 *
 *   import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
 *
 *   export async function POST(req: NextRequest) {
 *     const { supabase, applyCookies } = createRouteHandlerClient(req);
 *     const { error } = await supabase.auth.signInWithPassword({...});
 *     if (error) return NextResponse.json({ error }, { status: 401 });
 *
 *     const res = NextResponse.json({ ok: true });
 *     return applyCookies(res);  // critical : applique les cookies set
 *   }
 */

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "lax" | "strict" | "none" | boolean;
    secure?: boolean;
  };
}

export function createRouteHandlerClient(req: NextRequest) {
  // Buffer pour collecter tous les cookies que Supabase veut set durant l'op.
  const cookiesToApply: CookieToSet[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  // Detection HTTPS : Vercel met x-forwarded-proto, sinon on suppose true en prod.
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.url.startsWith("https://");

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          // FIX critique cookie session :
          // - secure: true (HTTPS only) — sinon Chrome rejette en prod
          // - httpOnly: true (defense XSS — server-side auth, pas besoin JS)
          // - sameSite: 'lax' (autorise magic link clic depuis email)
          // - path: '/' (cookie disponible sur toute l'app)
          const safeOptions = {
            ...options,
            secure: isHttps,
            httpOnly: true,
            sameSite: (options?.sameSite ?? "lax") as "lax" | "strict" | "none",
            path: options?.path ?? "/",
          };
          cookiesToApply.push({ name, value, options: safeOptions });
        });
      },
    },
  });

  /**
   * Applique tous les cookies collectes sur la NextResponse.
   * A appeler APRES tous les supabase.auth.* et JUSTE AVANT de return.
   */
  function applyCookies(res: NextResponse): NextResponse {
    cookiesToApply.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, options);
    });
    return res;
  }

  return { supabase, applyCookies };
}

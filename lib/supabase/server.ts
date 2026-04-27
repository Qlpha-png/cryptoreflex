/**
 * Supabase server client.
 *
 * À utiliser dans Server Components, Route Handlers, Server Actions et
 * Middleware. Gère la persistance de la session via les cookies Next.js.
 *
 * 2 clients distincts :
 *  - createServerClient : client utilisateur (RLS appliqué via la session)
 *  - createServiceRoleClient : bypass RLS (UNIQUEMENT pour Stripe webhook
 *    et tâches d'admin — JAMAIS exposé côté client)
 *
 * GRACEFUL DEGRADATION : retourne null si env vars absentes (cf. client.ts).
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/** Client serveur lié à la session du user courant (RLS appliqué). */
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component contexte : `cookieStore.set` jette. Ignoré
          // car le middleware gère le refresh du cookie.
        }
      },
    },
  });
}

/**
 * Client SERVICE ROLE : bypass RLS.
 *
 * À UTILISER UNIQUEMENT POUR :
 *  - Stripe webhook (créer/upgrader users sans auth context)
 *  - Cron jobs admin
 *  - Migrations
 *
 * À NE JAMAIS EXPOSER côté client. Accès réservé aux Route Handlers
 * `/api/*` qui valident eux-mêmes leur source (signature Stripe, secret cron).
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

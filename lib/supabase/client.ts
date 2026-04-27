/**
 * Supabase client (browser).
 *
 * À utiliser dans les Client Components ('use client') pour les opérations
 * authentifiées côté navigateur (read user session, sign out, listen auth state).
 *
 * Pour les Server Components / Route Handlers / Server Actions, utiliser
 * `createServerClient` depuis `./server.ts` à la place.
 *
 * GRACEFUL DEGRADATION : si les env vars ne sont pas configurées (avant le
 * setup Supabase initial), retourne un mock qui ne casse pas le build.
 * Permet au site de continuer à fonctionner en mode "no-auth" tant que
 * NEXT_PUBLIC_SUPABASE_URL n'est pas défini sur Vercel.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Mode dégradé : Supabase pas encore configuré.
    // On n'a pas de client réel à fournir — caller doit gérer le `null`.
    return null;
  }

  return createBrowserClient(url, anonKey);
}

/** Helper pour savoir si l'auth est disponible (utile pour conditional rendering). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

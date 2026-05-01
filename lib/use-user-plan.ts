"use client";

/**
 * lib/use-user-plan.ts — Hook React pour récupérer le plan + limites du user
 * courant côté client.
 *
 * Appelle GET /api/me et retourne `{ plan, isPro, limits, loading }`.
 * Cache mémoire (module-scope) pour éviter de spammer la route à chaque mount
 * d'un composant — la durée de vie est celle de la session navigateur (rafraîchi
 * au refresh page, ce qui suffit pour notre cas d'usage).
 *
 * Usage :
 *   const { isPro, limits, loading } = useUserPlan();
 *   if (loading) return <Spinner />;
 *   const max = limits.portfolio; // 10 si Free, 500 si Pro
 *
 * Pourquoi pas SWR/Tanstack Query : on veut zéro dépendance supplémentaire
 * pour ce hook très simple. Si le besoin grandit (revalidation périodique,
 * mutations optimistes), on migrera vers SWR.
 */

import { useEffect, useState } from "react";
import type { Plan } from "@/lib/auth";
import { FREE_LIMITS, type FeatureLimits } from "@/lib/limits";

interface UserPlanState {
  plan: Plan;
  isPro: boolean;
  isAuthenticated: boolean;
  email: string | null;
  limits: FeatureLimits;
  loading: boolean;
}

interface MeResponse {
  plan: Plan;
  isPro: boolean;
  isAuthenticated: boolean;
  email: string | null;
  limits: FeatureLimits;
}

/**
 * Cache module-scope avec TTL court (30s).
 *
 * Fix audit code review 01/05/2026 : avant, le cache module-scope ne se
 * vidait JAMAIS jusqu'à F5. Conséquence : après un login magic link, le
 * user voyait son ancien état "non authentifié" et limites Free jusqu'à
 * un hard refresh. TTL 30s suffit à invalider après login (le user prend
 * forcément >30s entre clic email et navigation).
 */
const CACHE_TTL_MS = 30_000;
let cachedState: MeResponse | null = null;
let cachedAt = 0;
let inflight: Promise<MeResponse> | null = null;

function isCacheFresh(): boolean {
  return cachedState !== null && Date.now() - cachedAt < CACHE_TTL_MS;
}

async function fetchMe(): Promise<MeResponse> {
  if (isCacheFresh()) return cachedState as MeResponse;
  if (inflight) return inflight;
  inflight = fetch("/api/me", {
    credentials: "include",
    headers: { accept: "application/json" },
    cache: "no-store",
  })
    .then(async (r) => {
      if (!r.ok) throw new Error(`/api/me ${r.status}`);
      const data = (await r.json()) as MeResponse;
      cachedState = data;
      cachedAt = Date.now();
      return data;
    })
    .catch(() => {
      // Erreur réseau ou Supabase down → on retombe sur Free par défaut.
      const fallback: MeResponse = {
        plan: "free",
        isPro: false,
        isAuthenticated: false,
        email: null,
        limits: { ...FREE_LIMITS },
      };
      cachedState = fallback;
      cachedAt = Date.now();
      return fallback;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Hook : retourne le plan + limites du user courant.
 *
 * - `loading: true` au premier render (pas de réseau côté SSR)
 * - Après hydratation : fetch /api/me, puis met `loading: false`
 * - Cache module-scope : les composants suivants ont la valeur instantanément
 */
export function useUserPlan(): UserPlanState {
  const [state, setState] = useState<UserPlanState>(() => {
    if (isCacheFresh() && cachedState) {
      return { ...cachedState, loading: false };
    }
    return {
      plan: "free",
      isPro: false,
      isAuthenticated: false,
      email: null,
      limits: { ...FREE_LIMITS },
      loading: true,
    };
  });

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((data) => {
      if (cancelled) return;
      setState({ ...data, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** Force un refresh du cache (utile après login/logout/upgrade Stripe). */
export function refreshUserPlan(): void {
  cachedState = null;
  cachedAt = 0;
  inflight = null;
}

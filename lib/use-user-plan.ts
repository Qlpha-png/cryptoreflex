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

/** Cache module-scope (1 fetch / page load max). */
let cachedState: MeResponse | null = null;
let inflight: Promise<MeResponse> | null = null;

async function fetchMe(): Promise<MeResponse> {
  if (cachedState) return cachedState;
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
    if (cachedState) {
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
  inflight = null;
}

/**
 * lib/auth.ts — Helpers d'authentification pour les routes serveur.
 *
 * Centralise la vérification du Bearer token utilisé par tous les crons et
 * endpoints admin (revalidate, etc.). Évite la duplication du pattern
 * `if (auth !== expected)` sur ~7 routes — et surtout corrige une faille
 * timing-attack : la comparaison `===` sur deux strings fuit la longueur du
 * préfixe commun via le timing CPU. En théorie un attaquant patient (et avec
 * un canal de mesure stable) peut deviner le secret octet par octet.
 *
 * Concrètement sur Vercel le bruit réseau noie la fuite, mais la mitigation
 * est triviale (`crypto.timingSafeEqual`) — autant le faire correctement.
 *
 * Usage :
 *
 *   import { verifyBearer } from "@/lib/auth";
 *
 *   if (!verifyBearer(req, process.env.CRON_SECRET)) {
 *     return NextResponse.json({ error: "Not found" }, { status: 404 });
 *   }
 */

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Vérifie un Bearer token en temps constant pour éviter les timing attacks.
 *
 * Comportement :
 *  - `secret` absent (undefined / vide) → renvoie `true` (mode dev sans secret).
 *    Le caller est libre de logger un warn pour signaler l'absence.
 *  - `secret` présent → compare octet à octet le header `Authorization` au
 *    pattern `Bearer <secret>`. Toute différence (longueur ou contenu) = false.
 *
 * Note : `timingSafeEqual` throw si les deux Buffer ont des longueurs
 * différentes. On gère ça par un check explicite en amont qui sort en `false`,
 * ce qui est volontairement constant côté caller (toujours `false` rapide,
 * pas d'exception à catcher).
 *
 * @param req — la requête entrante (Request standard ou NextRequest)
 * @param secret — la valeur attendue après "Bearer " (typiquement `process.env.CRON_SECRET`)
 * @returns `true` si autorisé, `false` sinon
 */
export function verifyBearer(req: Request, secret: string | undefined): boolean {
  if (!secret) {
    // Audit BACK 26/04/2026 P1 #5 : avant on retournait toujours true sans
    // secret. Si CRON_SECRET disparaissait par accident de l'env Vercel
    // (typo, suppression), tous les crons devenaient publics SILENCIEUSEMENT.
    // Maintenant : refus strict en prod, autorisation seulement en dev.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[verifyBearer] SECRET MANQUANT en production — refus de l'accès. Configurer CRON_SECRET dans Vercel.",
      );
      return false;
    }
    return true; // mode dev sans secret
  }
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Longueurs différentes → reject sans appeler timingSafeEqual (qui throw).
  if (auth.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
}

/* -------------------------------------------------------------------------- */
/*  USER AUTH (Supabase) — abonnement Cryptoreflex Pro                        */
/* -------------------------------------------------------------------------- */

/**
 * Helpers d'authentification user (Supabase magic link + Stripe subscription).
 *
 * Utilisés par :
 *  - /mon-compte (dashboard user)
 *  - /pro/welcome (post-paiement)
 *  - <ProGate /> client component pour feature gating UI
 *  - Routes API qui doivent connaître le plan du user
 *
 * GRACEFUL DEGRADATION : si Supabase n'est pas configuré (env vars absentes),
 * `getUser()` retourne null. Les pages qui utilisent ces helpers doivent
 * gérer ce cas et afficher un message "Connexion bientôt disponible" plutôt
 * que crasher.
 */

export type Plan = "free" | "pro_monthly" | "pro_annual";

export interface CryptoreflexUser {
  id: string;
  email: string;
  plan: Plan;
  planExpiresAt: Date | null;
  stripeCustomerId: string | null;
}

/**
 * Récupère l'utilisateur courant + son plan depuis Supabase.
 * Retourne null si non authentifié OU si Supabase n'est pas configuré.
 */
export async function getUser(): Promise<CryptoreflexUser | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile, error } = await supabase
    .from("users")
    .select("plan, plan_expires_at, stripe_customer_id")
    .eq("id", authUser.id)
    .single();

  if (error || !profile) {
    // Utilisateur authentifié mais pas encore de ligne dans `users` table
    // (cas post-signup avant que le webhook Stripe ne crée le profil).
    return {
      id: authUser.id,
      email: authUser.email ?? "",
      plan: "free",
      planExpiresAt: null,
      stripeCustomerId: null,
    };
  }

  const planExpiresAt = profile.plan_expires_at
    ? new Date(profile.plan_expires_at)
    : null;

  // Si la date d'expiration est passée, on considère le plan comme `free`
  // (le webhook Stripe devrait l'avoir mis à jour, mais double sécurité).
  const isExpired =
    planExpiresAt !== null && planExpiresAt.getTime() < Date.now();

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    plan: isExpired ? "free" : (profile.plan as Plan),
    planExpiresAt,
    stripeCustomerId: profile.stripe_customer_id,
  };
}

/** Check rapide : l'utilisateur est-il Pro actif ? */
export function isPro(user: CryptoreflexUser | null): boolean {
  if (!user) return false;
  return user.plan === "pro_monthly" || user.plan === "pro_annual";
}

/** Server Component / Route Handler guard : redirect vers /pro si pas Pro. */
export async function requirePro(): Promise<CryptoreflexUser> {
  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte");
  }
  if (!isPro(user)) {
    redirect("/pro");
  }
  return user;
}

/** Server Component / Route Handler guard : redirect vers /connexion si pas authentifié. */
export async function requireAuth(): Promise<CryptoreflexUser> {
  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte");
  }
  return user;
}

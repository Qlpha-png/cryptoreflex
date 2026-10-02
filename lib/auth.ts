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
 * différentes. On gère ça par un check explicite en amont (longueur en
 * OCTETS, cf. safeCompare) qui sort en `false`, ce qui est volontairement
 * constant côté caller (toujours `false` rapide, pas d'exception à catcher).
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
  return safeCompare(auth, `Bearer ${secret}`);
}

/**
 * Comparaison de secrets en temps constant, SANS jamais lever d'exception.
 *
 * AUDIT 2026-10-02 : on comparait `a.length` (unités UTF-16) avant
 * `timingSafeEqual` (octets UTF-8). Un header contenant un caractère non-ASCII
 * de même longueur JS mais de longueur différente en octets faisait throw
 * `timingSafeEqual` → 500 au lieu de 401/404. On compare donc les longueurs
 * en OCTETS (Buffer.byteLength), puis les buffers.
 */
export function safeCompare(provided: string, expected: string): boolean {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  // Longueurs différentes → reject sans appeler timingSafeEqual (qui throw).
  if (a.byteLength !== b.byteLength) return false;
  return timingSafeEqual(a, b);
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

/**
 * Plans Cryptoreflex.
 *
 * - free : compte gratuit (lecture, alertes basiques)
 * - pro_monthly / pro_annual : 2,99€/mois ou 29€/an (Pro V1) — déjà actif
 * - pro_plus_monthly / pro_plus_annual : 9,99€/mois ou 79€/an (Pro+ tier) —
 *   ajouté V1.1 mai 2026, gating IA Q&A illimité, exports illimités, alertes
 *   multi-conditions, accès API personnel.
 *
 * Hiérarchie d'accès : pro_plus_* ⊃ pro_* ⊃ free. Les helpers `isPro` /
 * `isProPlus` sont définis en bas de fichier.
 */
export type Plan =
  | "free"
  | "pro_monthly"
  | "pro_annual"
  | "pro_plus_monthly"
  | "pro_plus_annual";

export interface CryptoreflexUser {
  id: string;
  email: string;
  plan: Plan;
  planExpiresAt: Date | null;
  stripeCustomerId: string | null;
  /** Nom d'affichage personnalisé (depuis users.display_name si présent, sinon
      dérivé de l'email avant @). */
  displayName: string;
  /** True si l'email est listé dans ADMIN_EMAILS (csv, pas de fallback) ET
      a été vérifié (email_confirmed_at). */
  isAdmin: boolean;
}

/**
 * Liste des emails administrateurs, lue depuis ADMIN_EMAILS env var (csv).
 *
 * SÉCURITÉ (audit 2026-10-01) : plus AUCUN fallback hardcodé. Avant, si la
 * variable disparaissait, des emails connus devenaient admin par défaut — et
 * comme l'inscription ne vérifiait pas l'email, n'importe qui pouvait créer
 * un compte avec une de ces adresses et obtenir le rôle admin.
 * Variable absente = aucun admin (fail-closed).
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const ADMIN_EMAILS = new Set(getAdminEmails());

/** Check rapide : un email est-il admin ? */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
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

  const email = authUser.email ?? "";
  // Admin = email listé ET prouvé (email_confirmed_at). Un compte dont
  // l'email n'a jamais été vérifié ne peut pas être admin.
  const admin = isAdminEmail(email) && Boolean(authUser.email_confirmed_at);

  // Helper : dérive un display name lisible à partir de l'email + override
  // user_metadata.display_name (Supabase Auth permet de stocker des metadata
  // arbitraires sans migration DB).
  const metaDisplayName =
    typeof authUser.user_metadata?.display_name === "string"
      ? authUser.user_metadata.display_name.trim()
      : "";
  const fallbackName = email.split("@")[0] || "Utilisateur";
  const displayName = metaDisplayName || fallbackName;

  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("plan, plan_expires_at, stripe_customer_id")
    .eq("id", authUser.id)
    .single();

  if (profileErr || !profile) {
    // Utilisateur authentifié mais pas encore de ligne dans `users` table
    // (cas post-signup avant que le webhook Stripe ne crée le profil).
    // Si admin → accès gratuit à tout (plan pro_annual virtuel).
    return {
      id: authUser.id,
      email,
      plan: admin ? "pro_plus_annual" : "free",
      planExpiresAt: admin ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
      stripeCustomerId: null,
      displayName,
      isAdmin: admin,
    };
  }

  const planExpiresAt = profile.plan_expires_at
    ? new Date(profile.plan_expires_at)
    : null;

  // Si la date d'expiration est passée, on considère le plan comme `free`
  // (le webhook Stripe devrait l'avoir mis à jour, mais double sécurité).
  const isExpired =
    planExpiresAt !== null && planExpiresAt.getTime() < Date.now();

  // Si admin → on FORCE plan pro_annual, peu importe ce qui est en DB
  // (équivalent "free trial à vie" pour les admins de la plateforme).
  const finalPlan: Plan = admin
    ? "pro_plus_annual"
    : isExpired
      ? "free"
      : (profile.plan as Plan);
  const finalExpires: Date | null = admin
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    : planExpiresAt;

  return {
    id: authUser.id,
    email,
    plan: finalPlan,
    planExpiresAt: finalExpires,
    stripeCustomerId: profile.stripe_customer_id,
    displayName,
    isAdmin: admin,
  };
}

/**
 * DÉMONÉTISATION (juin 2026) : Cryptoreflex est 100 % gratuit.
 * Tout utilisateur authentifié est traité comme « Pro » — il n'y a plus de plan
 * payant qui débloque des features. (L'accès anonyme aux features UI passe par
 * <ProGate> devenu pass-through ; les routes qui ont besoin d'une identité
 * gardent leur garde `getUser() === null`.)
 */
export function isPro(user: CryptoreflexUser | null): boolean {
  return user !== null;
}

/** DÉMONÉTISATION : toutes les features avancées sont gratuites pour tout compte. */
export function isProPlus(user: CryptoreflexUser | null): boolean {
  return user !== null;
}

/**
 * Server Component / Route Handler guard. DÉMONÉTISATION : on n'exige plus de
 * plan payant — seulement d'être connecté (les features liées à un compte ont
 * besoin d'une identité). Plus aucune redirection vers /pro pour cause de plan.
 */
export async function requirePro(): Promise<CryptoreflexUser> {
  const user = await getUser();
  if (!user) {
    redirect("/connexion?next=/mon-compte");
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

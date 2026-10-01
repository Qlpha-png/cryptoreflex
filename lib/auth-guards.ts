/**
 * lib/auth-guards.ts — Protection contre la « prise de compte par pré-inscription ».
 *
 * Scénario (audit sécurité 2026-10-01) : un attaquant inscrit l'email d'une
 * victime avec SON mot de passe (compte non confirmé, par ex. via l'API
 * publique Supabase). Plus tard, la victime reçoit un lien magique ou de
 * réinitialisation et clique : Supabase confirme l'email SANS toucher au mot
 * de passe (verify.go → recoverVerify → user.Confirm) → l'attaquant se
 * connecte avec le sien.
 *
 * Parade : `generateSafeEmailLink` génère le lien, lit le compte renvoyé par
 * Supabase (source de vérité : auth.users, pas public.users) et, s'il n'est
 * PAS confirmé, remplace son mot de passe par une valeur aléatoire puis
 * régénère le lien (le 1er jeton est écrasé en base). FAIL-CLOSED : la moindre
 * erreur → aucun lien renvoyé, donc aucun email envoyé.
 */

import { randomBytes } from "node:crypto";
import type { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

export type SafeLinkResult =
  | { ok: true; hashedToken: string }
  | { ok: false; reason: "not_found" | "error"; message: string };

/**
 * Mot de passe jetable : 32 octets aléatoires, jamais communiqué à personne.
 * Le suffixe fixe garantit minuscule + majuscule + chiffre + symbole : l'API
 * admin applique la politique de mots de passe du projet (checkPasswordStrength
 * dans adminUserCreate/adminUserUpdate) ; sans lui, ~25 % des tirages base64url
 * n'auraient aucun symbole et seraient refusés si la politique en exige un.
 */
export function randomPassword(): string {
  return `${randomBytes(32).toString("base64url")}aA1!`;
}

export async function generateSafeEmailLink(
  admin: AdminClient,
  type: "magiclink" | "recovery",
  email: string,
  redirectTo: string,
): Promise<SafeLinkResult> {
  const generate = () =>
    admin.auth.admin.generateLink({ type, email, options: { redirectTo } });

  try {
    const first = await generate();
    const user = first.data?.user;
    const token = first.data?.properties?.hashed_token;
    if (first.error || !user?.id || !token) {
      const message = first.error?.message ?? "generateLink : réponse incomplète";
      const notFound =
        /not found|user_not_found/i.test(message) ||
        (first.error as { code?: string } | null)?.code === "user_not_found";
      return { ok: false, reason: notFound ? "not_found" : "error", message };
    }

    if (user.email_confirmed_at) return { ok: true, hashedToken: token };

    // Compte NON confirmé : le mot de passe a été posé sans preuve de l'email.
    const upd = await admin.auth.admin.updateUserById(user.id, {
      password: randomPassword(),
    });
    if (upd.error) {
      return { ok: false, reason: "error", message: `updateUserById : ${upd.error.message}` };
    }

    // Nouveau jeton émis APRÈS la neutralisation (écrase le précédent).
    const second = await generate();
    const token2 = second.data?.properties?.hashed_token;
    if (second.error || !token2 || second.data?.user?.id !== user.id) {
      return {
        ok: false,
        reason: "error",
        message: second.error?.message ?? "generateLink (2) : réponse incomplète",
      };
    }
    return { ok: true, hashedToken: token2 };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

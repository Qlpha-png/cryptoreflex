/**
 * lib/safe-redirect.ts — Résolution d'un paramètre `next` en cible de
 * redirection TOUJOURS interne au site (anti open-redirect).
 *
 * AUDIT 2026-10-01 : une liste de préfixes interdits (`//`, `/\`) était
 * contournable (`/%09/evil.com` → "/\t/evil.com" ; le parseur d'URL supprime
 * la tabulation → `//evil.com` → redirection hors site). On résout donc la
 * cible et on exige la MÊME origine. Le résultat est un objet URL absolu, à
 * passer tel quel à NextResponse.redirect (jamais re-parsé depuis une chaîne :
 * un chemin normalisé en `//evil.com` redeviendrait externe).
 */
export function resolveSameOriginRedirect(
  rawNext: string | null | undefined,
  origin: string,
  fallback = "/mon-compte",
): URL {
  const defaultTarget = new URL(fallback, origin);
  if (!rawNext || !rawNext.startsWith("/")) return defaultTarget;
  try {
    const target = new URL(rawNext, origin);
    return target.origin === new URL(origin).origin ? target : defaultTarget;
  } catch {
    return defaultTarget;
  }
}

/**
 * Retours autorisés après connexion / inscription (liste FERMÉE, comparaison stricte) :
 * seul le jeu Reflex Cards. Tout le reste (URL absolue, « //hôte », tableau, autre chemin) → null.
 */
export function allowedAuthNext(raw: unknown): "/cartes/jouer" | null {
  return raw === "/cartes/jouer" ? "/cartes/jouer" : null;
}

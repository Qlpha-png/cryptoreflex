/**
 * lib/abtest.ts — Framework A/B testing léger (zéro dépendance).
 *
 * Pourquoi un framework custom et pas Vercel Edge Config / GrowthBook / Optimizely ?
 *  - Zéro KB ajouté au bundle (vs ~30 KB pour GrowthBook).
 *  - Pas de provider externe à payer ni à brancher.
 *  - Suffit pour la phase d'optimisation V1 (≤ 5 expériences simultanées).
 *  - Migration vers Edge Config triviale plus tard : il suffit de remplacer
 *    `EXPERIMENTS` (constante hardcodée) par un fetch Edge Config au boot.
 *
 * Architecture :
 *  - `EXPERIMENTS` : map id → définition (variants + weights optionnels).
 *  - `getVariant(id)` : déterministe par cookie. SSR retourne "control" puis
 *    rerender côté Client une fois le cookie résolu (évite mismatch hydration).
 *  - `useVariant(id)` : hook Client qui résout le cookie + déclenche tracking.
 *  - `trackVariantExposure` : fire-and-forget POST vers `/api/abtest/exposure`
 *    pour persister l'exposition KV (compteur INCR par variant).
 *
 * Mesure des conversions :
 *  - À ton CTA / formulaire / lien à mesurer, appeler manuellement
 *    `trackVariantConversion(id, variant, "newsletter-signup")`.
 *  - Côté serveur, /api/abtest/conversion INCR le compteur correspondant.
 *
 * Cookie :
 *  - Nom : `cr_ab_{experimentId}` (max ~10 cookies si on a 10 expé actives).
 *  - TTL : 30 jours (cohérence cross-pages, refresh à chaque visite).
 *  - SameSite=Lax, Path=/ ; pas de Secure en dev (cookie posé côté JS).
 *
 * Usage :
 *
 *   // ---- Server Component ----
 *   // SSR retourne "control" — l'utilisateur voit immédiatement le control,
 *   // puis le client rerender avec le bon variant si différent.
 *   import { getVariant } from "@/lib/abtest";
 *   const variant = getVariant("hero-title-v1");
 *   return (
 *     <Hero
 *       title={
 *         variant === "v2-emotional" ? "Investis sereinement, sans stress." :
 *         variant === "v3-stat"      ? "847k Français investissent en crypto." :
 *                                      "Ton premier achat crypto, en 5 min."
 *       }
 *     />
 *   );
 *
 *   // ---- Client Component ----
 *   // Le hook s'occupe du cookie + du tracking d'exposure automatiquement.
 *   "use client";
 *   import { useVariant, trackVariantConversion } from "@/lib/abtest";
 *
 *   export function CtaBlock() {
 *     const variant = useVariant("cta-color-v1");
 *     const cls = variant === "green" ? "bg-accent-green" : "bg-primary";
 *     return (
 *       <button
 *         className={cls}
 *         onClick={() => {
 *           trackVariantConversion("cta-color-v1", variant, "affiliate-click");
 *           // ... action métier
 *         }}
 *       >
 *         S'inscrire
 *       </button>
 *     );
 *   }
 */

import { useEffect, useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface Experiment {
  id: string;
  /** Liste des variants. Le premier doit être "control" par convention. */
  variants: string[];
  /**
   * Poids optionnels (somme = 1.0). Doit avoir la même longueur que variants.
   * Si absent : équiprobable.
   */
  weights?: number[];
}

/* -------------------------------------------------------------------------- */
/*  Catalogue des expériences actives                                         */
/* -------------------------------------------------------------------------- */

/**
 * EXPERIMENTS — catalogue hardcodé des expé actives en V1.
 *
 * Pour ajouter une expé : décommenter ou ajouter une entrée. Pour la stopper :
 * commenter / supprimer (les utilisateurs déjà bucketés gardent leur cookie
 * mais aucune exposure n'est plus trackée — analyse possible jusqu'à TTL).
 *
 * IMPORTANT — ne pas changer les `id` ni l'ordre/le nom des `variants` une
 * fois en prod : les compteurs KV sont indexés par `{id}:{variant}`, donc
 * toute modification rend l'historique illisible.
 */
export const EXPERIMENTS: Record<string, Experiment> = {
  "hero-title-v1": {
    id: "hero-title-v1",
    variants: ["control", "v2-emotional", "v3-stat"],
    // 50% control / 25% / 25% : on garde un control majoritaire pour avoir
    // un baseline stable pendant la phase d'apprentissage.
    weights: [0.5, 0.25, 0.25],
  },
};

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

/** Préfixe des cookies A/B (évite collision avec d'autres cookies du site). */
const COOKIE_PREFIX = "cr_ab_";
/** TTL des cookies A/B (30 jours en secondes pour `Max-Age`). */
const COOKIE_TTL_SEC = 30 * 24 * 60 * 60;
/** Endpoint serveur pour persister les exposures (fire-and-forget). */
const EXPOSURE_ENDPOINT = "/api/abtest/exposure";
/** Endpoint serveur pour persister les conversions. */
const CONVERSION_ENDPOINT = "/api/abtest/conversion";

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

const isBrowser = (): boolean => typeof window !== "undefined";

/** Lit un cookie côté client (SSR-safe → renvoie null). */
function readCookie(name: string): string | null {
  if (!isBrowser()) return null;
  try {
    const raw = document.cookie || "";
    const parts = raw.split(";");
    for (const part of parts) {
      const [k, ...v] = part.trim().split("=");
      if (k === name) return decodeURIComponent(v.join("="));
    }
    return null;
  } catch {
    return null;
  }
}

/** Pose un cookie côté client. SameSite=Lax, Path=/, TTL 30j. */
function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (!isBrowser()) return;
  try {
    const v = encodeURIComponent(value);
    // Secure ajouté uniquement en HTTPS (sinon le browser refuse en dev http://).
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${v}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`;
  } catch {
    /* ignore : quota, mode privé strict, etc. */
  }
}

/**
 * Choix pondéré d'un variant.
 * - Si pas de `weights` ou tableau invalide : équiprobable.
 * - Sinon : tirage cumulatif sur la somme des poids.
 *
 * Remarque : on n'exige pas que les poids somment exactement à 1.0 — on
 * normalise par la somme effective. Tolérance face à un float un peu off.
 */
function pickWeighted(variants: string[], weights?: number[]): string {
  if (!variants.length) return "control";
  if (!weights || weights.length !== variants.length) {
    return variants[Math.floor(Math.random() * variants.length)];
  }
  const total = weights.reduce((s, w) => s + (w > 0 ? w : 0), 0);
  if (total <= 0) return variants[0];
  let r = Math.random() * total;
  for (let i = 0; i < variants.length; i++) {
    const w = weights[i] > 0 ? weights[i] : 0;
    if (r < w) return variants[i];
    r -= w;
  }
  return variants[variants.length - 1];
}

/* -------------------------------------------------------------------------- */
/*  API publique                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Renvoie le variant assigné à l'utilisateur pour `experimentId`.
 *
 * - SSR : retourne "control" (pas d'accès cookie côté serveur dans cette V1).
 *   Le composant Client refera l'appel et rerender si nécessaire.
 * - Client sans cookie : tirage pondéré + pose du cookie pour cohérence.
 * - Client avec cookie : retourne la valeur stockée (cohérence cross-pages).
 *
 * ATTENTION — ne déclenche PAS le tracking d'exposure. Pour ça, utiliser
 * `useVariant()` (qui combine getVariant + trackVariantExposure).
 */
export function getVariant(experimentId: string): string {
  const exp = EXPERIMENTS[experimentId];
  if (!exp) {
    // Garde-fou : expé inconnue → on ne crash pas, on retourne "control".
    return "control";
  }

  // SSR : on n'a pas accès au cookie ici (on ne lit pas req.headers dans cette
  // V1 pour rester simple). Retour "control" + rerender Client.
  if (!isBrowser()) return "control";

  const cookieName = `${COOKIE_PREFIX}${experimentId}`;
  const stored = readCookie(cookieName);
  if (stored && exp.variants.includes(stored)) {
    return stored;
  }

  // Premier passage : tirage + persistance.
  const chosen = pickWeighted(exp.variants, exp.weights);
  writeCookie(cookieName, chosen, COOKIE_TTL_SEC);
  return chosen;
}

/**
 * Envoie l'exposition (impression) au backend pour stats KV.
 * Fire-and-forget : aucune exception ne remonte, aucun await à faire côté UI.
 */
export function trackVariantExposure(
  experimentId: string,
  variant: string,
): void {
  if (!isBrowser()) return;
  try {
    // `keepalive: true` : le browser n'annule pas la requête si l'utilisateur
    // navigue ailleurs (utile car on peut tracker juste avant un click).
    void fetch(EXPOSURE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId, variant }),
      keepalive: true,
      // Pas de credentials nécessaires (route publique anonyme).
    }).catch(() => {
      /* ignore — analytics n'altère jamais l'UX */
    });
  } catch {
    /* ignore */
  }
}

/**
 * Envoie une conversion au backend pour stats KV.
 *
 * @param conversionType ex: "newsletter-signup", "affiliate-click", "alert-create"
 *
 * Note : on garde les `conversionType` côté client libres (string), mais on
 * recommande une whitelist conservatrice côté serveur (cf. route conversion).
 */
export function trackVariantConversion(
  experimentId: string,
  variant: string,
  conversionType: string,
): void {
  if (!isBrowser()) return;
  try {
    void fetch(CONVERSION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experimentId, variant, conversionType }),
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });
  } catch {
    /* ignore */
  }
}

/**
 * Hook React Client : assigne un variant + log l'exposure au montage.
 *
 * - SSR : retourne "control" (cohérent avec `getVariant`).
 * - Client : effet une seule fois → tirage du cookie si absent + POST exposure.
 *
 * Le re-render après hydration peut produire un "flash" (control → variant) ;
 * pour les expériences visuelles fortes, préférer placer le composant testé
 * dans un wrapper `suppressHydrationWarning` ou utiliser `getVariant` en SC
 * avec un cookie lu côté serveur (V2).
 */
export function useVariant(experimentId: string): string {
  // Initialisation : "control" pour matcher le SSR (évite hydration mismatch).
  const [variant, setVariant] = useState<string>("control");

  useEffect(() => {
    const v = getVariant(experimentId);
    setVariant(v);
    // Track l'exposition une fois (le hook est appelé 1 fois par mount du composant).
    trackVariantExposure(experimentId, v);
    // experimentId est typiquement constant à la durée du composant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentId]);

  return variant;
}

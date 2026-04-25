"use client";

/**
 * lib/abtest-client.ts — Hook React Client pour le framework A/B test.
 *
 * Pourquoi un fichier séparé de `lib/abtest.ts` ?
 *  - `lib/abtest.ts` est aussi importé par les routes API serveur
 *    (`/api/abtest/exposure`, `/api/abtest/conversion`) qui ont besoin de
 *    `EXPERIMENTS` pour valider les inputs.
 *  - Si `lib/abtest.ts` importait `useEffect`/`useState` de React, Next.js
 *    refuserait l'import depuis un Server Component (erreur "needs Client").
 *  - Solution : on isole le hook dans ce fichier marqué "use client".
 *
 * Usage :
 *   "use client";
 *   import { useVariant } from "@/lib/abtest-client";
 *   import { trackVariantConversion } from "@/lib/abtest";
 *
 *   const variant = useVariant("hero-title-v1");
 *   // ... rendu conditionnel selon `variant`
 *   onClick={() => trackVariantConversion("hero-title-v1", variant, "newsletter-signup")}
 */

import { useEffect, useState } from "react";
import { getVariant, trackVariantExposure } from "./abtest";

/**
 * Hook React Client : assigne un variant + log l'exposure au montage.
 *
 * - SSR : retourne "control" (cohérent avec `getVariant` côté serveur).
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

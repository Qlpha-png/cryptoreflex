"use client";

/**
 * HeroHeadline — îlot Client A/B pour le H1 du Hero.
 *
 * Pourquoi un sous-composant Client dédié plutôt que de basculer Hero entier ?
 *  - Hero reste Server Component (LCP, SSR du dotted grid + halo + widget live).
 *  - Seul le H1 a besoin du hook `useVariant` côté client.
 *  - SSR rend le `control` (cohérent avec `getVariant()` côté server). Après
 *    hydration, le hook réassigne le variant cookie-based : si différent du
 *    control, rerender → flash perceptible mais acceptable pour 50% du trafic
 *    (ratio non-control). Pour minimiser, le `control` ici est volontairement
 *    le wording actuel — donc 33% des users ne verront jamais de flash.
 *
 * Tracking :
 *  - Exposure : géré par `useVariant` (POST `/api/abtest/exposure`).
 *  - Conversion `click_pro_cta` : tracker le click sur le CTA primary
 *    voisin "Trouver ma plateforme en 2 min" est fait dans Hero.tsx (ce
 *    composant n'a pas accès au CTA). On expose donc une util `trackHeroCta`
 *    consommable depuis Hero (mais Hero est SC → impossible). Solution V1 :
 *    on ne tracke que l'exposure depuis ce composant ; pour la conversion CTA,
 *    on ajoutera un wrapper Client si nécessaire dans une vague suivante.
 */

import { useVariant } from "@/lib/abtest-client";

const EXPERIMENT_ID = "hero_headline_v1";

export default function HeroHeadline() {
  const variant = useVariant(EXPERIMENT_ID);

  if (variant === "social-proof") {
    return (
      <h1 className="ds-h1 leading-[1.05]">
        <span className="hero-headline-accent">847k Français</span>
        <br className="hidden lg:inline" />{" "}
        <span className="text-fg">investissent en crypto. Comprends pourquoi.</span>
      </h1>
    );
  }

  if (variant === "speed") {
    return (
      <h1 className="ds-h1 leading-[1.05]">
        Ton 1<sup className="text-[0.55em] align-super">er</sup> achat crypto{" "}
        <span className="hero-headline-accent">en 5 minutes</span>
        <br className="hidden lg:inline" />{" "}
        <span className="text-fg">— guidé étape par étape.</span>
      </h1>
    );
  }

  // BATCH 34 — fix user feedback "on est pas juste un comparateur on est
  // tout un ensemble". Cryptoreflex = écosystème complet (100 cryptos + 34
  // plateformes + 26 outils + fiscalité + méthodologie publique), pas juste
  // un comparateur. Nouveau headline élargit la promesse + garde le hook
  // "847 pages MiCA" qui ancre l'autorité concrète.
  return (
    <h1 className="ds-h1 leading-[1.05]">
      L&apos;écosystème crypto français qui a lu les{" "}
      <span className="hero-headline-accent">847 pages de MiCA</span>
      <br className="hidden lg:inline" />{" "}
      <span className="text-fg">
        pour toi. Plateformes, analyses, outils, fiscalité — tout en un.
      </span>
    </h1>
  );
}

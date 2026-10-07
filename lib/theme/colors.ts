"use client";

/**
 * lib/theme/colors.ts — couleurs du thème pour le code qui ne peut pas écrire `rgb(var(--c-…))` lui-même
 * (attributs de présentation SVG calculés en JS, canvas, bibliothèques de graphiques).
 *
 * Lecture des variables `--c-*` de app/styles/tokens.css par getComputedStyle sur <html>, au montage et à chaque
 * événement « cr-theme » (émis par la bascule de thème à partir du lot A6 ; personne ne l'émet avant).
 * Côté serveur et avant le montage : repli sur les valeurs legacy ci-dessous (identiques à tokens.css, contrôlé par
 * tests/lib/design-theme-colors.test.ts), donc aucun écart d'hydratation et un rendu identique au pixel.
 *
 * Valeurs au format canaux « R G B » (comme tokens.css) : rgb("primary") → "rgb(245 165 36)",
 * rgb("scrim", 0.25) → "rgb(0 0 0 / 0.25)".
 */
import { useCallback, useEffect, useState } from "react";

/** Événement de changement de thème (window), émis à partir du lot A6. */
export const THEME_EVENT = "cr-theme";

/**
 * Repli = thème par défaut de tokens.css (lot B2 : « Encre », premier bloc :root). Ne lister que les jetons utilisés
 * par du JS. Sous l'essai Papier (?theme=papier), les vraies valeurs sont relues après montage.
 */
export const THEME_FALLBACK = {
  background: "17 26 43",
  surface: "23 34 53",
  border: "38 50 74",
  fg: "243 237 226",
  "fg-4": "139 147 163",
  "fg-max": "243 237 226",
  scrim: "0 0 0",
  primary: "244 176 60",
  "primary-glow": "248 196 104",
  "accent-cyan": "147 189 242",
  success: "108 203 152",
  warning: "242 167 102",
  danger: "255 149 133",
} as const;

export type ThemeColorName = keyof typeof THEME_FALLBACK;
export type ThemeChannels = Record<ThemeColorName, string>;

const NOMS = Object.keys(THEME_FALLBACK) as ThemeColorName[];

function normaliser(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

/** Lit les canaux calculés des variables --c-* ; repli legacy pour toute variable absente ou hors navigateur. */
export function readThemeChannels(): ThemeChannels {
  const out = { ...THEME_FALLBACK } as ThemeChannels;
  if (typeof window === "undefined" || typeof document === "undefined") return out;
  const cs = getComputedStyle(document.documentElement);
  for (const n of NOMS) {
    const v = normaliser(cs.getPropertyValue(`--c-${n}`));
    if (/^\d{1,3} \d{1,3} \d{1,3}$/.test(v)) out[n] = v;
  }
  return out;
}

/** Chaîne CSS complète à partir des canaux : rgb(R G B) ou rgb(R G B / a). */
export function toRgb(channels: string, alpha?: number): string {
  return alpha === undefined ? `rgb(${channels})` : `rgb(${channels} / ${alpha})`;
}

function egaux(a: ThemeChannels, b: ThemeChannels): boolean {
  return NOMS.every((n) => a[n] === b[n]);
}

/**
 * Hook : renvoie `rgb(nom, alpha?)`. Valeurs de repli au premier rendu (serveur ET client, pas d'écart d'hydratation),
 * puis valeurs calculées après montage et à chaque « cr-theme ». Aucun nouveau rendu si les valeurs n'ont pas changé.
 */
export function useThemeColors(): (name: ThemeColorName, alpha?: number) => string {
  const [channels, setChannels] = useState<ThemeChannels>(THEME_FALLBACK as ThemeChannels);
  useEffect(() => {
    const lire = () => {
      const lu = readThemeChannels();
      setChannels((prec) => (egaux(prec, lu) ? prec : lu));
    };
    lire();
    window.addEventListener(THEME_EVENT, lire);
    return () => window.removeEventListener(THEME_EVENT, lire);
  }, []);
  return useCallback((name: ThemeColorName, alpha?: number) => toRgb(channels[name], alpha), [channels]);
}

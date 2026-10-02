import { Barlow_Condensed, Cinzel } from "next/font/google";

/* Polices propres aux cartes, auto-hébergées par next/font (la CSP du site refuse Google Fonts).
   Space Grotesk et JetBrains Mono viennent de app/layout.tsx (--font-display, --font-mono) : un seul
   fichier pour tout le site (Space Grotesk y inclut latin-ext pour le ₮ de USA₮).
   - latin-ext : noms avec signes hors latin de base ; fichier téléchargé seulement si besoin (unicode-range).
   - adjustFontFallback: false : un signe absent (le τ de τemplar) tombe sur la police système, comme
     dans la maquette, et non sur une Arial redimensionnée.
   - pas de préchargement : les cartes des fiches sont sous la ligne de flottaison. */
export const rcCond = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--rc-f-cond",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});
export const rcSerif = Cinzel({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--rc-f-serif",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});
export const RC_FONT_VARS = `${rcCond.variable} ${rcSerif.variable}`;

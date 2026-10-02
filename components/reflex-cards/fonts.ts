import { Barlow_Condensed, Cinzel } from "next/font/google";

/* Polices des cartes, auto-hébergées par next/font (la CSP du site refuse Google Fonts).
   Space Grotesk et JetBrains Mono viennent déjà de app/layout.tsx (--font-display, --font-mono). */
export const rcCond = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--rc-f-cond",
  display: "swap",
  /* pas de préchargement : l'encart des fiches est sous la ligne de flottaison, on ne pénalise pas leur chargement */
  preload: false,
});
export const rcSerif = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--rc-f-serif",
  display: "swap",
  preload: false,
});
export const RC_FONT_VARS = `${rcCond.variable} ${rcSerif.variable}`;

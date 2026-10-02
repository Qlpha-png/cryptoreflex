import { Barlow_Condensed, Cinzel, Space_Grotesk } from "next/font/google";

/* Polices des cartes, auto-hébergées par next/font (la CSP du site refuse Google Fonts).
   - latin-ext : certains noms ont des signes hors latin de base (USA₮) ; le fichier n'est
     téléchargé que si un de ces signes est affiché (unicode-range).
   - adjustFontFallback: false : un signe absent de la police (le τ de τemplar) tombe sur la police
     système, comme dans la maquette, et non sur une Arial redimensionnée.
   - pas de préchargement : l'encart des fiches est sous la ligne de flottaison, on ne pénalise pas leur chargement.
   JetBrains Mono vient de app/layout.tsx (--font-mono) : les cartes n'y utilisent que du latin. */
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
export const rcSans = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--rc-f-sans",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});
export const RC_FONT_VARS = `${rcCond.variable} ${rcSerif.variable} ${rcSans.variable}`;

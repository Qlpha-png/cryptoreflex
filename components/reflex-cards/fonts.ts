import localFont from "next/font/local";

/* Polices propres aux cartes, AUTO-HÉBERGÉES (public/fonts/barlow-condensed, public/fonts/cinzel) : plus aucune requête
   vers Google au build (le téléchargement de next/font/google a fait échouer le build de production à trois reprises,
   les 08-10/10/2026 : « Cannot read properties of null (reading '1') » dans @next/font/dist/google/loader.js).
   Mêmes variables CSS, même display, même absence de préchargement que l'ancienne version next/font/google.
   Space Grotesk et JetBrains Mono viennent de app/layout.tsx (--font-display, --font-mono) : un seul
   fichier pour tout le site (Space Grotesk y inclut latin-ext pour le ₮ de USA₮).
   - Fichiers : jeux latin + latin-ext des familles, tirés des sources officielles (dépôt google/fonts, licence SIL OFL 1.1
     dans chaque dossier), points de code identiques aux fichiers que servait Google Fonts. next/font/local ne sait pas
     découper un fichier par unicode-range : latin et latin-ext sont réunis dans un seul fichier par graisse, et
     l'unicode-range d'origine (latin + latin-ext) reste déclaré, donc un signe hors de ces plages retombe toujours sur
     la police système, comme avant.
   - next/font/local exige des littéraux écrits en toutes lettres : l'unicode-range est donc répété dans chaque appel.
   - adjustFontFallback: false : un signe absent (le τ de τemplar) tombe sur la police système, comme
     dans la maquette, et non sur une Arial redimensionnée.
   - pas de préchargement : les cartes des fiches sont sous la ligne de flottaison. */
export const rcCond = localFont({
  src: [
    { path: "../../public/fonts/barlow-condensed/barlow-condensed-600-latin.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/barlow-condensed/barlow-condensed-700-latin.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/barlow-condensed/barlow-condensed-800-latin.woff2", weight: "800", style: "normal" },
  ],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD, U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
  variable: "--rc-f-cond",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});
/* Cinzel est une police variable (400-900) : un seul fichier, déclaré en 600 et 700 comme le faisait Google Fonts. */
export const rcSerif = localFont({
  src: [
    { path: "../../public/fonts/cinzel/cinzel-latin.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/cinzel/cinzel-latin.woff2", weight: "700", style: "normal" },
  ],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD, U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
  variable: "--rc-f-serif",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});
export const RC_FONT_VARS = `${rcCond.variable} ${rcSerif.variable}`;

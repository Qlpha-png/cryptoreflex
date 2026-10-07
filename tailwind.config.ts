import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

/**
 * Cryptoreflex Design System — single source of truth.
 * Voir: plan/code/design-system.md pour la doc tokens + règles d'usage.
 *
 * Principes :
 *  - 4-base spacing (Tailwind par défaut, vérifié OK)
 *  - Typography scale nommée (caption/small/body/lead/h1..h6/display)
 *  - Couleurs sémantiques (success/warning/danger/info) en plus de la palette brand
 *  - 5 niveaux d'élévation (shadow.e1..e5)
 *  - Radii nommés (sm/md/lg/xl/2xl/3xl) alignés 6/10/14/18/24/32
 *  - Motion tokens (duration.fast/normal/slow + easings nommés)
 */

/** Couleur opaque en canaux « R G B » : accepte l'opacité Tailwind (bg-primary/10 → rgb(var(--c-primary) / 0.1)). */
const c = (nom: string) => `rgb(var(--c-${nom}) / <alpha-value>)`;
/** Couleur complète (rgba en phase legacy) : pas d'opacité /NN possible. */
const plein = (nom: string) => `var(--c-${nom})`;

const config: Config = {
  // Lot A6 : la variante dark: suit l'attribut data-theme="dark" posé sur <html> (script avant affichage,
  // lib/theme/anti-flash.ts), plus la préférence du système. 0 classe dark: dans le code aujourd'hui : CSS compilé
  // inchangé. :where() garde la spécificité de la classe seule (comme la stratégie « selector »).
  darkMode: ["variant", '&:where([data-theme="dark"], [data-theme="dark"] *)'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
    // 06/10/2026 : lib/ manquait (46 classes jamais générées : dégradés des parcours /academie,
    // pastilles du calendrier…). Le jeu Reflex Cards a son propre CSS : on l'exclut.
    "./lib/**/*.{ts,tsx}",
    "!./lib/reflex-cards/game/**",
  ],
  theme: {
    extend: {
      // ---------------------------------------------------------------
      // COLORS
      // ---------------------------------------------------------------
      // Valeurs dans app/styles/tokens.css, GÉNÉRÉ par scripts/design/tokens.source.mjs (source unique ; lot A1 du
      // plan de migration : phase « legacy » = valeurs actuelles, rendu identique au pixel). Format canaux « R G B » :
      // c("x") = rgb(var(--c-x) / <alpha-value>), indispensable aux 3 642 classes à opacité (bg-primary/10…) ; sans
      // <alpha-value>, elles disparaîtraient SANS erreur de build (test : tests/lib/design-tokens-alpha.test.ts).
      // plein("x") = var(--c-x), couleur complète (rgba) : *-soft et *-border des couleurs d'état. Un /NN sur elles
      // est ignoré par Tailwind (la classe garde l'opacité de la variable) : ne pas en écrire.
      // Ordre des clés : les noms existants d'abord, dans leur ordre d'origine ; les nouveaux noms À LA FIN.
      colors: {
        // Anthracite chaud — inspiré CoinGecko/Phantom/Bitpanda premium
        background: c("background"),
        surface: c("surface"),
        elevated: c("elevated"),
        border: c("border"),

        // Identité Cryptoreflex : GOLD désaturé
        primary: c("primary"),
        "primary-glow": c("primary-glow"),
        "primary-soft": c("primary-soft"),

        // Accents data (compatibilité) : green = success et rose = danger (valeurs identiques), cyan à part.
        accent: {
          cyan: c("accent-cyan"),
          green: c("success"),
          rose: c("danger"),
        },

        // DA OBSIDIAN 2026-06-11 — accent FROID "glacier" pour la data (chiffres live, sparklines, liens data).
        // Distinct du token sémantique `info` (réservé aux alertes/notices) même si les teintes sont voisines.
        ice: {
          DEFAULT: c("ice"),
          fg: c("ice-fg"),
          soft: plein("ice-soft"),
          border: plein("ice-border"),
        },

        // Texte
        fg: c("fg"),
        // muted : #B0B7C3 (WCAG AA sur background, surface, elevated). --color-muted de globals.css en est
        // désormais l'alias (il valait l'ancienne valeur, reprise par le jeton fg-4).
        muted: c("muted"),

        // -----------------------------------------------------------
        // SEMANTIC COLOR TOKENS — utiliser PRIORITAIREMENT ces tokens
        // au lieu de accent-green/accent-rose/amber-* dans les composants.
        // -----------------------------------------------------------
        success: {
          DEFAULT: c("success"),
          fg: c("success-fg"),
          soft: plein("success-soft"),
          border: plein("success-border"),
        },
        warning: {
          DEFAULT: c("warning"),
          fg: c("warning-fg"),
          soft: plein("warning-soft"),
          border: plein("warning-border"),
        },
        danger: {
          DEFAULT: c("danger"),
          fg: c("danger-fg"),
          soft: plein("danger-soft"),
          border: plein("danger-border"),
        },
        info: {
          DEFAULT: c("info"),
          fg: c("info-fg"),
          soft: plein("info-soft"),
          border: plein("info-border"),
        },

        // -----------------------------------------------------------
        // NOUVEAUX NOMS (lot A1), valeurs legacy : aucune classe ne les utilise encore.
        // fg-max, scrim, on-gold = cibles mécaniques du lot A4 (blanc et noir en dur), identiques au pixel.
        // Les autres prennent leurs vraies valeurs C+ au lot B2. « gold » n'a PAS de nom Tailwind : text-gold,
        // border-gold/40 et from-gold/10 sont déjà écrits (sans effet aujourd'hui) dans 3 pages d'outils.
        // -----------------------------------------------------------
        "fg-max": c("fg-max"),
        scrim: c("scrim"),
        "on-gold": c("on-gold"),
        "fg-2": c("fg-2"),
        "fg-4": c("fg-4"),
        sunken: c("sunken"),
        "heat-flat": c("heat-flat"),
        "border-strong": c("border-strong"),
        "border-input": c("border-input"),
        "primary-hover": c("primary-hover"),
        "gold-soft": c("gold-soft"),
        action: c("action"),
        "action-hover": c("action-hover"),
        "on-action": c("on-action"),
        "action-chip": c("action-chip"),
        "on-action-chip": c("on-action-chip"),
        link: c("link"),
        "link-line": c("link-line"),
        "link-hover": c("link-hover"),
        up: c("up"),
        down: c("down"),
        flat: c("flat"),
        "chart-line": c("chart-line"),
        "chart-ref": c("chart-ref"),
        focus: c("focus"),
        "logo-accent": c("logo-accent"),
        "logo-reflet": c("logo-reflet"),
        "logo-plate": c("logo-plate"),
        "on-plate": c("on-plate"),
        "plate-ink": c("plate-ink"),
        "scroll-shadow": c("scroll-shadow"),
        "r-c": c("r-c"),
        "r-pc": c("r-pc"),
        "r-r": c("r-r"),
        "r-sr": c("r-sr"),
        "r-ur": c("r-ur"),
        "r-l": c("r-l"),
        "r-c-text": c("r-c-text"),
        "r-pc-text": c("r-pc-text"),
        "r-r-text": c("r-r-text"),
        "r-sr-text": c("r-sr-text"),
        "r-ur-text": c("r-ur-text"),
        "r-l-text": c("r-l-text"),
        "ed-icon": c("ed-icon"),
        "ed-myth": c("ed-myth"),
        "ed-relic": c("ed-relic"),
      },

      // ---------------------------------------------------------------
      // SPACING — 4-base scale (Tailwind défaut OK, on documente ici)
      // 1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64 20=80 24=96
      // Ajout : tap-target = 44 (Apple HIG / WCAG 2.5.5)
      // ---------------------------------------------------------------
      spacing: {
        tap: "44px",
      },

      // ---------------------------------------------------------------
      // TYPOGRAPHY SCALE
      // Format : [fontSize, { lineHeight, letterSpacing?, fontWeight? }]
      // ---------------------------------------------------------------
      fontSize: {
        caption: ["11px", { lineHeight: "14px", letterSpacing: "0.01em" }],
        small: ["13px", { lineHeight: "18px" }],
        body: ["15px", { lineHeight: "22px" }],
        lead: ["17px", { lineHeight: "26px" }],
        h6: ["18px", { lineHeight: "24px", fontWeight: "600" }],
        h5: ["20px", { lineHeight: "26px", fontWeight: "600" }],
        h4: ["24px", { lineHeight: "30px", fontWeight: "700", letterSpacing: "-0.01em" }],
        h3: ["30px", { lineHeight: "36px", fontWeight: "700", letterSpacing: "-0.015em" }],
        h2: ["36px", { lineHeight: "42px", fontWeight: "800", letterSpacing: "-0.02em" }],
        h1: ["48px", { lineHeight: "52px", fontWeight: "800", letterSpacing: "-0.025em" }],
        display: ["64px", { lineHeight: "68px", fontWeight: "800", letterSpacing: "-0.03em" }],
      },

      fontFamily: {
        // « Cryptoreflex NNBSP » : seulement U+202F, l'espace des milliers en français (voir app/globals.css).
        sans: ["Cryptoreflex NNBSP", "var(--font-sans)", "system-ui", "sans-serif"],
        display: ["Cryptoreflex NNBSP", "var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["Cryptoreflex NNBSP", "var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontVariantNumeric: {
        tabular: "tabular-nums",
      },

      // ---------------------------------------------------------------
      // RADII — échelle nommée (px values aligned with design system)
      // ---------------------------------------------------------------
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
        "3xl": "32px",
      },

      // ---------------------------------------------------------------
      // SHADOWS — 5 niveaux d'élévation + tokens spéciaux brand
      // ---------------------------------------------------------------
      boxShadow: {
        // Elevation scale — du plus subtil (e1) au plus prononcé (e5)
        e1: "0 1px 2px 0 rgba(0, 0, 0, 0.25)",
        e2: "0 2px 6px -1px rgba(0, 0, 0, 0.30), 0 1px 2px 0 rgba(0, 0, 0, 0.20)",
        e3: "0 6px 16px -4px rgba(0, 0, 0, 0.40), 0 2px 4px -2px rgba(0, 0, 0, 0.25)",
        e4: "0 12px 28px -8px rgba(0, 0, 0, 0.45), 0 4px 8px -4px rgba(0, 0, 0, 0.30)",
        e5: "0 24px 48px -12px rgba(0, 0, 0, 0.55), 0 8px 16px -8px rgba(0, 0, 0, 0.35)",

        // Brand-specific
        "glow-gold": "0 0 60px -10px rgba(245, 165, 36, 0.4)",
        "glow-ice": "0 0 60px -10px rgba(56, 189, 248, 0.35)",
        // Backward compat (alias) — préférer e3
        card: "0 8px 24px -8px rgba(0, 0, 0, 0.4)",
      },

      // ---------------------------------------------------------------
      // MOTION — durations + easings nommés
      // ---------------------------------------------------------------
      transitionDuration: {
        fast: "120ms",
        normal: "200ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        // Standard easing pour transitions UI génériques
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        // Emphasized — entrée d'éléments importants (modal, sticky bar)
        emphasized: "cubic-bezier(0.22, 1, 0.36, 1)",
        // Decelerate — éléments qui entrent
        decelerate: "cubic-bezier(0, 0, 0.2, 1)",
        // Accelerate — éléments qui sortent
        accelerate: "cubic-bezier(0.4, 0, 1, 1)",
      },

      animation: {
        // BATCH 27 — accéléré 40s → 22s (user feedback "c'est statique" :
        // le ticker bougeait mais 1 cycle par 40s = imperceptible à l'œil
        // sur quelques secondes de visite). 22s = vitesse confortable
        // perceptible sans être désagréable. Pause au hover/focus conservée
        // (cf. PriceTicker.tsx :hover state).
        "ticker-scroll": "ticker 22s linear infinite",
        "pulse-dot": "pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in-up": "fade-in-up 600ms cubic-bezier(0, 0, 0.2, 1)",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;

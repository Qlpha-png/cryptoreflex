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
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{md,mdx}",
  ],
  theme: {
    extend: {
      // ---------------------------------------------------------------
      // COLORS
      // ---------------------------------------------------------------
      colors: {
        // Anthracite chaud — inspiré CoinGecko/Phantom/Bitpanda premium
        background: "#0B0D10",
        surface: "#16191F",
        elevated: "#1F242C",
        border: "#262B33",

        // Identité Cryptoreflex : GOLD désaturé
        // Premium, lisible AA en dark, différenciant vs le bleu Cointribune
        primary: "#F5A524",
        "primary-glow": "#FBBF24",
        "primary-soft": "#FCD34D",

        // Accents data — sobres, pas fluo (kept for backward compat)
        accent: {
          cyan: "#0E7490",
          green: "#22C55E",
          rose: "#EF4444",
        },

        // Texte
        fg: "#F4F5F7",
        // muted : foncé de #9BA3AF → #B0B7C3 pour passer WCAG AA (4.5:1)
        // sur background (#0B0D10), surface (#16191F), elevated (#1F242C).
        // Contrast vs #0B0D10 ≈ 8.94:1 ; vs #16191F ≈ 7.81:1 ; vs #1F242C ≈ 6.83:1.
        muted: "#B0B7C3",

        // -----------------------------------------------------------
        // SEMANTIC COLOR TOKENS — utiliser PRIORITAIREMENT ces tokens
        // au lieu de accent-green/accent-rose/amber-* dans les composants.
        // -----------------------------------------------------------
        success: {
          DEFAULT: "#22C55E",
          fg: "#86EFAC",
          soft: "rgba(34, 197, 94, 0.10)",
          border: "rgba(34, 197, 94, 0.40)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          fg: "#FCD34D",
          soft: "rgba(245, 158, 11, 0.10)",
          border: "rgba(245, 158, 11, 0.40)",
        },
        danger: {
          DEFAULT: "#EF4444",
          fg: "#FCA5A5",
          soft: "rgba(239, 68, 68, 0.10)",
          border: "rgba(239, 68, 68, 0.40)",
        },
        info: {
          DEFAULT: "#0EA5E9",
          fg: "#7DD3FC",
          soft: "rgba(14, 165, 233, 0.10)",
          border: "rgba(14, 165, 233, 0.40)",
        },
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
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
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
        "ticker-scroll": "ticker 40s linear infinite",
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

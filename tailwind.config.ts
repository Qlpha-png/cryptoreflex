import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Anthracite chaud — inspiré CoinGecko/Phantom/Bitpanda premium
        background: "#0B0D10",
        surface: "#16191F",
        elevated: "#1F242C",
        border: "#262B33",

        // Identité Cryptoreflex : GOLD désaturé
        // Premium, lisible AA en dark, différenciant vs le bleu Cointribune
        // Note: aplati (pas nested) pour que @apply text-primary-soft / bg-primary-glow marche
        primary: "#F5A524",
        "primary-glow": "#FBBF24",
        "primary-soft": "#FCD34D",

        // Accents data — sobres, pas fluo
        accent: {
          cyan: "#0E7490", // bleu canard pour data secondaire
          green: "#22C55E", // vert hausse, tabular nums
          rose: "#EF4444", // rouge baisse (jamais pour CTA)
        },

        // Texte — très légèrement chaud (renommé fg pour éviter le clash avec utility "text-")
        fg: "#F4F5F7",
        muted: "#9BA3AF",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      fontVariantNumeric: {
        tabular: "tabular-nums",
      },
      animation: {
        "ticker-scroll": "ticker 40s linear infinite",
        "pulse-dot": "pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in-up": "fade-in-up 600ms ease-out",
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
      boxShadow: {
        "glow-gold": "0 0 60px -10px rgba(245, 165, 36, 0.4)",
        card: "0 8px 24px -8px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;

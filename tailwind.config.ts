import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import plugin from "tailwindcss/plugin";

/**
 * Cryptoreflex Design System — single source of truth.
 * Voir: plan/code/design-system.md pour la doc tokens + règles d'usage.
 *
 * Principes :
 *  - 4-base spacing (Tailwind par défaut, vérifié OK)
 *  - Typography scale nommée (caption/small/body/lead/h1..h6/display)
 *  - Couleurs sémantiques (success/warning/danger/info) en plus de la palette brand
 *  - 5 niveaux d'élévation (shadow.e1..e5) → 3 élévations du kit C+ (lot B2)
 *  - Radii nommés (sm/md/lg/xl/2xl/3xl) alignés 6/12/12/16/16/16 (kit C+, lot B2)
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
        // Lot B1 (plan §2.1, lisibilité) : xs/sm/base remappés d'un cran (12→14, 14→16, 16→18 px), interlignes du
        // cran supérieur de Tailwind (≈ 1,43 / 1,5 / 1,56 ; kit C+ : --fs-1 14 px · 1,45, --fs-2 16 px, --fs-3 18 px).
        // Plus aucun texte sous 14 px : caption (11) et small (13) passent à 14 px. 2xl et au-delà ne bougent PAS.
        xs: ["0.875rem", { lineHeight: "1.25rem" }],
        sm: ["1rem", { lineHeight: "1.5rem" }],
        base: ["1.125rem", { lineHeight: "1.75rem" }],
        caption: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.01em" }],
        small: ["0.875rem", { lineHeight: "1.25rem" }],
        // B1 reprise (jury ronde 1) : base = 18 px, donc lg et xl montent aussi (sinon text-base = text-lg et xl à 1,11 de base) ;
        // lead (chapô) 17 → 20 px (kit --fs-4), body 15 → 16 px. 2xl (24 px) et au-delà ne bougent pas.
        lg: ["1.25rem", { lineHeight: "1.75rem" }],
        xl: ["1.375rem", { lineHeight: "1.875rem" }],
        body: ["16px", { lineHeight: "24px" }],
        lead: ["20px", { lineHeight: "30px" }],
        h6: ["18px", { lineHeight: "24px", fontWeight: "600" }],
        h5: ["20px", { lineHeight: "26px", fontWeight: "600" }],
        h4: ["24px", { lineHeight: "30px", fontWeight: "600", letterSpacing: "-0.01em" }],
        h3: ["30px", { lineHeight: "36px", fontWeight: "600", letterSpacing: "-0.01em" }],
        h2: ["36px", { lineHeight: "42px", fontWeight: "500", letterSpacing: "-0.015em" }],
        h1: ["48px", { lineHeight: "52px", fontWeight: "500", letterSpacing: "-0.02em" }],
        display: ["64px", { lineHeight: "68px", fontWeight: "500", letterSpacing: "-0.025em" }],
      },

      fontFamily: {
        // « Cryptoreflex NNBSP » : seulement U+202F, l'espace des milliers en français (voir app/globals.css).
        // Lot B1 (plan §2.1) : --font-sans = Inter + repli mesuré, --font-serif = Newsreader + repli mesuré
        // (app/styles/tokens.css). Les VARIABLES --font-display (Space Grotesk) et --font-mono (JetBrains Mono) restent
        // celles de next/font : les cartes Reflex les lisent (reflex-cards.css) jusqu'au lot B14.
        sans: ["Cryptoreflex NNBSP", "var(--font-sans)", "system-ui", "sans-serif"],
        // Titres éditoriaux : Newsreader. font-display (66 usages) et font-serif pointent sur la même pile.
        display: ["Cryptoreflex NNBSP", "var(--font-serif)"],
        serif: ["Cryptoreflex NNBSP", "var(--font-serif)"],
        // font-mono (≈ 450 usages) affiche des chiffres : pile Inter + chiffres tabulaires (plugin plus bas), comme la spec C+.
        mono: ["Cryptoreflex NNBSP", "var(--font-sans)", "system-ui", "sans-serif"],
        // Code (nouveau) : JetBrains Mono.
        code: ["Cryptoreflex NNBSP", "var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontVariantNumeric: {
        tabular: "tabular-nums",
      },

      // B1 reprise (jury ronde 1) : corps de lecture des articles et des actus (MdxContent, pages légales) = --fs-read du kit C+
      // (18 px mobile, 20 px dès lg), interligne 1,65, mesure 34em (≈ 62 à 68 signes). Le plugin typography a ses propres
      // tailles : le remap de text-base ne l'atteignait pas. Ne touche que les composants, pas le MDX.
      // Lot B2 : couleurs du plugin branchées sur les jetons (les deux thèmes) ; prose-invert (10 usages) pointe sur les
      // mêmes variables (il donnait du gris clair, illisible sur Papier). Liens de texte C+ : couleur link, soulignement
      // link-line 2 px sous les jambages (kit : .lnk), 3 px au survol.
      typography: {
        DEFAULT: {
          css: {
            ...Object.fromEntries(
              (
                [
                  ["body", "fg-2"], ["headings", "fg"], ["lead", "muted"], ["links", "link"], ["bold", "fg"],
                  ["counters", "fg-4"], ["bullets", "border-strong"], ["hr", "border"], ["quotes", "fg"],
                  ["quote-borders", "border-strong"], ["captions", "fg-4"], ["kbd", "fg"], ["code", "fg"],
                  ["pre-code", "fg-2"], ["pre-bg", "sunken"], ["th-borders", "border-strong"], ["td-borders", "border"],
                ] as const
              ).flatMap(([cle, jeton]) => [
                [`--tw-prose-${cle}`, `rgb(var(--c-${jeton}))`],
                [`--tw-prose-invert-${cle}`, `rgb(var(--c-${jeton}))`],
              ]),
            ),
            a: {
              color: "rgb(var(--c-link))",
              fontWeight: "inherit",
              textDecorationLine: "underline",
              textDecorationColor: "rgb(var(--c-link-line))",
              textDecorationThickness: "2px",
              textUnderlineOffset: "0.28em",
            },
            "a:hover": { color: "rgb(var(--c-link-hover))", textDecorationThickness: "3px" },
            fontSize: "1.125rem",
            lineHeight: "1.65",
            p: { maxWidth: "34em" },
            li: { maxWidth: "34em" },
            dd: { maxWidth: "34em" },
            blockquote: { maxWidth: "34em" },
          },
        },
      },

      // ---------------------------------------------------------------
      // RADII — échelle nommée (px values aligned with design system)
      // ---------------------------------------------------------------
      // Lot B2 (kit C+, bloc 0 de la spec qui fait foi : 6 / 12 / 16 / 999) : sm 6, md et lg 12, xl à 3xl 16, full 999.
      // Avant : 6 / 10 / 14 / 18 / 24 / 32. rounded (4 px) et rounded-none ne changent pas.
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "12px",
        xl: "16px",
        "2xl": "16px",
        "3xl": "16px",
        full: "999px",
      },

      // ---------------------------------------------------------------
      // SHADOWS — lot B2 : les 5 niveaux pointent sur les 3 élévations du kit C+ (--shadow-1/2/3 de tokens.css, une
      // valeur par thème : filet intérieur + ombre portée en Encre, ombre encre douce en Papier).
      // e1-e2 = cartes (shadow-1), e3-e4 = menus, popovers (shadow-2), e5 = dialogues (shadow-3).
      // glow-gold / glow-ice : plus aucun halo en C+ (ombre nulle et transparente, pas « none » : la liste
      // box-shadow de Tailwind y ajoute les anneaux, « none » la rendrait invalide).
      // ---------------------------------------------------------------
      boxShadow: {
        e1: "var(--shadow-1)",
        e2: "var(--shadow-1)",
        e3: "var(--shadow-2)",
        e4: "var(--shadow-2)",
        e5: "var(--shadow-3)",
        action: "var(--shadow-action)",

        "glow-gold": "0 0 0 0 transparent",
        "glow-ice": "0 0 0 0 transparent",
        // Ancien alias de e3 (2 usages, cartes) : élévation des cartes.
        card: "var(--shadow-1)",
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
  plugins: [
    typography,
    // Lot B1 : font-mono passe de JetBrains Mono (chasse fixe) à Inter (chiffres proportionnels par défaut). Les chiffres
    // gardent une chasse fixe (prix qui ne « sautent » pas) grâce aux chiffres tabulaires d'Inter. Couche components :
    // toute classe numérique explicite (tabular-nums, slashed-zero, normal-nums…, couche utilities) garde la main.
    plugin(({ addComponents }) => {
      addComponents({ ".font-mono": { fontVariantNumeric: "tabular-nums" } });
      // Corps de lecture des articles : 20 px dès lg (--fs-read du kit C+). Posé ici et non dans le thème typography, qui ignore les @media imbriqués.
      addComponents({ "@media (min-width: 1024px)": { ".prose": { fontSize: "1.25rem" } } });
    }),
  ],
};

export default config;

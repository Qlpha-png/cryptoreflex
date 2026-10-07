import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/**
 * Manifest PWA — généré automatiquement par Next.js sur `/manifest.webmanifest`.
 *
 * Permet l'installation "Add to Home Screen" sur Android (Chrome) et iOS (Safari ≥ 16.4).
 * theme/background : fond « Encre » du kit C+ (--c-background, lot B2), comme la meta theme-color de app/layout.tsx.
 *
 * Icônes : SVG versionnés dans /public/brand (lot B2, emblème du kit C+ ; nouveaux noms : rien d'écrasé en cache).
 *  - 192 / 512 : icônes "any" (toolbar, splash, install prompt)
 *  - maskable  : pour Android adaptive icons (safe zone 80%)
 *
 * Shortcuts : raccourcis affichés au long-press de l'icône installée
 * (Android uniquement — iOS ne les expose pas encore).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#111A2B",
    background_color: "#111A2B",
    lang: "fr-FR",
    dir: "ltr",
    categories: ["finance", "education"],
    icons: [
      {
        src: "/brand/cr-icon-192-v1.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/cr-icon-512-v1.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/cr-icon-maskable-v1.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/brand/cr-apple-touch-v1.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Outils crypto",
        short_name: "Outils",
        description: "Calculateurs, convertisseur, simulateur DCA",
        url: "/outils",
        icons: [{ src: "/brand/cr-icon-192-v1.svg", sizes: "192x192" }],
      },
      {
        name: "Blog",
        short_name: "Blog",
        description: "Guides et analyses crypto",
        url: "/blog",
        icons: [{ src: "/brand/cr-icon-192-v1.svg", sizes: "192x192" }],
      },
      {
        name: "Plateformes",
        short_name: "Plateformes",
        description: "Comparatif des meilleures plateformes",
        url: "/#plateformes",
        icons: [{ src: "/brand/cr-icon-192-v1.svg", sizes: "192x192" }],
      },
    ],
  };
}

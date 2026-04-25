import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/**
 * Manifest PWA — généré automatiquement par Next.js sur `/manifest.webmanifest`.
 *
 * Permet l'installation "Add to Home Screen" sur Android (Chrome) et iOS (Safari ≥ 16.4).
 * theme/background : noir profond cohérent avec la charte (--bg #0B0D10).
 *
 * Icônes : SVG dans /public/icons (cf. plan/code/pwa-setup.md pour le détail).
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
    theme_color: "#0B0D10",
    background_color: "#0B0D10",
    lang: "fr-FR",
    dir: "ltr",
    categories: ["finance", "education"],
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.svg",
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
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
      {
        name: "Blog",
        short_name: "Blog",
        description: "Guides et analyses crypto",
        url: "/blog",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
      {
        name: "Plateformes",
        short_name: "Plateformes",
        description: "Comparatif des meilleures plateformes",
        url: "/#plateformes",
        icons: [{ src: "/icons/icon-192.svg", sizes: "192x192" }],
      },
    ],
  };
}

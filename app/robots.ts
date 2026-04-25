import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;

/**
 * Politique de crawl pour les bots.
 *
 * Disallow :
 *  - /api/        : endpoints internes, pas de SEO direct.
 *  - /merci       : page de confirmation post-formulaire (no value pour SERP).
 *  - /offline     : page service worker, irrelevante hors mode déconnecté.
 *  - /embed/*     : iframes embarqués (widgets) — déjà no-index côté composant.
 *  - /portefeuille: outil personnel, déjà no-index ; double sécurité.
 *  - /watchlist   : idem, perso & déjà no-index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/merci",
          "/offline",
          "/embed/",
          "/portefeuille",
          "/watchlist",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

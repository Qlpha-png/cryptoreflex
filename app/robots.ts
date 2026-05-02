import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || BRAND.url;

/**
 * Politique de crawl pour les bots — version enrichie SEO + LLMs.
 *
 * # Stratégie
 *
 * 1. **Bots web généralistes (Googlebot, Bingbot, etc.)** : Allow / avec
 *    quelques disallows ciblés (api, embeds, pages perso).
 *
 * 2. **Bots LLM (GPTBot, ClaudeBot, PerplexityBot, anthropic-ai…)** :
 *    ALLOW intégral. Stratégie offensive : on VEUT être indexé par les LLMs
 *    parce que :
 *      - Quand un utilisateur demande à ChatGPT "meilleure plateforme crypto FR",
 *        on apparaît dans la réponse + lien source.
 *      - Trafic référent croissant depuis Perplexity / SearchGPT (~5-8% en 2026).
 *      - Pas de cannibalisation : nos contenus sont longs, structurés, sourcés —
 *        le LLM ne peut pas remplacer la lecture complète (calculateurs, outils).
 *
 * 3. **Googlebot-News** : Allow uniquement /actualites (préparation Google
 *    News Publisher Center).
 *
 * # Disallow strict
 *
 *  - /api/                                          : endpoints internes.
 *  - /merci                                         : confirmation post-formulaire.
 *  - /offline                                       : service worker fallback.
 *  - /embed/                                        : iframes embarqués (déjà noindex).
 *  - /portefeuille                                  : outil personnel.
 *  - /watchlist                                     : idem.
 *  - /outils/calculateur-fiscalite/preview-pdf/     : URLs de session PDF.
 *
 * # Sitemap
 *
 * Pointe sur `/sitemap-index.xml` (point d'entrée unique vers
 * sitemap.xml + sitemap-news.xml + sitemap-articles.xml).
 */
export default function robots(): MetadataRoute.Robots {
  const COMMON_DISALLOW = [
    "/api/",
    "/merci",
    "/offline",
    "/embed/",
    "/portefeuille",
    "/watchlist",
    // BATCH 39 — fix audit SEO P0 : pages compte/auth privées doivent
    // être disallow (fuite PageRank + risque indexation données user).
    "/mon-compte",
    "/connexion",
    "/inscription",
    "/mot-de-passe-oublie",
    "/outils/calculateur-fiscalite/preview-pdf/",
  ];

  return {
    rules: [
      // ----- Bots généralistes -----
      {
        userAgent: "*",
        allow: "/",
        disallow: COMMON_DISALLOW,
      },

      // ----- Googlebot-News : restreint à /actualites -----
      // Disallow / + Allow /actualites = Google News voit QUE les news.
      {
        userAgent: "Googlebot-News",
        allow: ["/actualites", "/actualites/"],
        disallow: ["/"],
      },

      // ----- Bots LLM majeurs (Allow intégral, stratégie offensive) -----
      { userAgent: "GPTBot", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "ChatGPT-User", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "anthropic-ai", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "ClaudeBot", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "Claude-Web", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "PerplexityBot", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "Perplexity-User", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "Google-Extended", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "CCBot", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "Bytespider", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "Mistral-Crawler", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "Bravebot", allow: "/", disallow: COMMON_DISALLOW },
      { userAgent: "Applebot-Extended", allow: "/", disallow: COMMON_DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap-index.xml`,
    host: SITE_URL,
  };
}

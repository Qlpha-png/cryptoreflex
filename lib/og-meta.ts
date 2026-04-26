/**
 * lib/og-meta.ts — Helper standardisé pour les métadonnées OpenGraph + Twitter.
 *
 * Pourquoi ?
 *  - Garantir que toutes les images OG/Twitter respectent les exigences
 *    Facebook/X/LinkedIn : 1200×630 PNG, alt text, type MIME explicite.
 *  - Single source of truth pour `locale: "fr_FR"` et `siteName: "Cryptoreflex"`.
 *  - Génère AUSSI le bloc `twitter` cohérent (Twitter Card large image).
 *
 * Utilisation (page Next.js 14 App Router) :
 *
 *   import { ogMetadata, twitterMetadata } from "@/lib/og-meta";
 *
 *   export const metadata: Metadata = {
 *     title: "Mon article",
 *     description: "...",
 *     openGraph: ogMetadata({
 *       title: "Mon article",
 *       description: "...",
 *       url: "/blog/mon-article",
 *       imagePath: "/api/og/blog/mon-article",  // ImageResponse ou static
 *     }),
 *     twitter: twitterMetadata({
 *       title: "Mon article",
 *       description: "...",
 *       imagePath: "/api/og/blog/mon-article",
 *     }),
 *   };
 *
 * Pour les ImageResponse dynamiques (app/.../opengraph-image.tsx),
 * Next.js gère automatiquement width/height — ce helper s'utilise pour les
 * routes API custom ou les images statiques.
 */

import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

const SITE_URL = BRAND.url.replace(/\/$/, "");

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface OgMetaOptions {
  /** Titre principal — 60 caractères max recommandés (X tronque à ~70). */
  title: string;
  /** Description — 160 chars recommandés (LinkedIn coupe agressivement). */
  description: string;
  /** Path absolu OU relatif. Sera converti en URL absolue (BRAND.url). */
  url: string;
  /**
   * Path image (relatif ou absolu). Format attendu : 1200×630 PNG/JPG.
   * Pour ImageResponse Next.js, pointer vers `/api/og/...` ou utiliser le
   * pattern de fichier `opengraph-image.tsx` qui auto-génère l'image.
   */
  imagePath: string;
  /**
   * Type OpenGraph — défaut "website". Pour un article, passer "article" ;
   * Facebook utilise ce flag pour l'affichage dans le feed.
   */
  type?: "website" | "article" | "profile" | "book" | "music.song";
  /**
   * Date de publication ISO (article uniquement) — alimente
   * `og:article:published_time`, important pour Google News.
   */
  publishedTime?: string;
  /**
   * Date de modification ISO (article uniquement).
   */
  modifiedTime?: string;
  /**
   * Tags / mots-clés (article uniquement) — alimente `og:article:tag`.
   */
  tags?: string[];
  /**
   * Auteur (article uniquement) — alimente `og:article:author`.
   */
  author?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

function abs(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/* -------------------------------------------------------------------------- */
/*  OpenGraph                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Construit le bloc `openGraph` complet pour `Metadata.openGraph`.
 * Inclut systématiquement width/height/type/alt — les 3 critères qui
 * déclenchent le "rich preview" sur Facebook / LinkedIn / Slack.
 */
export function ogMetadata(opts: OgMetaOptions): Metadata["openGraph"] {
  const url = abs(opts.url);
  const image = abs(opts.imagePath);
  const type = opts.type ?? "website";

  const base: NonNullable<Metadata["openGraph"]> = {
    title: opts.title,
    description: opts.description,
    url,
    type,
    locale: "fr_FR",
    siteName: BRAND.name,
    images: [
      {
        url: image,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: opts.title,
      },
    ],
  };

  // Champs spécifiques aux articles (Open Graph article namespace).
  // Next.js 14 gère ces champs uniquement quand `type === "article"`.
  if (type === "article") {
    return {
      ...base,
      type: "article",
      publishedTime: opts.publishedTime,
      modifiedTime: opts.modifiedTime ?? opts.publishedTime,
      tags: opts.tags,
      authors: opts.author ? [opts.author] : undefined,
    };
  }

  return base;
}

/* -------------------------------------------------------------------------- */
/*  Twitter Card                                                              */
/* -------------------------------------------------------------------------- */

export interface TwitterMetaOptions {
  title: string;
  description: string;
  imagePath: string;
}

/**
 * Twitter Card cohérente avec OpenGraph. Toujours `summary_large_image`
 * (1200×630, plein largeur) — pas `summary` (image carrée 240×240) qui est
 * moins engageant.
 */
export function twitterMetadata(opts: TwitterMetaOptions): Metadata["twitter"] {
  return {
    card: "summary_large_image",
    title: opts.title,
    description: opts.description,
    images: [abs(opts.imagePath)],
    site: "@cryptoreflex",
    creator: "@cryptoreflex",
  };
}

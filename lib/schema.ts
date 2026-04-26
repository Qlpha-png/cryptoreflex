/**
 * Schema.org JSON-LD helpers for Cryptoreflex.fr
 *
 * Toutes les fonctions retournent un objet JSON-LD prêt à être injecté
 * via le composant <StructuredData /> (components/StructuredData.tsx).
 *
 * Validé pour : Google Rich Results Test + Schema Markup Validator
 * https://validator.schema.org/  +  https://search.google.com/test/rich-results
 */

import { BRAND } from "@/lib/brand";
import { getAllPlatforms, getTopPlatforms, type Platform } from "@/lib/platforms";
import { authorRef, getAuthorByIdOrDefault } from "@/lib/authors";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type JsonLd = Record<string, unknown>;

export interface ArticleFrontmatter {
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  date: string;            // ISO date "2026-04-12"
  dateModified?: string;
  readTime?: string;       // "8 min"
  cover?: string;          // path to cover image (e.g. "/blog/btc-cover.jpg")
  /** Id auteur (cf. data/authors.json) — défaut : DEFAULT_AUTHOR_ID. */
  authorId?: string;
  /**
   * Nom d'auteur libre (frontmatter MDX legacy : "Cryptoreflex", "Équipe éditoriale"…).
   * Si fourni sans `authorId`, on retombe sur l'auteur par défaut côté schema —
   * le nom reste affiché dans l'UI mais le Person JSON-LD pointe vers le fondateur.
   */
  author?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;             // absolute URL preferred
}

export interface FaqItem {
  question: string;
  answer: string;          // peut contenir du HTML simple
}

export interface HowToStep {
  name: string;
  text: string;
  url?: string;            // anchor or external
  image?: string;
}

export interface HowToSupply {
  name: string;
}

export interface HowToTool {
  name: string;
}

/* -------------------------------------------------------------------------- */
/*  Constantes & helpers internes                                             */
/* -------------------------------------------------------------------------- */

const SITE_URL = BRAND.url.replace(/\/$/, "");
// Logo dynamique servi par app/api/logo/route.tsx (ImageResponse 512x512 PNG).
// Utilisé par Schema.org Organization (Knowledge Panel Google).
const LOGO_URL = `${SITE_URL}/api/logo`;
const DEFAULT_OG = `${SITE_URL}/og-image.png`;
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const PERSON_ID = `${SITE_URL}/#author-cryptoreflex`;

/** Réseaux sociaux officiels (à mettre à jour quand les comptes sont créés). */
const SAME_AS: string[] = [
  "https://twitter.com/cryptoreflex_fr",
  "https://www.linkedin.com/company/cryptoreflex",
  "https://t.me/cryptoreflex",
  "https://github.com/cryptoreflex",
];

/** Convertit un chemin relatif en URL absolue. */
function abs(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Mappe la note Cryptoreflex (sur 5) telle quelle pour Schema.org. */
function clampRating(value: number, max = 5): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(max, Number(value.toFixed(2))));
}

/** Échappe les chaînes utilisées en JSON-LD inline (pas besoin pour JSON.stringify côté composant). */
export function jsonLdSafe(obj: JsonLd): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

/* -------------------------------------------------------------------------- */
/*  1. Organization                                                           */
/* -------------------------------------------------------------------------- */

export function organizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: BRAND.name,
    legalName: BRAND.name,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: 512,
      height: 512,
    },
    image: LOGO_URL,
    description: BRAND.description,
    slogan: BRAND.tagline,
    foundingDate: "2026-01-01",
    email: BRAND.email,
    sameAs: SAME_AS,
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: BRAND.email,
        contactType: "customer support",
        availableLanguage: ["French", "English"],
      },
      {
        "@type": "ContactPoint",
        email: BRAND.partnersEmail,
        contactType: "Partnerships",
        availableLanguage: ["French", "English"],
      },
    ],
    areaServed: {
      "@type": "Country",
      name: "France",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  2. WebSite + SearchAction (sitelinks search box)                          */
/* -------------------------------------------------------------------------- */

export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: BRAND.name,
    description: BRAND.description,
    inLanguage: "fr-FR",
    publisher: { "@id": ORGANIZATION_ID },
    /**
     * SearchAction — éligible Sitelinks Search Box dans Google.
     *
     * On pointe sur `/blog?q=…` parce qu'il n'existe pas (encore) de page
     * /recherche dédiée : la barre de recherche du blog (cf. BlogIndexClient)
     * filtre la liste sur le query string `?q=`. Le formulaire `not-found.tsx`
     * pointe également vers /blog?q.
     */
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  3. Article                                                                */
/* -------------------------------------------------------------------------- */

export function articleSchema(article: ArticleFrontmatter): JsonLd {
  const url = abs(`/blog/${article.slug}`);
  const image = abs(article.cover ?? "/og-image.png");
  const author = getAuthorByIdOrDefault(article.authorId);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: article.title,
    description: article.description ?? article.excerpt ?? BRAND.description,
    image: [image],
    datePublished: article.date,
    dateModified: article.dateModified ?? article.date,
    author: authorRef(author),
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "fr-FR",
    articleSection: article.category ?? "Crypto",
    keywords: article.tags?.join(", "),
    url,
    isAccessibleForFree: true,
  };
}

/* -------------------------------------------------------------------------- */
/*  4. BreadcrumbList                                                         */
/* -------------------------------------------------------------------------- */

export function breadcrumbSchema(items: BreadcrumbItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: abs(item.url),
    })),
  };
}

/**
 * Helper auto pour construire un fil d'Ariane à partir d'un chemin.
 * Exemple : autoBreadcrumb("/blog/guide-bitcoin", "Bitcoin guide")
 */
export function autoBreadcrumb(
  pathname: string,
  finalName?: string
): BreadcrumbItem[] {
  const labelMap: Record<string, string> = {
    blog: "Blog",
    plateformes: "Plateformes",
    outils: "Outils",
    methodologie: "Méthodologie",
    affiliations: "Affiliations",
    partenariats: "Partenariats",
    "mentions-legales": "Mentions légales",
    confidentialite: "Confidentialité",
  };

  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ name: "Accueil", url: "/" }];

  let cumulative = "";
  segments.forEach((seg, idx) => {
    cumulative += `/${seg}`;
    const isLast = idx === segments.length - 1;
    const label =
      isLast && finalName
        ? finalName
        : labelMap[seg] ??
          seg
            .replace(/-/g, " ")
            .replace(/\b\w/g, (m) => m.toUpperCase());
    items.push({ name: label, url: cumulative });
  });

  return items;
}

/* -------------------------------------------------------------------------- */
/*  5. ItemList (Top 6 plateformes)                                           */
/* -------------------------------------------------------------------------- */

export function topPlatformsItemListSchema(count = 6): JsonLd {
  const platforms = getTopPlatforms(count);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top ${count} plateformes crypto régulées MiCA en France`,
    description:
      "Sélection des meilleures plateformes crypto disponibles en France, classées par score Cryptoreflex (frais, sécurité, UX, conformité MiCA).",
    numberOfItems: platforms.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: platforms.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: abs(`/plateformes/${p.id}`),
      item: {
        "@type": "FinancialProduct",
        name: p.name,
        url: p.websiteUrl,
        description: p.tagline,
        provider: {
          "@type": "Organization",
          name: p.name,
          url: p.websiteUrl,
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: clampRating(p.scoring.global),
          bestRating: 5,
          worstRating: 0,
          ratingCount: p.ratings.trustpilotCount || 1,
        },
      },
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*  6. Review + AggregateRating (par plateforme)                              */
/* -------------------------------------------------------------------------- */

/**
 * Schema pour une carte plateforme : combine Product + AggregateRating + Review.
 * À injecter sur la fiche /plateformes/[id] et sur la home (sous chaque card).
 */
export function platformReviewSchema(p: Platform): JsonLd {
  const productUrl = abs(`/plateformes/${p.id}`);
  const ratingValue = clampRating(p.scoring.global);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: p.name,
    image: abs(p.logo),
    url: productUrl,
    description: p.tagline,
    brand: {
      "@type": "Brand",
      name: p.name,
    },
    category: "Cryptocurrency Exchange",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue,
      bestRating: 5,
      worstRating: 0,
      ratingCount: Math.max(p.ratings.trustpilotCount, 1),
      reviewCount: Math.max(p.ratings.trustpilotCount, 1),
    },
    review: {
      "@type": "Review",
      author: authorRef(getAuthorByIdOrDefault()),
      datePublished: p.mica.lastVerified,
      reviewBody: `${p.idealFor}. Points forts : ${p.strengths.join(
        " ; "
      )}. Points faibles : ${p.weaknesses.join(" ; ")}.`,
      name: `Avis Cryptoreflex sur ${p.name}`,
      reviewRating: {
        "@type": "Rating",
        ratingValue,
        bestRating: 5,
        worstRating: 0,
      },
      publisher: { "@id": ORGANIZATION_ID },
    },
    offers: {
      "@type": "Offer",
      url: p.affiliateUrl,
      priceCurrency: "EUR",
      price: "0",
      availability: "https://schema.org/InStock",
      description: p.bonus.welcome,
    },
  };
}

/** Génère le schéma pour toutes les plateformes (utile en page comparatif). */
export function allPlatformsReviewSchemas(): JsonLd[] {
  return getAllPlatforms().map(platformReviewSchema);
}

/* -------------------------------------------------------------------------- */
/*  7. FAQPage                                                                */
/* -------------------------------------------------------------------------- */

export function faqSchema(items: FaqItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*  8. HowTo                                                                  */
/* -------------------------------------------------------------------------- */

export interface HowToOptions {
  name: string;
  description: string;
  totalTime?: string;        // ISO 8601 duration ex: "PT15M"
  estimatedCost?: { currency: string; value: number };
  supplies?: HowToSupply[];
  tools?: HowToTool[];
  steps: HowToStep[];
  image?: string;
}

export function howToSchema(opts: HowToOptions): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    image: opts.image ? abs(opts.image) : DEFAULT_OG,
    totalTime: opts.totalTime,
    estimatedCost: opts.estimatedCost && {
      "@type": "MonetaryAmount",
      currency: opts.estimatedCost.currency,
      value: opts.estimatedCost.value,
    },
    supply: opts.supplies?.map((s) => ({
      "@type": "HowToSupply",
      name: s.name,
    })),
    tool: opts.tools?.map((t) => ({
      "@type": "HowToTool",
      name: t.name,
    })),
    step: opts.steps.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.name,
      text: s.text,
      url: s.url ? abs(s.url) : undefined,
      image: s.image ? abs(s.image) : undefined,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*  9. Person (auteur — E-E-A-T)                                              */
/* -------------------------------------------------------------------------- */

/**
 * @deprecated — préférer `authorPersonSchema(getAuthorByIdOrDefault())`
 * depuis `@/lib/authors` pour signer un vrai humain (E-E-A-T).
 *
 * Conservé pour rétrocompatibilité : renvoie le schema Person du fondateur
 * mais avec l'ancien @id stable pour ne pas casser les références existantes.
 */
export function personSchema(): JsonLd {
  const founder = getAuthorByIdOrDefault();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: founder.name,
    url: `${SITE_URL}/auteur/${founder.id}`,
    image: abs(founder.image),
    jobTitle: founder.role,
    description: founder.shortBio,
    worksFor: { "@id": ORGANIZATION_ID },
    knowsAbout: founder.expertise,
    sameAs: [
      ...(founder.social.linkedin ? [founder.social.linkedin] : []),
      ...(founder.social.twitter ? [founder.social.twitter] : []),
      ...SAME_AS,
    ],
  };
}

/* -------------------------------------------------------------------------- */
/*  10. NewsArticle (variante)                                                */
/* -------------------------------------------------------------------------- */

export function newsArticleSchema(article: ArticleFrontmatter): JsonLd {
  const base = articleSchema(article);
  return {
    ...base,
    "@type": "NewsArticle",
    dateline: "Paris, France",
  };
}

/* -------------------------------------------------------------------------- */
/*  Helper : combine plusieurs schemas en un seul @graph                      */
/* -------------------------------------------------------------------------- */

export function graphSchema(schemas: JsonLd[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": schemas.map((s) => {
      // retire le @context pour éviter les doublons dans @graph
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { "@context": _ctx, ...rest } = s;
      return rest;
    }),
  };
}

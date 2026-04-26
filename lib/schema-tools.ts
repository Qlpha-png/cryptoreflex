/**
 * Schema.org JSON-LD helpers — spécialisés pour les outils Cryptoreflex.
 *
 * Complète `lib/schema.ts` avec des helpers WebApplication enrichis,
 * HowTo step-by-step, et CreativeWork (pour la page /ressources-libres).
 *
 * Validé pour : Google Rich Results Test + Schema Markup Validator.
 */

import { BRAND } from "@/lib/brand";
import type { JsonLd, HowToStep } from "@/lib/schema";

const SITE_URL = BRAND.url.replace(/\/$/, "");

export interface ToolMeta {
  /** Slug de la route (ex: "calculateur-fiscalite"). */
  slug: string;
  /** Titre humain affiché dans le schema name. */
  name: string;
  /** Description SEO 1-2 phrases. */
  description: string;
  /** Catégorie d'application — par défaut "FinanceApplication". */
  category?: string;
  /** Liste de features (3-8 items courts). */
  featureList: string[];
  /** Note moyenne (sur 5) — exclu si non fourni. */
  ratingValue?: number;
  /** Nombre d'avis qui forment la note. */
  ratingCount?: number;
  /** Image OG dédiée (chemin relatif ou absolu). */
  image?: string;
  /** Date de mise à jour (ISO). */
  dateModified?: string;
  /** Mots-clés SEO (pour le champ keywords). */
  keywords?: string[];
}

/**
 * `WebApplication` enrichi — éligible au rich snippet "App" dans Google.
 *
 * Choix :
 *  - applicationCategory : "FinanceApplication" (le plus pertinent pour
 *    nos outils crypto/fiscaux).
 *  - operatingSystem : "Any" (web, donc cross-platform).
 *  - browserRequirements : "Requires JavaScript" (les outils sont CSR).
 *  - offers : price 0 EUR (= gratuit, signal trust pour Google).
 *  - aggregateRating : seulement si `ratingValue` ET `ratingCount` fournis
 *    ET ratingCount >= 5. Pas d'invention de données (Google penalise
 *    le rating spam depuis 2019).
 */
export function generateWebApplicationSchema(tool: ToolMeta): JsonLd {
  const url = `${SITE_URL}/outils/${tool.slug}`;

  const base: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${url}#webapp`,
    name: tool.name,
    description: tool.description,
    url,
    applicationCategory: tool.category ?? "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    featureList: tool.featureList,
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: SITE_URL,
    },
  };

  if (tool.image) {
    base.image = tool.image.startsWith("http")
      ? tool.image
      : `${SITE_URL}${tool.image.startsWith("/") ? "" : "/"}${tool.image}`;
  }

  if (tool.dateModified) {
    base.dateModified = tool.dateModified;
  }

  if (tool.keywords?.length) {
    base.keywords = tool.keywords.join(", ");
  }

  // AggregateRating uniquement si la donnée est réelle et significative.
  // Hardcoder un faux rating expose à une manual action Google.
  if (
    typeof tool.ratingValue === "number" &&
    typeof tool.ratingCount === "number" &&
    tool.ratingCount >= 5
  ) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: tool.ratingValue.toFixed(1),
      ratingCount: tool.ratingCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return base;
}

/**
 * `HowTo` schema — éligible au rich snippet step-by-step.
 *
 * À utiliser sur les pages d'outils qui ont un workflow clair
 * (ex: "1. Saisir les cessions, 2. Choisir le régime, 3. Lire le résultat").
 */
export interface HowToToolOptions {
  name: string;
  description: string;
  /** ISO 8601 duration ex: "PT2M" pour 2 minutes. */
  totalTime?: string;
  steps: HowToStep[];
  /** URL canonique de la page d'outil. */
  url: string;
}

export function generateHowToSchema(opts: HowToToolOptions): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    totalTime: opts.totalTime,
    inLanguage: "fr-FR",
    step: opts.steps.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.name,
      text: s.text,
      url: s.url,
    })),
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: 0,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: opts.url,
    },
  };
}

/**
 * `CreativeWork` — pour la page /ressources-libres et les assets sous CC-BY.
 *
 * Le `license` pointe vers CC-BY 4.0 — Google et les bots indexeurs
 * comprennent le signal et l'affichent dans certains snippets.
 */
export interface CreativeWorkOptions {
  name: string;
  description: string;
  url: string;
  /** Date de publication ISO. */
  datePublished?: string;
  /** Type plus précis ("Dataset", "SoftwareSourceCode", "ImageObject", etc.) */
  subType?: string;
  keywords?: string[];
}

export function generateCreativeWorkSchema(
  opts: CreativeWorkOptions
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": opts.subType ?? "CreativeWork",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    inLanguage: "fr-FR",
    license: "https://creativecommons.org/licenses/by/4.0/",
    creditText: `Cryptoreflex (${BRAND.domain})`,
    creator: {
      "@type": "Organization",
      name: BRAND.name,
      url: SITE_URL,
    },
    isAccessibleForFree: true,
    keywords: opts.keywords?.join(", "),
  };
}

/**
 * `CollectionPage` — pour /embeds (liste des widgets) et /ressources-libres.
 */
export interface CollectionPageOptions {
  name: string;
  description: string;
  url: string;
  items: Array<{ name: string; url: string; description?: string }>;
}

export function generateCollectionPageSchema(
  opts: CollectionPageOptions
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: "fr-FR",
    isPartOf: {
      "@type": "WebSite",
      name: BRAND.name,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((item, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: item.url,
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
      })),
    },
  };
}

/**
 * Métadonnées des 4 widgets embeddables — réutilisable sur /embeds.
 */
export const EMBEDDABLE_TOOLS: Array<{
  slug: string;
  name: string;
  shortName: string;
  description: string;
  height: number;
  emoji: string;
}> = [
  {
    slug: "calculateur-fiscalite",
    name: "Calculateur fiscalité crypto France 2026",
    shortName: "Calculateur fiscalité",
    description:
      "Estime l'impôt PFU 30 %, barème progressif ou BIC en 2 minutes — Cerfa 2086 inclus.",
    height: 900,
    emoji: "📊",
  },
  {
    slug: "simulateur-dca",
    name: "Simulateur DCA crypto",
    shortName: "Simulateur DCA",
    description:
      "Backtest réel d'un Dollar Cost Averaging sur Bitcoin, Ethereum ou Solana (5 ans).",
    height: 800,
    emoji: "📈",
  },
  {
    slug: "convertisseur",
    name: "Convertisseur crypto temps réel",
    shortName: "Convertisseur",
    description:
      "15 cryptos vers EUR/USD avec taux CoinGecko rafraîchis toutes les minutes.",
    height: 480,
    emoji: "💱",
  },
  {
    slug: "calculateur-roi-crypto",
    name: "Calculateur ROI crypto",
    shortName: "Calculateur ROI",
    description:
      "ROI net, plus-value et impôt PFU 30 % en 5 secondes — frais inclus.",
    height: 700,
    emoji: "💰",
  },
];

import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { getAllArticleSummaries, getAllCategories } from "@/lib/mdx";
import BlogIndexClient from "@/components/blog/BlogIndexClient";
import StructuredData from "@/components/StructuredData";
import { breadcrumbSchema } from "@/lib/schema";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

export const metadata: Metadata = {
  title: "Blog & guides crypto",
  description:
    "Guides clairs pour débuter dans la crypto : Bitcoin, MiCA, wallets, fiscalité, sécurité, comparatifs de plateformes.",
  alternates: withHreflang(`${BRAND.url}/blog`),
};

/**
 * /blog — index des articles.
 *
 * Architecture (P1-8 audit-front-2026) :
 *  - Server Component : fetch les summaries + catégories (cache 1h).
 *  - Délégue le rendu interactif (filtre + recherche + pagination) à
 *    `BlogIndexClient` qui gère tout côté client. Le HTML initial reste
 *    compatible SSR : pas de filtre, page 1, query vide.
 *  - L'ancienne pagination via `?page=` / `?cat=` est remplacée par un
 *    état client. Les bots crawlent toujours la liste complète au-dessus
 *    du fold (les links dans visible[] sont rendus dès le SSR).
 */
export default async function BlogIndexPage() {
  const articles = await getAllArticleSummaries();
  const categories = await getAllCategories();

  const breadcrumbs = breadcrumbSchema([
    { name: "Accueil", url: "/" },
    { name: "Blog", url: "/blog" },
  ]);

  // AUDIT 2026-05-03 — JSON-LD ItemList + Blog schema (rich snippets Google).
  // Avant : seul BreadcrumbList present -> hub /blog sous-exploite SEO.
  // Maintenant : Blog @type + ItemList des articles top 20 pour gagner des
  // sitelinks / carousel rich results.
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${BRAND.url}/blog#blog`,
    name: "Blog Cryptoreflex — Guides crypto FR",
    description:
      "Guides clairs pour debuter dans la crypto : Bitcoin, MiCA, wallets, fiscalite, securite, comparatifs de plateformes.",
    url: `${BRAND.url}/blog`,
    inLanguage: "fr-FR",
    publisher: {
      "@type": "Organization",
      "@id": `${BRAND.url}/#organization`,
      name: BRAND.name,
    },
    blogPost: articles.slice(0, 20).map((a) => ({
      "@type": "BlogPosting",
      "@id": `${BRAND.url}/blog/${a.slug}`,
      headline: a.title,
      url: `${BRAND.url}/blog/${a.slug}`,
      datePublished: a.date,
      dateModified: a.lastUpdated ?? a.date,
      author: { "@type": "Person", name: a.author },
      articleSection: a.category,
    })),
  };
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Articles blog Cryptoreflex",
    numberOfItems: articles.length,
    itemListElement: articles.slice(0, 20).map((a, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${BRAND.url}/blog/${a.slug}`,
      name: a.title,
    })),
  };

  return (
    <section className="py-16 sm:py-20">
      <StructuredData data={breadcrumbs} id="blog-index-breadcrumb" />
      <StructuredData data={blogSchema} id="blog-index-blog-schema" />
      <StructuredData data={itemListSchema} id="blog-index-itemlist" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <BookOpen className="h-3.5 w-3.5" />
            Blog
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Tous les <span className="gradient-text">guides crypto</span>
          </h1>
          <p className="mt-3 text-fg/70">
            Articles écrits pour rendre la crypto accessible — du tout débutant
            à l'investisseur intermédiaire. Comparatifs MiCA, fiscalité,
            sécurité, choix de plateforme.
          </p>
        </div>

        <BlogIndexClient articles={articles} categories={categories} />
      </div>
    </section>
  );
}

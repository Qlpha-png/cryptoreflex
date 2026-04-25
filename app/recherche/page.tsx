import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { BRAND } from "@/lib/brand";
import SearchClient from "@/components/SearchClient";

export const metadata: Metadata = {
  title: "Recherche",
  description:
    "Recherche dans tous les contenus Cryptoreflex : articles, plateformes notées, fiches crypto, comparatifs, outils, glossaire.",
  alternates: { canonical: `${BRAND.url}/recherche` },
  // Page utilitaire — pas de valeur SEO (résultats dynamiques par query).
  robots: { index: false, follow: true },
};

/**
 * Page recherche transverse — alimentée par `/api/search` (fuzzy index).
 * Form GET classique pour permettre à Google et aux utilisateurs sans JS de
 * partager une recherche par URL (`/recherche?q=bitcoin`).
 *
 * Le composant client `<SearchClient />` est wrapped en <Suspense> car il
 * utilise `useSearchParams` (requis par Next.js 14+ pour le prerender).
 */
export default function RechercheePage() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted mb-6">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-1.5">/</span>
          <span className="text-fg">Recherche</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
            <Search className="h-3.5 w-3.5" />
            Recherche transverse
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Cherche dans <span className="gradient-text">tout Cryptoreflex</span>
          </h1>
          <p className="mt-3 max-w-2xl text-fg/70">
            Articles, plateformes notées, fiches crypto, comparatifs, outils,
            glossaire — tout l'index en une recherche.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-2xl bg-elevated/40" />
          }
        >
          <SearchClient />
        </Suspense>
      </div>
    </section>
  );
}

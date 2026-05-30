import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Search, TrendingUp } from "lucide-react";

/**
 * not-found.tsx co-localisé au segment /historique-prix/[crypto]/[annee].
 *
 * Même fix SEO que /cryptos/[slug]/not-found.tsx (BUG 2026-05-09) : sans
 * boundary 404 ancrée à ce segment, le notFound() remonte vers
 * app/not-found.tsx en gardant le layout parent et l'ISR sert un HTTP 200
 * (soft-404). Co-localiser ici garantit un vrai HTTP 404.
 *
 * Cas couvert : crypto inconnue ou année hors plage (2018-2026)
 * (ex. /historique-prix/foo/1999).
 *
 * Anti-SEO : robots index:false, follow:false.
 */

export const metadata: Metadata = {
  title: "Cet historique de prix n'existe pas — Cryptoreflex",
  description:
    "Cet historique de prix annuel n'est pas disponible. Parcours l'historique des prix de nos cryptos analysées.",
  robots: { index: false, follow: false },
};

export default function HistoriquePrixNotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="text-center">
          <span className="badge-info">
            <TrendingUp className="h-3.5 w-3.5" />
            Historique introuvable
          </span>

          <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="gradient-text font-mono">404</span>
          </h1>

          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-fg">
            Cet historique de prix n'est pas (encore) disponible
          </h2>

          <p className="mt-4 max-w-xl mx-auto text-base text-fg/70">
            On couvre l'évolution annuelle des prix des principales cryptos de
            2018 à 2026. Si cette page n'existe pas, c'est que la crypto sort de
            notre périmètre ou que l'année demandée est hors de cette plage.
          </p>

          {/* Search redirect */}
          <form
            role="search"
            action="/recherche"
            method="get"
            className="mt-8 max-w-md mx-auto"
            aria-label="Rechercher une crypto"
          >
            <label htmlFor="hist-search" className="sr-only">
              Rechercher une crypto
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                aria-hidden="true"
              />
              <input
                id="hist-search"
                name="q"
                type="search"
                placeholder="Rechercher une crypto (Bitcoin, Solana, Aave…)"
                autoComplete="off"
                className="w-full rounded-xl bg-elevated border border-border pl-11 pr-4 py-3 text-fg placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-colors"
              />
            </div>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/historique-prix" className="btn-primary text-base">
              <TrendingUp className="h-4 w-4" />
              Tous les historiques de prix
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
              aria-label="Retour à l'accueil"
            >
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

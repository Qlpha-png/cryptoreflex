import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Search, Trophy, BarChart3 } from "lucide-react";

/**
 * BUG FIX 2026-05-09 — `/comparatif/[bad-slug]` retournait HTTP 200 avec
 * la page 404 héritée du layout (pattern soft-404). Pour un vrai 404 propre,
 * on co-localise un `not-found.tsx` ici, qui ancre la 404 à ce segment et
 * renvoie HTTP 404 (Next 14+ behavior).
 *
 * Anti-SEO : `robots: { index: false, follow: false }` empêche Search
 * Console d'indexer les fake-routes.
 */

export const metadata: Metadata = {
  title: "Comparatif introuvable — Cryptoreflex",
  description:
    "Ce comparatif n'existe pas (encore !). Découvrez nos comparatifs MiCA officiels et nos top plateformes crypto françaises.",
  robots: { index: false, follow: false },
};

export default function ComparatifNotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="text-center">
          <span className="badge-info">
            <Search className="h-3.5 w-3.5" />
            Comparatif introuvable
          </span>

          <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="gradient-text font-mono">404</span>
          </h1>

          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-fg">
            Ce comparatif n'existe pas
          </h2>

          <p className="mt-4 max-w-xl mx-auto text-base text-fg/70">
            On compare uniquement des plateformes crypto régulées MiCA / PSAN
            référencées par Cryptoreflex. Si vous cherchez une comparaison
            spécifique, parcours nos comparatifs officiels ou notre top.
          </p>

          <form
            role="search"
            action="/recherche"
            method="get"
            className="mt-8 max-w-md mx-auto"
            aria-label="Rechercher un comparatif"
          >
            <label htmlFor="cmp-search" className="sr-only">
              Rechercher un comparatif
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                aria-hidden="true"
              />
              <input
                id="cmp-search"
                name="q"
                type="search"
                placeholder="Rechercher (Binance vs Coinbase, top frais…)"
                autoComplete="off"
                className="w-full rounded-xl bg-elevated border border-border pl-11 pr-4 py-3 text-fg placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-colors"
              />
            </div>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/comparatif" className="btn-primary text-base">
              <Trophy className="h-4 w-4" />
              Tous les comparatifs
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
              aria-label="Retour à l'accueil"
            >
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
            <Link
              href="/comparatif/frais"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Comparer les frais
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

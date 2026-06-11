import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Search, GitCompareArrows, Trophy } from "lucide-react";

/**
 * not-found.tsx co-localisé au segment /vs/[a]/[b].
 *
 * Même fix SEO que /cryptos/[slug]/not-found.tsx (BUG 2026-05-09) : sans
 * boundary 404 ancrée à ce segment, Next.js fait remonter le notFound() vers
 * app/not-found.tsx tout en gardant le layout parent, et l'ISR sert la page
 * en HTTP 200 (soft-404). Co-localiser ici garantit un vrai HTTP 404.
 *
 * Cas couvert : paire crypto vs crypto inexistante / hors top 100
 * (ex. /vs/foo/bar).
 *
 * Anti-SEO : robots index:false, follow:false → pas d'indexation des
 * fausses paires 404.
 */

export const metadata: Metadata = {
  title: "Ce comparatif n'existe pas — Cryptoreflex",
  description:
    "Ce comparatif crypto vs crypto n'existe pas (encore !). Découvre tous nos duels et nos 780 cryptos analysées.",
  robots: { index: false, follow: false },
};

export default function VsNotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="text-center">
          <span className="badge-info">
            <GitCompareArrows className="h-3.5 w-3.5" />
            Comparatif introuvable
          </span>

          <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="gradient-text font-mono">404</span>
          </h1>

          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-fg">
            Ce duel crypto vs crypto n'est pas (encore) disponible
          </h2>

          <p className="mt-4 max-w-xl mx-auto text-base text-fg/70">
            Cryptoreflex compare les 100 plus grosses cryptos entre elles
            (forces, décentralisation, corrélation 7j, plateformes communes).
            Si la paire que vous cherchez n'existe pas, c'est qu'au moins l'un des
            deux actifs sort de notre périmètre comparatif.
          </p>

          {/* Search redirect */}
          <form
            role="search"
            action="/recherche"
            method="get"
            className="mt-8 max-w-md mx-auto"
            aria-label="Rechercher une crypto"
          >
            <label htmlFor="vs-search" className="sr-only">
              Rechercher une crypto
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                aria-hidden="true"
              />
              <input
                id="vs-search"
                name="q"
                type="search"
                placeholder="Rechercher une crypto (Bitcoin, Solana, Aave…)"
                autoComplete="off"
                className="w-full rounded-xl bg-elevated border border-border pl-11 pr-4 py-3 text-fg placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-colors"
              />
            </div>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/vs" className="btn-primary text-base">
              <GitCompareArrows className="h-4 w-4" />
              Tous les comparatifs crypto
            </Link>
            <Link
              href="/cryptos"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
            >
              <Trophy className="h-4 w-4" />
              Les 780 cryptos analysées
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

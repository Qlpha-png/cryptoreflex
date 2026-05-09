import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Search, Trophy, BarChart3 } from "lucide-react";

/**
 * BUG FIX 2026-05-09 — `/cryptos/[bad-slug]` returned HTTP 200 with the
 * listing layout content instead of a real HTTP 404.
 *
 * Root cause : `notFound()` was called inside the page when both
 * `getCryptoBySlug` AND `getCryptoFiche` returned null, BUT without a local
 * not-found.tsx boundary at this segment, Next.js bubbled the 404 up to
 * `app/not-found.tsx` while keeping `app/cryptos/layout.tsx` wrapped — and
 * the ISR cache served it as 200.
 *
 * Fix : co-locate this `not-found.tsx` at the `[slug]` segment. Next.js
 * 14+ now anchors the 404 to this segment, returns HTTP 404, AND lets ISR
 * cache the rendered output without leaking the 200 status. The rendered
 * UI stays branded but lightweight (no listing wrapper noise).
 *
 * Anti-SEO : `robots: { index: false, follow: false }` prevents Search
 * Console from indexing fake-route 404s.
 */

export const metadata: Metadata = {
  title: "Cette crypto n'existe pas — Cryptoreflex",
  description:
    "Cette fiche crypto n'existe pas (encore !). Découvre nos 780 cryptos analysées (100 fiches éditoriales premium + 680 fiches LLM).",
  robots: { index: false, follow: false },
};

export default function CryptoNotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="text-center">
          <span className="badge-info">
            <Search className="h-3.5 w-3.5" />
            Crypto introuvable
          </span>

          <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="gradient-text font-mono">404</span>
          </h1>

          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-fg">
            Cette crypto n'est pas (encore) dans notre catalogue
          </h2>

          <p className="mt-4 max-w-xl mx-auto text-base text-fg/70">
            Cryptoreflex couvre 780 cryptos analysées : 100 fiches éditoriales
            premium (top 10 marketcap + 90 hidden gems) plus 680 fiches LLM
            exploratoires. Si tu cherches un projet plus exotique, dis-le-nous —
            on l'ajoutera peut-être au prochain batch.
          </p>

          {/* Search redirect */}
          <form
            role="search"
            action="/recherche"
            method="get"
            className="mt-8 max-w-md mx-auto"
            aria-label="Rechercher une crypto"
          >
            <label htmlFor="cn-search" className="sr-only">
              Rechercher une crypto
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                aria-hidden="true"
              />
              <input
                id="cn-search"
                name="q"
                type="search"
                placeholder="Rechercher une crypto (Bitcoin, Solana, Aave…)"
                autoComplete="off"
                className="w-full rounded-xl bg-elevated border border-border pl-11 pr-4 py-3 text-fg placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-colors"
              />
            </div>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/cryptos" className="btn-primary text-base">
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
            <Link
              href="/#marche"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Marché live
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

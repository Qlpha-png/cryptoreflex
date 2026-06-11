import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Search, BookOpen, GraduationCap } from "lucide-react";

/**
 * BUG FIX 2026-05-09 — `/glossaire/[bad-slug]` retournait HTTP 200 avec
 * page 404 héritée du layout (soft-404). Co-localisation pour ancrer une
 * vraie 404 (HTTP 404, Next 14+).
 */

export const metadata: Metadata = {
  title: "Définition introuvable — Cryptoreflex",
  description:
    "Cette définition n'existe pas (encore !). Parcours notre glossaire crypto complet en français.",
  robots: { index: false, follow: false },
};

export default function GlossaireNotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="text-center">
          <span className="badge-info">
            <Search className="h-3.5 w-3.5" />
            Définition introuvable
          </span>

          <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="gradient-text font-mono">404</span>
          </h1>

          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-fg">
            Ce terme n'est pas (encore) dans notre glossaire
          </h2>

          <p className="mt-4 max-w-xl mx-auto text-base text-fg/70">
            Notre glossaire couvre les termes essentiels de la crypto en
            français (MiCA, staking, halving, smart contract…). Si vous
            cherchez un terme spécifique, parcourez notre index complet.
          </p>

          <form
            role="search"
            action="/recherche"
            method="get"
            className="mt-8 max-w-md mx-auto"
            aria-label="Rechercher dans le glossaire"
          >
            <label htmlFor="glo-search" className="sr-only">
              Rechercher un terme
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                aria-hidden="true"
              />
              <input
                id="glo-search"
                name="q"
                type="search"
                placeholder="Rechercher (staking, halving, MiCA…)"
                autoComplete="off"
                className="w-full rounded-xl bg-elevated border border-border pl-11 pr-4 py-3 text-fg placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-colors"
              />
            </div>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/glossaire" className="btn-primary text-base">
              <BookOpen className="h-4 w-4" />
              Tout le glossaire
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
              href="/guides"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
            >
              <GraduationCap className="h-4 w-4" />
              Guides débutants
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Trophy,
  Building2,
  Calculator,
  Search,
  Compass,
} from "lucide-react";

/**
 * 404 custom Cryptoreflex.
 *
 * Next.js retourne automatiquement le status HTTP 404 lorsqu'une route
 * inexistante atteint ce composant (App Router) — pas besoin de hack.
 *
 * SEO : noindex pour éviter d'indexer les pages d'erreur ; rien à perdre
 * et ça nettoie la Search Console.
 */
export const metadata: Metadata = {
  title: "Page introuvable",
  description:
    "Cette page n'existe pas (encore !). Découvre nos comparatifs, le top 10 cryptos et nos outils gratuits.",
  robots: { index: false, follow: false },
};

const SUGGESTIONS = [
  {
    href: "/#marche",
    title: "Marché",
    description: "Top 20 cryptos en direct, prix, variations, market cap.",
    icon: BarChart3,
  },
  {
    href: "/#top10",
    title: "Top 10 cryptos",
    description: "Notre sélection des 10 cryptos qui comptent vraiment.",
    icon: Trophy,
  },
  {
    href: "/#plateformes",
    title: "Plateformes",
    description: "Comparatif des exchanges Coinbase, Binance, Revolut…",
    icon: Building2,
  },
  {
    href: "/outils",
    title: "Outils gratuits",
    description: "Calculateur fiscalité, simulateur DCA, convertisseur.",
    icon: Calculator,
  },
] as const;

export default function NotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="text-center">
          <span className="badge-info">
            <Compass className="h-3.5 w-3.5" />
            Erreur 404
          </span>

          <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="gradient-text font-mono">404</span>
          </h1>

          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-fg">
            Cette page n'existe pas (encore&nbsp;!)
          </h2>

          <p className="mt-4 max-w-xl mx-auto text-base text-fg/70">
            Le lien est peut-être obsolète, ou la page a été déplacée. Pas de panique,
            on a quelques pistes pour toi 👇
          </p>

          {/* Search bar — placeholder, branchée plus tard */}
          <form
            role="search"
            action="/blog"
            method="get"
            className="mt-8 max-w-md mx-auto"
            aria-label="Rechercher sur Cryptoreflex"
          >
            <label htmlFor="nf-search" className="sr-only">
              Rechercher
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                aria-hidden="true"
              />
              <input
                id="nf-search"
                name="q"
                type="search"
                placeholder="Rechercher un guide, un exchange…"
                autoComplete="off"
                className="w-full rounded-xl bg-elevated border border-border pl-11 pr-4 py-3 text-fg placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-colors"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              La recherche est en cours d'intégration — pour l'instant on t'envoie sur le blog.
            </p>
          </form>

          {/* Retour home */}
          <div className="mt-8">
            <Link
              href="/"
              className="btn-primary text-base"
              aria-label="Retour à l'accueil"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>
          </div>
        </div>

        {/* Suggestions */}
        <div className="mt-14">
          <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
            Ou explore une rubrique
          </h3>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUGGESTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className="group glass rounded-2xl p-5 hover:border-primary/40 hover:translate-y-[-2px] transition-all"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-soft border border-primary/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h4 className="mt-4 font-semibold text-fg group-hover:text-primary-glow transition-colors">
                    {s.title}
                  </h4>
                  <p className="mt-1.5 text-sm text-muted line-clamp-2">{s.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft group-hover:text-primary">
                    Y aller
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

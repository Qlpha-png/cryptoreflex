import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Star } from "lucide-react";
import { BRAND } from "@/lib/brand";
import WatchlistView from "@/components/WatchlistView";

/**
 * /watchlist — page Client (la donnée vit en localStorage), wrappée dans
 * un Server Component minimal pour pouvoir exporter `metadata` (Next.js
 * interdit metadata + "use client" sur le même fichier).
 *
 * SEO : noindex — page personnelle sans valeur indexable.
 */
export const metadata: Metadata = {
  title: "Ma watchlist crypto",
  description:
    "Votre watchlist crypto Cryptoreflex — jusqu'à 10 cryptos suivies en temps réel, stockées localement sur votre appareil (zéro compte requis).",
  alternates: { canonical: `${BRAND.url}/watchlist` },
  robots: { index: false, follow: true },
};

export default function WatchlistPage() {
  return (
    <article className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Ma watchlist</span>
        </nav>

        {/* Header */}
        <header className="mt-6 mb-8">
          <span className="badge-info">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            Watchlist locale
          </span>
          <h1 className="mt-3 ds-h1 leading-[1.1]">
            Ma <span className="text-gradient-gold">watchlist crypto</span>
          </h1>
          <p className="mt-3 ds-lead max-w-2xl">
            Jusqu'à 10 cryptos suivies en temps réel. Données stockées
            uniquement sur votre appareil (localStorage) — aucun compte, aucune
            donnée envoyée à nos serveurs.
          </p>
        </header>

        {/* Vue client : liste + prix live + actions */}
        <WatchlistView />

        {/* Cross-sell vers le tracker portefeuille — propose la suite logique
            de la watchlist (suivre la valeur réelle de tes positions). */}
        <aside
          aria-labelledby="portfolio-cross-heading"
          className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="portfolio-cross-heading"
                className="text-base font-semibold text-fg"
              >
                Tu veux suivre tes gains ?
              </h2>
              <p className="mt-1 text-sm text-fg/80">
                Utilise notre tracker portefeuille gratuit pour voir la valeur
                live de tes positions, ton gain/perte global et l&apos;allocation
                de ton portefeuille. Toujours 100% local.
              </p>
              <Link
                href="/portefeuille"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-glow hover:text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                Mon portefeuille
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Aide pédagogique en bas */}
        <p className="mt-12 text-[12px] text-muted leading-relaxed border-t border-border/60 pt-6">
          La watchlist est conservée dans votre navigateur. Si vous videz le
          cache, changez de navigateur ou utilisez la navigation privée, votre
          liste ne sera pas synchronisée. Les prix sont rafraîchis toutes les
          deux minutes via l'API CoinGecko.
        </p>
      </div>
    </article>
  );
}

/**
 * BATCH 48a (2026-05-03) — Suspense skeleton pour /cryptos.
 *
 * /cryptos est une page client ('use client'), donc le SSR rend la page
 * statique et React hydrate ensuite. Pendant la phase router transition
 * (depuis une autre route), Next.js sert ce loading.tsx → skeleton instant
 * au lieu d'un flash blanc.
 *
 * Skeleton mime la structure : header h1 + chips filtres + grille de
 * 9 cards crypto (taille perçue ~1 viewport).
 */
export default function CryptosLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement des 100 cryptos analysées">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="h-3 w-32 rounded bg-elevated mb-6" />

        {/* Header */}
        <div className="space-y-3 max-w-3xl mb-8">
          <div className="h-12 w-2/3 rounded bg-elevated" />
          <div className="h-4 w-full rounded bg-elevated/70" />
          <div className="h-4 w-5/6 rounded bg-elevated/70" />
        </div>

        {/* Filtres top : kind + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-full bg-elevated" />
            <div className="h-9 w-24 rounded-full bg-elevated/70" />
            <div className="h-9 w-32 rounded-full bg-elevated/70" />
          </div>
          <div className="h-9 w-72 rounded-lg bg-elevated/70" />
        </div>

        {/* Chips catégories */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-elevated/60" />
          ))}
        </div>

        {/* Compteur */}
        <div className="h-4 w-32 rounded bg-elevated/70 mb-4" />

        {/* Grid cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl border border-border bg-surface/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

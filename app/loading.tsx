/**
 * Loading global Cryptoreflex — affiché pendant le streaming des Server Components
 * de n'importe quelle route racine.
 *
 * Stratégie : reproduire le layout perçu (Hero + cards + table) en skeletons
 * shimmer. Pas de spinner basique : on respecte la grille pour éviter le CLS
 * lorsque le vrai contenu arrive.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-fade-in">
      <span className="sr-only">Chargement de la page…</span>

      {/* HERO SKELETON — reflète Hero.tsx (badges + h1 + CTA + carte droite) */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
            <div>
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <div className="skeleton h-6 w-44 rounded-full" />
                <div className="skeleton h-6 w-52 rounded-full" />
              </div>

              {/* H1 */}
              <div className="mt-5 space-y-3">
                <div className="skeleton h-10 sm:h-12 lg:h-14 w-11/12" />
                <div className="skeleton h-10 sm:h-12 lg:h-14 w-9/12" />
              </div>

              {/* Paragraphe */}
              <div className="mt-5 space-y-2 max-w-xl">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-11/12" />
                <div className="skeleton h-4 w-8/12" />
              </div>

              {/* CTA */}
              <div className="mt-8 space-y-3">
                <div className="skeleton h-12 w-72 rounded-xl" />
                <div className="skeleton h-4 w-60" />
              </div>

              {/* Liste reassurance */}
              <div className="mt-8 grid sm:grid-cols-3 gap-3">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-5 w-44" />
                <div className="skeleton h-5 w-48" />
              </div>
            </div>

            {/* Carte droite */}
            <div className="lg:pl-6">
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-6 w-full" />
                <div className="skeleton h-6 w-10/12" />
                <div className="space-y-2 pt-2">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-9/12" />
                </div>
                <div className="skeleton h-4 w-28" />
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                  <SkeletonStat />
                  <SkeletonStat />
                  <SkeletonStat />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CARDS SKELETON — placeholders pour PlatformsSection / Top10 */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-3 mb-8">
            <div className="skeleton h-6 w-40 rounded-full" />
            <div className="skeleton h-9 w-72" />
            <div className="skeleton h-4 w-96 max-w-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* TABLE SKELETON — placeholder pour MarketTable desktop */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-3 mb-6">
            <div className="skeleton h-9 w-80" />
            <div className="skeleton h-4 w-72" />
          </div>

          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="space-y-2">
      <div className="skeleton h-5 w-12 mx-auto" />
      <div className="skeleton h-3 w-20 mx-auto" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-10/12" />
      </div>
      <div className="skeleton h-9 w-full rounded-xl" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-t border-border first:border-t-0">
      <div className="skeleton h-3 w-4" />
      <div className="skeleton h-7 w-7 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-3 w-16" />
      </div>
      <div className="skeleton h-4 w-20 hidden sm:block" />
      <div className="skeleton h-4 w-16" />
      <div className="skeleton h-7 w-24 hidden lg:block" />
    </div>
  );
}

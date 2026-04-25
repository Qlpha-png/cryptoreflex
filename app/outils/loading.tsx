/**
 * Loading spécifique à la section /outils.
 * Skeleton aligné avec la grille des outils (calculateur fiscalité, DCA, etc).
 */
export default function OutilsLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-fade-in">
      <span className="sr-only">Chargement des outils…</span>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="space-y-3 mb-10">
            <div className="skeleton h-6 w-36 rounded-full" />
            <div className="skeleton h-10 w-96 max-w-full" />
            <div className="skeleton h-4 w-[28rem] max-w-full" />
          </div>

          {/* Grid d'outils */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ToolCardSkeleton key={i} />
            ))}
          </div>

          {/* Zone "outil interactif" plus large dessous */}
          <div className="mt-14 glass rounded-2xl p-6 space-y-4">
            <div className="skeleton h-6 w-64" />
            <div className="skeleton h-4 w-96 max-w-full" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-12 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-12 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-12 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-12 w-full rounded-xl" />
              </div>
            </div>

            <div className="skeleton h-12 w-44 rounded-xl mt-4" />
          </div>
        </div>
      </section>
    </div>
  );
}

function ToolCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="skeleton h-12 w-12 rounded-xl" />
      <div className="space-y-2">
        <div className="skeleton h-5 w-44" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-10/12" />
      </div>
      <div className="skeleton h-9 w-32 rounded-xl" />
    </div>
  );
}

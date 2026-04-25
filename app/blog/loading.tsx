/**
 * Loading spécifique au blog (/blog et /blog/[slug]).
 * Skeleton de la liste d'articles : header + grid de 6 cards.
 */
export default function BlogLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-fade-in">
      <span className="sr-only">Chargement des articles…</span>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="space-y-3 mb-10">
            <div className="skeleton h-6 w-32 rounded-full" />
            <div className="skeleton h-10 w-80 max-w-full" />
            <div className="skeleton h-4 w-96 max-w-full" />
          </div>

          {/* Grid d'articles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ArticleCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Cover */}
      <div className="skeleton h-40 w-full rounded-none" />

      <div className="p-5 space-y-3">
        <div className="skeleton h-5 w-full" />
        <div className="skeleton h-5 w-10/12" />

        <div className="space-y-2 pt-1">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-11/12" />
          <div className="skeleton h-3 w-9/12" />
        </div>

        <div className="flex items-center gap-3 pt-3">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

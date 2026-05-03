/**
 * BATCH 49c (2026-05-03) — Suspense skeleton pour /actualites.
 *
 * Avant : flash blanc avant fetch des news server (cron + cache).
 * Maintenant : skeleton qui mime header + grid de 6 articles.
 */
export default function ActualitesLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement des actualités crypto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-3 mb-8 max-w-3xl">
          <div className="h-3 w-32 rounded bg-elevated" />
          <div className="h-10 w-2/3 rounded bg-elevated" />
          <div className="h-4 w-full rounded bg-elevated/70" />
        </div>

        {/* Filtres bar */}
        <div className="flex gap-2 mb-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-elevated" />
          ))}
        </div>

        {/* Grid articles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface/40 overflow-hidden"
            >
              <div className="h-40 bg-elevated/40" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-20 rounded bg-elevated/60" />
                <div className="h-5 w-full rounded bg-elevated" />
                <div className="h-5 w-3/4 rounded bg-elevated" />
                <div className="h-3 w-1/3 rounded bg-elevated/50 mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

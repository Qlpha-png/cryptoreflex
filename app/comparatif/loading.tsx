/**
 * BATCH 49c (2026-05-03) — Suspense skeleton pour /comparatif.
 *
 * Hub des comparatifs editoriaux plateformes. Skeleton pendant la
 * generation static / route transition.
 */
export default function ComparatifLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement du comparateur de plateformes">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-3 mb-8 max-w-3xl">
          <div className="h-3 w-32 rounded bg-elevated" />
          <div className="h-10 w-2/3 rounded bg-elevated" />
          <div className="h-4 w-full rounded bg-elevated/70" />
          <div className="h-4 w-5/6 rounded bg-elevated/70" />
        </div>

        {/* Comparatif table skeleton */}
        <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden mb-8">
          <div className="h-14 border-b border-border bg-elevated/40" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 border-b border-border last:border-b-0 flex items-center px-4 gap-4">
              <div className="h-9 w-9 rounded-full bg-elevated" />
              <div className="h-4 w-32 rounded bg-elevated" />
              <div className="ml-auto flex gap-3">
                <div className="h-4 w-16 rounded bg-elevated/70" />
                <div className="h-4 w-16 rounded bg-elevated/70" />
                <div className="h-4 w-16 rounded bg-elevated/70" />
              </div>
            </div>
          ))}
        </div>

        {/* Cards comparatifs editoriaux */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-border bg-surface/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

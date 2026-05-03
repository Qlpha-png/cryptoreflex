/**
 * BATCH 53 — Suspense skeleton pour /academie (académie certifiante).
 */
export default function AcademieLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement de l'académie">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 mb-8 max-w-3xl">
          <div className="h-3 w-32 rounded bg-elevated" />
          <div className="h-12 w-2/3 rounded bg-elevated" />
          <div className="h-4 w-full rounded bg-elevated/70" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-56 rounded-2xl border border-border bg-surface/40" />
          ))}
        </div>
      </div>
    </div>
  );
}

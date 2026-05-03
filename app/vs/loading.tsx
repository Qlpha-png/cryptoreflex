/**
 * BATCH 53 — Suspense skeleton pour /vs (4950 duels crypto-vs-crypto).
 */
export default function VsLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement duels crypto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero centre */}
        <div className="text-center space-y-3 mb-12">
          <div className="h-7 w-48 mx-auto rounded-full bg-elevated" />
          <div className="h-14 w-2/3 mx-auto rounded bg-elevated" />
          <div className="h-4 w-full max-w-2xl mx-auto rounded bg-elevated/70" />
        </div>
        {/* Grid 20 duels stars */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-surface/40" />
          ))}
        </div>
      </div>
    </div>
  );
}

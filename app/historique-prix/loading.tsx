/**
 * BATCH 53 — Suspense skeleton pour /historique-prix (240 URLs annuelles).
 */
export default function HistoriquePrixLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement historique prix">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 mb-8 max-w-3xl">
          <div className="h-3 w-32 rounded bg-elevated" />
          <div className="h-12 w-2/3 rounded bg-elevated" />
          <div className="h-4 w-full rounded bg-elevated/70" />
        </div>
        {/* 30 cards crypto x 8 années compactes */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-border bg-surface/40" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * BATCH 53 — Suspense skeleton pour /marche (hub donnees live marche).
 */
export default function MarcheLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement du marché crypto live">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 mb-8 max-w-3xl">
          <div className="h-3 w-32 rounded bg-elevated" />
          <div className="h-12 w-2/3 rounded bg-elevated" />
          <div className="h-4 w-full rounded bg-elevated/70" />
          <div className="h-4 w-5/6 rounded bg-elevated/70" />
        </div>
        {/* 3 cards principales (heatmap, fear-greed, gainers) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl border border-border bg-surface/40" />
          ))}
        </div>
        {/* Sections educatives */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-40 rounded-2xl border border-border bg-surface/40" />
          <div className="h-40 rounded-2xl border border-border bg-surface/40" />
        </div>
      </div>
    </div>
  );
}

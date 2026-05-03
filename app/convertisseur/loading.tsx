/**
 * BATCH 53 — Suspense skeleton pour /convertisseur (~30 paires).
 */
export default function ConvertisseurLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement convertisseur crypto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 mb-8 max-w-3xl">
          <div className="h-3 w-32 rounded bg-elevated" />
          <div className="h-12 w-2/3 rounded bg-elevated" />
          <div className="h-4 w-full rounded bg-elevated/70" />
        </div>
        {/* 5 sections groupes par crypto base */}
        <div className="space-y-8">
          {[0, 1, 2].map((g) => (
            <div key={g}>
              <div className="h-6 w-40 rounded bg-elevated mb-4" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg border border-border bg-surface/40" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

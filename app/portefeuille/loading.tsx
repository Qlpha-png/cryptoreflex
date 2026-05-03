/**
 * BATCH 49c (2026-05-03) — Suspense skeleton pour /portefeuille.
 *
 * Avant : flash blanc avant l'hydration de PortfolioView (Client Component
 * lourd qui lit localStorage + polling 2min). UX laggy au 1er load.
 *
 * Maintenant : skeleton instant qui mime le layout (header + summary card
 * + table positions). Pattern Linear/Vercel pour dashboards.
 */
export default function PortefeuilleLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement de ton portfolio">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-3 mb-8">
          <div className="h-3 w-24 rounded bg-elevated" />
          <div className="h-10 w-72 rounded bg-elevated" />
          <div className="h-4 w-96 rounded bg-elevated/70" />
        </div>

        {/* Summary card */}
        <div className="h-32 rounded-2xl border border-border bg-surface/40 mb-6" />

        {/* Allocation pie + stats */}
        <div className="grid gap-4 lg:grid-cols-[260px_1fr] mb-6">
          <div className="h-64 rounded-2xl border border-border bg-surface/40" />
          <div className="space-y-3">
            <div className="h-10 rounded-xl border border-border bg-surface/40" />
            <div className="h-10 rounded-xl border border-border bg-surface/40" />
            <div className="h-10 rounded-xl border border-border bg-surface/40" />
            <div className="h-10 rounded-xl border border-border bg-surface/40" />
          </div>
        </div>

        {/* Positions table */}
        <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
          <div className="h-12 border-b border-border bg-elevated/30" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 border-b border-border last:border-b-0" />
          ))}
        </div>
      </div>
    </div>
  );
}

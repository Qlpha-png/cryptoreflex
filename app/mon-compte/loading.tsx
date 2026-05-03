/**
 * BATCH 48a (2026-05-03) — Suspense skeleton pour /mon-compte.
 *
 * Avant : flash blanc avant le redirect Supabase getUser() async (qui peut
 * prendre 100-500ms en cold start). UX laggy.
 *
 * Maintenant : Next.js detecte ce loading.tsx et l'affiche pendant que le
 * server component principal resout son async. Pattern Linear/Vercel.
 *
 * Skeleton mime la structure du dashboard : header avec nom + badge Crown,
 * 4 KPI cards en grid, section "Tes outils Soutien" avec 4 cards.
 *
 * motion-safe:animate-pulse pour respecter prefers-reduced-motion.
 */
export default function MonCompteLoading() {
  return (
    <div className="py-12 sm:py-16 motion-safe:animate-pulse" aria-busy="true" aria-label="Chargement de ton espace personnel">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header skeleton : nom + email + badges */}
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-elevated" />
            <div className="h-9 w-72 rounded bg-elevated" />
            <div className="h-4 w-56 rounded bg-elevated/70" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-20 rounded-full bg-elevated" />
            <div className="h-7 w-32 rounded-full bg-elevated" />
            <div className="h-11 w-32 rounded-lg bg-elevated/70" />
          </div>
        </header>

        {/* KPI cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl border border-border bg-surface/40"
            />
          ))}
        </div>

        {/* Section Tes outils Soutien */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-5 sm:p-6 mb-6">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <div className="h-6 w-44 rounded bg-elevated" />
            <div className="h-4 w-28 rounded bg-elevated/70" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl border border-border bg-surface/60"
              />
            ))}
          </div>
        </div>

        {/* Section secondaire (préférences / abonnement) */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-48 rounded-2xl border border-border bg-surface/40" />
          <div className="h-48 rounded-2xl border border-border bg-surface/40" />
        </div>
      </div>
    </div>
  );
}

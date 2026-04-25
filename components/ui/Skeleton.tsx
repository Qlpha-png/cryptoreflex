import type { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  /** Pour aria-label : décrit le contenu en cours de chargement. */
  label?: string;
}

/**
 * Brique de base — une bande shimmer.
 * S'utilise via les compositions ci-dessous (SkeletonCard / List / Hero)
 * ou en standalone pour des placeholders custom.
 */
export function Skeleton({ className = "", style, label }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={style}
      role="status"
      aria-busy="true"
      aria-label={label ?? "Chargement…"}
    />
  );
}

/**
 * SkeletonCard — placeholder d'une carte type MarketTable row /
 * Top10 / HiddenGem. Hauteur ~180px, glass-like.
 */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`glass rounded-2xl p-6 ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Carte en cours de chargement"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-3/5 mb-2" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 shrink-0" />
      </div>

      <Skeleton className="mt-5 h-3 w-1/2" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-11/12" />
      <Skeleton className="mt-2 h-3 w-4/5" />

      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * SkeletonList — placeholder pour Top10 / liste de cryptos.
 * `rows` détermine le nombre de lignes (défaut 5).
 */
export function SkeletonList({
  rows = 5,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <ul
      className={`divide-y divide-border rounded-2xl border border-border bg-elevated/40 ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Liste en cours de chargement"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3 w-1/3 mb-1.5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
          <Skeleton className="h-4 w-12 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/**
 * SkeletonHero — placeholder pour le bloc Hero (titre, sub, CTA, carte droite).
 */
export function SkeletonHero({ className = "" }: { className?: string }) {
  return (
    <section
      className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-16 lg:pt-20 lg:pb-24 ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Hero en cours de chargement"
    >
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-6 w-48 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-12 w-11/12" />
          <Skeleton className="mt-3 h-12 w-9/12" />
          <Skeleton className="mt-6 h-4 w-full max-w-xl" />
          <Skeleton className="mt-2 h-4 w-5/6 max-w-xl" />
          <Skeleton className="mt-2 h-4 w-4/6 max-w-xl" />
          <Skeleton className="mt-8 h-12 w-72 rounded-xl" />
          <div className="mt-8 grid sm:grid-cols-3 gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div className="lg:pl-6">
          <div className="glass rounded-2xl p-6">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-6 w-11/12" />
            <Skeleton className="mt-2 h-6 w-3/4" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-5 h-4 w-32" />
            <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Skeleton;

"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Activity, RefreshCw } from "lucide-react";
import { revalidateHeatmap } from "./actions";

/**
 * Empty-state interactif pour /marche/heatmap quand `fetchTopMarket(100)`
 * renvoie un dataset vide (CoinGecko down ou rate-limit).
 *
 * Bouton "Réessayer" → server action `revalidateHeatmap` → invalide le cache
 * ISR et la page est re-rendue côté serveur. UX optimiste : on affiche un
 * spinner pendant la transition pour éviter le double-clic.
 */
export default function HeatmapEmpty() {
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      await revalidateHeatmap();
    });
  };

  return (
    <div
      className="glass rounded-2xl py-12 sm:py-16 px-6 text-center flex flex-col items-center"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-soft border border-primary/20">
        <Activity className="h-6 w-6" aria-hidden="true" />
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-fg">
        Données marché indisponibles
      </h3>

      <p className="mt-2 max-w-md text-sm text-muted">
        Notre fournisseur de cours est temporairement injoignable. Réessayez
        dans quelques instants ou consultez nos guides en attendant.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleRetry}
          disabled={isPending}
          className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Recharger les données marché"
        >
          <RefreshCw
            className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {isPending ? "Rechargement…" : "Réessayer"}
        </button>
        <Link href="/blog" className="btn-ghost text-sm">
          Voir les guides
        </Link>
      </div>
    </div>
  );
}

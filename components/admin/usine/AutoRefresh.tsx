"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pause, Play, RefreshCw } from "lucide-react";

/**
 * AutoRefresh — relit l'état de l'Usine toutes les `intervalleS` secondes (router.refresh : le Server Component est
 * rejoué, sans rechargement complet). Pause quand l'onglet est caché (économie, et aucune requête GitHub/KV inutile).
 * `age` (ISO) : heure de génération de l'état affiché, pour le « lu il y a X s ».
 */
export default function AutoRefresh({ intervalleS = 60, genereLe }: { intervalleS?: number; genereLe: string }) {
  const router = useRouter();
  const [actif, setActif] = useState(true);
  const [reste, setReste] = useState(intervalleS);
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    setReste(intervalleS);
  }, [genereLe, intervalleS]);

  useEffect(() => {
    const tick = () => {
      setAge(Math.max(0, Math.round((Date.now() - Date.parse(genereLe)) / 1000)));
      if (!actif || document.visibilityState === "hidden") return;
      setReste((r) => {
        if (r <= 1) {
          router.refresh();
          return intervalleS;
        }
        return r - 1;
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [actif, genereLe, intervalleS, router]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
      <span className="tabular-nums">{age === null ? "état lu à l'instant" : age < 5 ? "état lu à l'instant" : `état lu il y a ${age} s`}</span>
      <span aria-hidden className="text-border">
        ·
      </span>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="inline-flex items-center gap-1 text-fg/80 hover:text-primary"
        title="Relire maintenant"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        relire
      </button>
      <button
        type="button"
        onClick={() => setActif((a) => !a)}
        className="inline-flex items-center gap-1 text-fg/80 hover:text-primary tabular-nums"
        title={actif ? "Mettre en pause le rafraîchissement automatique" : "Reprendre le rafraîchissement automatique"}
        aria-pressed={!actif}
      >
        {actif ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
        {actif ? `auto dans ${reste} s` : "auto en pause"}
      </button>
    </div>
  );
}

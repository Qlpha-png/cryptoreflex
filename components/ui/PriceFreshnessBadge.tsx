"use client";

import { Clock, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * <PriceFreshnessBadge /> — Badge UI discret pour signaler la fraîcheur
 * des prix ticker affichés.
 *
 * Pourquoi (2026-05-14) :
 *   En cas de gap GitHub Actions cron (65 à 246 min observés), le cache KV
 *   `cg-ticker-prices:v1` (live, TTL 12 min) expire et les pages servent
 *   les prix depuis `cg-ticker-prices:stale:v1` (fallback TTL 6 h). Sans
 *   indicateur visuel, l'utilisateur ne sait pas que les prix ont jusqu'à
 *   6 h de retard. Risque UX + potentiellement DGCCRF (présentation
 *   trompeuse d'un prix retardé comme "temps réel").
 *
 * Comportement :
 *   - `fresh` (< 12 min) : aucun badge (ou seulement si `alwaysShow=true`)
 *   - `indicative` (12 min - 2 h) : "Prix indicatif — MAJ il y a Xmin"
 *   - `delayed` (2 h - 6 h) : "Prix indicatif — données retardées, vérifiez
 *     auprès de la plateforme avant toute décision"
 *   - `unknown` (pas de fetchedAt) : aucun badge (legacy KV ou source "none")
 *
 * Ne s'affiche QUE côté client : évite hydration mismatch sur la date relative.
 * SSR retourne `null`.
 */

interface Props {
  /** ISO 8601 timestamp de la dernière fetch CG (cf. readTickerCache().fetchedAt). */
  fetchedAt: string | null;
  /** Affiche le badge même si "fresh" (utile pour debug ou page transparence). */
  alwaysShow?: boolean;
  /** Classes additionnelles (positionnement, espacement). */
  className?: string;
}

type Freshness = "fresh" | "indicative" | "delayed" | "unknown";

const FRESH_THRESHOLD_MS = 12 * 60 * 1000; // 12 min
const INDICATIVE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 h

function classify(fetchedAt: string | null): {
  level: Freshness;
  ageMs: number | null;
} {
  if (!fetchedAt) return { level: "unknown", ageMs: null };
  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) return { level: "unknown", ageMs: null };
  const age = Math.max(0, Date.now() - parsed);
  if (age < FRESH_THRESHOLD_MS) return { level: "fresh", ageMs: age };
  if (age < INDICATIVE_THRESHOLD_MS)
    return { level: "indicative", ageMs: age };
  return { level: "delayed", ageMs: age };
}

function formatAge(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  const remainingMin = min % 60;
  if (remainingMin === 0) return `il y a ${h} h`;
  return `il y a ${h} h ${remainingMin} min`;
}

export default function PriceFreshnessBadge({
  fetchedAt,
  alwaysShow = false,
  className = "",
}: Props) {
  // SSR : return null pour éviter mismatch d'hydratation sur l'âge calculé.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const { level, ageMs } = classify(fetchedAt);

  // Pas de badge si "fresh" sauf si alwaysShow, ou si "unknown" (legacy data).
  if (level === "unknown") return null;
  if (level === "fresh" && !alwaysShow) return null;

  const ageLabel = ageMs !== null ? formatAge(ageMs) : "";

  if (level === "fresh") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success ${className}`}
        title={`Dernière mise à jour ${ageLabel}`}
      >
        <Clock className="h-3 w-3" aria-hidden="true" />
        Temps réel
      </span>
    );
  }

  if (level === "indicative") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-muted/15 px-2 py-0.5 text-[10px] font-medium text-muted ${className}`}
        title={`Prix mis à jour ${ageLabel}. Si vous prenez une décision financière, vérifiez auprès de la plateforme.`}
      >
        <Clock className="h-3 w-3" aria-hidden="true" />
        Prix indicatif · MAJ {ageLabel}
      </span>
    );
  }

  // delayed (2 h - 6 h)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300 ${className}`}
      title={`Prix mis à jour ${ageLabel}. Données potentiellement retardées : vérifiez auprès de la plateforme avant toute décision.`}
    >
      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      Prix retardé · {ageLabel}
    </span>
  );
}

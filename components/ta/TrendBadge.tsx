/**
 * <TrendBadge /> — pill compact pour afficher la tendance d'une analyse TA.
 *
 * Utilisé dans :
 *  - Cartes de l'index /analyses-techniques
 *  - Header d'article /analyses-techniques/[slug]
 *
 * Variantes :
 *  - "bullish"  → fond vert + flèche montante
 *  - "bearish"  → fond rouge + flèche descendante
 *  - "neutral"  → fond ambre + flèche horizontale
 *
 * Tailles : sm (xs text) | md (sm text). Server Component pur (pas d'état).
 */

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { Trend } from "@/lib/ta-types";
import { TREND_LABEL_FR } from "@/lib/ta-types";

interface Props {
  trend: Trend;
  size?: "sm" | "md";
  /** Si true, masque le label texte (pour très petites cartes). */
  iconOnly?: boolean;
}

export default function TrendBadge({ trend, size = "sm", iconOnly = false }: Props) {
  const label = TREND_LABEL_FR[trend];

  const colorClasses =
    trend === "bullish"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
      : trend === "bearish"
        ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
        : "border-amber-500/40 bg-amber-500/15 text-amber-300";

  const sizeClasses =
    size === "md"
      ? "px-3 py-1 text-sm gap-1.5"
      : "px-2.5 py-0.5 text-xs gap-1";

  const Icon = trend === "bullish" ? TrendingUp : trend === "bearish" ? TrendingDown : Minus;

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-semibold",
        sizeClasses,
        colorClasses,
      ].join(" ")}
      aria-label={`Tendance ${label}`}
    >
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden="true" />
      {!iconOnly && <span>{label}</span>}
    </span>
  );
}

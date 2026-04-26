import { ShieldCheck } from "lucide-react";

/**
 * MiCAComplianceBadge — badge de réassurance MiCA réutilisable.
 *
 * Pourquoi c'est important :
 *  - Audit Trust 26-04 (issue critique #6) : "Pas de certification/badge
 *    MiCA compliant proche CTA". Trust signal manquant aux moments critiques
 *    (page comparatif + home + cards plateformes).
 *  - MiCA est LE filtre éditorial #1 de Cryptoreflex : on ne recommande que
 *    des plateformes agréées CASP. Le rendre visible explicitement = trust + SEO.
 *
 * Variants :
 *  - `compact` : pour les cards plateformes (small, inline)
 *  - `default` : pour les pages avis / comparatif (medium)
 *  - `banner` : pour les sections CTAs proéminentes (large, full-width)
 *
 * Couleur : accent-green (validation) sur background subtle, halo discret pour
 * que le badge soit perçu comme "officiel" plutôt que comme une étiquette marketing.
 */

interface Props {
  /** Visuel : compact (≤140px), default, banner (full-width). Défaut : default. */
  variant?: "compact" | "default" | "banner";
  /**
   * Date de dernière vérification (ISO). Affiche "Vérifié le ..." en muted.
   * Si absent : juste le badge sans date.
   */
  verifiedAt?: string;
  /** Pays-source de l'agrément (ex: "France", "Allemagne", "Lituanie"). Optionnel. */
  jurisdiction?: string;
  /** Classes Tailwind additionnelles. */
  className?: string;
}

export default function MiCAComplianceBadge({
  variant = "default",
  verifiedAt,
  jurisdiction,
  className = "",
}: Props) {
  const isBanner = variant === "banner";
  const isCompact = variant === "compact";

  // Format date en FR si fourni.
  const verifiedLabel = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-full
        border border-accent-green/30 bg-accent-green/10
        ${isBanner ? "px-4 py-2 text-sm w-full justify-center" : ""}
        ${isCompact ? "px-2 py-0.5 text-[10px]" : ""}
        ${!isBanner && !isCompact ? "px-3 py-1 text-xs" : ""}
        font-semibold text-accent-green
        ${className}
      `}
      role="status"
      aria-label={`Plateforme agréée MiCA${jurisdiction ? ` (${jurisdiction})` : ""}${
        verifiedLabel ? `, vérifiée le ${verifiedLabel}` : ""
      }`}
    >
      <ShieldCheck
        className={isCompact ? "h-3 w-3" : "h-4 w-4"}
        aria-hidden="true"
        strokeWidth={2.25}
      />
      <span>
        Agréé MiCA
        {jurisdiction && !isCompact ? ` (${jurisdiction})` : ""}
      </span>
      {verifiedLabel && !isCompact && (
        <span className="text-[10px] font-normal text-accent-green/70">
          · vérifié {verifiedLabel}
        </span>
      )}
    </div>
  );
}

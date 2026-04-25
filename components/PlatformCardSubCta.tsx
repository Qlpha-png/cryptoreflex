"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackAffiliateClick } from "@/lib/analytics";

/**
 * PlatformCardSubCta — sous-CTA "Lire notre avis détaillé" sur les cartes plateforme.
 *
 * Pourquoi un fichier dédié ?
 *  - <PlatformCard> est un Server Component (rendu statique aux 480 routes,
 *    bénéfique pour le poids JS). On ne peut donc pas y attacher d'`onClick`.
 *  - On extrait juste ce lien dans un mini Client Component pour pouvoir
 *    tracker la conversion intermédiaire (sub-CTA → page avis → CTA affilié)
 *    sans perdre le bénéfice SSR sur le reste de la carte.
 *
 * Tracking :
 *  - `trackAffiliateClick(platformId, "platform-card-sub-cta", "Lire notre avis détaillé")`
 *  - C'est techniquement un click "vers une page interne", mais on le mesure via
 *    le même event "Affiliate Click" pour suivre tout le funnel jusqu'au CTA final.
 *  - Plausible distingue grâce au placement = "platform-card-sub-cta".
 */

interface Props {
  platformId: string;
  platformName: string;
}

export default function PlatformCardSubCta({ platformId, platformName }: Props) {
  const handleClick = () => {
    try {
      trackAffiliateClick(platformId, "platform-card-sub-cta", "Lire notre avis détaillé");
    } catch {
      /* analytics never blocks UX */
    }
  };

  return (
    <Link
      href={`/avis/${platformId}`}
      onClick={handleClick}
      className="mt-2 inline-flex items-center justify-center gap-1 text-sm text-primary-soft hover:text-primary
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                 focus-visible:ring-offset-background rounded transition-colors"
      aria-label={`Lire notre avis détaillé sur ${platformName}`}
    >
      Lire notre avis détaillé
      <ArrowRight className="h-[14px] w-[14px]" aria-hidden="true" />
    </Link>
  );
}

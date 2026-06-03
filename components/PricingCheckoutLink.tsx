/**
 * PricingCheckoutLink — NEUTRALISÉ (démonétisation juin 2026).
 *
 * Ce wrapper traquait `click_checkout` (conversion A/B) sur le CTA d'un
 * abonnement payant. Cryptoreflex est désormais 100 % gratuit : il n'y a plus
 * de checkout ni de conversion payante à tracker.
 *
 * Le composant rend désormais un simple lien de navigation (interne / ancre /
 * externe) sans aucun tracking de paiement. On conserve l'export par défaut et
 * la signature de props (`href`, `label`, `className`) pour ne casser aucun
 * import résiduel.
 */

import Link from "next/link";

interface PricingCheckoutLinkProps {
  href: string;
  label: string;
  className: string;
}

export default function PricingCheckoutLink({
  href,
  label,
  className,
}: PricingCheckoutLinkProps) {
  const isAnchor = href.startsWith("#");
  const isExternal = /^https?:\/\//.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </a>
    );
  }
  if (isAnchor) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

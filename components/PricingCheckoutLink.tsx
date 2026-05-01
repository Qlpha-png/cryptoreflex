"use client";

/**
 * PricingCheckoutLink — wrapper Client du CTA "checkout" pour l'expé
 * `pricing_display_v1`. Tracke `click_checkout` au click.
 *
 * Utilisé par TieredPricing UNIQUEMENT pour les tiers qui portent
 * `abTestKey: "pricing_display_v1"`. Pour les autres tiers, le rendu legacy
 * (Link/anchor) est conservé tel quel.
 *
 * Compat externe / interne / anchor : on supporte les 3 cas du parent.
 */

import Link from "next/link";
import { getVariant, trackVariantConversion } from "@/lib/abtest";

interface PricingCheckoutLinkProps {
  href: string;
  label: string;
  className: string;
}

const EXPERIMENT_ID = "pricing_display_v1";

export default function PricingCheckoutLink({
  href,
  label,
  className,
}: PricingCheckoutLinkProps) {
  const handleClick = () => {
    const variant = getVariant(EXPERIMENT_ID);
    trackVariantConversion(EXPERIMENT_ID, variant, "click_checkout");
  };

  const isAnchor = href.startsWith("#");
  const isExternal = /^https?:\/\//.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={handleClick}
      >
        {label}
      </a>
    );
  }
  if (isAnchor) {
    return (
      <a href={href} className={className} onClick={handleClick}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={handleClick}>
      {label}
    </Link>
  );
}

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { getPlatformById } from "@/lib/platforms";

interface AffiliateLinkProps {
  /** ID d'une plateforme dans `data/platforms.json` (ex: "binance"). Prioritaire sur `href`. */
  platform?: string;
  /** URL brute. Sera enrichie d'un `utm_source=cryptoreflex` si absent. */
  href?: string;
  /** Texte d'ancre. Si vide et `platform` fourni, on prend le nom de la plateforme. */
  children?: ReactNode;
  /** Style "bouton" plutôt que lien inline. */
  variant?: "inline" | "button";
  /** Si true, n'affiche pas l'icône externe. */
  noIcon?: boolean;
}

function withUtm(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has("utm_source")) {
      url.searchParams.set("utm_source", BRAND.utmSource);
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Lien d'affiliation conforme : `rel="sponsored nofollow noopener"` + `target="_blank"`.
 *
 * Usage MDX :
 *   <AffiliateLink platform="binance">Ouvrir un compte Binance</AffiliateLink>
 *   <AffiliateLink href="https://example.com/partner" variant="button">Voir l'offre</AffiliateLink>
 */
export default function AffiliateLink({
  platform,
  href,
  children,
  variant = "inline",
  noIcon,
}: AffiliateLinkProps) {
  const p = platform ? getPlatformById(platform) : undefined;
  const finalHref = withUtm(p?.affiliateUrl ?? href ?? "#");
  const label = children ?? p?.name ?? "Voir l'offre";

  const baseRel = "sponsored nofollow noopener";

  if (variant === "button") {
    return (
      <a
        href={finalHref}
        rel={baseRel}
        target="_blank"
        className="not-prose inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background no-underline transition-colors hover:bg-primary-glow"
      >
        {label}
        {!noIcon && <ExternalLink className="h-4 w-4" aria-hidden />}
      </a>
    );
  }

  return (
    <a
      href={finalHref}
      rel={baseRel}
      target="_blank"
      className="text-primary-glow underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary"
    >
      {label}
      {!noIcon && (
        <ExternalLink
          className="ml-0.5 inline h-3.5 w-3.5 align-text-top opacity-70"
          aria-hidden
        />
      )}
    </a>
  );
}

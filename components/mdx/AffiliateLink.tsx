import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { findPaidPlatformByUrl, getPlatformById } from "@/lib/platforms";
import { getFiscalToolById } from "@/lib/fiscal-tools";
import { isPaidLink, paidLinkCaption } from "@/lib/partnerships";
import { acceptsUtm } from "@/lib/partner-links";

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
    if (acceptsUtm(rawUrl) && !url.searchParams.has("utm_source")) {
      url.searchParams.set("utm_source", BRAND.utmSource);
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Lien sortant des articles MDX : `target="_blank"` + `rel` exact.
 *
 * 06/10/2026 :
 *  - « sponsored » et mention visible « Publicité » UNIQUEMENT si le lien est réellement rémunéré
 *    (plateforme listée dans lib/partnerships.ts) ; avant, tout lien de ce composant était « sponsored »
 *    et aucun ne portait de mention visible, même les vrais liens d'affiliation Ledger ;
 *  - `platform="waltio"` (outil fiscal, absent de data/platforms.json) menait à « # » : l'URL est aussi
 *    cherchée dans data/fiscal-tools.json.
 *
 * Usage MDX :
 *   <AffiliateLink platform="ledger">le site officiel Ledger</AffiliateLink>
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
  const tool = platform && !p ? getFiscalToolById(platform) : null;
  const rawHref = p?.affiliateUrl ?? tool?.affiliateUrl ?? href ?? "#";
  const finalHref = withUtm(rawHref);
  const label = children ?? p?.name ?? tool?.name ?? "Voir l'offre";

  const paidId = platform ? (isPaidLink(platform, rawHref) ? platform : null) : findPaidPlatformByUrl(rawHref)?.id ?? null;
  const rel = paidId ? "sponsored nofollow noopener" : "nofollow noopener noreferrer";
  // Même libellé que partout ailleurs (/transparence l'annonce) : « Publicité — Cryptoreflex perçoit une commission »
  // ou « Publicité — lien de parrainage personnel ».
  const mention = paidId ? paidLinkCaption(paidId, rawHref) : null;
  const mentionNode = mention ? (
    <span className="not-prose ml-1 text-[0.875em] text-muted">({mention})</span>
  ) : null;

  if (variant === "button") {
    return (
      <>
        <a
          href={finalHref}
          rel={rel}
          target="_blank"
          className="not-prose inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background no-underline transition-colors hover:bg-primary-glow"
        >
          {label}
          {!noIcon && <ExternalLink className="h-4 w-4" aria-hidden />}
        </a>
        {mentionNode}
      </>
    );
  }

  return (
    <>
      <a
        href={finalHref}
        rel={rel}
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
      {mentionNode}
    </>
  );
}

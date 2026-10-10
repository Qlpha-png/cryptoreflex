import { useId, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { lienAffilie } from "@/lib/lien-affilie";
import { paidLinkCaption } from "@/lib/partnerships";
import { acceptsUtm } from "@/lib/partner-links";
import { typoFrRiche } from "@/lib/typo-fr";

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
 * Lot B4 (10/10/2026) — apparence seulement, la logique ci-dessus est inchangée :
 *  - lien de texte : couleur link, soulignement link-line de 2 px (3 px au survol), icône de sortie + « (site externe) » pour
 *    les lecteurs d'écran ;
 *  - bouton : jamais plein (règle C+ : un lien publicitaire n'est jamais un bouton plein) → bouton SECONDAIRE (contour) ;
 *  - mention « Publicité — … » COLLÉE au lien, dans une pastille (fond sunken, 14 px) qui revient à la ligne si besoin,
 *    reliée au lien par aria-describedby ; elle mène à /transparence.
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
  const idMention = useId();
  const { p, tool, rawHref, paidId } = lienAffilie({ platform, href });
  const finalHref = withUtm(rawHref);
  const label = children ?? p?.name ?? tool?.name ?? "Voir l'offre";

  const rel = paidId ? "sponsored nofollow noopener" : "nofollow noopener noreferrer";
  // Même libellé que partout ailleurs (/transparence l'annonce) : « Publicité — Cryptoreflex perçoit une commission »
  // ou « Publicité — lien de parrainage personnel ».
  const mention = paidId ? paidLinkCaption(paidId, rawHref) : null;
  const mentionNode = mention ? (
    <>
      {" "}
      <Link
        id={idMention}
        href="/transparence"
        className="not-prose rounded-[14px] bg-sunken px-2.5 py-0.5 text-[0.875em] text-fg-2 no-underline hover:text-fg hover:underline inline-block max-w-[calc(100%-1.5em)] align-baseline leading-snug [overflow-wrap:normal]"
      >
        {typoFrRiche(mention)}
      </Link>
      {/* U+2060 (joint de mots) : la ponctuation qui suit la pastille ne passe jamais seule à la ligne */}
      {String.fromCharCode(0x2060)}
    </>
  ) : null;

  if (variant === "button") {
    return (
      <>
        <a
          href={finalHref}
          rel={rel}
          target="_blank"
          aria-describedby={mention ? idMention : undefined}
          className="btn-ghost not-prose text-[1rem]"
        >
          {label}
          {!noIcon && <ExternalLink className="h-4 w-4" aria-hidden />}
          <span className="sr-only"> (site externe, nouvel onglet)</span>
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
        aria-describedby={mention ? idMention : undefined}
        className="text-link underline decoration-link-line decoration-2 underline-offset-[0.28em] transition-colors hover:text-link-hover hover:decoration-[3px]"
      >
        {label}
        {!noIcon && (
          <ExternalLink
            className="ml-1 inline h-[0.8em] w-[0.8em] align-baseline opacity-70"
            aria-hidden
          />
        )}
        <span className="sr-only"> (site externe, nouvel onglet)</span>
      </a>
      {mentionNode}
    </>
  );
}

import type { ComponentProps } from "react";
import Link from "next/link";
import GlossaryLink from "@/components/mdx/GlossaryLink";
import { findPaidPlatformByUrl } from "@/lib/platforms";
import { paidLinkCaption } from "@/lib/partnerships";
import { getGlossaryEntry } from "@/lib/glossary";

/**
 * <MdxLink/> — rendu d'un lien Markdown dans un MDX d'article (override de `a`).
 *
 *  - Lien vers le glossaire            → infobulle de définition.
 *  - Lien interne (`/blog/...`)        → <Link/> Next, prefetch automatique.
 *  - Lien externe générique            → <a target="_blank" rel="noopener nofollow">.
 *  - Lien externe RÉMUNÉRÉ             → rel « sponsored » + mention visible « (Publicité — …) » juste après le lien.
 *
 * 06/10/2026 : un lien Markdown brut portant le vrai code de parrainage Bitpanda ou Trade Republic recevait
 * « sponsored » mais AUCUNE mention visible (loi n° 2023-451 : caractère commercial identifiable). Seul un lien qui
 * porte le vrai code d'une relation listée dans lib/partnerships.ts est concerné (findPaidPlatformByUrl) ; un lien
 * vers coinbase.com, kraken.com… reste un lien neutre. Pour un CTA, préférer <AffiliateLink platform="…"/>.
 */
export default function MdxLink({ href, children, ...rest }: ComponentProps<"a">) {
  if (!href) return <a {...rest}>{children}</a>;

  // Lien vers le glossaire → infobulle de définition (sans quitter la leçon).
  const glossaryMatch = /^\/outils\/glossaire-crypto#(.+)$/.exec(href);
  if (glossaryMatch) {
    const entry = getGlossaryEntry(glossaryMatch[1]);
    if (entry) {
      const def =
        entry.definition.length > 180
          ? `${entry.definition.slice(0, 180).trimEnd()}…`
          : entry.definition;
      return (
        <GlossaryLink href={href} term={entry.term} definition={def}>
          {children}
        </GlossaryLink>
      );
    }
  }

  const isExternal = /^https?:\/\//i.test(href);
  if (isExternal) {
    const paid = findPaidPlatformByUrl(href);
    const caption = paid ? paidLinkCaption(paid.id, href) : null;
    return (
      <>
        <a
          href={href}
          rel={paid ? "noopener nofollow sponsored" : "noopener nofollow"}
          target="_blank"
          className="text-primary-glow underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          {...rest}
        >
          {children}
        </a>
        {caption && <span className="not-prose ml-1 text-[0.8em] text-muted">({caption})</span>}
      </>
    );
  }

  return (
    <Link
      href={href}
      className="text-primary-glow underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
    >
      {children}
    </Link>
  );
}

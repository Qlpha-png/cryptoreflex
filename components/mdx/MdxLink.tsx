import type { ComponentProps } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import GlossaryLink from "@/components/mdx/GlossaryLink";
import { findPaidPlatformByUrl } from "@/lib/platforms";
import { paidLinkCaption } from "@/lib/partnerships";
import { getGlossaryEntry } from "@/lib/glossary";
import { typoFrRiche } from "@/lib/typo-fr";

/** Lien de texte C+ : couleur link, soulignement link-line de 2 px sous les jambages, 3 px au survol (kit : .lnk). */
const LIEN =
  "text-link underline decoration-link-line decoration-2 underline-offset-[0.28em] transition-colors hover:text-link-hover hover:decoration-[3px]";

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
          className={LIEN}
          {...rest}
        >
          {children}
          <ExternalLink className="ml-1 inline h-[0.8em] w-[0.8em] align-baseline opacity-70" aria-hidden />
          <span className="sr-only"> (site externe, nouvel onglet)</span>
        </a>
        {caption && (
          <>
            {" "}
            <Link
              href="/transparence"
              className="not-prose rounded-[14px] bg-sunken px-2.5 py-0.5 text-[0.875em] text-fg-2 no-underline hover:text-fg hover:underline inline-block max-w-[calc(100%-1.5em)] align-baseline leading-snug [overflow-wrap:normal]"
            >
              {typoFrRiche(caption)}
            </Link>
            {/* U+2060 (joint de mots) : la ponctuation qui suit la pastille ne passe jamais seule à la ligne */}
            {String.fromCharCode(0x2060)}
          </>
        )}
      </>
    );
  }

  return (
    <Link href={href} className={LIEN}>
      {children}
    </Link>
  );
}

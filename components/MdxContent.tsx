/**
 * <MdxContent /> — rendu Server-Component du MDX d'un article.
 *
 * Stack :
 *   - next-mdx-remote/rsc  →  zéro client-JS pour le rendu Markdown.
 *   - remark-gfm           →  GFM (tables, task lists, autolinks, strike).
 *   - rehype-slug          →  ajoute des `id` sur les headings (ancres / TOC).
 *
 * Les composants custom (Callout, AffiliateLink, PlatformCardInline,
 * FaqAccordion) sont injectés en globals — pas besoin de `import` dans le MDX.
 *
 * Tout le rendu est wrappé dans `prose prose-invert` (plugin typography) +
 * surcharges Cryptoreflex (couleurs gold, code block surface, tables).
 */

import { MDXRemote } from "next-mdx-remote/rsc";
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

import remarkAutoLinkEntities from "@/lib/remark-auto-link-entities";
import Callout from "@/components/mdx/Callout";
import AffiliateLink from "@/components/mdx/AffiliateLink";
import PlatformCardInline from "@/components/mdx/PlatformCardInline";
import FaqAccordion from "@/components/mdx/FaqAccordion";
import AuthorBox from "@/components/mdx/AuthorBox";
import CTABox from "@/components/mdx/CTABox";
import ComparisonTable from "@/components/mdx/ComparisonTable";
import TableOfContents from "@/components/mdx/TableOfContents";
import FAQ from "@/components/mdx/FAQ";
import HowToSchema from "@/components/mdx/HowToSchema";
import { getAllPlatforms } from "@/lib/platforms";

/* -------------------------------------------------------------------------- */
/*  Components mappés → markdown HTML                                         */
/* -------------------------------------------------------------------------- */

/**
 * Détection auto des liens d'affiliation pour le `rel="sponsored"` Google.
 * On extrait les hostnames de tous les `affiliateUrl` connus dans
 * `data/platforms.json` + `data/wallets.json`. Les éventuels `redirect.aff`
 * Cryptoreflex ne sont PAS auto-détectés ici (les CTAs internes passent par
 * <AffiliateLink/> qui pose `sponsored` explicitement).
 *
 * Calculé une seule fois au boot (Set immutable) — coût négligeable.
 */
const AFFILIATE_HOSTNAMES: ReadonlySet<string> = (() => {
  const set = new Set<string>();
  for (const p of getAllPlatforms()) {
    if (!p.affiliateUrl) continue;
    try {
      const u = new URL(p.affiliateUrl);
      // On normalise (lowercase, sans port) pour matcher tous les variants.
      set.add(u.hostname.toLowerCase());
    } catch {
      // affiliateUrl mal formé → on ignore (jamais en prod, mais defensif).
    }
  }
  return set;
})();

function isAffiliateUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return AFFILIATE_HOSTNAMES.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * <MdxLink/> — rendu d'un lien dans un MDX d'article.
 *
 *  - Lien interne (`/blog/...`)         → <Link/> Next, prefetch automatique.
 *  - Lien externe générique             → <a target="_blank" rel="noopener nofollow">.
 *  - Lien externe vers domaine d'affilié → <a ... rel="noopener nofollow sponsored">
 *    (filet de sécurité automatique pour la conformité Google ad disclosure).
 *
 * Pour les CTAs sponsorisés inline, **préférer le composant <AffiliateLink/>
 * explicite** (déjà utilisé par les rédacteurs en amont) : il pose `sponsored`
 * de manière garantie, ajoute le tracking UTM, et inclut le wrapper visuel.
 * Cette détection auto par hostname est un *fallback* pour les liens markdown
 * bruts (`[Acheter sur Coinbase](https://www.coinbase.com/...)`) qui auraient
 * échappé à la migration éditoriale.
 */
function MdxLink({ href, children, ...rest }: ComponentProps<"a">) {
  if (!href) return <a {...rest}>{children}</a>;

  const isExternal = /^https?:\/\//i.test(href);
  if (isExternal) {
    const rel = isAffiliateUrl(href)
      ? "noopener nofollow sponsored"
      : "noopener nofollow";
    return (
      <a
        href={href}
        rel={rel}
        target="_blank"
        className="text-primary-glow underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
        {...rest}
      >
        {children}
      </a>
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

const mdxComponents = {
  /* Composants custom Cryptoreflex --------------------------------------- */
  Callout,
  AffiliateLink,
  PlatformCardInline,
  FaqAccordion,
  AuthorBox,
  CTABox,
  ComparisonTable,
  TableOfContents,
  FAQ,
  HowToSchema,

  /* Overrides Markdown standard ------------------------------------------ */
  a: MdxLink,

  h1: (props: ComponentProps<"h1">) => (
    // En général le H1 vient déjà de la page (pas du MDX) — on neutralise.
    <h1
      className="mt-10 scroll-mt-24 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
      {...props}
    />
  ),
  h2: (props: ComponentProps<"h2">) => (
    <h2
      className="mt-12 scroll-mt-24 border-l-4 border-primary pl-3 text-2xl font-bold tracking-tight text-white sm:text-3xl"
      {...props}
    />
  ),
  h3: (props: ComponentProps<"h3">) => (
    <h3
      className="mt-8 scroll-mt-24 text-xl font-semibold text-white sm:text-2xl"
      {...props}
    />
  ),
  h4: (props: ComponentProps<"h4">) => (
    <h4
      className="mt-6 scroll-mt-24 text-lg font-semibold text-white"
      {...props}
    />
  ),

  p: (props: ComponentProps<"p">) => (
    <p className="leading-relaxed text-white/80" {...props} />
  ),

  ul: (props: ComponentProps<"ul">) => (
    <ul
      className="list-disc space-y-1.5 pl-6 marker:text-primary/70"
      {...props}
    />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol
      className="list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-primary"
      {...props}
    />
  ),
  li: (props: ComponentProps<"li">) => (
    <li className="text-white/80" {...props} />
  ),

  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      className="my-6 rounded-r-lg border-l-4 border-primary bg-primary/5 px-5 py-3 italic text-white/90"
      {...props}
    />
  ),

  hr: () => <hr className="my-10 border-border" />,

  strong: (props: ComponentProps<"strong">) => (
    <strong className="font-semibold text-white" {...props} />
  ),

  em: (props: ComponentProps<"em">) => (
    <em className="italic text-white/90" {...props} />
  ),

  code: (props: ComponentProps<"code">) => (
    <code
      className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[0.85em] text-primary-glow before:content-none after:content-none"
      {...props}
    />
  ),

  pre: (props: ComponentProps<"pre">) => (
    <pre
      className="my-6 overflow-x-auto rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-white/90"
      {...props}
    />
  ),

  /* Tableaux GFM ---------------------------------------------------------- */
  // FIX RESPONSIVE 2026-05-02 #6 — `max-w-full` sur le wrapper le découple
  // d'un parent qui aurait été gonflé. `min-w-[480px]` rend le scroll
  // horizontal explicite (au lieu de squeezer des cellules à 60px qui
  // wraperaient en illisible) sur mobile <480px.
  table: (props: ComponentProps<"table">) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-border max-w-full">
      <table className="w-full min-w-[480px] border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props: ComponentProps<"thead">) => (
    <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-white/70" {...props} />
  ),
  tbody: (props: ComponentProps<"tbody">) => (
    <tbody className="divide-y divide-border" {...props} />
  ),
  tr: (props: ComponentProps<"tr">) => (
    <tr className="hover:bg-elevated/40" {...props} />
  ),
  th: (props: ComponentProps<"th">) => (
    <th className="border-b border-border px-4 py-2.5 font-semibold" {...props} />
  ),
  td: (props: ComponentProps<"td">) => (
    <td className="px-4 py-2.5 align-top text-white/85" {...props} />
  ),

  img: (props: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img className="my-6 rounded-xl border border-border" loading="lazy" {...props} />
  ),
};

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                        */
/* -------------------------------------------------------------------------- */

interface MdxContentProps {
  source: string;
  /** Composants supplémentaires injectés ponctuellement par la page. */
  components?: Record<string, (props: any) => ReactNode>;
}

export default function MdxContent({ source, components }: MdxContentProps) {
  return (
    <div
      className={[
        // FIX RESPONSIVE 2026-05-02 #6 — `min-w-0 w-full break-words` :
        // ceinture+bretelles si le parent grid perd `min-w-0`. Évite que
        // les URLs nues longues (0xABC..., bc1q..., transaction hashes)
        // ou les mots techniques non-cassables fassent déborder l'article.
        "prose prose-invert max-w-none min-w-0 w-full break-words",
        "prose-headings:font-display prose-headings:tracking-tight",
        "prose-a:text-primary-glow prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-white",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-surface prose-pre:border prose-pre:border-border",
        "prose-blockquote:border-primary prose-blockquote:text-white/90",
        "prose-li:marker:text-primary/70",
      ].join(" ")}
    >
      <MDXRemote
        source={source}
        components={{ ...mdxComponents, ...(components ?? {}) }}
        options={{
          // ⚠ next-mdx-remote v6 (sécurité) : `blockJS` est `true` par défaut,
          // ce qui supprime toutes les expressions JS dans le MDX (`rows={[...]}`,
          // `items={[...]}`, etc.) et casse nos composants (props deviennent
          // undefined). Notre contenu MDX vient EXCLUSIVEMENT de `content/articles/`
          // (auteurs internes, contenu de confiance, pas user-generated) — on peut
          // donc autoriser les expressions JS sans risque d'XSS.
          // `blockDangerousJS: true` (default) reste actif : eval/Function/process
          // restent bloqués, par défense en profondeur.
          blockJS: false,
          mdxOptions: {
            // ⚠ MDX 3 parse `{...}` au niveau document AVANT les plugins remark.
            // Donc la syntaxe `## Titre {#anchor-id}` est interdite (acorn crash).
            // → Utiliser uniquement `## Titre` ; rehype-slug génère l'id depuis le texte.
            remarkPlugins: [
              remarkGfm,
              // Auto-linking entity-driven (cryptos, platforms, tools, glossary).
              // Plafond 12 liens auto par article ; 1 lien max par entité.
              // Skip code/pre/headings/links existants — cf. lib/remark-auto-link-entities.ts.
              [remarkAutoLinkEntities, { maxLinks: 12 }],
            ],
            rehypePlugins: [rehypeSlug],
          },
          parseFrontmatter: false, // déjà parsé par lib/mdx.ts
        }}
      />
    </div>
  );
}

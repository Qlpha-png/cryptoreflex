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
import KeyTakeaways from "@/components/mdx/KeyTakeaways";
import LessonTool from "@/components/academy/LessonTool";
import FAQ from "@/components/mdx/FAQ";
import HowToSchema from "@/components/mdx/HowToSchema";
import MdxLink from "@/components/mdx/MdxLink";
import WaltioFranchise from "@/components/fiscal-tools/WaltioFranchise";
import ScrollableTable from "@/components/ui/ScrollableTable";

/* -------------------------------------------------------------------------- */
/*  Components mappés → markdown HTML                                         */
/*  (le rendu des liens `a`, mention « Publicité » comprise, est dans         */
/*  components/mdx/MdxLink.tsx — 06/10/2026)                                  */
/* -------------------------------------------------------------------------- */

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
  KeyTakeaways,
  LessonTool,
  FAQ,
  HowToSchema,
  // 07/10/2026 : encart « Bon à savoir » sur la fuite de données Waltio de janvier 2026, à placer avant toute
  // recommandation de Waltio avec un lien rémunéré (test : tests/lib/waltio-franchise.test.ts).
  WaltioFranchise: (props: ComponentProps<typeof WaltioFranchise>) => (
    <div className="not-prose my-6">
      <WaltioFranchise {...props} />
    </div>
  ),

  /* Overrides Markdown standard ------------------------------------------ */
  a: MdxLink,

  // AUDIT SEO 2026-10-02 — un « # Titre » markdown dans le MDX est rendu en
  // <h2> : chaque page qui affiche du MDX (blog, académie, actualités, analyses)
  // rend déjà son propre <h1>. Avant : 2 H1 sur 16 pages (8 articles × blog +
  // académie). Rendu visuel identique à un H2 de section. Sans `id` : ce titre
  // répète le H1 de la page, il ne doit pas entrer dans le sommaire
  // (ArticleToc liste les `h2[id]`).
  h1: ({ id: _slugId, ...props }: ComponentProps<"h1">) => (
    <h2
      className="mt-12 scroll-mt-24 border-l-4 border-primary pl-3 text-2xl font-bold tracking-tight text-fg-max sm:text-3xl"
      {...props}
    />
  ),
  h2: (props: ComponentProps<"h2">) => (
    <h2
      className="mt-12 scroll-mt-24 border-l-4 border-primary pl-3 text-2xl font-bold tracking-tight text-fg-max sm:text-3xl"
      {...props}
    />
  ),
  h3: (props: ComponentProps<"h3">) => (
    <h3
      className="mt-8 scroll-mt-24 text-xl font-semibold text-fg-max sm:text-2xl"
      {...props}
    />
  ),
  h4: (props: ComponentProps<"h4">) => (
    <h4
      className="mt-6 scroll-mt-24 text-lg font-semibold text-fg-max"
      {...props}
    />
  ),

  p: (props: ComponentProps<"p">) => (
    <p className="leading-relaxed text-fg-max/80" {...props} />
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
    <li className="text-fg-max/80" {...props} />
  ),

  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      className="my-6 rounded-r-lg border-l-4 border-primary bg-primary/5 px-5 py-3 italic text-fg-max/90"
      {...props}
    />
  ),

  hr: () => <hr className="my-10 border-border" />,

  strong: (props: ComponentProps<"strong">) => (
    <strong className="font-semibold text-fg-max" {...props} />
  ),

  em: (props: ComponentProps<"em">) => (
    <em className="italic text-fg-max/90" {...props} />
  ),

  code: (props: ComponentProps<"code">) => (
    <code
      className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[0.85em] text-primary-glow before:content-none after:content-none"
      {...props}
    />
  ),

  pre: (props: ComponentProps<"pre">) => (
    <pre
      className="my-6 overflow-x-auto rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-fg-max/90"
      {...props}
    />
  ),

  /* Tableaux GFM ---------------------------------------------------------- */
  // FIX RESPONSIVE 2026-05-02 #6 — `max-w-full` sur le wrapper le découple
  // d'un parent qui aurait été gonflé. `min-w-[480px]` rend le scroll
  // horizontal explicite (au lieu de squeezer des cellules à 60px qui
  // wraperaient en illisible) sur mobile <480px.
  // Design lot 0 (06/10/2026) — défilement signalé (dégradé de bord +
  // rond chevron cliquable) via ScrollableTable ; `break-normal` annule le
  // `overflow-wrap: anywhere` hérité du body qui coupait les mots en plein
  // milieu dans les cellules ; `my-0` supprime les marges prose (2 × 28 px)
  // qui laissaient une bande vide en haut et en bas, dans le cadre.
  table: (props: ComponentProps<"table">) => (
    <ScrollableTable
      className="my-6 max-w-full rounded-xl border border-border bg-surface"
      fadeFrom="from-surface"
      label="Tableau de l'article, défilant horizontalement"
    >
      <table className="my-0 w-full min-w-[480px] border-collapse text-sm break-normal" {...props} />
    </ScrollableTable>
  ),
  thead: (props: ComponentProps<"thead">) => (
    <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-fg-max/70" {...props} />
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
    <td className="px-4 py-2.5 align-top text-fg-max/85" {...props} />
  ),

  img: (props: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="my-6 rounded-xl border border-border"
      loading="lazy"
      {...props}
      alt={props.alt ?? ""}
    />
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
        "prose-strong:text-fg-max",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-surface prose-pre:border prose-pre:border-border",
        "prose-blockquote:border-primary prose-blockquote:text-fg-max/90",
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
              // Plafond 18 liens auto par article ; 1 lien max par entité.
              // 18 (vs 12) : nos leçons académie font 2 000-3 000 mots, soit
              // ~1 lien interne / 150 mots — densité naturelle, sous le seuil
              // de sur-optimisation. Skip code/pre/headings/links existants.
              [remarkAutoLinkEntities, { maxLinks: 18 }],
            ],
            rehypePlugins: [rehypeSlug],
          },
          parseFrontmatter: false, // déjà parsé par lib/mdx.ts
        }}
      />
    </div>
  );
}

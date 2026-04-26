"use client";

import Link from "next/link";
import { Newspaper } from "lucide-react";
import type { ArticleSummary } from "@/lib/mdx";

interface Props {
  /** 5 derniers articles fournis par le wrapper Server. */
  articles: ArticleSummary[];
}

/**
 * News ticker — bandeau défilant des 5 derniers articles publiés.
 *
 * Comportement :
 * - Animation CSS pure (`@keyframes news-scroll`, ~60 s par cycle).
 * - Pause au hover ET au focus (a11y : un utilisateur clavier doit pouvoir
 *   lire les liens sans qu'ils défilent).
 * - Liste dupliquée (×2) pour un loop infini fluide (translateX -50%).
 * - `prefers-reduced-motion` : on bascule en grid statique (2 colonnes desktop,
 *   1 colonne mobile) — pas d'animation, pas de duplication.
 *
 * a11y :
 * - `aria-live="off"` sur le rail défilant (sinon spam des SR à chaque tick).
 * - `role="region"` + `aria-label` pour annoncer le bloc dans la rotor SR.
 * - Focus-visible géré par les `<Link>` (Tailwind ring-primary natif sur le site).
 *
 * Perf :
 * - Server fetch côté wrapper, pas d'appel client.
 * - Animation transform-only (compositor-driven, 0 reflow).
 */
export default function NewsTicker({ articles }: Props) {
  if (!articles || articles.length === 0) return null;

  // Loop ×2 pour un défilement infini sans saut (translateX 0 → -50%).
  const loop = [...articles, ...articles];

  return (
    <section
      role="region"
      aria-label="Derniers articles publiés"
      className="relative overflow-hidden border-b border-border/60 bg-elevated/60 backdrop-blur-sm"
    >
      {/* Variante reduced-motion — visible uniquement quand l'OS le demande */}
      <div className="news-ticker-static hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 py-2">
          {articles.slice(0, 4).map((a) => (
            <NewsItem key={`static-${a.slug}`} article={a} />
          ))}
        </div>
      </div>

      {/* Variante par défaut : défilement */}
      <div
        className="news-ticker-scroll relative h-9 flex items-center"
        aria-live="off"
        aria-atomic="false"
      >
        <div className="news-ticker-track flex items-center whitespace-nowrap will-change-transform">
          {loop.map((a, idx) => (
            <NewsItem
              key={`${a.slug}-${idx}`}
              article={a}
              // Le second exemplaire de la liste reste accessible mais inaudible
              // (prévient les doublons quand la SR scrute le DOM).
              ariaHidden={idx >= articles.length}
            />
          ))}
        </div>

        {/* Edge fade gauche/droite — indique visuellement que le contenu défile */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-elevated to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-elevated to-transparent" />
      </div>

      <style>{`
        /* Bascule reduced-motion → static, hide scrolling */
        @media (prefers-reduced-motion: reduce) {
          .news-ticker-scroll { display: none !important; }
          .news-ticker-static { display: block !important; }
        }
      `}</style>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function NewsItem({
  article,
  ariaHidden = false,
}: {
  article: ArticleSummary;
  ariaHidden?: boolean;
}) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      aria-hidden={ariaHidden || undefined}
      tabIndex={ariaHidden ? -1 : 0}
      className="group inline-flex items-center gap-2 px-5 text-[13px] text-muted
                 hover:text-fg transition-colors duration-fast
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                 focus-visible:ring-offset-2 focus-visible:ring-offset-elevated rounded"
    >
      <Newspaper
        className="h-3.5 w-3.5 text-primary-soft shrink-0"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="text-[11px] uppercase tracking-wider text-muted/80 font-medium shrink-0 font-mono">
        {formatRelative(article.date)}
      </span>
      <span className="text-fg/85 group-hover:text-fg max-w-[34ch] truncate">
        {article.title}
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Formatte une date ISO en absolu compact ("12 mars", "26 avr.").
 *
 * Bug fix critique 26/04/2026 : avant on utilisait `Date.now()` au render,
 * ce qui creait un mismatch hydration SSR vs CSR (le serveur calculait
 * "il y a 2h", le client en hydratant calculait "il y a 4h" -> React bail
 * out -> TOUS les event handlers de la page detaches -> burger menu mobile
 * inerte, etc). Erreurs React #422 + #425 dans le console Lighthouse.
 *
 * Solution : on rend desormais un format absolu deterministe ("12 mars")
 * qui produit le meme output sur serveur et client. Pas de "il y a X h"
 * possible sans Date.now() dans le render.
 */
function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

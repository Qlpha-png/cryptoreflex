/**
 * components/RelatedPagesNav.tsx — Bloc "Pages liées" en bas de chaque page.
 *
 * Server Component qui consomme `lib/internal-link-graph.ts` pour afficher
 * 3-6 pages contextuellement pertinentes en bas de la page courante.
 *
 * Usage :
 *   <RelatedPagesNav currentPath="/outils/calculateur-fiscalite" />
 *
 * Bénéfices :
 *  - SEO : densifie le maillage interne (PageRank flow vers les long-tails).
 *  - UX : le user ne quitte pas le site après lecture (rétention, engagement).
 *  - Crawl : Googlebot trouve toutes les pages d'un cluster en 1-2 clics.
 *
 * Pas de tracking ni de Plausible ici — c'est un Server Component pur, le
 * tracking se fait au niveau du <Link> via le router.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRelatedPages, getClusterFor } from "@/lib/internal-link-graph";

export interface RelatedPagesNavProps {
  /** Path canonique de la page courante (ex: /outils/calculateur-fiscalite). */
  currentPath: string;
  /** Nombre max de related pages affichées (défaut 4). */
  limit?: number;
  /** Titre custom — défaut auto-généré depuis le cluster. */
  title?: string;
  /**
   * Variante visuelle :
   *  - "default" : grille 2x2 / 3 colonnes
   *  - "compact" : liste horizontale en chips
   *  - "sidebar" : liste verticale, cards fines
   */
  variant?: "default" | "compact" | "sidebar";
  /** Classes additionnelles (Tailwind). */
  className?: string;
}

export default function RelatedPagesNav({
  currentPath,
  limit = 4,
  title,
  variant = "default",
  className = "",
}: RelatedPagesNavProps) {
  const related = getRelatedPages({ currentPath, limit, includeCrossLinks: true });

  if (related.length === 0) return null;

  const cluster = getClusterFor(currentPath);
  const sectionTitle =
    title ??
    (cluster
      ? `Pour aller plus loin sur "${cluster.name}"`
      : "Continuer ta lecture sur Cryptoreflex");

  if (variant === "compact") {
    return (
      <nav
        aria-label="Pages liées"
        className={`mt-10 ${className}`}
      >
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          {sectionTitle}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {related.map((node) => (
            <li key={node.path}>
              <Link
                href={node.path}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                           border border-border/60 bg-elevated/40 text-sm text-fg/85
                           hover:border-primary/50 hover:text-fg hover:bg-elevated
                           transition-colors
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                           focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {node.label}
                <ArrowRight className="h-3 w-3 opacity-60" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  if (variant === "sidebar") {
    return (
      <aside
        aria-label="Pages liées"
        className={`mt-8 ${className}`}
      >
        <h2 className="text-sm font-semibold text-fg mb-3">{sectionTitle}</h2>
        <ul className="space-y-2">
          {related.map((node) => (
            <li key={node.path}>
              <Link
                href={node.path}
                className="flex items-start gap-2 p-3 rounded-lg
                           border border-border/40 bg-elevated/30 text-sm text-fg/85
                           hover:border-primary/50 hover:bg-elevated transition-colors
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                           focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary-soft shrink-0" aria-hidden="true" />
                <span>{node.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  // Variante "default" : grille 2 colonnes (mobile) / 4 colonnes (desktop).
  return (
    <nav
      aria-label="Pages liées"
      className={`mt-12 ${className}`}
    >
      <h2 className="text-xl sm:text-2xl font-bold text-fg mb-4">
        {sectionTitle}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {related.map((node) => (
          <Link
            key={node.path}
            href={node.path}
            className="group flex flex-col h-full p-4 rounded-xl
                       border border-border/60 bg-elevated/40
                       hover:border-primary/60 hover:bg-elevated
                       transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="font-semibold text-fg text-sm mb-2">
              {node.label}
            </span>
            {node.description && (
              <span className="text-xs text-muted leading-relaxed mb-3 flex-1">
                {node.description}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-primary-soft group-hover:text-primary-glow font-semibold mt-auto">
              Découvrir
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

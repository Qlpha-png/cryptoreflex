/**
 * components/RelatedEntities.tsx — Bloc "Voir aussi" entity-driven.
 *
 * Server Component pur — lecture sync de l'EntityIndex (lib/internal-link-graph.ts).
 *
 * # Usage
 *
 * Côté article MDX :
 *   const article = await getArticleBySlug(slug);
 *   <RelatedEntities text={article.content} />
 *
 * Ou pré-calculé manuellement :
 *   <RelatedEntities entities={[entry1, entry2, ...]} />
 *
 * # Logique de sélection
 *
 * Si `text` est fourni : on scanne les entités mentionnées via
 * `findEntitiesInText` puis on prend `pickRelatedEntities` (top 3 cryptos +
 * 1 platform + 1 tool + 1 comparatif + termes, capped à `limit`).
 *
 * Si aucune entité n'est trouvée (article off-topic, page neuve), on n'affiche
 * RIEN — préférable à un bloc générique "Bitcoin / Ethereum / Solana" qui
 * casse la pertinence sémantique pour Google.
 */

import Link from "next/link";
import { ArrowUpRight, Coins, Building2, Wrench, GitCompare, BookOpen } from "lucide-react";

import {
  pickRelatedEntities,
  type EntityIndexEntry,
} from "@/lib/internal-link-graph";

export interface RelatedEntitiesProps {
  /**
   * Texte de l'article (MDX brut). Le composant en extrait les entités
   * mentionnées pour proposer des liens contextuels.
   */
  text?: string;
  /**
   * Override : entités déjà sélectionnées (court-circuit le scan automatique).
   * Utile si le caller a déjà calculé la sélection.
   */
  entities?: EntityIndexEntry[];
  /** Nombre max de cards affichées. Défaut 6. */
  limit?: number;
  /** Titre du bloc. Défaut "Voir aussi". */
  title?: string;
  /** Classes additionnelles (Tailwind). */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers UI                                                                 */
/* -------------------------------------------------------------------------- */

function entityIcon(type: EntityIndexEntry["type"]) {
  switch (type) {
    case "crypto":
      return Coins;
    case "platform":
      return Building2;
    case "tool":
      return Wrench;
    case "comparison":
      return GitCompare;
    case "term":
      return BookOpen;
  }
}

function entityKindLabel(type: EntityIndexEntry["type"]): string {
  switch (type) {
    case "crypto":
      return "Crypto";
    case "platform":
      return "Plateforme";
    case "tool":
      return "Outil";
    case "comparison":
      return "Comparatif";
    case "term":
      return "Glossaire";
  }
}

/* -------------------------------------------------------------------------- */
/*  Composant                                                                  */
/* -------------------------------------------------------------------------- */

export default function RelatedEntities({
  text,
  entities,
  limit = 6,
  title = "Voir aussi",
  className = "",
}: RelatedEntitiesProps) {
  const picked: EntityIndexEntry[] = entities
    ? entities.slice(0, limit)
    : text
      ? pickRelatedEntities(text, limit)
      : [];

  if (picked.length === 0) return null;

  return (
    <section
      className={[
        "mt-16 rounded-2xl border border-border bg-elevated/30 p-6 sm:p-8",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="related-entities-heading"
    >
      <h2
        id="related-entities-heading"
        className="text-xl font-bold tracking-tight text-fg sm:text-2xl"
      >
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Pages connexes mentionnées dans cet article.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {picked.map((e) => {
          const Icon = entityIcon(e.type);
          return (
            <li key={e.url}>
              <Link
                href={e.url}
                className="group flex h-full items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3
                           transition-colors hover:border-primary/40 hover:bg-elevated
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                             bg-primary/10 text-primary-glow"
                  aria-hidden
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {entityKindLabel(e.type)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-semibold text-fg group-hover:text-primary-glow">
                    {e.label}
                  </span>
                  {e.description && (
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted">
                      {e.description}
                    </span>
                  )}
                </span>
                <ArrowUpRight
                  className="mt-1 h-4 w-4 shrink-0 text-muted transition-transform
                             group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-glow"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

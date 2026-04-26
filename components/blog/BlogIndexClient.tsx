"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ArticleSummary } from "@/lib/mdx";
import ArticleHero from "@/components/ui/ArticleHero";

/**
 * BlogIndexClient — filtre catégorie + recherche client-side + pagination.
 *
 * Architecture (P1-8 audit-front-2026) :
 *  - Reçoit `articles` + `categories` pré-fetchés côté Server (cache 1h via
 *    unstable_cache dans `lib/mdx.ts`) → aucun fetch Client, hydration-safe.
 *  - SSR par défaut : pas de filtre, page 1, query vide → output Client initial
 *    matche pixel-pour-pixel l'output Server. Pas de flash après hydration.
 *  - Recherche : titre + description, accent-insensitive via `normalize("NFD")`.
 *    Debounced 250ms (setTimeout simple, pas de hook ni lib externe).
 *  - Pagination recalculée sur la liste filtrée — change de page reset au
 *    minimum si la nouvelle liste est plus courte que la page courante.
 *  - A11y : input `aria-label`, count `aria-live="polite"`, empty state avec
 *    bouton "Réinitialiser la recherche".
 */

const PAGE_SIZE = 12;

interface Props {
  articles: ArticleSummary[];
  categories: string[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Strip diacritics + lowercase pour matching tolérant accents/casse.
 *  La regex ̀-ͯ cible le bloc Unicode "Combining Diacritical Marks"
 *  (gardé en code unit pour compat large, plutôt qu'`/\p{M}/u` qui requiert
 *  Node 12+ et est plus restrictif sur certaines compositions). */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function BlogIndexClient({ articles, categories }: Props) {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState(""); // debounced
  const [page, setPage] = useState(1);

  /* -------- Debounce 250ms ---------------------------------------------- */
  useEffect(() => {
    const id = setTimeout(() => setQuery(rawQuery), 250);
    return () => clearTimeout(id);
  }, [rawQuery]);

  /* -------- Reset page quand filtre / query changent -------------------- */
  useEffect(() => {
    setPage(1);
  }, [activeCat, query]);

  /* -------- Index normalisé (mémo) -------------------------------------- */
  const indexed = useMemo(
    () =>
      articles.map((a) => ({
        a,
        haystack: `${normalize(a.title)} ${normalize(a.description)}`,
      })),
    [articles]
  );

  /* -------- Filtrage : catégorie + recherche --------------------------- */
  const filtered = useMemo(() => {
    let list = indexed;
    if (activeCat) list = list.filter((it) => it.a.category === activeCat);
    const q = normalize(query.trim());
    if (q) {
      // multi-mots : tous les tokens doivent matcher au moins une fois
      const tokens = q.split(/\s+/).filter(Boolean);
      list = list.filter((it) => tokens.every((t) => it.haystack.includes(t)));
    }
    return list.map((it) => it.a);
  }, [indexed, activeCat, query]);

  /* -------- Pagination ------------------------------------------------- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function resetSearch() {
    setRawQuery("");
    setQuery("");
  }

  return (
    <>
      {/* Search input */}
      <div className="mt-8">
        <label htmlFor="blog-search" className="sr-only">
          Rechercher un article
        </label>
        <div className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <input
            id="blog-search"
            type="search"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Rechercher un article (titre, description)…"
            aria-label="Rechercher un article"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-surface pl-10 pr-10 py-2.5 text-sm text-fg
                       placeholder:text-muted focus:outline-none focus:border-primary/60
                       focus:ring-2 focus:ring-primary/30"
          />
          {rawQuery && (
            <button
              type="button"
              onClick={resetSearch}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {filtered.length} article{filtered.length > 1 ? "s" : ""} trouvé
          {filtered.length > 1 ? "s" : ""}
          {query.trim() ? ` pour "${query.trim()}"` : ""}.
        </p>
      </div>

      {/* Filtres catégorie */}
      {categories.length > 1 && (
        <nav
          aria-label="Filtrer par catégorie"
          className="mt-6 flex flex-wrap gap-2"
          role="radiogroup"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!activeCat}
            aria-pressed={!activeCat}
            onClick={() => setActiveCat(null)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                         !activeCat
                           ? "border-primary bg-primary/15 text-primary-glow"
                           : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg"
                       }`}
          >
            Tout
            <span className="ml-1.5 text-xs text-muted">({articles.length})</span>
          </button>
          {categories.map((cat) => {
            const count = articles.filter((a) => a.category === cat).length;
            const isActive = activeCat === cat;
            return (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-pressed={isActive}
                onClick={() => setActiveCat(cat)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                             isActive
                               ? "border-primary bg-primary/15 text-primary-glow"
                               : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg"
                           }`}
              >
                {cat}
                <span className="ml-1.5 text-xs text-muted">({count})</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Grid + empty state */}
      {visible.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-border bg-surface p-10 text-center">
          {query.trim() ? (
            <>
              <p className="text-fg/70">
                Aucun article trouvé pour{" "}
                <span className="text-fg font-semibold">
                  « {query.trim()} »
                </span>
                {activeCat && <> dans la catégorie « {activeCat} »</>}.
              </p>
              <button
                type="button"
                onClick={resetSearch}
                className="mt-4 inline-block text-sm font-semibold text-primary-glow hover:underline"
              >
                Réinitialiser la recherche
              </button>
            </>
          ) : (
            <>
              <p className="text-fg/70">
                Aucun article{activeCat && (
                  <>
                    {" "}dans la catégorie « <strong>{activeCat}</strong> »
                  </>
                )}
                {" "}pour l'instant.
              </p>
              {activeCat && (
                <button
                  type="button"
                  onClick={() => setActiveCat(null)}
                  className="mt-4 inline-block text-sm font-semibold text-primary-glow hover:underline"
                >
                  Voir tous les articles
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="group glass overflow-hidden rounded-2xl transition-transform hover:translate-y-[-2px]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* Hero : OG image dynamique (200 OK confirme prod 26/04).
                  PNG 1200x630 avec titre + categorie + auteur baked. ArticleHero
                  CSS reste fallback via onError pour les rares failures. */}
              <div className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${a.gradient}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/blog/${a.slug}/opengraph-image`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-5">
                <h2 className="text-lg font-semibold text-fg group-hover:text-primary-glow">
                  {a.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-fg/70">
                  {a.description}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {a.readTime}
                  </span>
                  <span>·</span>
                  <span>{formatDate(a.date)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination — boutons (et non Link) car l'état est purement client */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination des articles"
          className="mt-12 flex items-center justify-center gap-2"
        >
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm
                       hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </button>

          <span className="px-3 text-sm text-muted">
            Page <strong className="text-fg">{safePage}</strong> sur {totalPages}
          </span>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm
                       hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Page suivante"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </>
  );
}

"use client";

/**
 * <Glossary /> — Recherche et filtrage live du glossaire crypto français.
 *
 * Pilier 5. Page : /outils/glossaire-crypto.
 *
 * UX :
 *  - Search input avec debounce 200 ms (évite re-renders à chaque touche).
 *  - Chips catégorie cliquables pour filtrer (multi-select OFF — toggle simple).
 *  - Liste verticale avec terme en gras + chip catégorie + définition + lien interne.
 *  - Highlight des matches (terme et définition).
 *  - Empty state si aucun résultat.
 *  - Compteur résultats persistant.
 *  - Si recherche vide ET pas de catégorie sélectionnée : affiche tous les termes
 *    par catégorie avec sections collapsibles (par défaut ouvertes).
 */

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, ArrowRight, ChevronDown } from "lucide-react";
import {
  GLOSSARY,
  GLOSSARY_FLAT_CATEGORIES,
  type GlossaryFlatCategory,
  type GlossaryTermFlat,
} from "@/lib/glossary";

interface GlossaryProps {
  /** Slug à pré-sélectionner (ex: ?term=bitcoin → scrollIntoView). */
  initialSlug?: string;
}

/** Strip accents pour matching insensible aux accents. */
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Compte le nombre de termes par catégorie pour les chips. */
function buildCategoryCounts(terms: GlossaryTermFlat[]) {
  const map = new Map<GlossaryFlatCategory, number>();
  for (const c of GLOSSARY_FLAT_CATEGORIES) map.set(c, 0);
  for (const t of terms) map.set(t.category, (map.get(t.category) ?? 0) + 1);
  return map;
}

/** Surligne dans `text` les fragments qui matchent `query` (insensible accents). */
function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query.trim());
  const idx = normalizedText.indexOf(normalizedQuery);
  if (idx === -1) return text;
  const end = idx + normalizedQuery.length;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/30 text-primary-soft rounded-sm px-0.5">
        {text.slice(idx, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

export default function Glossary({ initialSlug }: GlossaryProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<GlossaryFlatCategory | null>(null);

  // useDeferredValue : recherche 200 ms-like sans setTimeout manuel — React
  // déprioritise le re-render sous charge (better INP qu'un debounce naïf).
  const query = useDeferredValue(rawQuery);

  // Filtrage mémoisé sur query + catégorie.
  const filtered = useMemo(() => {
    let list: GlossaryTermFlat[] = GLOSSARY;
    if (activeCategory) {
      list = list.filter((t) => t.category === activeCategory);
    }
    const q = query.trim();
    if (q) {
      const nq = normalize(q);
      list = list.filter(
        (t) =>
          normalize(t.term).includes(nq) ||
          normalize(t.definition).includes(nq) ||
          t.slug.includes(nq.replace(/\s+/g, "-"))
      );
    }
    return list;
  }, [query, activeCategory]);

  const counts = useMemo(() => buildCategoryCounts(GLOSSARY), []);

  // Scroll vers l'ancre demandée (initialSlug ou hash) au mount.
  useEffect(() => {
    const slug =
      initialSlug ??
      (typeof window !== "undefined"
        ? window.location.hash.replace(/^#/, "")
        : "");
    if (!slug) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`term-${slug}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [initialSlug]);

  const isFilterActive = Boolean(rawQuery.trim() || activeCategory);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder="Rechercher un terme : Bitcoin, DeFi, MiCA..."
          className="w-full pl-11 pr-11 py-3 bg-elevated border border-border rounded-xl text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition"
          aria-label="Rechercher un terme dans le glossaire"
        />
        {rawQuery && (
          <button
            type="button"
            onClick={() => setRawQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted hover:bg-surface hover:text-fg transition"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Catégorie chips */}
      <div className="flex flex-wrap gap-2">
        <CategoryChip
          label="Toutes"
          count={GLOSSARY.length}
          active={activeCategory === null}
          onClick={() => setActiveCategory(null)}
        />
        {GLOSSARY_FLAT_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            label={cat}
            count={counts.get(cat) ?? 0}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          />
        ))}
      </div>

      {/* Compteur + reset */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span aria-live="polite">
          <strong className="text-fg">{filtered.length}</strong>{" "}
          terme{filtered.length > 1 ? "s" : ""}
          {isFilterActive ? " trouvés" : ""}
        </span>
        {isFilterActive && (
          <button
            type="button"
            onClick={() => {
              setRawQuery("");
              setActiveCategory(null);
            }}
            className="text-primary-soft hover:text-primary-glow underline-offset-2 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <EmptyResults onReset={() => setRawQuery("")} />
      ) : isFilterActive ? (
        // Vue plate (filtres actifs) : juste la liste linéaire.
        <ul className="space-y-3">
          {filtered.map((t) => (
            <TermItem key={t.slug} term={t} query={rawQuery} />
          ))}
        </ul>
      ) : (
        // Vue par catégorie (aucun filtre actif) : sections collapsibles.
        <div className="space-y-6">
          {GLOSSARY_FLAT_CATEGORIES.map((cat) => {
            const inCat = filtered.filter((t) => t.category === cat);
            if (inCat.length === 0) return null;
            return (
              <CategorySection key={cat} category={cat} terms={inCat} />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Sub-components ---------------------------- */

interface CategoryChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}
const CategoryChip = memo(function CategoryChip({
  label,
  count,
  active,
  onClick,
}: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
        active
          ? "bg-primary/20 text-primary-soft border-primary/60 shadow-glow-gold"
          : "bg-elevated text-muted border-border hover:text-fg hover:border-primary/40"
      }`}
    >
      <span>{label}</span>
      <span
        className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? "bg-primary/30 text-primary-soft" : "bg-background/60 text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
});

interface CategorySectionProps {
  category: GlossaryFlatCategory;
  terms: GlossaryTermFlat[];
}
function CategorySection({ category, terms }: CategorySectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <section
      aria-label={`Catégorie ${category}`}
      className="rounded-2xl border border-border overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-4 bg-elevated hover:bg-elevated/70 transition"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-fg">{category}</span>
          <span className="text-xs text-muted tabular-nums">
            {terms.length} terme{terms.length > 1 ? "s" : ""}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <ul className="divide-y divide-border bg-surface/40">
          {terms.map((t) => (
            <TermItem key={t.slug} term={t} query="" inSection />
          ))}
        </ul>
      )}
    </section>
  );
}

interface TermItemProps {
  term: GlossaryTermFlat;
  query: string;
  inSection?: boolean;
}
function TermItem({ term, query, inSection = false }: TermItemProps) {
  const wrapperClass = inSection
    ? "px-5 py-4 hover:bg-background/40 transition"
    : "glass rounded-2xl p-5";

  return (
    <li id={`term-${term.slug}`} className={wrapperClass}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-fg text-lg">
          {highlight(term.term, query)}
        </h3>
        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide rounded-full bg-primary/15 text-primary-soft border border-primary/30 px-2 py-1">
          {term.category}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted leading-relaxed">
        {highlight(term.definition, query)}
      </p>

      {(term.relatedTerms?.length || term.internalLink) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {term.internalLink && (
            <Link
              href={term.internalLink}
              className="inline-flex items-center gap-1 font-semibold text-primary-soft hover:text-primary-glow"
            >
              Outil associé
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <span className="text-muted">
              Voir aussi :{" "}
              {term.relatedTerms.map((slug, i) => (
                <span key={slug}>
                  <a
                    href={`#term-${slug}`}
                    className="text-fg underline-offset-2 hover:text-primary-soft hover:underline"
                  >
                    {slug.replace(/-/g, " ")}
                  </a>
                  {i < (term.relatedTerms?.length ?? 0) - 1 ? ", " : ""}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyResults({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="glass rounded-2xl py-12 px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-soft border border-primary/20">
        <Search className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-fg">Aucun terme trouvé</h3>
      <p className="mt-2 max-w-md mx-auto text-sm text-muted">
        Essayez un autre mot-clé ou réinitialisez les filtres pour parcourir
        l'ensemble du glossaire.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary-soft border border-primary/40 px-4 py-2 text-sm font-semibold transition"
      >
        Réinitialiser
      </button>
    </div>
  );
}

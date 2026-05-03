"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * OutilsSearchFilter — BATCH 45c (2026-05-03).
 *
 * Filtre interactif minimal pour le hub /outils (28 outils).
 *
 * Strategie pragmatique : 0 refactor du hub server component. Le
 * composant agit sur le DOM apres render via attributs data-* poses
 * par le hub server. C'est un client component "leaf" qui :
 *
 *  1. Rend une barre de recherche + tabs Tous/Gratuit/Soutien.
 *  2. Au changement, parcourt tous les `[data-tool-card]` du document
 *     et toggle `display:none` sur leur parent <li> (Tilt3D wrapper)
 *     selon match texte + match tier.
 *  3. Les sections vides (toutes leurs cards filtrees) recoivent
 *     aussi display:none.
 *  4. Annonce le count "X outils affiches" via aria-live polite.
 *
 * Pourquoi pas un Context React ou un store : 28 cards = perf negligeable
 * en pure DOM. 0 hydration overhead supplementaire pour les server
 * components. Pattern progressive enhancement clean.
 *
 * A11y :
 *  - role="search" sur le wrapper
 *  - aria-label sur input
 *  - aria-pressed sur les tabs
 *  - aria-live sur le compteur
 *  - Esc dans l'input clear la query
 */

type Tier = "all" | "free" | "pro";

const TIER_LABELS: Record<Tier, string> = {
  all: "Tous",
  free: "Gratuits",
  pro: "Soutien",
};

export default function OutilsSearchFilter() {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier>("all");
  const [count, setCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Applique le filtre au DOM apres chaque change.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const cards = document.querySelectorAll<HTMLElement>("[data-tool-card]");
    if (cards.length === 0) {
      // Hub pas encore monte ou pas sur la bonne page.
      setCount(null);
      return;
    }

    const q = query.trim().toLowerCase();
    let visible = 0;

    // 1. Filtre les cards individuellement.
    cards.forEach((card) => {
      const cardTier = (card.dataset.tier ?? "free") as "free" | "pro";
      const text = (card.dataset.searchText ?? "").toLowerCase();

      const matchTier = tier === "all" || tier === cardTier;
      const matchQuery = !q || text.includes(q);
      const show = matchTier && matchQuery;

      // Le wrapper visible est le parent le plus proche qui est un grid
      // direct child. Pour notre layout (Tilt3D > .spotlight-card link),
      // le wrapper Tilt3D est le parent direct dans la grille.
      const wrapper = (card.closest("[data-tool-wrapper]") ??
        card.parentElement) as HTMLElement | null;
      if (wrapper) {
        wrapper.style.display = show ? "" : "none";
      }
      if (show) visible++;
    });

    // 2. Cache les sections (CategorySection) qui n'ont plus aucune card visible.
    const sections = document.querySelectorAll<HTMLElement>("[data-category-section]");
    sections.forEach((section) => {
      const visibleInSection = section.querySelectorAll<HTMLElement>(
        "[data-tool-card]",
      );
      const anyVisible = Array.from(visibleInSection).some((c) => {
        const w = (c.closest("[data-tool-wrapper]") ?? c.parentElement) as HTMLElement | null;
        return w ? w.style.display !== "none" : true;
      });
      section.style.display = anyVisible ? "" : "none";
    });

    setCount(visible);
  }, [query, tier]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      inputRef.current?.blur();
    }
  };

  return (
    <div role="search" aria-label="Filtrer les outils" className="mt-8 space-y-3">
      {/* Barre de recherche */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Rechercher un outil par nom, description ou catégorie"
          placeholder="Rechercher un outil (ex: fiscalité, DCA, MiCA, glossaire…)"
          // text-base sur mobile pour eviter le zoom auto iOS Safari (focus
          // sur input <16px = zoom force, casse le scroll). Desktop sm:text-sm.
          className="w-full rounded-xl border border-border bg-surface pl-10 pr-10 py-3 text-base sm:text-sm text-fg placeholder:text-muted/80 focus:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted hover:text-fg hover:bg-elevated transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Tabs tier */}
      <div
        role="tablist"
        aria-label="Filtrer par type d'accès"
        className="inline-flex gap-1 rounded-lg border border-border bg-surface p-1"
      >
        {(Object.keys(TIER_LABELS) as Tier[]).map((t) => {
          const active = tier === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              aria-pressed={active}
              onClick={() => setTier(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                active
                  ? "bg-primary/15 text-primary-glow"
                  : "text-fg/70 hover:text-fg hover:bg-elevated/50"
              }`}
            >
              {TIER_LABELS[t]}
            </button>
          );
        })}
      </div>

      {/* Compteur live region (annonce screen reader uniquement si interaction) */}
      <p className="sr-only" aria-live="polite" aria-atomic="true" role="status">
        {count !== null
          ? `${count} outil${count > 1 ? "s" : ""} affiché${count > 1 ? "s" : ""}.`
          : ""}
      </p>

      {/* Affichage visible du compteur si filtre actif */}
      {(query || tier !== "all") && count !== null && (
        <p className="text-xs text-muted">
          {count} outil{count > 1 ? "s" : ""} sur{" "}
          {document.querySelectorAll("[data-tool-card]").length} affiché
          {count > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
}

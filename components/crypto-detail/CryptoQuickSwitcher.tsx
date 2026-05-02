"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Gem, Trophy, ArrowRight } from "lucide-react";
import { getAllCryptos } from "@/lib/cryptos";

/**
 * CryptoQuickSwitcher — barre de recherche compacte intégrée en haut des
 * fiches `/cryptos/[slug]`, demandée par user (audit 2026-05-02).
 *
 * Pourquoi : la command palette globale ⌘K existe déjà mais reste cachée
 * derrière un raccourci clavier (et un bouton "Rechercher" peu visible dans
 * la navbar). L'utilisateur sur mobile/débutant ne pense pas à ⌘K. Sur la
 * fiche TRON il veut switcher vers Ethereum sans repasser par /cryptos.
 *
 * Stratégie UI :
 *  - Input visible en permanence (pas de modale), placé sous le breadcrumb
 *    et au-dessus du Hero pour rester accessible mais pas envahissant.
 *  - Dropdown s'affiche dès qu'il y a une query OU au focus.
 *  - 8 résultats max pour rester compact.
 *  - Match sur name/symbol/category (cohérent avec la recherche /cryptos).
 *  - Exclut la crypto courante du résultat (pas de "saut sur place").
 *  - Keyboard a11y : flèches ↑↓ pour navigate, Enter pour valider, Esc fermer.
 *  - Click outside ferme le dropdown.
 */

interface Props {
  currentSlug: string;
  /** Optionnel : pré-rempli "Voir une autre crypto" pour expliciter l'intent. */
  placeholder?: string;
}

export default function CryptoQuickSwitcher({
  currentSlug,
  placeholder = "Voir une autre crypto (ex: ethereum, ETH, layer 2)…",
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const allOthers = useMemo(
    () => getAllCryptos().filter((c) => c.id !== currentSlug),
    [currentSlug],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Pas de query : top 8 par "rank" (top10 d'abord, gems ensuite par leur ordre).
    if (!q) {
      return allOthers.slice(0, 8);
    }
    return allOthers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.tagline.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [allOthers, query]);

  // Reset highlight quand la liste change.
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered.length, query]);

  // Click outside → ferme.
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const target = filtered[highlightedIndex];
      if (target) {
        e.preventDefault();
        router.push(`/cryptos/${target.id}`);
        setIsOpen(false);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      role="search"
      aria-label="Naviguer vers une autre crypto"
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          aria-label="Rechercher une autre crypto"
          aria-autocomplete="list"
          aria-controls="crypto-quick-switcher-list"
          aria-expanded={isOpen}
          /* BATCH 38 — fix audit Mobile UX P0 : text-sm (14px) déclenchait
             le zoom auto iOS Safari au focus. Passé à text-base (16px) sur
             mobile (sm:text-sm sur desktop pour préserver le design). */
          className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2.5 text-base sm:text-sm text-fg placeholder:text-muted/80 focus:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors"
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <div
          id="crypto-quick-switcher-list"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
        >
          {!query.trim() && (
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted bg-surface/40 border-b border-border">
              Suggestions populaires
            </div>
          )}
          <ul className="max-h-[360px] overflow-y-auto">
            {filtered.map((c, idx) => {
              const isGem = c.kind === "hidden-gem";
              const isHi = idx === highlightedIndex;
              return (
                <li key={c.id} role="option" aria-selected={isHi}>
                  <Link
                    href={`/cryptos/${c.id}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm border-b border-border/40 last:border-b-0 transition-colors ${
                      isHi
                        ? "bg-primary/10 text-fg"
                        : "text-fg/90 hover:bg-surface/60"
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isGem
                          ? "bg-amber-400/15 text-amber-300"
                          : "bg-primary/15 text-primary-soft"
                      }`}
                      aria-hidden="true"
                    >
                      {isGem ? (
                        <Gem className="h-3.5 w-3.5" />
                      ) : (
                        <Trophy className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold truncate">
                        {c.name}{" "}
                        <span className="font-mono text-xs text-muted">
                          {c.symbol}
                        </span>
                      </span>
                      <span className="block text-[11px] text-muted truncate">
                        {c.category} · {c.tagline}
                      </span>
                    </span>
                    <ArrowRight
                      className={`h-3.5 w-3.5 shrink-0 transition-opacity ${
                        isHi ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="px-3 py-2 text-[10px] text-muted/80 bg-surface/40 border-t border-border flex items-center justify-between">
            <span>↑↓ naviguer · Enter ouvrir · Esc fermer</span>
            <Link
              href="/cryptos"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-primary-soft hover:text-primary"
            >
              Voir les 100 fiches →
            </Link>
          </div>
        </div>
      )}

      {isOpen && query.trim() && filtered.length === 0 && (
        <div
          role="status"
          className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-border bg-background p-4 text-sm text-muted shadow-2xl"
        >
          Aucune crypto ne correspond à «&nbsp;
          <span className="font-semibold text-fg">{query}</span>&nbsp;».{" "}
          <Link
            href="/cryptos"
            onClick={() => setIsOpen(false)}
            className="font-semibold text-primary-soft hover:text-primary"
          >
            Voir tout
          </Link>
        </div>
      )}
    </div>
  );
}

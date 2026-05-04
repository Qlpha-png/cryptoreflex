"use client";

/**
 * CompareSelector — combobox client pour ajouter/retirer des cryptos
 * directement depuis la page /cryptos/comparer.
 *
 * BATCH 61 (2026-05-04) — User feedback : le comparateur dynamique force
 * l'utilisateur a quitter la page pour ajouter/retirer des cryptos (aller
 * sur /cryptos -> cocher -> revenir). Friction max.
 *
 * Solution : combobox integre AU SEIN de la page comparateur :
 *  - Affiche les chips des cryptos selectionnees (avec X pour retirer)
 *  - Bouton "Ajouter une crypto" qui ouvre une dropdown avec recherche
 *    live sur les 100 cryptos (filtre name/symbol/id, accents-insensible)
 *  - Au clic sur un resultat : update URL via router.replace + sync
 *    localStorage via useCompareList -> tout reste synchro avec le drawer
 *  - Plafond MAX_COMPARE = 4 (au-dela tableau illisible)
 *
 * SSR-safe : ce composant est use client, mais la page parent passe les
 * cryptos initiales (selectionnees serveur depuis ?ids=) en props.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Plus, Search, X, Check } from "lucide-react";
import { MAX_COMPARE, useCompareList } from "@/lib/use-compare-list";

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  category: string;
  kind: "top10" | "hidden-gem";
  rank?: number;
  logo?: string | null;
}

interface Props {
  /** Cryptos actuellement selectionnees (ordre = ordre URL ?ids=). */
  selected: CryptoOption[];
  /** Catalogue complet des 100 cryptos disponibles (passe par la page serveur). */
  catalog: CryptoOption[];
}

/** Normalise pour matching insensible casse + accents. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function CompareSelector({ selected, catalog }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { add, remove, hydrated } = useCompareList();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(
    () => new Set(selected.map((c) => c.id)),
    [selected],
  );

  const isFull = selected.length >= MAX_COMPARE;

  // Filtre catalog : exclut deja selectionnees + match query.
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const available = catalog.filter((c) => !selectedIds.has(c.id));
    if (!q) return available.slice(0, 30); // top 30 sans recherche
    return available
      .filter((c) => {
        const haystack = normalize(`${c.name} ${c.symbol} ${c.id}`);
        return haystack.includes(q);
      })
      .slice(0, 30);
  }, [catalog, selectedIds, query]);

  // Update URL ?ids=... + sync localStorage.
  const updateIds = useCallback(
    (newIds: string[]): void => {
      const params = new URLSearchParams(searchParams.toString());
      if (newIds.length === 0) {
        params.delete("ids");
        router.replace(`/cryptos`);
      } else {
        params.set("ids", newIds.join(","));
        router.replace(`/cryptos/comparer?${params.toString()}`);
      }
    },
    [router, searchParams],
  );

  const handleAdd = useCallback(
    (id: string): void => {
      if (selectedIds.has(id)) return;
      if (selected.length >= MAX_COMPARE) return;
      const newIds = [...selected.map((c) => c.id), id];
      add(id);
      setQuery("");
      setOpen(false);
      updateIds(newIds);
    },
    [add, selected, selectedIds, updateIds],
  );

  const handleRemove = useCallback(
    (id: string): void => {
      const newIds = selected.filter((c) => c.id !== id).map((c) => c.id);
      remove(id);
      updateIds(newIds);
    },
    [remove, selected, updateIds],
  );

  // Click outside pour fermer le dropdown.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Auto-focus input quand on ouvre.
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // ESC pour fermer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Selection
          </span>
          <span className="rounded-full bg-elevated/60 px-2 py-0.5 text-[11px] font-mono font-bold text-fg/85">
            {selected.length}/{MAX_COMPARE}
          </span>
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => updateIds([])}
            className="text-[11px] text-muted hover:text-fg underline underline-offset-2"
          >
            Tout effacer
          </button>
        )}
      </div>

      {/* Chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {selected.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary-soft"
          >
            {c.logo ? (
              <Image
                src={c.logo}
                alt=""
                width={16}
                height={16}
                className="h-4 w-4 rounded-full"
                unoptimized
              />
            ) : (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold">
                {c.symbol.slice(0, 2)}
              </span>
            )}
            <span>{c.name}</span>
            <span className="font-mono text-[10px] text-fg/60">{c.symbol}</span>
            <button
              type="button"
              onClick={() => handleRemove(c.id)}
              aria-label={`Retirer ${c.name}`}
              className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted hover:bg-elevated/80 hover:text-fg transition-colors"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}

        {/* Bouton "Ajouter" (cache si plein) */}
        {!isFull && (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-elevated/40 px-3 py-1.5 text-sm font-semibold text-fg/85 hover:border-primary/40 hover:bg-elevated/60 transition-colors"
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter une crypto
            </button>

            {open && (
              <div
                role="listbox"
                aria-label="Choisir une crypto a ajouter"
                className="absolute left-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface shadow-2xl"
              >
                <div className="border-b border-border p-3">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      ref={inputRef}
                      type="search"
                      inputMode="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher (Bitcoin, ETH, Solana...)"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-elevated/60 text-sm text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <ul className="max-h-72 overflow-y-auto py-1">
                  {filtered.length === 0 && (
                    <li className="px-3 py-3 text-sm text-muted text-center">
                      Aucune crypto trouvee
                    </li>
                  )}
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handleAdd(c.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-elevated/60 transition-colors"
                      >
                        {c.logo ? (
                          <Image
                            src={c.logo}
                            alt=""
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-full shrink-0"
                            unoptimized
                          />
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary-soft shrink-0">
                            {c.symbol.slice(0, 2)}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-fg truncate">
                            {c.name}
                          </span>
                          <span className="block text-[11px] text-muted">
                            <span className="font-mono">{c.symbol}</span> ·{" "}
                            {c.category}
                            {c.kind === "top10" && c.rank
                              ? ` · Top ${c.rank}`
                              : c.kind === "hidden-gem"
                                ? " · Hidden Gem"
                                : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border px-3 py-2 text-[11px] text-muted text-center">
                  {filtered.length} resultat{filtered.length > 1 ? "s" : ""} ·{" "}
                  <Link
                    href="/cryptos"
                    className="text-primary-soft hover:underline"
                  >
                    Voir les 100 fiches
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {isFull && (
          <span className="text-[11px] text-muted italic self-center">
            Maximum {MAX_COMPARE} cryptos atteint
          </span>
        )}
      </div>

      {!hydrated && (
        <p className="mt-3 text-[11px] text-muted italic">
          Synchronisation en cours...
        </p>
      )}
    </div>
  );
}

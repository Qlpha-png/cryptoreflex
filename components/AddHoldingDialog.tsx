"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plus, Search, X, Check } from "lucide-react";
import { ALL_CRYPTOS, type CryptoMeta } from "@/lib/programmatic";
import { addHolding, MAX_HOLDINGS, type Holding } from "@/lib/portfolio";

interface AddHoldingDialogProps {
  open: boolean;
  onClose: () => void;
  /** Appelé après ajout réussi. La page parent peut alors re-fetch les prix. */
  onAdded?: (h: Holding) => void;
  /** Nombre actuel de positions — pour griser le submit si plein. */
  currentCount: number;
}

/**
 * Dialog modal d'ajout de position au portefeuille.
 *
 * Pattern dialog full-control :
 *   - parent contrôle `open` / `onClose` (pas de portail React, juste un fixed)
 *   - focus trap manuel via Tab/Shift+Tab cyclique sur les focusables
 *   - escape close
 *   - body scroll lock
 *   - aria-modal + aria-labelledby
 *
 * Combobox crypto :
 *   - input de recherche filtrant ALL_CRYPTOS sur name + symbol + id
 *   - max 8 résultats visibles, scrollable au-delà
 *   - flèches haut/bas + Enter pour sélectionner
 *
 * Validation :
 *   - crypto sélectionnée obligatoire
 *   - quantity > 0
 *   - avgBuyPriceEur >= 0 (zéro permis : airdrop)
 *
 * Pas de framer-motion ni librairie modal externe — pur React + CSS.
 */
export default function AddHoldingDialog({
  open,
  onClose,
  onAdded,
  currentCount,
}: AddHoldingDialogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CryptoMeta | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  const isFull = currentCount >= MAX_HOLDINGS;

  /* -------- Reset quand le dialog s'ouvre/ferme ------------------------- */
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      document.body.classList.add("modal-open");
      // Focus l'input de recherche après mount.
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      document.body.classList.remove("modal-open");
      // Reset state à la fermeture (on revient propre la prochaine fois).
      setQuery("");
      setSelected(null);
      setQuantity("");
      setPrice("");
      setError(null);
      setActiveIdx(0);
      previouslyFocused.current?.focus?.();
    }
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  /* -------- Filtrage combobox ------------------------------------------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Sans query : on propose les 8 plus connues (ALL_CRYPTOS commence par TOP).
      return ALL_CRYPTOS.slice(0, 8);
    }
    const matches: Array<{ c: CryptoMeta; score: number }> = [];
    for (const c of ALL_CRYPTOS) {
      const sym = c.symbol.toLowerCase();
      const name = c.name.toLowerCase();
      const id = c.id.toLowerCase();
      let score = 0;
      if (sym === q) score = 100;
      else if (id === q) score = 95;
      else if (sym.startsWith(q)) score = 80;
      else if (name.toLowerCase().startsWith(q)) score = 70;
      else if (id.startsWith(q)) score = 60;
      else if (name.includes(q)) score = 40;
      else if (id.includes(q)) score = 30;
      else if (sym.includes(q)) score = 20;
      if (score > 0) matches.push({ c, score });
    }
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((m) => m.c);
  }, [query]);

  // Reset activeIdx si la liste filtrée change
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  /* -------- Sélection d'une crypto -------------------------------------- */
  const handleSelect = useCallback((c: CryptoMeta) => {
    setSelected(c);
    setQuery(""); // collapse la liste
    setError(null);
    // Focus le prochain champ pour fluidité clavier.
    requestAnimationFrame(() => quantityRef.current?.focus());
  }, []);

  /* -------- Soumission -------------------------------------------------- */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;

      if (!selected) {
        setError("Sélectionne une cryptomonnaie.");
        return;
      }
      const q = Number(quantity.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) {
        setError("La quantité doit être un nombre supérieur à zéro.");
        return;
      }
      const p = Number(price.replace(",", "."));
      if (!Number.isFinite(p) || p < 0) {
        setError("Le prix d'achat moyen ne peut pas être négatif.");
        return;
      }

      setSubmitting(true);
      const created = addHolding({
        cryptoId: selected.coingeckoId,
        symbol: selected.symbol,
        name: selected.name,
        quantity: q,
        avgBuyPriceEur: p,
      });
      setSubmitting(false);

      if (!created) {
        setError(
          `Impossible d'ajouter (limite ${MAX_HOLDINGS} positions atteinte ?).`
        );
        return;
      }
      onAdded?.(created);
      onClose();
    },
    [submitting, selected, quantity, price, onAdded, onClose]
  );

  /* -------- Keyboard global (focus trap + escape + flèches combobox) --- */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Flèches uniquement quand on est dans la combobox (pas sélectionné encore
      // OU on a tapé pour rechercher).
      const inSearch = document.activeElement === searchRef.current;
      if (inSearch && filtered.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIdx((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter") {
          const target = filtered[activeIdx];
          if (target) {
            e.preventDefault();
            handleSelect(target);
            return;
          }
        }
      }

      // Focus trap : Tab cyclique entre tous les focusables du dialog
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [filtered, activeIdx, onClose, handleSelect]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-holding-title"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]"
      onKeyDown={onKeyDown}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        tabIndex={-1}
      />

      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl border border-border/60 bg-elevated/95 shadow-2xl shadow-black/50 animate-slide-down overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <h2
            id="add-holding-title"
            className="text-lg font-semibold text-fg flex items-center gap-2"
          >
            <Plus className="h-5 w-5 text-primary" aria-hidden="true" />
            Ajouter une position
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-muted hover:bg-white/5 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
          {/* 1. Combobox crypto */}
          <div>
            <label
              htmlFor="add-holding-search"
              className="block text-sm font-medium text-fg/90 mb-1.5"
            >
              Cryptomonnaie
            </label>

            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase">
                    {selected.symbol.slice(0, 3)}
                  </span>
                  <span className="font-semibold text-fg truncate">
                    {selected.name}
                  </span>
                  <span className="text-xs text-muted font-mono uppercase">
                    {selected.symbol}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    requestAnimationFrame(() => searchRef.current?.focus());
                  }}
                  className="text-xs text-muted hover:text-fg underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label="Changer de cryptomonnaie"
                >
                  Changer
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <input
                  ref={searchRef}
                  id="add-holding-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Bitcoin, ETH, Solana…"
                  aria-label="Rechercher une cryptomonnaie"
                  aria-autocomplete="list"
                  aria-controls="crypto-listbox"
                  aria-activedescendant={
                    filtered[activeIdx] ? `crypto-opt-${activeIdx}` : undefined
                  }
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-surface text-fg text-sm placeholder:text-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                {filtered.length > 0 && (
                  <ul
                    id="crypto-listbox"
                    role="listbox"
                    aria-label="Suggestions de cryptos"
                    className="mt-1.5 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface py-1"
                  >
                    {filtered.map((c, idx) => {
                      const active = idx === activeIdx;
                      return (
                        <li key={c.id} role="presentation">
                          <button
                            type="button"
                            role="option"
                            id={`crypto-opt-${idx}`}
                            aria-selected={active}
                            onMouseEnter={() => setActiveIdx(idx)}
                            onClick={() => handleSelect(c)}
                            className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                              active
                                ? "bg-primary/10 text-fg"
                                : "text-fg/90 hover:bg-white/5"
                            }`}
                          >
                            <span className="font-semibold truncate">{c.name}</span>
                            <span className="text-xs text-muted font-mono uppercase">
                              {c.symbol}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* 2. Quantité */}
          <div>
            <label
              htmlFor="add-holding-qty"
              className="block text-sm font-medium text-fg/90 mb-1.5"
            >
              Quantité détenue
            </label>
            <input
              ref={quantityRef}
              id="add-holding-qty"
              type="number"
              inputMode="decimal"
              step="0.00001"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.05"
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-fg text-sm placeholder:text-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono"
            />
          </div>

          {/* 3. Prix moyen d'achat (PRU) */}
          <div>
            <label
              htmlFor="add-holding-price"
              className="block text-sm font-medium text-fg/90 mb-1.5"
            >
              Prix moyen d&apos;achat (€)
            </label>
            <input
              id="add-holding-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="60000"
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-fg text-sm placeholder:text-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono"
            />
            <p className="mt-1.5 text-[11px] text-muted">
              Ton PRU (prix de revient unitaire) en EUR. Mets 0 si la position
              est offerte (airdrop, cadeau).
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <p
              role="alert"
              className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg text-fg/85 hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-h-[40px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || isFull}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-semibold text-sm px-4 py-2 min-h-[40px] hover:bg-primary-glow transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-elevated"
              aria-disabled={submitting || isFull}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {isFull ? "Limite atteinte" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

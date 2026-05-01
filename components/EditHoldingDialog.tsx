"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { updateHolding, type Holding } from "@/lib/portfolio";

interface EditHoldingDialogProps {
  open: boolean;
  onClose: () => void;
  holding: Holding | null;
  /** Appelé après update réussi (la page parent re-fetch). */
  onUpdated?: () => void;
}

/**
 * Dialog modal d'édition d'une position existante.
 *
 * On NE permet PAS de changer la crypto sous-jacente : trop ambigu
 * (crée une nouvelle position si tu veux changer, c'est plus clair).
 * On peut seulement éditer quantity et avgBuyPriceEur.
 *
 * Squelette : même pattern que AddHoldingDialog (focus trap, escape, body lock).
 */
export default function EditHoldingDialog({
  open,
  onClose,
  holding,
  onUpdated,
}: EditHoldingDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  /* -------- Préremplissage à l'ouverture -------------------------------- */
  useEffect(() => {
    if (open && holding) {
      setQuantity(String(holding.quantity));
      setPrice(String(holding.avgBuyPriceEur));
      setError(null);
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      document.body.classList.add("modal-open");
      requestAnimationFrame(() => firstInputRef.current?.focus());
    } else if (!open) {
      document.body.classList.remove("modal-open");
      previouslyFocused.current?.focus?.();
    }
    return () => document.body.classList.remove("modal-open");
  }, [open, holding]);

  /* -------- Soumission -------------------------------------------------- */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!holding) return;

      const q = Number(quantity.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) {
        setError("La quantité doit être supérieure à zéro.");
        return;
      }
      const p = Number(price.replace(",", "."));
      if (!Number.isFinite(p) || p < 0) {
        setError("Le prix d'achat moyen ne peut pas être négatif.");
        return;
      }

      const ok = updateHolding(holding.id, {
        quantity: q,
        avgBuyPriceEur: p,
      });
      if (!ok) {
        setError("Échec de la mise à jour.");
        return;
      }
      onUpdated?.();
      onClose();
    },
    [holding, quantity, price, onUpdated, onClose]
  );

  /* -------- Keyboard : escape + focus trap ------------------------------ */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
    [onClose]
  );

  const reduce = useReducedMotion();
  const backdropTransition = reduce ? { duration: 0 } : { duration: 0.2 };
  const panelTransition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 400, damping: 30 };

  const isOpen = open && !!holding;

  return (
    <AnimatePresence>
      {isOpen && holding && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-holding-title"
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[8vh] sm:pt-[12vh]"
          onKeyDown={onKeyDown}
        >
          <motion.button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
          />

          <motion.div
            ref={dialogRef}
            className="relative w-full max-w-md rounded-2xl border border-border/60 bg-elevated/95 shadow-2xl shadow-black/50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={panelTransition}
          >
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <h2
            id="edit-holding-title"
            className="text-lg font-semibold text-fg flex items-center gap-2"
          >
            <Pencil className="h-4 w-4 text-primary" aria-hidden="true" />
            Modifier {holding.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-muted hover:bg-white/5 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
          <div>
            <label
              htmlFor="edit-holding-qty"
              className="block text-sm font-medium text-fg/90 mb-1.5"
            >
              Quantité détenue ({holding.symbol})
            </label>
            <input
              ref={firstInputRef}
              id="edit-holding-qty"
              type="number"
              inputMode="decimal"
              step="0.00001"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-fg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="edit-holding-price"
              className="block text-sm font-medium text-fg/90 mb-1.5"
            >
              Prix moyen d&apos;achat (€)
            </label>
            <input
              id="edit-holding-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-fg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-semibold text-sm px-4 py-2 min-h-[40px] hover:bg-primary-glow transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-elevated"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Enregistrer
            </button>
          </div>
        </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

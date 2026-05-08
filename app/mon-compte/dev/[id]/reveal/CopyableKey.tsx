"use client";

/**
 * Composant client : affiche une clé secrète + bouton copy-to-clipboard.
 *
 * Volontairement minimal. La clé est rendue dans le DOM (uniquement client-side
 * — le SSR la met aussi mais c'est dans une page noindex). On utilise
 * `navigator.clipboard` pour la copie ; fallback `document.execCommand` non
 * implémenté (les browsers cibles supportent tous l'API moderne).
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyableKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si le clipboard est bloqué (contexte non-secure), on ne peut pas
      // grand-chose ; le user peut sélectionner manuellement.
      alert("Impossible de copier automatiquement. Sélectionne le texte avec ta souris.");
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Ta clé secrète
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          aria-label="Copier la clé"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-green-600" />
              Copié !
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copier
            </>
          )}
        </button>
      </div>
      <pre className="font-mono text-xs sm:text-sm break-all whitespace-pre-wrap select-all">
        {value}
      </pre>
    </div>
  );
}

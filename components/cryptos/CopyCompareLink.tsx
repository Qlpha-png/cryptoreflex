"use client";

import { useCallback, useState } from "react";
import { Check, Link2 } from "lucide-react";

interface Props {
  /** URL absolue à copier dans le presse-papier. */
  url: string;
}

/**
 * CopyCompareLink — bouton "Copier le lien" pour partager le comparatif.
 * Petit Client Component embarqué dans la page server `/cryptos/comparer`.
 *
 * Tolérance erreurs : si `navigator.clipboard` n'est pas dispo (vieux navigo
 * ou contexte non sécurisé), on retombe sur `document.execCommand('copy')`
 * via un input temporaire.
 */
export default function CopyCompareLink({ url }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else if (typeof document !== "undefined") {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Silencieux : on ne casse pas l'UX si la copie échoue */
    }
  }, [url]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="block rounded-lg border border-border bg-surface px-3 py-2 text-[11px] text-muted truncate sm:max-w-md">
        {url}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary-soft hover:bg-primary/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Copier le lien du comparatif"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Copié
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Copier le lien
          </>
        )}
      </button>
    </div>
  );
}

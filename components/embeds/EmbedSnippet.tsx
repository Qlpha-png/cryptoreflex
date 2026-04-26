"use client";

/**
 * <EmbedSnippet /> — bloc de code iframe prêt à coller.
 *
 * Usage : sur la landing page /embeds, chaque widget propose un snippet
 * avec bouton "Copier". Le snippet inclut OBLIGATOIREMENT l'attribution
 * dofollow vers cryptoreflex.fr (license CC-BY → backlink garanti).
 *
 * Stratégie linkable assets : plus le snippet est facile à copier-coller,
 * plus on génère de backlinks organiques sans démarchage.
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface EmbedSnippetProps {
  /** Slug du widget (ex: "calculateur-fiscalite"). */
  slug: string;
  /** Titre humain affiché dans l'attribution. */
  title: string;
  /** Hauteur recommandée de l'iframe. */
  height?: number;
}

export default function EmbedSnippet({
  slug,
  title,
  height = 800,
}: EmbedSnippetProps) {
  const [copied, setCopied] = useState(false);

  // URL canonique www.cryptoreflex.fr — attribut dofollow par défaut.
  // On ne met PAS de rel="nofollow" : c'est le deal de la license CC-BY.
  const snippet = `<iframe src="https://www.cryptoreflex.fr/embed/${slug}" width="100%" height="${height}" frameborder="0" loading="lazy" title="${title} — Cryptoreflex"></iframe>
<p style="font-size:12px;text-align:center;color:#666;margin-top:8px">Outil par <a href="https://www.cryptoreflex.fr/outils/${slug}">Cryptoreflex</a> — license CC-BY 4.0</p>`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      // Plausible event (no-op si Plausible absent).
      if (typeof window !== "undefined" && (window as any).plausible) {
        (window as any).plausible("Embed Snippet Copied", {
          props: { widget: slug },
        });
      }
    } catch {
      // Fallback : sélectionne le texte si clipboard API refusée.
      const range = document.createRange();
      const el = document.getElementById(`snippet-${slug}`);
      if (el) {
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  return (
    <div className="rounded-xl border border-border bg-elevated/60 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface/40">
        <span className="text-xs font-mono text-muted">
          Code iframe à coller sur ton site
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 px-3 py-1.5 text-xs font-semibold text-primary-soft border border-primary/30 transition-colors"
          aria-live="polite"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Copié !
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copier
            </>
          )}
        </button>
      </div>
      <pre
        id={`snippet-${slug}`}
        className="overflow-x-auto p-3 text-xs leading-relaxed text-white/85 bg-background/40 font-mono whitespace-pre-wrap break-all"
      >
        {snippet}
      </pre>
    </div>
  );
}

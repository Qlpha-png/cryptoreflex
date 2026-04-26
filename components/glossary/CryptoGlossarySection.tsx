import { BookOpen, Sparkles, Info } from "lucide-react";
import {
  type GlossaryTerm,
  findGlossaryTerm,
  extractTermsFromText,
} from "@/lib/crypto-glossary";

/**
 * <CryptoGlossarySection /> — section "Lexique de cet article" en fin de page.
 *
 * Pourquoi ce composant existe (audit 26/04/2026, demande user) :
 *   "50 cryptos avec catalogue dynamique + glossaire enfant ton vulgarisé"
 *   Les articles d'analyse technique parlent de RSI, MACD, support, halving…
 *   Un débutant lâche au 3ème mot inconnu. Cette section explique TOUS les
 *   termes techniques utilisés DANS L'ARTICLE LU avec les mots de tous les
 *   jours, comme à un enfant intelligent de 12 ans.
 *
 * Modes d'utilisation :
 *
 *   1. Auto-détection depuis le contenu MDX (recommandé pour les articles
 *      générés par cron) :
 *      <CryptoGlossarySection mdxContent={article.content} />
 *
 *   2. Liste explicite de termes (recommandé pour articles éditoriaux où
 *      l'auteur sait exactement ce qu'il veut expliquer) :
 *      <CryptoGlossarySection terms={["RSI", "MACD", "EMA", "support"]} />
 *
 *   3. Section vide → render rien (pas de bruit visuel sur articles courts) :
 *      <CryptoGlossarySection terms={[]} />
 *
 * Architecture :
 *  - Server Component (zéro JS expédié au client).
 *  - Accordéon natif <details>/<summary> pour "Détail complet" → zéro JS,
 *    keyboard a11y native, motion-safe par défaut, fonctionne no-JS.
 *  - max 12 termes affichés (au-delà, lien vers /glossaire complet).
 *  - Schema.org DefinedTermSet + DefinedTerm (signal éducatif Google).
 *
 * A11y :
 *  - <section role="region" aria-labelledby> (NavLandmark Glossary)
 *  - <dl><dt><dd> (sémantique liste de définitions)
 *  - <summary> + <details> = native disclosure pattern (4.1.2 Name/Role/Value)
 *  - text-fg/85 (contraste AA 4.5:1)
 */

interface CryptoGlossarySectionProps {
  /** Contenu brut (MDX ou texte) — auto-détecte les termes connus. */
  mdxContent?: string;
  /** Liste explicite de termes (canoniques OU alias). Prioritaire sur `mdxContent`. */
  terms?: string[];
  /** Titre custom (par défaut "Lexique de cet article"). */
  title?: string;
  /** Compact : pas d'intro descriptive, juste la liste (utile en sidebar). */
  compact?: boolean;
}

const MAX_DISPLAYED = 12;

export default function CryptoGlossarySection({
  mdxContent,
  terms,
  title = "Lexique de cet article",
  compact = false,
}: CryptoGlossarySectionProps) {
  // Résolution des termes à afficher (déduplication + tri alpha)
  const resolved: GlossaryTerm[] = (() => {
    if (terms && terms.length > 0) {
      const seen = new Set<string>();
      const out: GlossaryTerm[] = [];
      for (const t of terms) {
        const def = findGlossaryTerm(t);
        if (def && !seen.has(def.term)) {
          seen.add(def.term);
          out.push(def);
        }
      }
      return out.sort((a, b) => a.term.localeCompare(b.term, "fr"));
    }
    if (mdxContent) {
      return extractTermsFromText(mdxContent);
    }
    return [];
  })();

  if (resolved.length === 0) return null;

  const displayed = resolved.slice(0, MAX_DISPLAYED);
  const overflow = resolved.length - displayed.length;

  // Schema.org DefinedTermSet — signale à Google qu'on a un mini-glossaire
  // structuré (boost EAT/E-E-A-T sur les pages YMYL crypto).
  const schema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: title,
    inDefinedTermSet: "https://cryptoreflex.fr/outils/glossaire-crypto",
    hasDefinedTerm: displayed.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.short,
      termCode: t.term.toLowerCase().replace(/\s+/g, "-"),
    })),
  };

  return (
    <section
      role="region"
      aria-labelledby="article-glossary-heading"
      className="mt-12 rounded-2xl border border-border/60 bg-elevated/60 backdrop-blur-md p-5 sm:p-6 not-prose"
    >
      {/* JSON-LD pour les rich results Google (DefinedTermSet) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Header */}
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300/90 mb-1">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
            Glossaire
          </p>
          <h2
            id="article-glossary-heading"
            className="text-lg sm:text-xl font-bold text-fg leading-tight"
          >
            {title}
          </h2>
          {!compact && (
            <p className="mt-1 text-[13px] text-fg/75 leading-relaxed">
              Tous les mots techniques de l&apos;article expliqués avec des phrases
              simples — comme à un grand débutant.
            </p>
          )}
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[10px] font-mono font-bold text-amber-300">
          <Sparkles className="h-3 w-3" aria-hidden="true" focusable="false" />
          {displayed.length} terme{displayed.length > 1 ? "s" : ""}
        </span>
      </header>

      {/* Liste de définitions — sémantique <dl> */}
      <dl className="grid gap-2 sm:grid-cols-2">
        {displayed.map((t) => (
          <GlossaryEntry key={t.term} term={t} />
        ))}
      </dl>

      {/* Footer — overflow + lien vers glossaire complet */}
      <footer className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-[12px] text-fg/65">
        {overflow > 0 ? (
          <span>
            +{overflow} autre{overflow > 1 ? "s" : ""} terme{overflow > 1 ? "s" : ""} non affiché{overflow > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Info className="h-3 w-3" aria-hidden="true" focusable="false" />
            Définitions vulgarisées Cryptoreflex.
          </span>
        )}
        <a
          href="/outils/glossaire-crypto"
          className="inline-flex items-center gap-1 font-semibold text-primary-soft hover:text-primary transition-colors"
          aria-label="Voir le glossaire crypto complet"
        >
          Glossaire complet →
        </a>
      </footer>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* GlossaryEntry — une entrée <dt>/<dd> avec accordéon natif <details>        */
/* -------------------------------------------------------------------------- */

const CATEGORY_BADGE: Record<
  GlossaryTerm["category"],
  { label: string; cls: string }
> = {
  indicateur: { label: "Indicateur", cls: "bg-cyan-300/15 text-cyan-300 border-cyan-300/30" },
  concept: { label: "Concept", cls: "bg-violet-300/15 text-violet-300 border-violet-300/30" },
  produit: { label: "Produit", cls: "bg-emerald-300/15 text-emerald-300 border-emerald-300/30" },
  regulation: { label: "Régulation", cls: "bg-rose-300/15 text-rose-300 border-rose-300/30" },
  tech: { label: "Tech", cls: "bg-amber-300/15 text-amber-300 border-amber-300/30" },
};

function GlossaryEntry({ term }: { term: GlossaryTerm }) {
  const meta = CATEGORY_BADGE[term.category];
  const hasMore = Boolean(term.full || term.example);

  return (
    <div className="rounded-lg border border-border/40 bg-surface/40 p-3 hover:border-amber-300/30 hover:bg-surface/60 transition-colors">
      {/* Header : term + badge catégorie */}
      <dt className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="font-semibold text-fg text-[14px] truncate">{term.term}</span>
        <span
          className={`shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${meta.cls}`}
        >
          {meta.label}
        </span>
      </dt>

      {/* Définition courte : enfant-friendly, ≤ 25 mots */}
      <dd className="text-[13px] leading-relaxed text-fg/85">
        {term.short}
      </dd>

      {/* Accordéon "Détail complet" — uniquement si on a +d'info */}
      {hasMore && (
        <details className="mt-2 group">
          <summary className="cursor-pointer text-[11px] font-medium text-primary-soft hover:text-primary transition-colors inline-flex items-center gap-1 select-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">+ Détail complet</span>
            <span className="hidden group-open:inline">− Replier</span>
          </summary>
          <div className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-fg/80 border-l-2 border-amber-300/40 pl-3">
            {term.full && <p>{term.full}</p>}
            {term.example && (
              <p className="text-fg/70 italic">
                <strong className="not-italic font-semibold text-fg/85">Exemple :</strong>{" "}
                {term.example}
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

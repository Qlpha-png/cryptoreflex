"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  FileText,
  Building2,
  Coins,
  GitCompare,
  Wrench,
  BookOpen,
  ArrowRight,
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  type: "article" | "platform" | "crypto" | "comparatif" | "outil" | "glossary";
  url: string;
  snippet: string;
  score: number;
}

const TYPE_META: Record<
  SearchResult["type"],
  { label: string; Icon: typeof Search; color: string }
> = {
  article: { label: "Article", Icon: FileText, color: "text-blue-300" },
  platform: { label: "Plateforme", Icon: Building2, color: "text-primary-glow" },
  crypto: { label: "Crypto", Icon: Coins, color: "text-amber-300" },
  comparatif: { label: "Comparatif", Icon: GitCompare, color: "text-cyan-300" },
  outil: { label: "Outil", Icon: Wrench, color: "text-emerald-300" },
  glossary: { label: "Glossaire", Icon: BookOpen, color: "text-purple-300" },
};

const TYPE_FILTERS: Array<{ key: SearchResult["type"] | "all"; label: string }> = [
  { key: "all", label: "Tout" },
  { key: "article", label: "Articles" },
  { key: "platform", label: "Plateformes" },
  { key: "crypto", label: "Cryptos" },
  { key: "comparatif", label: "Comparatifs" },
  { key: "outil", label: "Outils" },
  { key: "glossary", label: "Glossaire" },
];

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SearchResult["type"] | "all">("all");
  const [isPending, startTransition] = useTransition();

  // Fetch results
  const search = useCallback(async (q: string) => {
    if (!q || q.trim().length < 1) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=50`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { results: SearchResult[] };
      setResults(data.results ?? []);
    } catch (err) {
      console.error("[search] failed:", err);
      setError("Recherche indisponible. Réessaie dans un instant.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount if ?q= present
  useEffect(() => {
    if (initialQuery) {
      void search(initialQuery);
    }
  }, [initialQuery, search]);

  // Debounced fetch on user typing
  useEffect(() => {
    const t = setTimeout(() => {
      if (query !== initialQuery) {
        // Sync URL state
        startTransition(() => {
          const sp = new URLSearchParams();
          if (query) sp.set("q", query);
          router.replace(sp.toString() ? `/recherche?${sp}` : "/recherche", {
            scroll: false,
          });
        });
        void search(query);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, initialQuery, router, search]);

  const filteredResults =
    filter === "all" ? results : results.filter((r) => r.type === filter);

  const counts = TYPE_FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f.key] =
      f.key === "all"
        ? results.length
        : results.filter((r) => r.type === f.key).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Search input */}
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Rechercher sur Cryptoreflex"
      >
        <label htmlFor="search-input" className="sr-only">
          Rechercher
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted"
            aria-hidden="true"
          />
          <input
            id="search-input"
            name="q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un guide, une plateforme, une crypto…"
            autoComplete="off"
            autoFocus
            className="w-full rounded-xl bg-elevated border border-border pl-12 pr-4 py-4 text-fg placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30 transition-colors text-lg"
          />
        </div>
      </form>

      {/* Filter chips */}
      {results.length > 0 && (
        <div
          className="mt-6 flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Filtrer par type"
        >
          {TYPE_FILTERS.map((f) => {
            const isActive = filter === f.key;
            const count = counts[f.key] ?? 0;
            const disabled = f.key !== "all" && count === 0;
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-pressed={isActive}
                disabled={disabled}
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? "border-primary bg-primary/15 text-primary-glow"
                    : disabled
                    ? "border-border/50 bg-surface/30 text-muted/50 cursor-not-allowed"
                    : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg"
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-xs text-muted">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Status */}
      <div className="mt-6 min-h-[24px] text-sm text-muted" aria-live="polite">
        {isLoading && "Recherche en cours…"}
        {!isLoading && error && (
          <span className="text-accent-rose">{error}</span>
        )}
        {!isLoading && !error && query && results.length === 0 && (
          <span>
            Aucun résultat pour <strong>« {query} »</strong>. Essaie un autre
            terme ou{" "}
            <Link href="/blog" className="text-primary-soft hover:underline">
              parcours le blog
            </Link>
            .
          </span>
        )}
        {!isLoading && !error && results.length > 0 && (
          <span>
            <strong className="text-fg">{filteredResults.length}</strong>{" "}
            résultat{filteredResults.length > 1 ? "s" : ""}
            {filter !== "all" && ` (${filter})`}
          </span>
        )}
      </div>

      {/* Results list */}
      {filteredResults.length > 0 && (
        <ul className="mt-6 space-y-3">
          {filteredResults.map((r) => {
            const meta = TYPE_META[r.type];
            const Icon = meta.Icon;
            return (
              <li key={r.id}>
                <Link
                  href={r.url}
                  className="group block glass rounded-xl p-5 hover:border-primary/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated ${meta.color}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-muted truncate">
                          {r.url}
                        </span>
                      </div>
                      <h3 className="mt-1 font-bold text-fg group-hover:text-primary-glow transition-colors">
                        {r.title}
                      </h3>
                      <p className="mt-1 text-sm text-fg/70 line-clamp-2">
                        {r.snippet}
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-1 h-4 w-4 text-muted shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Empty initial state (no query yet) */}
      {!query && (
        <div className="mt-10 rounded-2xl border border-border bg-elevated/30 p-8 text-center">
          <p className="text-fg/70 text-sm">
            Tape ce que tu cherches dans la barre ci-dessus — l'index couvre{" "}
            <strong className="text-fg">tous les contenus du site</strong> :
            articles, plateformes, cryptos, comparatifs, outils, glossaire.
          </p>
          <p className="mt-3 text-xs text-muted">
            Astuce&nbsp;: tu peux aussi appuyer sur <kbd>⌘</kbd>+<kbd>K</kbd>{" "}
            (ou <kbd>Ctrl</kbd>+<kbd>K</kbd>) depuis n'importe quelle page pour
            ouvrir la recherche rapide.
          </p>
        </div>
      )}
    </div>
  );
}

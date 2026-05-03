"use client";

/**
 * components/CommandPalette.tsx — Cockpit ⌘K basé sur cmdk + fuse.js.
 *
 * Étude 02/05/2026 — proposition #7 :
 *   On transforme la palette purement navigationnelle (search → click → page)
 *   en cockpit avec ACTIONS exécutables :
 *     - Section "Actions rapides" (lib/cmdk-actions.ts) : add holding,
 *       create alert, convert, toggle theme, push, logout, force ISR…
 *     - Section "Recherche" (lib/search-client.ts) : articles / cryptos /
 *       plateformes / glossaire / outils / comparatifs.
 *     - Section "Suggestions" (4 actions populaires) si query vide.
 *
 * Stack :
 *   - cmdk (@radix-ui dialog + a11y combobox)
 *   - fuse.js (scoring tolérant typos, multi-champs)
 *
 * Lifecycle :
 *   - Lazy-loaded depuis app/layout.tsx (dynamic ssr:false).
 *   - Listeners : Cmd+K (toggle), "/" (open hors input), event "cmdk:open"/
 *     "cmdk:close", helper exporté setCommandPaletteOpen().
 *   - Esc + click backdrop → close.
 *
 * Choix scoring :
 *   - threshold fuse 0.4 (équilibre fuzziness / pertinence).
 *   - keys pondérées : label (0.6), keywords (0.3), group (0.1).
 *   - includeScore=true → on trie nous-même pour merger Actions + Search.
 *
 * Important (RCA 26/04 commits d776b2d → 7bd30ba) :
 *   On importe `lib/search-client` (PUR) et NON `lib/search` (qui pull mdx.ts
 *   et casse le bundle webpack côté navigateur via node:fs).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
// BATCH 53 — wallet-aware safe navigation (cf. bug clic eth/sol/sui/aptos/dot)
import { safeNavigate } from "@/lib/safe-navigate";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import {
  Search,
  FileText,
  Building2,
  Coins,
  GitCompareArrows,
  Wrench,
  BookOpen,
  X,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";
import {
  searchIndex,
  type SearchItem,
  type SearchResult,
  type SearchType,
} from "@/lib/search-client";
import {
  CMDK_ACTIONS,
  DEFAULT_SUGGESTION_IDS,
  actionsToSearchDocs,
  filterActions,
  getActionById,
  type CmdkAction,
  type CmdkRunContext,
  type CmdkSearchDoc,
} from "@/lib/cmdk-actions";
import { useUserPlan } from "@/lib/use-user-plan";

/* -------------------------------------------------------------------------- */
/*  Constantes                                                                */
/* -------------------------------------------------------------------------- */

const TYPE_META: Record<
  SearchType,
  { label: string; icon: typeof Search; color: string }
> = {
  article: { label: "Articles", icon: FileText, color: "text-amber-300" },
  platform: { label: "Plateformes", icon: Building2, color: "text-cyan-300" },
  crypto: { label: "Cryptos", icon: Coins, color: "text-emerald-300" },
  comparatif: {
    label: "Comparatifs",
    icon: GitCompareArrows,
    color: "text-fuchsia-300",
  },
  outil: { label: "Outils", icon: Wrench, color: "text-violet-300" },
  glossary: { label: "Glossaire", icon: BookOpen, color: "text-sky-300" },
};

const TYPE_ORDER: SearchType[] = [
  "platform",
  "crypto",
  "article",
  "comparatif",
  "outil",
  "glossary",
];

const FUSE_THRESHOLD = 0.4;
const MAX_SEARCH_RESULTS = 20;

/* -------------------------------------------------------------------------- */
/*  Singleton state — listeners externes                                      */
/* -------------------------------------------------------------------------- */

type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();

/** Ouvre / ferme la palette depuis n'importe où (Navbar, footer, etc.). */
export function setCommandPaletteOpen(open: boolean) {
  for (const fn of listeners) fn(open);
}

/* -------------------------------------------------------------------------- */
/*  Hook : index recherche chargé une fois côté client                        */
/* -------------------------------------------------------------------------- */

function useSearchIndex(enabled: boolean) {
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || index || loading) return;
    setLoading(true);
    fetch("/api/search?index=1", { cache: "force-cache" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { items: SearchItem[] };
        setIndex(data.items);
      })
      .catch(() => {
        // Silent fallback : la palette affichera juste 0 résultats search,
        // mais les actions restent disponibles.
      })
      .finally(() => setLoading(false));
  }, [enabled, index, loading]);

  return { index, loading };
}

/* -------------------------------------------------------------------------- */
/*  Composant                                                                 */
/* -------------------------------------------------------------------------- */

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const { isAuthenticated } = useUserPlan();
  // Heuristique admin : on n'a pas de flag `isAdmin` côté useUserPlan, alors
  // on regarde le cookie cr_admin (set côté middleware) OU le pathname (si
  // l'utilisateur est sur /admin, alors le middleware l'a déjà laissé passer).
  const isAdmin = useMemo(() => {
    if (typeof document === "undefined") return false;
    if (pathname.startsWith("/admin")) return true;
    return /(?:^|;\s*)cr_admin=1/.test(document.cookie);
  }, [pathname]);

  /* -------- Index search lazy-load (au 1er open) ----------------------- */
  const { index: searchSrc } = useSearchIndex(open);

  /* -------- Actions visibles (filtrées auth/admin) --------------------- */
  const visibleActions = useMemo<CmdkAction[]>(
    () => filterActions(CMDK_ACTIONS, { isAuthenticated, isAdmin }),
    [isAuthenticated, isAdmin]
  );

  /* -------- Fuse instance (re-build quand visibleActions change) ------- */
  const actionsFuse = useMemo(() => {
    const docs: CmdkSearchDoc[] = actionsToSearchDocs(visibleActions);
    return new Fuse<CmdkSearchDoc>(docs, {
      keys: [
        { name: "label", weight: 0.6 },
        { name: "keywords", weight: 0.3 },
        { name: "group", weight: 0.1 },
      ],
      threshold: FUSE_THRESHOLD,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }, [visibleActions]);

  /* -------- Listeners externes (helper + custom event) ----------------- */
  useEffect(() => {
    const fn: Listener = (next) => setOpen(next);
    listeners.add(fn);

    // Event "cmdk:open" — pattern alternatif pour les triggers qui préfèrent
    // dispatcher un évènement DOM (ex. composants externes ne pouvant importer
    // ce module). Dispatch via : window.dispatchEvent(new CustomEvent('cmdk:open'))
    const onCustomOpen = () => setOpen(true);
    const onCustomClose = () => setOpen(false);
    window.addEventListener("cmdk:open", onCustomOpen);
    window.addEventListener("cmdk:close", onCustomClose);

    return () => {
      listeners.delete(fn);
      window.removeEventListener("cmdk:open", onCustomOpen);
      window.removeEventListener("cmdk:close", onCustomClose);
    };
  }, []);

  /* -------- Raccourci clavier global Cmd+K / Ctrl+K --------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      // Slash global (sans modifier, hors des inputs) → ouvre aussi la palette
      if (
        e.key === "/" &&
        !isMod &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement | null)?.isContentEditable
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* -------- Lock body scroll + focus management ------------------------- */
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      document.body.classList.add("modal-open");
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      document.body.classList.remove("modal-open");
      setQuery("");
      previouslyFocused.current?.focus?.();
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  /* -------- Close handler --------------------------------------------- */
  const close = useCallback(() => setOpen(false), []);

  /* -------- Actions matchées (fuse) ------------------------------------ */
  const matchedActions = useMemo<CmdkAction[]>(() => {
    const q = query.trim();
    if (!q) {
      // Pas de query → tableau vide ; les "Suggestions" sont gérées séparément.
      return [];
    }
    const hits = actionsFuse.search(q, { limit: 12 });
    return hits
      .filter((h) => (h.score ?? 1) <= FUSE_THRESHOLD)
      .map((h) => getActionById(h.item.id))
      .filter((a): a is CmdkAction => Boolean(a));
  }, [actionsFuse, query]);

  /* -------- Search results (réutilise scoreItem de search-client) ------ */
  const searchResults: SearchResult[] = useMemo(() => {
    if (!searchSrc || !query.trim()) return [];
    return searchIndex(searchSrc, query, MAX_SEARCH_RESULTS);
  }, [searchSrc, query]);

  /* -------- Suggestions (query vide) ----------------------------------- */
  const suggestions = useMemo<CmdkAction[]>(() => {
    return DEFAULT_SUGGESTION_IDS.map((id) =>
      visibleActions.find((a) => a.id === id)
    ).filter((a): a is CmdkAction => Boolean(a));
  }, [visibleActions]);

  /* -------- Group search results par type ------------------------------ */
  const groupedSearch = useMemo(() => {
    const map = new Map<SearchType, SearchResult[]>();
    for (const r of searchResults) {
      const arr = map.get(r.type) ?? [];
      arr.push(r);
      map.set(r.type, arr);
    }
    const groups: Array<{ type: SearchType; items: SearchResult[] }> = [];
    for (const t of TYPE_ORDER) {
      const items = map.get(t);
      if (items && items.length > 0) groups.push({ type: t, items });
    }
    return groups;
  }, [searchResults]);

  /* -------- Run action / nav search result ----------------------------- */
  const runAction = useCallback(
    (action: CmdkAction) => {
      const ctx: CmdkRunContext = { router, pathname, close };
      // run() peut être async ; on n'attend pas pour ne pas bloquer la fermeture.
      void action.run(ctx);
    },
    [router, pathname, close]
  );

  const goSearch = useCallback(
    (item: SearchItem) => {
      close();
      // BATCH 53 — bypass router.push si wallet extension detectee
      // (silent fail sur fiches /cryptos/[eth|sol|sui|aptos|polkadot])
      safeNavigate(router, item.url);
    },
    [router, close]
  );

  const onEscapeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    },
    [close]
  );

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const hasAnyResult =
    matchedActions.length > 0 || searchResults.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recherche & actions Cryptoreflex"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[15vh]"
      onKeyDown={onEscapeKeyDown}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer la recherche"
        onClick={close}
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        tabIndex={-1}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl rounded-2xl border border-border/60 bg-elevated/95 shadow-2xl shadow-black/50 animate-slide-down overflow-hidden"
      >
        <Command
          // shouldFilter=false : on gère le scoring nous-même via fuse.js +
          // searchIndex (cf. lib/search-client) pour garder la maîtrise du
          // ranking cross-sources (Actions vs Search). cmdk ne sert qu'au
          // rendu list / a11y combobox / keyboard nav.
          shouldFilter={false}
          loop
          label="Palette de commandes Cryptoreflex"
        >
          {/* Search bar */}
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <Search className="h-5 w-5 text-muted shrink-0" aria-hidden="true" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Rechercher ou exécuter une action…"
              className="w-full bg-transparent text-base text-fg placeholder:text-muted/70 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-md text-muted hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            {/* Suggestions (pas de query) */}
            {!hasQuery && suggestions.length > 0 && (
              <Command.Group
                heading={
                  <GroupHeading
                    icon={<Sparkles className="h-3.5 w-3.5 text-amber-300" />}
                    label="Suggestions"
                  />
                }
              >
                {suggestions.map((action) => (
                  <ActionItem
                    key={`sug-${action.id}`}
                    value={`sug-${action.id}-${action.label}`}
                    action={action}
                    onRun={runAction}
                  />
                ))}
              </Command.Group>
            )}

            {/* Actions rapides (query active) */}
            {hasQuery && matchedActions.length > 0 && (
              <Command.Group
                heading={
                  <GroupHeading
                    icon={<Sparkles className="h-3.5 w-3.5 text-amber-300" />}
                    label="Actions rapides"
                    count={matchedActions.length}
                  />
                }
              >
                {matchedActions.map((action) => (
                  <ActionItem
                    key={`act-${action.id}`}
                    value={`act-${action.id}-${action.label}`}
                    action={action}
                    onRun={runAction}
                  />
                ))}
              </Command.Group>
            )}

            {/* Recherche (groupée par type) */}
            {hasQuery &&
              groupedSearch.map((group) => {
                const meta = TYPE_META[group.type];
                const Icon = meta.icon;
                return (
                  <Command.Group
                    key={`search-${group.type}`}
                    heading={
                      <GroupHeading
                        icon={<Icon className={`h-3.5 w-3.5 ${meta.color}`} />}
                        label={meta.label}
                        count={group.items.length}
                      />
                    }
                  >
                    {group.items.map((item) => (
                      <SearchResultItem
                        key={item.id}
                        value={`res-${item.id}`}
                        result={item}
                        onSelect={goSearch}
                      />
                    ))}
                  </Command.Group>
                );
              })}

            {/* Empty state when query has no matches */}
            {hasQuery && !hasAnyResult && (
              <Command.Empty className="px-4 py-8 text-center">
                <p className="text-sm text-muted">
                  Aucun résultat pour{" "}
                  <span className="text-fg font-medium">
                    &laquo; {query.trim().slice(0, 50)}
                    {query.trim().length > 50 ? "…" : ""} &raquo;
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    // BATCH 53 — wallet-aware safe nav
                    safeNavigate(
                      router,
                      `/recherche?q=${encodeURIComponent(query.trim())}`,
                    );
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber-300 hover:text-amber-200 underline-offset-4 hover:underline"
                >
                  Lancer une recherche complète
                </button>
              </Command.Empty>
            )}

            {/* Empty state initial (no query yet, no suggestions visible — rare) */}
            {!hasQuery && suggestions.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted">
                Tape une commande ou un mot-clé…
              </div>
            )}
          </Command.List>

          {/* Footer raccourcis clavier — minimal, juste pour rappel */}
          <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2 text-[11px] text-muted/80">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-background/60 border border-border/60 font-mono text-[10px]">
                  ↑↓
                </kbd>
                <span>nav</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-background/60 border border-border/60 font-mono text-[10px]">
                  ↵
                </kbd>
                <span>exécuter</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="inline-flex items-center justify-center h-4 px-1 rounded bg-background/60 border border-border/60 font-mono text-[10px]">
                  Esc
                </kbd>
                <span>fermer</span>
              </span>
            </div>
            <span className="hidden sm:inline">
              {visibleActions.length} actions disponibles
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function GroupHeading({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted/80 font-semibold flex items-center gap-1.5">
      {icon}
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="text-muted/50 font-normal">({count})</span>
      )}
    </div>
  );
}

function ActionItem({
  value,
  action,
  onRun,
}: {
  value: string;
  action: CmdkAction;
  onRun: (a: CmdkAction) => void;
}) {
  const Icon = action.icon;
  return (
    <Command.Item
      value={value}
      onSelect={() => onRun(action)}
      className="cmdk-item w-full text-left px-3 py-2.5 mx-2 rounded-lg flex items-start gap-3 cursor-pointer
                 text-white/90 data-[selected=true]:bg-white/10 data-[selected=true]:text-white
                 hover:bg-white/5 transition-colors"
    >
      <Icon
        className="h-4 w-4 mt-0.5 shrink-0 text-amber-300"
        aria-hidden="true"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{action.label}</span>
        {action.hint && (
          <span className="block text-xs text-muted truncate mt-0.5">
            {action.hint}
          </span>
        )}
      </span>
      <CornerDownLeft
        className="h-3.5 w-3.5 text-muted shrink-0 mt-1 opacity-0 group-data-[selected=true]:opacity-100"
        aria-hidden="true"
      />
    </Command.Item>
  );
}

function SearchResultItem({
  value,
  result,
  onSelect,
}: {
  value: string;
  result: SearchResult;
  onSelect: (item: SearchItem) => void;
}) {
  const meta = TYPE_META[result.type];
  const Icon = meta.icon;
  return (
    <Command.Item
      value={value}
      onSelect={() => onSelect(result)}
      className="cmdk-item w-full text-left px-3 py-2.5 mx-2 rounded-lg flex items-start gap-3 cursor-pointer
                 text-white/90 data-[selected=true]:bg-white/10 data-[selected=true]:text-white
                 hover:bg-white/5 transition-colors"
    >
      <Icon
        className={`h-4 w-4 mt-0.5 shrink-0 ${meta.color}`}
        aria-hidden="true"
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{result.title}</span>
        {result.snippet && (
          <span className="block text-xs text-muted truncate mt-0.5">
            {result.snippet}
          </span>
        )}
      </span>
    </Command.Item>
  );
}

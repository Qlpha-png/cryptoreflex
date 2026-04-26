"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
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
  ArrowUp,
  ArrowDown,
} from "lucide-react";
// IMPORTANT : importer depuis `lib/search-client` (pur, zéro Node) et NON
// depuis `lib/search` qui pull `lib/mdx.ts` (node:fs + node:path) → casse
// le bundle webpack côté navigateur. Cf. RCA commits d776b2d → 7bd30ba.
import {
  searchIndex,
  type SearchItem,
  type SearchResult,
  type SearchType,
} from "@/lib/search-client";

/* -------------------------------------------------------------------------- */
/*  Constantes UI                                                             */
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

/* -------------------------------------------------------------------------- */
/*  Singleton state — un seul listener Cmd+K global                           */
/* -------------------------------------------------------------------------- */

type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();

/** Ouvre / ferme la palette depuis n'importe où (Navbar, footer, etc.). */
export function setCommandPaletteOpen(open: boolean) {
  for (const fn of listeners) fn(open);
}

/* -------------------------------------------------------------------------- */
/*  Hook : index chargé une fois côté client                                  */
/* -------------------------------------------------------------------------- */

function useSearchIndex(enabled: boolean) {
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || index || loading) return;
    setLoading(true);
    fetch("/api/search?index=1", { cache: "force-cache" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { items: SearchItem[] };
        setIndex(data.items);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      })
      .finally(() => setLoading(false));
  }, [enabled, index, loading]);

  return { index, loading, error };
}

/* -------------------------------------------------------------------------- */
/*  Composant                                                                 */
/* -------------------------------------------------------------------------- */

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const { index, loading } = useSearchIndex(open);

  /* -------- Listeners externes (setCommandPaletteOpen + custom event) --- */
  useEffect(() => {
    const fn: Listener = (next) => setOpen(next);
    listeners.add(fn);

    // Event "cmdk:open" — pattern alternative pour les triggers qui préfèrent
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
      // Focus input après mount (rAF pour laisser React render le portail/fade)
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      document.body.classList.remove("modal-open");
      // Reset state à la fermeture
      setQuery("");
      setActiveIndex(0);
      previouslyFocused.current?.focus?.();
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  /* -------- Recherche (memo) ------------------------------------------- */
  const results: SearchResult[] = useMemo(() => {
    if (!index || !query.trim()) return [];
    return searchIndex(index, query, 40);
  }, [index, query]);

  /* -------- Reset activeIndex quand la requête change ------------------ */
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  /* -------- Groupement par type + flat liste ordonnée ------------------ */
  const grouped = useMemo(() => {
    const map = new Map<SearchType, SearchResult[]>();
    for (const r of results) {
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
  }, [results]);

  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  /* -------- Navigation ------------------------------------------------- */
  const close = useCallback(() => setOpen(false), []);

  const go = useCallback(
    (item: SearchItem) => {
      close();
      router.push(item.url);
    },
    [router, close]
  );

  /* -------- Auto-scroll de l'item actif -------------------------------- */
  useEffect(() => {
    if (!open || flat.length === 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flat.length, open]);

  /* -------- Keyboard handler dans la palette --------------------------- */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(Math.max(0, flat.length - 1));
        return;
      }
      if (e.key === "Enter") {
        const target = flat[activeIndex];
        if (target) {
          e.preventDefault();
          go(target);
        } else if (query.trim()) {
          // Pas de résultats → page de recherche complète
          e.preventDefault();
          close();
          router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
        }
        return;
      }

      // Focus trap simple : Tab cyclique entre input et bouton "Voir tout"
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
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
    [activeIndex, close, flat, go, query, router]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recherche Cryptoreflex"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[15vh]"
      onKeyDown={onKeyDown}
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
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="h-5 w-5 text-muted shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher articles, plateformes, cryptos…"
            aria-label="Tape ta recherche"
            aria-autocomplete="list"
            aria-controls="cmdk-list"
            aria-activedescendant={
              flat[activeIndex] ? `cmdk-item-${activeIndex}` : undefined
            }
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
        <div className="max-h-[60vh] overflow-y-auto">
          {!index && loading && (
            <div className="px-4 py-8 text-center text-sm text-muted">
              Chargement de l&apos;index…
            </div>
          )}

          {index && query.trim() && flat.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted">
                Aucun résultat pour{" "}
                <span className="text-fg font-medium">
                  &laquo;{" "}
                  {query.trim().slice(0, 50)}
                  {query.trim().length > 50 ? "…" : ""}{" "}
                  &raquo;
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  close();
                  router.push(
                    `/recherche?q=${encodeURIComponent(query.trim())}`
                  );
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber-300 hover:text-amber-200 underline-offset-4 hover:underline"
              >
                Lancer une recherche complète
              </button>
            </div>
          )}

          {!query.trim() && (
            <EmptyState
              onPick={(q) => {
                setQuery(q);
                inputRef.current?.focus();
              }}
            />
          )}

          {flat.length > 0 && (
            <ul
              ref={listRef}
              id="cmdk-list"
              role="listbox"
              aria-label="Résultats de recherche"
              className="py-2"
            >
              {grouped.map((group) => {
                const meta = TYPE_META[group.type];
                return (
                  <li key={group.type} className="px-2 pb-2">
                    <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted/80 font-semibold flex items-center gap-1.5">
                      <meta.icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      {meta.label}
                      <span className="text-muted/50 font-normal">
                        ({group.items.length})
                      </span>
                    </div>
                    <ul role="group">
                      {group.items.map((item) => {
                        const idx = flat.findIndex((r) => r.id === item.id);
                        const active = idx === activeIndex;
                        return (
                          <li key={item.id} role="presentation">
                            <button
                              type="button"
                              role="option"
                              id={`cmdk-item-${idx}`}
                              data-idx={idx}
                              aria-selected={active}
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() => go(item)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors ${
                                active
                                  ? "bg-white/10 text-white"
                                  : "hover:bg-white/5 text-white/90"
                              }`}
                            >
                              <meta.icon
                                className={`h-4 w-4 mt-0.5 shrink-0 ${meta.color}`}
                                aria-hidden="true"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium truncate">
                                  {item.title}
                                </span>
                                {item.snippet && (
                                  <span className="block text-xs text-muted truncate mt-0.5">
                                    {item.snippet}
                                  </span>
                                )}
                              </span>
                              {active && (
                                <CornerDownLeft className="h-3.5 w-3.5 text-muted shrink-0 mt-1" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-background/60 px-4 py-2 text-[11px] text-muted hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hint icon={<ArrowUp className="h-3 w-3" />} label="Naviguer" />
            <Hint icon={<ArrowDown className="h-3 w-3" />} label="" />
            <Hint
              icon={<CornerDownLeft className="h-3 w-3" />}
              label="Ouvrir"
            />
            <Hint label="Esc" textOnly>
              Fermer
            </Hint>
          </div>
          <span>Cryptoreflex Search</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function Hint({
  icon,
  label,
  textOnly,
  children,
}: {
  icon?: React.ReactNode;
  label?: string;
  textOnly?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon && (
        <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] rounded border border-border/60 bg-elevated px-1 text-muted">
          {icon}
        </kbd>
      )}
      {textOnly && label && (
        <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-border/60 bg-elevated text-[10px] text-muted">
          {label}
        </kbd>
      )}
      {label && !textOnly && <span>{label}</span>}
      {children && <span>{children}</span>}
    </span>
  );
}

const SUGGESTIONS: Array<{ q: string; label: string }> = [
  { q: "binance", label: "Binance" },
  { q: "ledger", label: "Ledger" },
  { q: "bitcoin", label: "Bitcoin" },
  { q: "fiscalite", label: "Fiscalité crypto" },
  { q: "mica", label: "MiCA" },
  { q: "dca", label: "Stratégie DCA" },
];

/**
 * EmptyState — UI pédagogue et guidante quand pas encore de query.
 *
 * Audit user 26/04/2026 ('Ne fonctionne pas - Je veux une recherche bien
 * dynamique et pédagogue qui guide') : refonte complète pour :
 *  - Sections guides par persona (Débutant / Intermédiaire / Avancé)
 *  - Suggestions populaires colorées par catégorie
 *  - Raccourcis clavier visibles (↑↓ Enter Esc)
 *  - Ce qu'on peut chercher (5 catégories iconographiées)
 *  - Tone "main tenue" : phrases d'exemple "Que cherches-tu ?"
 */
function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="p-5 sm:p-6">
      {/* Section 1 : Pour qui es-tu ? Guidance par persona */}
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-wider text-amber-300/90 font-bold flex items-center gap-1.5 mb-2">
          <Search className="h-3 w-3" /> Pour bien commencer
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <PersonaCard
            label="Je débute"
            icon="🌱"
            queries={["acheter bitcoin", "premier achat crypto", "MiCA c'est quoi"]}
            onPick={onPick}
          />
          <PersonaCard
            label="Je compare"
            icon="⚖️"
            queries={["coinbase vs binance", "comparatif plateformes", "frais kraken"]}
            onPick={onPick}
          />
          <PersonaCard
            label="J'apprends"
            icon="📚"
            queries={["RSI MACD", "staking ETH", "fiscalité crypto"]}
            onPick={onPick}
          />
        </div>
      </div>

      {/* Section 2 : Suggestions populaires (chips colorés) */}
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-wider text-muted/80 font-semibold mb-2">
          Suggestions populaires
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.q}
              type="button"
              onClick={() => onPick(s.q)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-elevated px-3 py-1.5 text-xs text-white/85 hover:border-amber-300/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Search className="h-3 w-3 text-muted" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 3 : Ce que tu peux chercher (catégories iconographiées) */}
      <div className="mb-5 rounded-xl border border-border/60 bg-surface/50 p-3">
        <p className="text-[11px] uppercase tracking-wider text-muted/80 font-semibold mb-2">
          Tu peux chercher dans
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-[11px]">
          {TYPE_ORDER.map((type) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            return (
              <span key={type} className="inline-flex items-center gap-1.5 text-fg/75">
                <Icon className={`h-3 w-3 ${meta.color}`} aria-hidden="true" />
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Section 4 : Raccourcis clavier */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted/80">
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-elevated border border-border/60 font-mono text-[10px]">↑</kbd>
          <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-elevated border border-border/60 font-mono text-[10px]">↓</kbd>
          naviguer
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-elevated border border-border/60 font-mono text-[10px]">↵</kbd>
          ouvrir
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-elevated border border-border/60 font-mono text-[10px]">Esc</kbd>
          fermer
        </span>
        <span className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-elevated border border-border/60 font-mono text-[10px]">⌘K</kbd>
          réouvrir
        </span>
      </div>
    </div>
  );
}

/**
 * PersonaCard — bloc guidance par persona (Débutant / Intermédiaire / Avancé).
 * Affiche 3 exemples de query au format chip cliquable.
 */
function PersonaCard({
  label,
  icon,
  queries,
  onPick,
}: {
  label: string;
  icon: string;
  queries: string[];
  onPick: (q: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface/50 p-2.5">
      <div className="text-[11px] font-bold text-white mb-1.5 flex items-center gap-1.5">
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {queries.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="text-left text-[11px] text-fg/70 hover:text-amber-300 transition-colors truncate"
          >
            → {q}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ArrowRight,
  Gem,
  Trophy,
  X,
  Scale,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAllCryptos, type AnyCrypto } from "@/lib/cryptos";
import type { UnifiedCrypto } from "@/lib/cryptos-extended";
import { useCompareList } from "@/lib/use-compare-list";
import Tilt3D from "@/components/ui/Tilt3D";
import CryptoLogo from "@/components/ui/CryptoLogo";

/**
 * Navigateur /cryptos — liste UNIFIEE (100 premium + ~680 LLM) avec recherche,
 * filtres et PAGINATION client-side (48/page) pour ne jamais monter les 780
 * cartes dans le DOM d'un coup (perf). Les données arrivent du Server Component
 * parent (getAllCryptosUnified, cache 6h) → zéro coût LLM, ~1 lecture Supabase/6h.
 *
 * - source "static" → carte riche (tagline, fiabilité) via lib/cryptos.ts.
 * - source "llm-pipeline" → carte légère (logo + nom + catégorie + rang).
 */

type FilterKind = "all" | "top10" | "hidden-gem" | "llm";

const PER_PAGE = 48;

const FILTERS: Array<{ key: FilterKind; label: string; icon: typeof Trophy }> = [
  { key: "all", label: "Toutes", icon: Filter },
  { key: "top10", label: "Top 10", icon: Trophy },
  { key: "hidden-gem", label: "Hidden Gems", icon: Gem },
  { key: "llm", label: "Analyses", icon: Sparkles },
];

const CATEGORY_ORDER = [
  "Layer 1",
  "Layer 2",
  "DeFi",
  "DePIN / Infra",
  "Memecoin",
  "Stablecoin",
  "Gaming / NFT",
  "Privacy / ZK",
  "RWA",
  "Oracles / Données",
  "Autre",
];

/** Regroupe une catégorie brute (string libre) en l'un des CATEGORY_ORDER. */
function classifyCategory(catRaw?: string): string {
  const cat = (catRaw || "").toLowerCase();
  if (cat.includes("layer 2") || cat.includes("l2")) return "Layer 2";
  if (
    cat.includes("layer 1") ||
    cat.includes("layer 0") ||
    cat.includes("smart contract") ||
    cat.includes("plateforme")
  )
    return "Layer 1";
  if (cat.includes("defi") || cat.includes("dex") || cat.includes("staking") || cat.includes("lending"))
    return "DeFi";
  if (
    cat.includes("depin") ||
    cat.includes("infra") ||
    cat.includes("storage") ||
    cat.includes("compute") ||
    cat.includes("ai") ||
    cat.includes("ia")
  )
    return "DePIN / Infra";
  if (cat.includes("meme")) return "Memecoin";
  if (cat.includes("stablecoin")) return "Stablecoin";
  if (cat.includes("gaming") || cat.includes("metaverse") || cat.includes("nft")) return "Gaming / NFT";
  if (cat.includes("privacy") || cat.includes("zk") || cat.includes("zero")) return "Privacy / ZK";
  if (cat.includes("rwa") || cat.includes("real world")) return "RWA";
  if (cat.includes("oracle")) return "Oracles / Données";
  return "Autre";
}

/** Clé de tri : Top 10 d'abord, puis Hidden Gems, puis LLM par market cap rank. */
function rankKey(c: UnifiedCrypto, staticById: Map<string, AnyCrypto>): number {
  if (c.source === "static") {
    const r = staticById.get(c.id);
    if (r && r.kind === "top10") return r.rank ?? 99;
    return 1000 + (r?.rank ?? 999);
  }
  return 100000 + (c.marketCapRank ?? 99999);
}

/** Fenêtre de pagination compacte : 1 … n-1 n n+1 … total. */
function pageWindow(current: number, total: number): Array<number | "…"> {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

export default function CryptosBrowser({ items }: { items: UnifiedCrypto[] }) {
  // Données riches des 100 statiques (sync, déjà bundlées) indexées par id.
  const staticById = useMemo(() => {
    const m = new Map<string, AnyCrypto>();
    for (const c of getAllCryptos()) m.set(c.id, c);
    return m;
  }, []);

  const [filter, setFilter] = useState<FilterKind>("all");
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { list: compareList, hydrated: compareHydrated } = useCompareList();

  const counts = useMemo(() => {
    const c: Record<FilterKind, number> = { all: items.length, top10: 0, "hidden-gem": 0, llm: 0 };
    for (const it of items) {
      if (it.source === "llm-pipeline") c.llm++;
      else {
        const r = staticById.get(it.id);
        if (r?.kind === "top10") c.top10++;
        else if (r?.kind === "hidden-gem") c["hidden-gem"]++;
      }
    }
    return c;
  }, [items, staticById]);

  const categoryGroups = useMemo(() => {
    const g: Record<string, number> = {};
    for (const it of items) {
      const name = classifyCategory(it.category);
      g[name] = (g[name] || 0) + 1;
    }
    return CATEGORY_ORDER.filter((n) => g[n] > 0).map((n) => ({ name: n, count: g[n] }));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "llm") list = list.filter((c) => c.source === "llm-pipeline");
    else if (filter === "top10" || filter === "hidden-gem")
      list = list.filter((c) => c.source === "static" && staticById.get(c.id)?.kind === filter);
    if (category) list = list.filter((c) => classifyCategory(c.category) === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => {
        const r = c.source === "static" ? staticById.get(c.id) : undefined;
        return (
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q) ||
          (c.category || "").toLowerCase().includes(q) ||
          (r?.tagline || "").toLowerCase().includes(q)
        );
      });
    }
    return [...list].sort((a, b) => rankKey(a, staticById) - rankKey(b, staticById));
  }, [items, filter, category, query, staticById]);

  // Reset à la page 1 dès qu'un filtre/recherche change.
  useEffect(() => {
    setPage(1);
  }, [filter, category, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  function goToPage(p: number) {
    setPage(p);
    if (typeof document !== "undefined") {
      document.getElementById("cryptos-grid-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <>
      {/* CTA Comparer — visible quand 2+ cryptos sélectionnées via les fiches. */}
      {compareHydrated && compareList.length >= 2 && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
              <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-semibold text-fg">
                {compareList.length} crypto
                {compareList.length > 1 ? "s" : ""} dans votre comparateur
              </div>
              <div className="text-xs text-muted">Visualise-les côte à côte sur une seule page.</div>
            </div>
          </div>
          <Link
            href={`/cryptos/comparer?ids=${compareList.join(",")}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ouvrir le comparatif
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Filtres type + recherche */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(({ key, label, icon: Icon }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary/50 bg-primary/15 text-primary-soft"
                    : "border-border bg-surface text-muted hover:text-fg hover:border-primary/30"
                }`}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className="text-[10px] opacity-70">({counts[key]})</span>
              </button>
            );
          })}
        </div>

        <div className="relative sm:max-w-xs sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom, symbole, catégorie…)"
            className="w-full rounded-full border border-border bg-surface pl-9 pr-4 py-2 text-sm text-fg placeholder:text-muted focus:border-primary/50 focus:outline-none"
            aria-label="Rechercher une crypto"
          />
        </div>
      </div>

      {/* Filtre catégorie */}
      <div className="mt-3 flex items-center gap-2 flex-nowrap overflow-x-auto sm:flex-wrap snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
        <span className="text-[11px] uppercase tracking-wider text-muted shrink-0">Catégorie</span>
        {categoryGroups.map((g) => {
          const active = category === g.name;
          return (
            <button
              key={g.name}
              onClick={() => setCategory(active ? "" : g.name)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] shrink-0 snap-start ${
                active
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                  : "border-border bg-surface text-muted hover:text-fg hover:border-amber-400/30"
              }`}
              aria-pressed={active}
            >
              {g.name}
              <span className="text-[10px] opacity-70">({g.count})</span>
            </button>
          );
        })}
        {category && (
          <button
            onClick={() => setCategory("")}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:text-fg min-h-[36px] shrink-0"
            aria-label="Réinitialiser le filtre catégorie"
          >
            <X className="h-3 w-3" /> Effacer
          </button>
        )}
      </div>

      {/* Ancre + compteur résultats */}
      <div id="cryptos-grid-top" className="scroll-mt-24" />
      <p className="mt-5 text-xs text-muted">
        <span className="font-semibold text-fg">{filtered.length}</span> crypto
        {filtered.length > 1 ? "s" : ""}
        {filtered.length !== items.length && ` sur ${items.length}`}
        {totalPages > 1 && ` · page ${safePage}/${totalPages}`}
      </p>

      {/* Grid (page courante uniquement) */}
      {filtered.length === 0 ? (
        <p className="mt-12 text-sm text-muted">
          Aucune crypto ne correspond à votre recherche. Essayez un autre mot-clé ou effacez les
          filtres.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageItems.map((c) => {
            const rich = c.source === "static" ? staticById.get(c.id) : undefined;
            return (
              <Tilt3D key={c.id} max={4}>
                {rich ? <CryptoCard crypto={rich} /> : <LightCryptoCard c={c} />}
              </Tilt3D>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
          <button
            onClick={() => goToPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg hover:border-primary/40 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" /> Préc.
          </button>
          {pageWindow(safePage, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`dot-${i}`} className="px-1.5 text-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goToPage(p)}
                aria-current={p === safePage ? "page" : undefined}
                className={`min-w-[36px] rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  p === safePage
                    ? "border-primary/50 bg-primary/15 text-primary-soft"
                    : "border-border bg-surface text-muted hover:text-fg hover:border-primary/30"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg hover:border-primary/40 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Page suivante"
          >
            Suiv. <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cartes                                                                    */
/* -------------------------------------------------------------------------- */

/** Carte riche pour les 100 fiches éditoriales premium (données statiques). */
function CryptoCard({ crypto }: { crypto: AnyCrypto }) {
  const isGem = crypto.kind === "hidden-gem";
  return (
    <Link
      href={`/cryptos/${crypto.id}`}
      aria-label={`${crypto.name} (${crypto.symbol}) — ${isGem ? "Hidden Gem" : `Top ${crypto.rank}`}`}
      className="spotlight-card group h-full rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <CryptoLogo
            symbol={crypto.symbol}
            coingeckoId={crypto.id}
            size={40}
            shape="rounded"
            className="ring-1 ring-border shrink-0"
            viewTransitionId={`crypto-logo-${crypto.symbol.toLowerCase()}`}
          />
          <div className="min-w-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isGem
                  ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border border-primary/30 bg-primary/10 text-primary-soft"
              }`}
            >
              {isGem ? <Gem className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
              {isGem ? "Hidden Gem" : `Top ${crypto.rank}`}
            </span>
            <h2 className="mt-1 text-lg font-bold text-fg truncate">
              {crypto.name} <span className="font-mono text-sm text-muted">{crypto.symbol}</span>
            </h2>
            <p className="text-xs text-muted truncate">
              {crypto.category} · {crypto.yearCreated}
            </p>
          </div>
        </div>
        {isGem && (
          <div className="shrink-0 rounded-lg border border-border bg-elevated px-2 py-1 text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted">Fiabilité</div>
            <div className="font-mono text-sm font-bold text-fg">{crypto.reliability.score.toFixed(1)}</div>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm italic text-primary-soft line-clamp-2">{crypto.tagline}</p>
      <p className="mt-2 text-xs text-fg/70 line-clamp-3 leading-relaxed flex-1">{crypto.what}</p>

      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft group-hover:text-primary">
        Lire la fiche
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

/** Carte légère pour les fiches générées (LLM pipeline) — data minimale. */
function LightCryptoCard({ c }: { c: UnifiedCrypto }) {
  return (
    <Link
      href={`/cryptos/${c.id}`}
      aria-label={`${c.name} (${c.symbol}) — analyse complète`}
      className="spotlight-card group h-full rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors flex flex-col"
    >
      <div className="flex items-start gap-3 min-w-0">
        <CryptoLogo
          symbol={c.symbol}
          coingeckoId={c.coingeckoId}
          size={40}
          shape="rounded"
          className="ring-1 ring-border shrink-0"
        />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 text-violet-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Analyse
          </span>
          <h2 className="mt-1 text-lg font-bold text-fg truncate">
            {c.name} <span className="font-mono text-sm text-muted">{c.symbol}</span>
          </h2>
          <p className="text-xs text-muted truncate">
            {c.category || "Crypto"}
            {typeof c.marketCapRank === "number" ? ` · #${c.marketCapRank}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft group-hover:text-primary">
        Lire la fiche
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

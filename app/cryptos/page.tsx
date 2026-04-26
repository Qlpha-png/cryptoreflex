"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Filter, ArrowRight, Gem, Trophy } from "lucide-react";
import { getAllCryptos, type AnyCrypto } from "@/lib/cryptos";

type FilterKind = "all" | "top10" | "hidden-gem";

const FILTERS: Array<{ key: FilterKind; label: string; icon: typeof Trophy }> = [
  { key: "all", label: "Toutes", icon: Filter },
  { key: "top10", label: "Top 10", icon: Trophy },
  { key: "hidden-gem", label: "Hidden Gems", icon: Gem },
];

/**
 * Index /cryptos — liste filtrable + recherche locale.
 *
 * Client Component pour permettre la recherche live + le filter sans round-trip serveur.
 * Les datasets étant statiques (top 10 + hidden gems), tout tient en mémoire (~20 entrées).
 */
export default function CryptosIndexPage() {
  const all = useMemo(() => getAllCryptos(), []);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = all;
    if (filter !== "all") list = list.filter((c) => c.kind === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.tagline.toLowerCase().includes(q)
      );
    }
    return list;
  }, [all, filter, query]);

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Cryptos</span>
        </nav>

        {/* Header */}
        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Toutes nos fiches <span className="gradient-text">crypto</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            20 fiches détaillées : 10 cryptos majeures expliquées pour les débutants
            (Top 10 par capitalisation) et 10 "hidden gems" avec score de fiabilité
            calculé sur méthodologie publique.
          </p>
        </header>

        {/* Filtres + recherche */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(({ key, label, icon: Icon }) => {
              const active = filter === key;
              const count =
                key === "all"
                  ? all.length
                  : all.filter((c) => c.kind === key).length;
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
                  <span className="text-[10px] opacity-70">({count})</span>
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

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="mt-12 text-sm text-muted">
            Aucune crypto ne correspond à ta recherche.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <CryptoCard key={c.id} crypto={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CryptoCard({ crypto }: { crypto: AnyCrypto }) {
  const isGem = crypto.kind === "hidden-gem";
  return (
    <Link
      href={`/cryptos/${crypto.id}`}
      className="group rounded-2xl border border-border bg-surface p-5 hover:border-primary/40 transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
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
          <h2 className="mt-2 text-lg font-bold text-fg truncate">
            {crypto.name}{" "}
            <span className="font-mono text-sm text-muted">{crypto.symbol}</span>
          </h2>
          <p className="text-xs text-muted truncate">
            {crypto.category} · {crypto.yearCreated}
          </p>
        </div>
        {isGem && (
          <div className="shrink-0 rounded-lg border border-border bg-elevated px-2 py-1 text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted">Fiabilité</div>
            <div className="font-mono text-sm font-bold text-fg">
              {crypto.reliability.score.toFixed(1)}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm italic text-primary-soft line-clamp-2">{crypto.tagline}</p>
      <p className="mt-2 text-xs text-fg/70 line-clamp-3 leading-relaxed flex-1">
        {crypto.what}
      </p>

      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft group-hover:text-primary">
        Lire la fiche
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

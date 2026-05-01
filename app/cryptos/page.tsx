"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Filter, ArrowRight, Gem, Trophy, X, Scale } from "lucide-react";
import { getAllCryptos, type AnyCrypto } from "@/lib/cryptos";
import { useCompareList } from "@/lib/use-compare-list";

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
 * 100 entrées : tient en mémoire sans souci, pas besoin de pagination.
 *
 * Filtres :
 *  - Kind (toutes / top10 / hidden gems)
 *  - Catégorie (Layer 1, DeFi, DePIN, RWA, Memecoin, Stablecoin, etc.)
 *  - Recherche full-text sur name / symbol / category / tagline
 */
export default function CryptosIndexPage() {
  const all = useMemo(() => getAllCryptos(), []);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const { list: compareList, hydrated: compareHydrated } = useCompareList();

  // Catégories agrégées dynamiquement depuis les datasets — on regroupe les
  // catégories proches via une heuristique simple pour ne pas avoir 40 chips.
  const categoryGroups = useMemo(() => {
    const groups: Record<string, string[]> = {
      "Layer 1": [],
      "Layer 2": [],
      "DeFi": [],
      "DePIN / Infra": [],
      "Memecoin": [],
      "Stablecoin": [],
      "Gaming / NFT": [],
      "Privacy / ZK": [],
      "RWA": [],
      "Oracles / Données": [],
      "Autre": [],
    };
    all.forEach((c) => {
      const cat = c.category.toLowerCase();
      if (cat.includes("layer 2") || cat.includes("l2")) {
        groups["Layer 2"].push(c.id);
      } else if (cat.includes("layer 1") || cat.includes("layer 0") || cat.includes("smart contracts") || cat.includes("plateforme")) {
        groups["Layer 1"].push(c.id);
      } else if (cat.includes("defi") || cat.includes("dex") || cat.includes("liquid staking") || cat.includes("lending")) {
        groups["DeFi"].push(c.id);
      } else if (cat.includes("depin") || cat.includes("infrastructure") || cat.includes("storage") || cat.includes("compute") || cat.includes("ai") || cat.includes("ia")) {
        groups["DePIN / Infra"].push(c.id);
      } else if (cat.includes("meme")) {
        groups["Memecoin"].push(c.id);
      } else if (cat.includes("stablecoin")) {
        groups["Stablecoin"].push(c.id);
      } else if (cat.includes("gaming") || cat.includes("metaverse") || cat.includes("nft")) {
        groups["Gaming / NFT"].push(c.id);
      } else if (cat.includes("privacy") || cat.includes("zk") || cat.includes("zero")) {
        groups["Privacy / ZK"].push(c.id);
      } else if (cat.includes("rwa") || cat.includes("real world")) {
        groups["RWA"].push(c.id);
      } else if (cat.includes("oracle")) {
        groups["Oracles / Données"].push(c.id);
      } else {
        groups["Autre"].push(c.id);
      }
    });
    return Object.entries(groups)
      .filter(([, ids]) => ids.length > 0)
      .map(([name, ids]) => ({ name, count: ids.length, ids: new Set(ids) }));
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;
    if (filter !== "all") list = list.filter((c) => c.kind === filter);
    if (category) {
      const group = categoryGroups.find((g) => g.name === category);
      if (group) list = list.filter((c) => group.ids.has(c.id));
    }
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
  }, [all, filter, category, query, categoryGroups]);

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
            100 cryptos <span className="gradient-text">analysées</span>
          </h1>
          <p className="mt-3 text-base text-muted">
            La plus grande base d&apos;analyse crypto francophone : 10 cryptos majeures
            expliquées pour les débutants (Top 10 par capitalisation), 90 fiches Hidden Gems
            avec score de fiabilité calculé sur méthodologie publique. Régulation MiCA, audits,
            backers, risques — tout est documenté.
          </p>
        </header>

        {/* CTA Comparer — visible quand l'utilisateur a déjà sélectionné 2+
            cryptos via les boutons "+ Comparer" sur les fiches. Permet de
            sauter directement au comparatif sans re-cliquer dans le drawer. */}
        {compareHydrated && compareList.length >= 2 && (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
              </span>
              <div>
                <div className="text-sm font-semibold text-fg">
                  {compareList.length} crypto
                  {compareList.length > 1 ? "s" : ""} dans ton comparateur
                </div>
                <div className="text-xs text-muted">
                  Visualise-les côte à côte sur une seule page.
                </div>
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

        {/* Filtres kind + recherche */}
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

        {/* Filtre catégorie */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-muted">
            Catégorie
          </span>
          {categoryGroups.map((g) => {
            const active = category === g.name;
            return (
              <button
                key={g.name}
                onClick={() => setCategory(active ? "" : g.name)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-[10px] text-muted hover:text-fg"
              aria-label="Réinitialiser le filtre catégorie"
            >
              <X className="h-3 w-3" /> Effacer
            </button>
          )}
        </div>

        {/* Compteur résultats */}
        <p className="mt-5 text-xs text-muted">
          <span className="font-semibold text-fg">{filtered.length}</span> crypto{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}
          {filtered.length !== all.length && ` sur ${all.length} au total`}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="mt-12 text-sm text-muted">
            Aucune crypto ne correspond à ta recherche. Essaie un autre mot-clé ou efface les filtres.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

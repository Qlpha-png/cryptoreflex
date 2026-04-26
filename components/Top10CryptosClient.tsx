"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Grid2X2,
  GraduationCap,
  List as ListIcon,
  ShieldCheck,
} from "lucide-react";
import ScrollReveal from "./ui/ScrollReveal";
import CryptoLogo from "./ui/CryptoLogo";

/**
 * Top10CryptosClient — version interactive de la section "Top 10 expliquées".
 *
 * Architecture (P1-3 + P1-4 audit-front-2026) :
 *  - Reçoit la liste pré-rendue côté Server (cf. wrapper Top10CryptosSection),
 *    aucune fetch à la mount → hydration-safe.
 *  - SSR par défaut : pas de filtre (Tous), grid view, ordre par rang.
 *    Le re-render Client après mount n'a pas de flash car les valeurs initiales
 *    matchent l'output Server (pas de `Date.now`, pas de `Math.random`).
 *  - Filtres "chips" role=radiogroup (a11y propre, pas un select natif qui
 *    masque l'état actif). Mapping `category` JSON → 7 buckets fonctionnels.
 *  - Tri dropdown <select> natif (clavier OS, plus accessible qu'un combobox custom).
 *  - Toggle View grid/list : grid = cards 2-col, list = ligne dense (table-like).
 *  - prefers-reduced-motion : ScrollReveal le respecte déjà ; toggles sans transition.
 */

export interface TopCrypto {
  rank: number;
  id: string;
  name: string;
  symbol: string;
  /** ID CoinGecko (utilisé pour résoudre le logo officiel via lib/crypto-logos.ts). */
  coingeckoId?: string;
  yearCreated: number;
  category: string;
  tagline: string;
  what: string;
  useCase: string;
  beginnerFriendly: number;
  riskLevel: "Très faible" | "Faible" | "Modéré" | "Élevé" | "Très élevé";
  whereToBuy: string[];
  strengths: string[];
}

const RISK_COLORS: Record<string, string> = {
  "Très faible": "text-accent-green",
  Faible: "text-accent-green",
  Modéré: "text-amber-400",
  Élevé: "text-accent-rose",
  "Très élevé": "text-accent-rose",
};

const RISK_RANK: Record<TopCrypto["riskLevel"], number> = {
  "Très faible": 0,
  Faible: 1,
  Modéré: 2,
  Élevé: 3,
  "Très élevé": 4,
};

/* -------------------------------------------------------------------------- */
/*  Filter buckets — mapping `category` brut (JSON) → libellé filtre stable   */
/* -------------------------------------------------------------------------- */

type Bucket =
  | "all"
  | "layer1"
  | "defi"
  | "stablecoins"
  | "memecoins"
  | "smartcontract"
  | "privacy"
  | "other";

function categoryBucket(category: string): Exclude<Bucket, "all"> {
  const c = category.toLowerCase();
  if (c.includes("memecoin") || c.includes("meme")) return "memecoins";
  if (c.includes("stablecoin")) return "stablecoins";
  if (c.includes("privacy") || c.includes("confidentialité")) return "privacy";
  if (c.includes("defi") || c.includes("oracle")) return "defi";
  if (c.includes("smart contract")) return "smartcontract";
  if (
    c.includes("réserve de valeur") ||
    c.includes("layer 1") ||
    c.includes("plateforme de smart contracts") ||
    c.includes("paiement")
  ) {
    return "layer1";
  }
  return "other";
}

const FILTERS: Array<{ value: Bucket; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "layer1", label: "Layer 1" },
  { value: "smartcontract", label: "Smart Contract" },
  { value: "defi", label: "DeFi" },
  { value: "stablecoins", label: "Stablecoins" },
  { value: "memecoins", label: "Memecoins" },
  { value: "privacy", label: "Privacy" },
  { value: "other", label: "Other" },
];

/* -------------------------------------------------------------------------- */
/*  Sort options                                                              */
/* -------------------------------------------------------------------------- */

type SortKey = "rank" | "risk-asc" | "beginner-desc" | "year-desc";

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "rank", label: "Rang (défaut)" },
  { value: "risk-asc", label: "Risque croissant" },
  { value: "beginner-desc", label: "Beginner-friendly décroissant" },
  { value: "year-desc", label: "Année création desc" },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function Top10CryptosClient({
  cryptos,
}: {
  cryptos: TopCrypto[];
}) {
  // SSR-safe defaults : "all" + grid view + tri par rang.
  // Aucun useEffect ne mute ces états avant interaction utilisateur,
  // donc le HTML rendu côté client au premier render === HTML serveur.
  const [bucket, setBucket] = useState<Bucket>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [view, setView] = useState<"grid" | "list">("grid");
  // Pour éviter tout warning hydration (ex: si on lisait un `localStorage`),
  // on flaggue "mounted" — utile pour rendre des features Client-only après hydratation.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* -------- Comptes par filtre (mémo) ---------------------------------- */
  const counts = useMemo(() => {
    const m: Record<Bucket, number> = {
      all: cryptos.length,
      layer1: 0,
      defi: 0,
      stablecoins: 0,
      memecoins: 0,
      smartcontract: 0,
      privacy: 0,
      other: 0,
    };
    for (const c of cryptos) {
      const b = categoryBucket(c.category);
      m[b]++;
    }
    return m;
  }, [cryptos]);

  /* -------- Liste filtrée + triée -------------------------------------- */
  const filtered = useMemo(() => {
    const base =
      bucket === "all"
        ? cryptos
        : cryptos.filter((c) => categoryBucket(c.category) === bucket);

    const sorted = [...base];
    sorted.sort((a, b) => {
      switch (sort) {
        case "risk-asc":
          return RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel] || a.rank - b.rank;
        case "beginner-desc":
          return b.beginnerFriendly - a.beginnerFriendly || a.rank - b.rank;
        case "year-desc":
          return b.yearCreated - a.yearCreated || a.rank - b.rank;
        case "rank":
        default:
          return a.rank - b.rank;
      }
    });
    return sorted;
  }, [cryptos, bucket, sort]);

  return (
    <section id="top10" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="badge-info">
            <GraduationCap className="h-3.5 w-3.5" />
            Pédagogique
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Top 10 cryptos <span className="gradient-text">expliquées simplement</span>
          </h2>
          <p className="mt-2 text-muted text-sm max-w-2xl">
            Les 10 plus grosses cryptomonnaies du moment, expliquées en 2 phrases pour qu'un
            débutant comprenne ce que c'est et à quoi ça sert. Sans jargon.
          </p>
        </div>

        {/* Toolbar : filtres + tri + view toggle */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {/* Chips filtres — role=radiogroup */}
          <div
            role="radiogroup"
            aria-label="Filtrer par catégorie"
            className="flex flex-wrap gap-1.5"
          >
            {FILTERS.map((f) => {
              const active = bucket === f.value;
              const n = counts[f.value];
              const disabled = n === 0;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-pressed={active}
                  aria-label={`${f.label}, ${n} crypto${n > 1 ? "s" : ""}`}
                  disabled={disabled}
                  onClick={() => setBucket(f.value)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-primary bg-primary/15 text-primary-glow"
                      : disabled
                        ? "border-border/40 bg-surface/50 text-muted/50 cursor-not-allowed"
                        : "border-border bg-surface text-fg/70 hover:border-primary/40 hover:text-fg",
                  ].join(" ")}
                >
                  {f.label}
                  <span className="text-[10px] text-muted">({n})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort dropdown — natif pour a11y OS */}
            <label htmlFor="top10-sort" className="sr-only">
              Trier les cryptos
            </label>
            <select
              id="top10-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg/80 hover:text-fg
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Trier les cryptos"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* View toggle grid/list */}
            <div
              role="group"
              aria-label="Choisir l'affichage"
              className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5"
            >
              <button
                type="button"
                aria-label="Affichage en grille"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                className={[
                  "inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  view === "grid"
                    ? "bg-primary/15 text-primary-glow"
                    : "text-muted hover:text-fg",
                ].join(" ")}
              >
                <Grid2X2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Affichage en liste"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                className={[
                  "inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  view === "list"
                    ? "bg-primary/15 text-primary-glow"
                    : "text-muted hover:text-fg",
                ].join(" ")}
              >
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Compte filtré (a11y) */}
        <p className="sr-only" aria-live="polite">
          {filtered.length} crypto{filtered.length > 1 ? "s" : ""} affichée
          {filtered.length > 1 ? "s" : ""}.
        </p>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
            <p className="text-fg/70 text-sm">
              Aucune crypto dans cette catégorie pour le moment.
            </p>
            <button
              type="button"
              onClick={() => setBucket("all")}
              className="mt-3 text-sm font-semibold text-primary-glow hover:underline"
            >
              Réinitialiser le filtre
            </button>
          </div>
        ) : view === "grid" ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
            {filtered.map((c, i) => (
              <ScrollReveal key={c.id} delay={mounted ? i * 60 : 0} direction="up">
                <CryptoCard crypto={c} />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
            <ul className="divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id}>
                  <CryptoListRow crypto={c} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function CryptoCard({ crypto }: { crypto: TopCrypto }) {
  return (
    <article className="glass rounded-2xl p-6 hover:border-primary/50 hover-lift group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <CryptoLogo
              symbol={crypto.symbol}
              coingeckoId={crypto.coingeckoId ?? crypto.id}
              size={44}
              className="ring-1 ring-border"
            />
            <span
              aria-label={`Rang ${crypto.rank}`}
              className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-background font-bold font-mono text-[10px] px-1 ring-2 ring-background"
            >
              {crypto.rank}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-fg truncate">
              {crypto.name}{" "}
              <span className="text-muted font-mono text-sm">{crypto.symbol}</span>
            </h3>
            <p className="text-xs text-muted truncate">
              {crypto.category} · {crypto.yearCreated}
            </p>
          </div>
        </div>

        <span
          className={`text-xs font-semibold whitespace-nowrap ${RISK_COLORS[crypto.riskLevel]}`}
        >
          ● {crypto.riskLevel}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-primary-soft italic">{crypto.tagline}</p>

      <p className="mt-3 text-sm text-fg/80 leading-relaxed">{crypto.what}</p>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
          À quoi ça sert
        </div>
        <p className="text-sm text-fg/75 leading-relaxed line-clamp-3">{crypto.useCase}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs">
        <div className="inline-flex items-center gap-1 text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
          <span>Disponible sur :</span>
          <span className="text-fg font-medium">
            {crypto.whereToBuy.slice(0, 3).join(", ")}
          </span>
        </div>
        <a
          href={`#plateformes`}
          className="inline-flex items-center gap-1 text-primary-soft font-semibold hover:text-primary"
        >
          Acheter
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}

function CryptoListRow({ crypto }: { crypto: TopCrypto }) {
  return (
    <a
      href={`/cryptos/${crypto.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/40 active:bg-elevated/60 transition-colors
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span className="flex h-7 w-7 items-center justify-center text-muted font-mono text-[11px] shrink-0 tabular-nums">
        {crypto.rank}
      </span>
      <CryptoLogo
        symbol={crypto.symbol}
        coingeckoId={crypto.coingeckoId ?? crypto.id}
        size={32}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-fg text-sm truncate">{crypto.name}</span>
          <span className="text-[11px] text-muted font-mono uppercase shrink-0">
            {crypto.symbol}
          </span>
        </div>
        <div className="text-[11px] text-muted truncate">{crypto.tagline}</div>
      </div>

      <div className="hidden sm:block text-[11px] text-muted shrink-0 max-w-[180px] truncate">
        {crypto.category}
      </div>

      <div
        className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${RISK_COLORS[crypto.riskLevel]}`}
        aria-label={`Niveau de risque : ${crypto.riskLevel}`}
      >
        ● {crypto.riskLevel}
      </div>

      <div className="hidden md:flex items-center gap-1 text-[11px] text-muted shrink-0">
        <span>Débutant</span>
        <span className="font-bold text-fg">{crypto.beginnerFriendly}/5</span>
      </div>

      <ArrowRight className="h-4 w-4 text-muted shrink-0" aria-hidden="true" />
    </a>
  );
}

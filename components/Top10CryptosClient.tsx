"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Grid2X2,
  GraduationCap,
  List as ListIcon,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Layers,
  LineChart,
  Anchor,
  EyeOff,
  FileCode,
  Coins as CoinsIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import ScrollReveal from "./ui/ScrollReveal";
import CryptoLogo from "./ui/CryptoLogo";

/**
 * Top10CryptosClient — version interactive de la section "Top 10 expliquées".
 *
 * Audit Block 5 RE-AUDIT 26/04/2026 (5 agents PRO consolidés) :
 *
 * VAGUE 1 — A11y EAA P0 (Agent A11y juin 2025)
 *  - Radiogroup keyboard navigation : ArrowLeft/Right/Home/End + roving tabindex.
 *  - Disabled chip : aria-disabled="true" (pas disabled HTML qui sort du tab order).
 *  - Tap targets 36px min sur chips, 40px min sur toggle view (WCAG 2.5.8).
 *  - Risk color-only fix : icône (ShieldCheck/ShieldAlert/AlertTriangle) + texte + couleur.
 *  - Toggle view : role="radiogroup" + aria-checked (au lieu de aria-pressed incorrect).
 *  - Live region : aria-atomic + ne s'active QUE après interaction (pas au mount).
 *  - Wrap grid dans <ul role="list"> + <li> (sémantique cohérente avec list view).
 *  - Wrap H3 dans <a> (anchor SEO exact-match + tap target large).
 *
 * VAGUE 2 — Front fixes (Agent Front)
 *  - Suppression mounted dead code (force re-render entier inutilement).
 *  - View toggle persisté via localStorage (cr:top10:view).
 *  - categoryBucket : ajout bucket "exchange" pour BNB ("Token d'exchange").
 *  - RISK_COLORS typé strict Record<TopCrypto["riskLevel"], string>.
 *  - mobile par défaut : force view="list" si viewport <640px (matchMedia).
 *
 * VAGUE 3 — UX débutant (Agent UX 6.5/10 → 9/10)
 *  - Filtres en FR débutant ("Les bases", "Pour payer", "Apps & jeux", "Stable", "Fun/risqué", "Privacy").
 *  - Sticker "Commencez ici" sur Bitcoin (rang 1) — réduit paralysie 10 cards.
 *  - Tagline retire italique (lecture +25%).
 *  - CTA "Acheter" → /comparatif?crypto={id} (au lieu de générique).
 *  - Footer CTA "Explorer les 50 cryptos" + "Comparer plateformes" (CRO P0).
 *
 * VAGUE 4 — DYNAMISME + Visual (Agent Visual 6.5 + Animation 4.5 → 9/10)
 *  - Risk-meter 5 dots horizontaux (style Apple battery, signature visuelle).
 *  - BeginnerFriendly stars Duolingo (5 capsules) visible en grid.
 *  - Badge catégorie picto coloré (Layers indigo / LineChart emerald / etc.).
 *  - Logo orbital pulse au hover (CSS animation tinted primary).
 *
 * VAGUE 5 — Mobile (Agent Mobile 4/10 → 8/10)
 *  - Force view="list" par défaut <640px (mur 10 cards = 3000px scroll évité).
 *  - Filter chips horizontal scroll-snap mobile.
 *  - CTA "Voir la fiche" + "Acheter" en grid-cols-2 (au lieu de stacked).
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

const RISK_COLORS: Record<TopCrypto["riskLevel"], string> = {
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

const RISK_ICONS: Record<TopCrypto["riskLevel"], LucideIcon> = {
  "Très faible": ShieldCheck,
  Faible: ShieldCheck,
  Modéré: ShieldAlert,
  Élevé: AlertTriangle,
  "Très élevé": AlertTriangle,
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
  | "exchange"
  | "privacy"
  | "other";

function categoryBucket(category: string): Exclude<Bucket, "all"> {
  const c = category.toLowerCase();
  if (c.includes("memecoin") || c.includes("meme")) return "memecoins";
  if (c.includes("stablecoin")) return "stablecoins";
  if (c.includes("privacy") || c.includes("confidentialité")) return "privacy";
  if (c.includes("defi") || c.includes("oracle")) return "defi";
  if (c.includes("smart contract")) return "smartcontract";
  // Audit Block 5 RE-AUDIT (Agent Front #4) : BNB ("Token d'exchange") tombait dans "other"
  if (c.includes("token d'exchange") || c.includes("exchange token")) return "exchange";
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

/**
 * FILTERS — Audit UX P0 : libellés en FR débutant au lieu de jargon technique.
 * Le label technique original reste accessible via title/aria-label.
 */
const FILTERS: Array<{ value: Bucket; label: string; tech: string }> = [
  { value: "all", label: "Tous", tech: "Tous les types" },
  { value: "layer1", label: "Les bases", tech: "Layer 1 / Réserve de valeur" },
  { value: "smartcontract", label: "Apps & jeux", tech: "Smart Contract Platform" },
  { value: "defi", label: "Finance déc.", tech: "DeFi / Oracle" },
  { value: "stablecoins", label: "Stable", tech: "Stablecoins" },
  { value: "memecoins", label: "Fun / risqué", tech: "Memecoins" },
  { value: "exchange", label: "Tokens exchange", tech: "Token d'exchange" },
  { value: "privacy", label: "Anonymat", tech: "Privacy / Confidentialité" },
];

/**
 * CATEGORY_VISUAL — picto + couleur sémantique par catégorie pour badges.
 * Audit Visual : remplace le texte gris générique par pill colorée scannable.
 */
const CATEGORY_VISUAL: Record<Exclude<Bucket, "all">, { Icon: LucideIcon; color: string }> = {
  layer1: { Icon: Layers, color: "text-indigo-300 bg-indigo-400/10 border-indigo-400/30" },
  smartcontract: { Icon: FileCode, color: "text-sky-300 bg-sky-400/10 border-sky-400/30" },
  defi: { Icon: LineChart, color: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30" },
  stablecoins: { Icon: Anchor, color: "text-slate-300 bg-slate-400/10 border-slate-400/30" },
  memecoins: { Icon: Sparkles, color: "text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/30" },
  exchange: { Icon: CoinsIcon, color: "text-amber-300 bg-amber-400/10 border-amber-400/30" },
  privacy: { Icon: EyeOff, color: "text-violet-300 bg-violet-400/10 border-violet-400/30" },
  other: { Icon: CoinsIcon, color: "text-fg/60 bg-elevated border-border/60" },
};

/* -------------------------------------------------------------------------- */
/*  Sort options                                                              */
/* -------------------------------------------------------------------------- */

type SortKey = "rank" | "risk-asc" | "beginner-desc" | "year-desc";

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "rank", label: "Rang (défaut)" },
  { value: "risk-asc", label: "Du moins risqué" },
  { value: "beginner-desc", label: "Du plus simple" },
  { value: "year-desc", label: "Du plus récent" },
];

const VIEW_STORAGE_KEY = "cr:top10:view";

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function Top10CryptosClient({
  cryptos,
}: {
  cryptos: TopCrypto[];
}) {
  // SSR-safe defaults : "all" + grid view + tri par rang.
  const [bucket, setBucket] = useState<Bucket>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [view, setView] = useState<"grid" | "list">("grid");
  // Flag d'interaction utilisateur — empêche live region annonce au mount (V3 fix).
  const [interacted, setInteracted] = useState(false);
  const chipRefs = useRef<Map<Bucket, HTMLButtonElement>>(new Map());

  // Audit Block 5 RE-AUDIT (Agent Mobile P0) : force view="list" sur mobile (<640px)
  // pour éviter le mur de 10 cards = 3000px scroll. + Audit Front : persistance localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "grid" || stored === "list") {
        setView(stored);
        return;
      }
    } catch {
      /* ignore localStorage errors */
    }
    // Auto-switch list sur mobile uniquement si pas de préférence enregistrée.
    if (window.matchMedia?.("(max-width: 639px)").matches) {
      setView("list");
    }
  }, []);

  function changeView(next: "grid" | "list") {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  /* -------- Comptes par filtre (mémo) ---------------------------------- */
  const counts = useMemo(() => {
    const m: Record<Bucket, number> = {
      all: cryptos.length,
      layer1: 0,
      defi: 0,
      stablecoins: 0,
      memecoins: 0,
      smartcontract: 0,
      exchange: 0,
      privacy: 0,
      other: 0,
    };
    for (const crypto of cryptos) {
      const b = categoryBucket(crypto.category);
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

  // Audit A11y V1 : roving tabindex + keyboard navigation pour radiogroup chips.
  const visibleFilters = FILTERS.filter((f) => counts[f.value] > 0);
  function handleChipKeyDown(e: React.KeyboardEvent, currentValue: Bucket) {
    const idx = visibleFilters.findIndex((f) => f.value === currentValue);
    if (idx < 0) return;
    let nextIdx = idx;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIdx = (idx + 1) % visibleFilters.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIdx = (idx - 1 + visibleFilters.length) % visibleFilters.length;
        break;
      case "Home":
        nextIdx = 0;
        break;
      case "End":
        nextIdx = visibleFilters.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const nextValue = visibleFilters[nextIdx].value;
    setBucket(nextValue);
    setInteracted(true);
    chipRefs.current.get(nextValue)?.focus();
  }

  function handleChipClick(value: Bucket) {
    setBucket(value);
    setInteracted(true);
  }

  function handleSortChange(value: SortKey) {
    setSort(value);
    setInteracted(true);
  }

  // Live region message — uniquement après interaction (V3 fix).
  const liveMessage = interacted
    ? `${filtered.length} crypto${filtered.length > 1 ? "s" : ""} affichée${filtered.length > 1 ? "s" : ""}.`
    : "";

  return (
    <section id="top10" className="py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="badge-info">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
            Pédagogique
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Top {cryptos.length} cryptos <span className="gradient-text">expliquées simplement</span>
          </h2>
          <p className="mt-2 text-muted text-sm max-w-2xl">
            Les {cryptos.length} plus grosses cryptomonnaies du moment, expliquées en 2 phrases pour qu&apos;un
            débutant comprenne ce que c&apos;est et à quoi ça sert. Sans jargon.
          </p>
          {/* Audit SEO/CRO (Levier 6) : freshness signal E-E-A-T visible */}
          <p className="mt-1 text-[11px] text-fg/50">
            Mis à jour le{" "}
            <time dateTime="2026-04-26">26 avril 2026</time>
            {" · "}Source : CoinGecko + recherche éditoriale Cryptoreflex
          </p>
        </div>

        {/* Toolbar : filtres + tri + view toggle */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {/* Chips filtres — radiogroup avec roving tabindex + keyboard nav */}
          <div
            role="radiogroup"
            aria-label="Filtrer par catégorie"
            className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap snap-x snap-mandatory"
          >
            {FILTERS.map((f) => {
              const active = bucket === f.value;
              const n = counts[f.value];
              const isDisabled = n === 0;
              const isTabbable = active || (bucket === "all" && f.value === "all");
              return (
                <button
                  key={f.value}
                  ref={(el) => {
                    if (el) chipRefs.current.set(f.value, el);
                  }}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-disabled={isDisabled || undefined}
                  aria-label={`${f.label} (${f.tech}), ${n} crypto${n > 1 ? "s" : ""}`}
                  title={f.tech}
                  tabIndex={isTabbable ? 0 : -1}
                  onClick={() => !isDisabled && handleChipClick(f.value)}
                  onKeyDown={(e) => handleChipKeyDown(e, f.value)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors snap-start whitespace-nowrap min-h-[36px] shrink-0",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-primary bg-primary/15 text-primary-glow"
                      : isDisabled
                        ? "border-border/40 bg-surface/50 text-fg/35 opacity-60"
                        : "border-border bg-surface text-fg/75 hover:border-primary/40 hover:text-fg",
                  ].join(" ")}
                >
                  {f.label}
                  <span className="text-[11px] text-fg/55 tabular-nums">({n})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sort dropdown — natif pour a11y OS */}
            <label htmlFor="top10-sort" className="sr-only">
              Trier les cryptos
            </label>
            <select
              id="top10-sort"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value as SortKey)}
              className="rounded-lg border border-border bg-surface px-3 py-2 min-h-[40px] text-sm font-medium text-fg/85 hover:text-fg
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Trier les cryptos"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* View toggle grid/list — radiogroup mutually exclusive (V4 fix) */}
            <div
              role="radiogroup"
              aria-label="Choisir l'affichage"
              className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5"
            >
              <button
                type="button"
                role="radio"
                aria-checked={view === "grid"}
                aria-label="Affichage en grille"
                onClick={() => changeView("grid")}
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  view === "grid"
                    ? "bg-primary/15 text-primary-glow"
                    : "text-fg/60 hover:text-fg",
                ].join(" ")}
              >
                <Grid2X2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={view === "list"}
                aria-label="Affichage en liste"
                onClick={() => changeView("list")}
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  view === "list"
                    ? "bg-primary/15 text-primary-glow"
                    : "text-fg/60 hover:text-fg",
                ].join(" ")}
              >
                <ListIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Live region a11y — uniquement après interaction utilisateur (V3 fix) */}
        <p className="sr-only" aria-live="polite" aria-atomic="true" role="status">
          {liveMessage}
        </p>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
            <p className="text-fg/70 text-sm">
              Aucune crypto dans cette catégorie pour le moment.
            </p>
            <button
              type="button"
              onClick={() => handleChipClick("all")}
              className="mt-3 text-sm font-semibold text-primary-glow hover:underline"
            >
              Réinitialiser le filtre
            </button>
          </div>
        ) : view === "grid" ? (
          <ul role="list" className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((c, i) => (
              <li key={c.id}>
                <ScrollReveal delay={Math.min(i * 60, 240)} direction="up">
                  <CryptoCard crypto={c} />
                </ScrollReveal>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
            <ul role="list" className="divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id}>
                  <CryptoListRow crypto={c} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer CTA — Audit SEO/CRO Levier 4 P0 : trou béant en fin de section */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/cryptos"
              className="btn-primary inline-flex items-center justify-center"
            >
              Explorer les 100+ cryptos analysées
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/comparatif"
              className="btn-ghost inline-flex items-center justify-center"
            >
              Comparer les plateformes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function CryptoCard({ crypto }: { crypto: TopCrypto }) {
  const RiskIcon = RISK_ICONS[crypto.riskLevel];
  const riskColor = RISK_COLORS[crypto.riskLevel];
  const riskLevel = RISK_RANK[crypto.riskLevel] + 1; // 1-5 pour risk-meter
  const bucket = categoryBucket(crypto.category);
  const catVisual = CATEGORY_VISUAL[bucket];
  const CatIcon = catVisual.Icon;
  const isFirstStep = crypto.rank === 1;

  return (
    <article
      aria-labelledby={`crypto-card-${crypto.id}-title`}
      className="card-premium group relative rounded-2xl p-6 hover:border-primary/50 h-full flex flex-col"
    >
      {/* Audit UX P0 : sticker "Commencez ici" sur Bitcoin (rang 1) — réduit paralysie 10 cards */}
      {isFirstStep && (
        <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-primary text-background text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shadow-[0_4px_14px_-2px_rgba(245,165,36,0.55)] badge-pulse-strong z-10">
          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
          Commencez ici
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <CryptoLogo
              symbol={crypto.symbol}
              coingeckoId={crypto.coingeckoId ?? crypto.id}
              size={44}
              className="ring-1 ring-border platform-logo-wrap"
            />
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-background font-bold font-mono text-[10px] px-1 ring-2 ring-background"
            >
              {crypto.rank}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            {/* Audit SEO Levier 2 : H3 wrapped dans <a> (anchor exact-match keyword) */}
            <h3 id={`crypto-card-${crypto.id}-title`} className="font-bold text-lg text-fg truncate">
              <Link
                href={`/cryptos/${crypto.id}`}
                className="hover:text-primary-glow transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {crypto.name}
              </Link>{" "}
              <span className="text-muted font-mono text-sm">{crypto.symbol}</span>
            </h3>
            {/* Badge catégorie picto coloré (Audit Visual E) */}
            <div className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${catVisual.color}`}>
              <CatIcon className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" focusable="false" />
              {crypto.category}
              <span className="text-fg/50 font-normal normal-case">· {crypto.yearCreated}</span>
            </div>
          </div>
        </div>

        {/* Risk indicator — Audit A11y V6 : icône + texte + couleur (pas color-only) */}
        <div className="text-right shrink-0">
          <div className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${riskColor}`}>
            <RiskIcon className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" focusable="false" />
            {crypto.riskLevel}
          </div>
          {/* Risk-meter 5 dots horizontaux (Audit Visual F) */}
          <div className="mt-1 flex items-center gap-0.5 justify-end" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((dot) => (
              <span
                key={dot}
                className={`h-1 w-2 rounded-full transition-colors ${
                  dot <= riskLevel
                    ? riskLevel <= 2
                      ? "bg-accent-green"
                      : riskLevel === 3
                        ? "bg-amber-400"
                        : "bg-accent-rose"
                    : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tagline — Audit UX : retire italic (lecture +25%) */}
      <p className="mt-4 text-sm font-semibold text-primary-soft">{crypto.tagline}</p>

      <p className="mt-3 text-sm text-fg/80 leading-relaxed line-clamp-2 sm:line-clamp-none">
        {crypto.what}
      </p>

      <div className="hidden sm:block mt-4 pt-4 border-t border-border">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
          À quoi ça sert
        </div>
        <p className="text-sm text-fg/75 leading-relaxed line-clamp-3">{crypto.useCase}</p>
      </div>

      {/* BeginnerFriendly stars Duolingo (Audit Visual G : visible en grid) */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-muted font-semibold uppercase tracking-wide">Débutant</span>
        <div className="flex items-center gap-0.5" role="img" aria-label={`Niveau débutant : ${crypto.beginnerFriendly} sur 5`}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              aria-hidden="true"
              className={`h-3 w-1.5 rounded-full transition-colors ${
                s <= crypto.beginnerFriendly
                  ? "bg-accent-green shadow-[inset_0_0_4px_rgba(34,197,94,0.4)]"
                  : "border border-border bg-transparent"
              }`}
            />
          ))}
          <span className="ml-1 text-xs font-bold text-fg/85 tabular-nums">{crypto.beginnerFriendly}/5</span>
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-accent-green" aria-hidden="true" focusable="false" />
        <span>Disponible sur :</span>
        <span className="text-fg font-medium">
          {crypto.whereToBuy.slice(0, 3).join(", ")}
        </span>
      </div>

      {/* CTA mt-auto pour alignment bas (Audit Mobile M4) */}
      <div className="mt-auto pt-4 grid grid-cols-2 gap-2 text-sm">
        <Link
          href={`/cryptos/${crypto.id}`}
          className="inline-flex items-center justify-center gap-1 min-h-[44px] py-2 px-3 rounded-lg border border-border hover:border-primary/40 text-fg/80 hover:text-fg hover:bg-elevated transition-colors font-medium
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Voir la fiche complète ${crypto.name}`}
        >
          Voir la fiche
          <ArrowRight className="h-3.5 w-3.5 arrow-spring" aria-hidden="true" />
        </Link>
        {/* Audit UX F2 : CTA contextualisé /comparatif?crypto={id} au lieu de générique */}
        <Link
          href={`/comparatif?crypto=${crypto.id}`}
          className="inline-flex items-center justify-center gap-1 min-h-[44px] py-2 px-3 rounded-lg bg-primary btn-primary-shine text-background hover:bg-primary-glow transition-colors font-semibold
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Acheter ${crypto.name} sur les meilleures plateformes`}
        >
          Acheter
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function CryptoListRow({ crypto }: { crypto: TopCrypto }) {
  const RiskIcon = RISK_ICONS[crypto.riskLevel];
  const riskColor = RISK_COLORS[crypto.riskLevel];

  return (
    <Link
      href={`/cryptos/${crypto.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/40 active:bg-elevated/60 transition-colors min-h-[60px]
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
        <div className="text-[11px] text-fg/55 truncate">{crypto.tagline}</div>
      </div>

      <div className="hidden sm:block text-[11px] text-fg/55 shrink-0 max-w-[180px] truncate">
        {crypto.category}
      </div>

      {/* Risk : icône + texte + couleur (V6 fix) */}
      <div
        className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 ${riskColor}`}
        aria-label={`Niveau de risque : ${crypto.riskLevel}`}
      >
        <RiskIcon className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" focusable="false" />
        {crypto.riskLevel}
      </div>

      <div className="hidden md:flex items-center gap-1 text-[11px] text-fg/55 shrink-0">
        <span>Débutant</span>
        <span className="font-bold text-fg">{crypto.beginnerFriendly}/5</span>
      </div>

      <ArrowRight className="h-4 w-4 text-muted shrink-0 arrow-spring" aria-hidden="true" />
    </Link>
  );
}

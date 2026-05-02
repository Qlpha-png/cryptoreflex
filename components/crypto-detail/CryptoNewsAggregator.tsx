"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Newspaper, RotateCw, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { CryptoNewsItem } from "@/lib/news-aggregator";

/**
 * CryptoNewsAggregator — Client Component qui affiche les 5 dernières news
 * pertinentes pour une crypto sur sa fiche /cryptos/[slug].
 *
 * Pattern :
 *  - Fetch /api/news/{coingeckoId} au mount + sur clic refresh.
 *  - Si la réponse est vide OU si fetch fail → ne rend RIEN (return null).
 *    On préfère masquer le bloc plutôt qu'un état "Aucune news" qui dégrade
 *    la perception de fraîcheur du site.
 *  - Skeleton custom pendant le loading initial seulement (pas pendant un refresh).
 *  - Animations CSS pures via classes Tailwind (`animate-news-up` inline en
 *    <style jsx>) — pas de Framer Motion.
 */

interface Props {
  coingeckoId: string;
  cryptoName: string;
  cryptoSymbol: string;
}

interface ApiResponse {
  items: CryptoNewsItem[];
}

export default function CryptoNewsAggregator({
  coingeckoId,
  cryptoName,
  cryptoSymbol,
}: Props) {
  const [items, setItems] = useState<CryptoNewsItem[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errored, setErrored] = useState<boolean>(false);
  const [lastFetched, setLastFetched] = useState<number>(0);
  // BATCH 38 — fix audit a11y P0 WCAG 2.2.2 (Pause Stop Hide) : toggle
  // utilisateur pour mettre en pause l'auto-refresh news. Persisté
  // localStorage pour respecter la préférence cross-session.
  const [autoRefreshPaused, setAutoRefreshPaused] = useState<boolean>(false);

  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      try {
        const res = await fetch(
          `/api/news/${encodeURIComponent(coingeckoId)}`,
          { signal, cache: "no-store" },
        );
        if (!res.ok) {
          setErrored(true);
          setItems([]);
          return;
        }
        const json = (await res.json()) as ApiResponse;
        setItems(Array.isArray(json.items) ? json.items : []);
        setErrored(false);
        setLastFetched(Date.now());
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setErrored(true);
        setItems([]);
      }
    },
    [coingeckoId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setInitialLoading(true);
    load(controller.signal).finally(() => setInitialLoading(false));
    return () => controller.abort();
  }, [load]);

  // BATCH 38 — restore préférence pause depuis localStorage au mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("cr:news-auto-refresh-paused");
      if (saved === "1") setAutoRefreshPaused(true);
    } catch {
      /* localStorage indisponible (Safari private) — ignore */
    }
  }, []);

  // BATCH 30 — auto-refresh toutes les 5 min (user feedback "j'aime les actu
  // personnalisées pour chaque crypto mais je veux ça en automatique").
  // 5 min cohérent avec le SWR API (s-maxage=900 / 15 min CDN). Désactivé
  // si l'onglet n'est pas visible (Page Visibility API) → 0 fetch parasite.
  // BATCH 38 — fix WCAG 2.2.2 : skip si autoRefreshPaused (toggle user).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoRefreshPaused) return; // BATCH 38 : pause user
    const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes
    let timer: ReturnType<typeof setInterval> | null = null;
    const startTimer = () => {
      if (timer !== null) return;
      timer = setInterval(() => {
        if (!document.hidden) load();
      }, AUTO_REFRESH_MS);
    };
    const stopTimer = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stopTimer();
      else startTimer();
    };
    if (!document.hidden) startTimer();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load, autoRefreshPaused]);

  // BATCH 38 — toggle pause/resume auto-refresh (WCAG 2.2.2 control)
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshPaused((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cr:news-auto-refresh-paused", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load, refreshing]);

  // Skeleton uniquement au premier chargement
  if (initialLoading) {
    return <NewsSkeleton />;
  }

  // Aucun bloc vide : si rien à dire, on disparaît.
  if (errored || items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={`Actualités ${cryptoName}`}
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      {/* Animations CSS pures — staggered fade-up. Respecte prefers-reduced-motion. */}
      <style jsx>{`
        @keyframes newsUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .news-card {
          opacity: 0;
          animation: newsUp 0.45s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .news-card {
            opacity: 1;
            animation: none;
          }
        }
      `}</style>

      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Actualités{" "}
            <span className="gradient-text">{cryptoName}</span>{" "}
            <span className="text-muted font-mono text-xs">({cryptoSymbol.toUpperCase()})</span>
          </h2>
          {/* BATCH 30 + 38 — badge "● Auto" devenu CLIQUABLE pour respecter
              WCAG 2.2.2 Pause/Stop/Hide. Click → toggle auto-refresh,
              persisté localStorage. État pulse vert si actif, gris si pause. */}
          <button
            type="button"
            onClick={toggleAutoRefresh}
            aria-pressed={!autoRefreshPaused}
            aria-label={
              autoRefreshPaused
                ? "Auto-refresh en pause — cliquer pour reprendre"
                : "Auto-refresh actif toutes les 5 minutes — cliquer pour mettre en pause"
            }
            title={autoRefreshPaused ? "Auto-refresh en pause" : "Auto-refresh actif (cliquer pour pause)"}
            className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ml-1 min-h-[24px] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              autoRefreshPaused
                ? "border-border bg-elevated/60 text-muted hover:text-fg"
                : "border-success-border bg-success-soft text-success-fg hover:bg-success-soft/80"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                autoRefreshPaused ? "bg-muted" : "bg-success-fg animate-pulse-dot"
              }`}
              aria-hidden="true"
            />
            {autoRefreshPaused ? "Pause" : "Auto"}
          </button>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Rafraîchir les actualités maintenant"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated/60 px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-fg hover:border-primary/40 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <RotateCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {refreshing ? "MAJ..." : lastFetched > 0 ? <RelativeTime since={lastFetched} /> : "Rafraîchir"}
        </button>
      </header>

      <ul className="mt-5 space-y-3">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="news-card"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <NewsCard item={item} />
          </li>
        ))}
      </ul>

      <footer className="mt-4 flex items-center justify-between flex-wrap gap-2 text-[11px] text-muted">
        <span>
          Source : CryptoPanic · MAJ {formatRelativeFr(lastFetched)}
        </span>
        <Link
          href="/actualites"
          className="font-semibold text-primary hover:underline"
        >
          Toutes les news →
        </Link>
      </footer>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

function NewsCard({ item }: { item: CryptoNewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block rounded-xl border border-border bg-elevated/40 p-4 transition-colors hover:border-primary/40 hover:bg-elevated/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <SentimentBadge sentiment={item.sentiment} />
          <span className="text-[10px] uppercase tracking-wider font-mono text-muted/80 truncate">
            {item.source}
          </span>
          <span className="text-[10px] text-muted/60">·</span>
          <span className="text-[10px] text-muted/80 whitespace-nowrap">
            {formatRelativeFr(item.publishedAt)}
          </span>
        </div>
        <ExternalLink
          className="h-3.5 w-3.5 text-muted/60 group-hover:text-primary flex-shrink-0 transition-colors"
          aria-hidden="true"
        />
      </div>
      <h3 className="mt-2 text-sm font-bold text-fg leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {item.title}
      </h3>
      {item.snippet && (
        <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
          {item.snippet}
        </p>
      )}
    </a>
  );
}

function SentimentBadge({ sentiment }: { sentiment: CryptoNewsItem["sentiment"] }) {
  const config: Record<
    CryptoNewsItem["sentiment"],
    { label: string; cls: string; Icon: typeof TrendingUp }
  > = {
    bullish: {
      label: "Bullish",
      cls: "text-accent-green border-accent-green/30 bg-accent-green/5",
      Icon: TrendingUp,
    },
    bearish: {
      label: "Bearish",
      cls: "text-accent-rose border-accent-rose/30 bg-accent-rose/5",
      Icon: TrendingDown,
    },
    neutral: {
      label: "Neutre",
      cls: "text-muted border-border bg-elevated/40",
      Icon: Minus,
    },
  };
  const { label, cls, Icon } = config[sentiment];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton & helpers                                                        */
/* -------------------------------------------------------------------------- */

function NewsSkeleton() {
  return (
    <section
      aria-label="Chargement des actualités"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="h-5 w-48 rounded bg-elevated/60 animate-pulse motion-reduce:animate-none" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl border border-border bg-elevated/40 animate-pulse motion-reduce:animate-none"
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Format relatif FR compact ("à l'instant", "il y a 3 min", "il y a 2 h",
 * "il y a 4 j"). Cohérent avec les autres composants client (OnChainMetricsLive).
 *
 * Accepte un timestamp number (Date.now()) OU une string ISO.
 */
function formatRelativeFr(input: string | number): string {
  if (!input) return "à l'instant";
  const t = typeof input === "number" ? input : Date.parse(input);
  if (!Number.isFinite(t) || t <= 0) return "à l'instant";
  const diffMs = Date.now() - t;
  const diffMin = Math.max(0, Math.round(diffMs / 60_000));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}

/**
 * RelativeTime — petit composant client qui re-render toutes les 30s
 * pour afficher un timestamp relatif vivant ("il y a 2min", "il y a 4min"...).
 * Utilisé dans le bouton refresh : signal "le site sait quand il a fetched".
 *
 * Pas de useState (re-render naturel via setInterval + force update via
 * key sur le compteur). Très léger, 0 dépendance externe.
 */
function RelativeTime({ since }: { since: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono">{formatRelativeFr(since)}</span>;
}

/**
 * /admin/vitals — Dashboard Core Web Vitals interne.
 *
 * Lit les agrégats `vitals:p75:*` + dernier sample `vitals:samples:*[0]`
 * stockés par /api/analytics/vitals (qui reçoit les hits du composant
 * <WebVitalsReporter />).
 *
 * Gating : strict admin only (cf. /admin/page.tsx). 404 sinon — pas de leak.
 *
 * Style : reprend les composants StatBox / wrappers de /admin/page.tsx pour
 * cohérence visuelle. On garde tout dans un seul fichier (page locale, pas
 * de réutilisation prévue).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Crown, Gauge, ExternalLink } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getKv } from "@/lib/kv";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Admin — Core Web Vitals",
  description: "Dashboard interne des Core Web Vitals (LCP, CLS, INP, FCP, TTFB).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  Types + thresholds Vercel (https://web.dev/articles/vitals)               */
/* -------------------------------------------------------------------------- */

type VitalName = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";
type Rating = "good" | "needs-improvement" | "poor";

interface VitalSample {
  name: VitalName;
  value: number;
  id: string;
  rating: Rating;
  url: string;
  ts: number;
}

interface P75Entry {
  value: number;
  n: number;
  updatedAt: number;
}

interface VitalRow {
  name: VitalName;
  /** Thresholds officiels web.dev — `good <= goodMax`, `poor > niMax`. */
  goodMax: number;
  niMax: number;
  /** Format affichage : "ms" ou "score" (CLS). */
  unit: "ms" | "score";
  doc: string;
  description: string;
}

const VITALS: VitalRow[] = [
  {
    name: "LCP",
    goodMax: 2500,
    niMax: 4000,
    unit: "ms",
    doc: "https://web.dev/articles/lcp",
    description: "Largest Contentful Paint — temps avant que le plus gros élément above-fold soit peint.",
  },
  {
    name: "CLS",
    goodMax: 0.1,
    niMax: 0.25,
    unit: "score",
    doc: "https://web.dev/articles/cls",
    description: "Cumulative Layout Shift — stabilité visuelle (sauts de mise en page).",
  },
  {
    name: "INP",
    goodMax: 200,
    niMax: 500,
    unit: "ms",
    doc: "https://web.dev/articles/inp",
    description: "Interaction to Next Paint — réactivité aux clics/keypress (a remplacé FID en mars 2024).",
  },
  {
    name: "FCP",
    goodMax: 1800,
    niMax: 3000,
    unit: "ms",
    doc: "https://web.dev/articles/fcp",
    description: "First Contentful Paint — premier pixel de contenu rendu (texte, image, SVG).",
  },
  {
    name: "TTFB",
    goodMax: 800,
    niMax: 1800,
    unit: "ms",
    doc: "https://web.dev/articles/ttfb",
    description: "Time To First Byte — latence serveur jusqu'au premier octet reçu.",
  },
];

function rate(value: number, row: VitalRow): Rating {
  if (value <= row.goodMax) return "good";
  if (value <= row.niMax) return "needs-improvement";
  return "poor";
}

function fmt(value: number, unit: "ms" | "score"): string {
  if (unit === "score") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

function relativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 60) return `il y a ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

interface VitalState {
  row: VitalRow;
  p75: P75Entry | null;
  lastSample: VitalSample | null;
}

async function loadAllVitals(): Promise<VitalState[]> {
  const kv = getKv();
  return Promise.all(
    VITALS.map(async (row) => {
      const [p75, samples] = await Promise.all([
        kv.get<P75Entry>(`vitals:p75:${row.name}`),
        kv.lrange<VitalSample>(`vitals:samples:${row.name}`, 0, 0),
      ]);
      return { row, p75, lastSample: samples[0] ?? null };
    }),
  );
}

export default async function AdminVitalsPage() {
  const user = await getUser();
  if (!user || !user.isAdmin) {
    notFound();
  }

  const states = await loadAllVitals();
  const kv = getKv();

  return (
    <article className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/admin" className="hover:text-fg">Admin</Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">Web Vitals</span>
        </nav>

        <header className="mt-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              ADMIN — Core Web Vitals
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Web Vitals <span className="gradient-text">{BRAND.name}</span>
            </h1>
            <p className="mt-2 text-sm text-muted">
              p75 calculé sur les 1000 derniers samples (recalcul auto toutes les 50 valeurs).{" "}
              {kv.mocked && (
                <span className="text-amber-300">
                  ⚠ KV en mode mocked — données perdues à chaque cold start.
                </span>
              )}
            </p>
          </div>
        </header>

        {/* Tableau métriques */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-elevated/60 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 text-left">Métrique</th>
                <th className="px-4 py-3 text-right">p75</th>
                <th className="px-4 py-3 text-center">Rating</th>
                <th className="px-4 py-3 text-right">N</th>
                <th className="px-4 py-3 text-left">Dernier sample</th>
                <th className="px-4 py-3 text-left">Doc</th>
              </tr>
            </thead>
            <tbody>
              {states.map(({ row, p75, lastSample }) => {
                const rating = p75 ? rate(p75.value, row) : null;
                return (
                  <tr key={row.name} className="border-t border-border/60">
                    <td className="px-4 py-4">
                      <div className="font-bold text-fg flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted" />
                        {row.name}
                      </div>
                      <p className="mt-1 text-xs text-fg/60 leading-snug max-w-md">
                        {row.description}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-mono tabular-nums text-base">
                      {p75 ? fmt(p75.value, row.unit) : "—"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {rating ? <RatingPill rating={rating} /> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right text-fg/70 tabular-nums">
                      {p75 ? p75.n : 0}
                    </td>
                    <td className="px-4 py-4 text-xs text-fg/70">
                      {lastSample ? (
                        <div>
                          <div className="font-mono">
                            {fmt(lastSample.value, row.unit)} ·{" "}
                            <span className="text-fg/50">{lastSample.rating}</span>
                          </div>
                          <div className="mt-0.5 text-fg/50 truncate max-w-[200px]" title={lastSample.url}>
                            {lastSample.url}
                          </div>
                          <div className="mt-0.5 text-fg/40">{relativeTime(lastSample.ts)}</div>
                        </div>
                      ) : (
                        <span className="text-muted">aucun sample</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <a
                        href={row.doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        web.dev <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <LegendCard rating="good" label="Good" hint="Cible Google CWV — pas d'action requise." />
          <LegendCard rating="needs-improvement" label="Needs improvement" hint="Surveiller — ne bloque pas le ranking." />
          <LegendCard rating="poor" label="Poor" hint="Pénalité Page Experience — à corriger en priorité." />
        </section>

        {/* Notes */}
        <section className="mt-12 rounded-2xl border border-border bg-elevated/40 p-5 text-sm text-fg/80">
          <h3 className="font-bold text-fg mb-2">📚 Notes</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              Les samples sont collectés via <code className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">components/WebVitalsReporter.tsx</code> (
              <code className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">useReportWebVitals</code> + <code className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">navigator.sendBeacon</code>).
            </li>
            <li>
              p75 = recalculé serveur toutes les 50 nouvelles valeurs (amorti, n &lt;= 1000).
            </li>
            <li>
              Pour des dimensions par page / device, s&apos;abonner à Plausible Stats ou
              Vercel Speed Insights — ce dashboard est volontairement minimal.
            </li>
            <li>
              Si la KV n&apos;est pas configurée (env <code className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">KV_REST_API_URL</code> / <code className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">KV_REST_API_TOKEN</code>),
              les métriques sont stockées en mémoire (perdues au cold start).
            </li>
          </ul>
        </section>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function RatingPill({ rating }: { rating: Rating }) {
  const cfg = {
    good: {
      label: "Good",
      cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    },
    "needs-improvement": {
      label: "Needs improvement",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    },
    poor: {
      label: "Poor",
      cls: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    },
  }[rating];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function LegendCard({
  rating,
  label,
  hint,
}: {
  rating: Rating;
  label: string;
  hint: string;
}) {
  const accent = {
    good: "from-emerald-500/15 border-emerald-500/30",
    "needs-improvement": "from-amber-500/15 border-amber-500/30",
    poor: "from-rose-500/15 border-rose-500/30",
  }[rating];
  return (
    <div className={`rounded-2xl border bg-gradient-to-br to-transparent p-4 ${accent}`}>
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-sm text-fg/80">{hint}</div>
    </div>
  );
}

/**
 * /admin/abtest — Dashboard A/B testing interne (vague mai 2026).
 *
 * Lit les compteurs KV produits par /api/abtest/exposure et /api/abtest/conversion :
 *   - `abtest:exposure:{id}:{variant}`               → exposures
 *   - `abtest:conversion:{id}:{variant}`             → conversions totales
 *   - `abtest:conversion:{id}:{variant}:{metric}`    → conversions par metric
 *
 * Pour chaque expérience :
 *   - Tableau variants × métriques avec : exposures, conversions, taux,
 *     uplift vs control (delta relatif), p-value (test Z deux proportions).
 *   - Garde-fou "données insuffisantes" si min(exposures) < 100 par variant.
 *
 * Stats — formule test Z deux proportions (Wald) :
 *   p1 = c1/n1, p2 = c2/n2
 *   p_pool = (c1 + c2) / (n1 + n2)
 *   se = sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))
 *   z = (p2 - p1) / se
 *   p-value (deux côtés) = 2 * (1 - Φ(|z|))
 *
 * Approximation Φ(x) (CDF normale standard) via Abramowitz & Stegun §26.2.17.
 * Précision ~7e-8, suffisante pour décisions A/B en mode "as good as it gets"
 * pour de l'analytics d'attribution.
 *
 * Gating : strict admin (404 sinon) — cf. pattern /admin/page.tsx + /admin/vitals.
 *
 * Style : reprend RatingPill, StatBox, table layout de /admin/vitals/page.tsx
 * pour cohérence visuelle.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Crown, FlaskConical, ExternalLink } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getKv } from "@/lib/kv";
import { BRAND } from "@/lib/brand";
import { EXPERIMENTS } from "@/lib/abtest";
import {
  EXPERIMENT_LIST,
  type ExperimentMeta,
} from "@/lib/abtest-experiments";

export const metadata: Metadata = {
  title: "Admin — A/B testing",
  description: "Dashboard interne des expériences A/B (exposures, conversions, p-value).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Seuil sous lequel on considère que les données sont insuffisantes pour décider. */
const MIN_EXPOSURES_PER_VARIANT = 100;
/** Seuil de p-value pour considérer le résultat significatif (95% confiance). */
const SIGNIFICANCE_THRESHOLD = 0.05;

/* -------------------------------------------------------------------------- */
/*  Helpers stats                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Approximation CDF normale standard Φ(x) — Abramowitz & Stegun §26.2.17.
 * Précision absolue ~7.5e-8 sur [0, +∞). Symétrie : Φ(-x) = 1 - Φ(x).
 */
function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  // Coefficients A&S
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erfApprox =
    1 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-ax * ax);
  return 0.5 * (1 + sign * erfApprox);
}

/**
 * p-value bilatérale d'un test Z deux proportions (Wald).
 * Renvoie 1.0 si l'un des n est nul ou si pool dégénère (pas de signal).
 */
function twoProportionPValue(
  cControl: number,
  nControl: number,
  cVariant: number,
  nVariant: number,
): number {
  if (nControl <= 0 || nVariant <= 0) return 1;
  const p1 = cControl / nControl;
  const p2 = cVariant / nVariant;
  const pPool = (cControl + cVariant) / (nControl + nVariant);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nControl + 1 / nVariant));
  if (!isFinite(se) || se === 0) return 1;
  const z = (p2 - p1) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return Math.max(0, Math.min(1, pValue));
}

/* -------------------------------------------------------------------------- */
/*  Loaders KV                                                                */
/* -------------------------------------------------------------------------- */

interface VariantStats {
  variant: string;
  exposures: number;
  /** Map metric → conversions count. */
  conversions: Map<string, number>;
}

interface ExperimentStats {
  meta: ExperimentMeta;
  variants: VariantStats[];
}

async function loadExperimentStats(
  meta: ExperimentMeta,
): Promise<ExperimentStats> {
  const kv = getKv();
  const variants = await Promise.all(
    meta.variants.map(async (variant) => {
      // Exposure
      const exposureKey = `abtest:exposure:${meta.id}:${variant}`;
      const exposures = (await kv.get<number>(exposureKey)) ?? 0;
      // Conversions par metric
      const conversions = new Map<string, number>();
      await Promise.all(
        meta.metrics.map(async (metric) => {
          const key = `abtest:conversion:${meta.id}:${variant}:${metric}`;
          const c = (await kv.get<number>(key)) ?? 0;
          conversions.set(metric, c);
        }),
      );
      return { variant, exposures, conversions } satisfies VariantStats;
    }),
  );
  return { meta, variants };
}

async function loadAllStats(): Promise<ExperimentStats[]> {
  return Promise.all(EXPERIMENT_LIST.map((m) => loadExperimentStats(m)));
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function AdminAbTestPage() {
  const user = await getUser();
  if (!user || !user.isAdmin) {
    notFound();
  }

  const allStats = await loadAllStats();
  const kv = getKv();

  return (
    <article className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-fg">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link href="/admin" className="hover:text-fg">
            Admin
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fg/80">A/B testing</span>
        </nav>

        <header className="mt-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              ADMIN — A/B testing
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Expériences <span className="gradient-text">{BRAND.name}</span>
            </h1>
            <p className="mt-2 text-sm text-muted max-w-3xl">
              Test Z deux proportions (Wald, bilatéral). Significatif si p &lt;{" "}
              {SIGNIFICANCE_THRESHOLD}. Seuil minimal{" "}
              {MIN_EXPOSURES_PER_VARIANT} exposures / variant pour décider.{" "}
              {kv.mocked && (
                <span className="text-amber-300">
                  ⚠ KV en mode mocked — données perdues à chaque cold start.
                </span>
              )}
            </p>
          </div>
        </header>

        <div className="mt-10 space-y-12">
          {allStats.map((stats) => (
            <ExperimentSection key={stats.meta.id} stats={stats} />
          ))}
        </div>

        {/* Notes */}
        <section className="mt-16 rounded-2xl border border-border bg-elevated/40 p-5 text-sm text-fg/80">
          <h3 className="font-bold text-fg mb-2">📚 Notes</h3>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              <strong>Catalogue expériences :</strong>{" "}
              <code className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">
                lib/abtest.ts
              </code>{" "}
              (moteur) +{" "}
              <code className="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded">
                lib/abtest-experiments.ts
              </code>{" "}
              (métriques + descriptions UI).
            </li>
            <li>
              <strong>Validation :</strong> {EXPERIMENT_LIST.length}{" "}
              expériences vague mai 2026, {Object.keys(EXPERIMENTS).length} au
              total dans EXPERIMENTS (incluant historiques).
            </li>
            <li>
              <strong>Uplift :</strong> écart relatif{" "}
              <code>(rate_variant - rate_control) / rate_control</code>. Le
              control est par convention le premier variant déclaré.
            </li>
            <li>
              <strong>p-value :</strong> probabilité d&apos;observer cet écart
              (ou plus extrême) sous H0 (variants équivalents). p &lt; 0,05 ⇒
              on rejette H0.
            </li>
            <li>
              <strong>Limitations :</strong> pas de correction multi-tests
              (Bonferroni / BH) — à appliquer mentalement quand on compare 2+
              variants vs control. Pour un calcul plus rigoureux, exporter les
              compteurs et utiliser scipy / statsmodels.
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

function ExperimentSection({ stats }: { stats: ExperimentStats }) {
  const { meta, variants } = stats;
  const minExposures = Math.min(...variants.map((v) => v.exposures));
  const totalExposures = variants.reduce((s, v) => s + v.exposures, 0);
  const insufficient = minExposures < MIN_EXPOSURES_PER_VARIANT;
  const primaryMetric = meta.metrics[0];
  const control = variants[0];

  return (
    <section
      aria-labelledby={`exp-${meta.id}`}
      className="rounded-2xl border border-border bg-surface overflow-hidden"
    >
      <header className="border-b border-border/60 p-5 sm:p-6 flex flex-wrap gap-3 items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <FlaskConical className="h-4 w-4 text-primary" />
            <h2
              id={`exp-${meta.id}`}
              className="text-lg sm:text-xl font-bold text-fg font-mono"
            >
              {meta.id}
            </h2>
          </div>
          <p className="mt-2 text-sm text-fg/75">{meta.description}</p>
          <p className="mt-1 text-xs text-muted">
            Métriques :{" "}
            {meta.metrics.map((m, i) => (
              <span key={m}>
                <code className="font-mono text-[11px] bg-elevated px-1.5 py-0.5 rounded">
                  {m}
                </code>
                {i === 0 ? (
                  <span className="ml-1 text-primary-soft text-[10px] uppercase tracking-wider">
                    primaire
                  </span>
                ) : null}
                {i < meta.metrics.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
        <div className="text-right text-xs text-muted shrink-0">
          <div>
            Total exposures :{" "}
            <span className="text-fg/85 font-mono tabular-nums">
              {totalExposures.toLocaleString("fr-FR")}
            </span>
          </div>
          <div className="mt-1">
            Min / variant :{" "}
            <span
              className={`font-mono tabular-nums ${
                insufficient ? "text-amber-300" : "text-emerald-300"
              }`}
            >
              {minExposures.toLocaleString("fr-FR")}
            </span>
          </div>
        </div>
      </header>

      {insufficient ? (
        <div className="p-5 sm:p-6 bg-amber-500/5 border-t border-amber-500/20">
          <p className="text-sm text-amber-200">
            <strong>Données insuffisantes — collecte en cours.</strong>{" "}
            Atteindre au moins {MIN_EXPOSURES_PER_VARIANT} exposures par variant
            avant de tirer une conclusion ({minExposures} actuellement sur le
            variant le moins exposé).
          </p>
          {/* On affiche tout de même le tableau brut pour debug */}
          <div className="mt-5">
            <StatsTable
              variants={variants}
              metrics={meta.metrics}
              control={control}
              primaryMetric={primaryMetric}
              showStats={false}
            />
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <StatsTable
            variants={variants}
            metrics={meta.metrics}
            control={control}
            primaryMetric={primaryMetric}
            showStats={true}
          />
        </div>
      )}
    </section>
  );
}

interface StatsTableProps {
  variants: VariantStats[];
  metrics: readonly string[];
  control: VariantStats;
  primaryMetric: string;
  showStats: boolean;
}

function StatsTable({
  variants,
  metrics,
  control,
  primaryMetric,
  showStats,
}: StatsTableProps) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted">
          <tr className="border-b border-border/60">
            <th className="px-3 py-2 text-left">Variant</th>
            <th className="px-3 py-2 text-right">Exposures</th>
            {metrics.map((m) => (
              <th key={m} className="px-3 py-2 text-right">
                <span className="font-mono">{m}</span>
              </th>
            ))}
            {showStats && (
              <>
                <th className="px-3 py-2 text-right">
                  Taux primaire
                  <div className="text-[10px] normal-case text-muted/70">
                    {primaryMetric}
                  </div>
                </th>
                <th className="px-3 py-2 text-right">Uplift vs control</th>
                <th className="px-3 py-2 text-right">p-value</th>
                <th className="px-3 py-2 text-center">Confiance</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => {
            const isControl = v.variant === control.variant;
            const cPrimary = v.conversions.get(primaryMetric) ?? 0;
            const ratePrimary =
              v.exposures > 0 ? cPrimary / v.exposures : 0;
            const cControlPrimary =
              control.conversions.get(primaryMetric) ?? 0;
            const rateControlPrimary =
              control.exposures > 0
                ? cControlPrimary / control.exposures
                : 0;
            const uplift =
              !isControl && rateControlPrimary > 0
                ? (ratePrimary - rateControlPrimary) / rateControlPrimary
                : 0;
            const pValue = isControl
              ? 1
              : twoProportionPValue(
                  cControlPrimary,
                  control.exposures,
                  cPrimary,
                  v.exposures,
                );
            const significant = !isControl && pValue < SIGNIFICANCE_THRESHOLD;

            return (
              <tr
                key={v.variant}
                className="border-b border-border/30 last:border-b-0"
              >
                <td className="px-3 py-3">
                  <div className="font-bold text-fg flex items-center gap-2">
                    <span className="font-mono">{v.variant}</span>
                    {isControl && (
                      <span className="text-[10px] uppercase tracking-wider text-muted bg-elevated px-1.5 py-0.5 rounded">
                        control
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-fg/85">
                  {v.exposures.toLocaleString("fr-FR")}
                </td>
                {metrics.map((m) => {
                  const c = v.conversions.get(m) ?? 0;
                  const rate = v.exposures > 0 ? c / v.exposures : 0;
                  return (
                    <td
                      key={m}
                      className="px-3 py-3 text-right font-mono tabular-nums"
                    >
                      <div className="text-fg/85">
                        {c.toLocaleString("fr-FR")}
                      </div>
                      <div className="text-[10px] text-muted">
                        {(rate * 100).toFixed(2)}%
                      </div>
                    </td>
                  );
                })}
                {showStats && (
                  <>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-base text-fg">
                      {(ratePrimary * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {isControl ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span
                          className={
                            uplift > 0
                              ? "text-emerald-300"
                              : uplift < 0
                                ? "text-rose-300"
                                : "text-fg/70"
                          }
                        >
                          {uplift > 0 ? "+" : ""}
                          {(uplift * 100).toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-fg/75">
                      {isControl ? (
                        <span className="text-muted">—</span>
                      ) : (
                        pValue.toFixed(4)
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isControl ? (
                        <span className="text-muted">—</span>
                      ) : significant ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          {(100 * (1 - pValue)).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] font-bold text-muted">
                          NS
                        </span>
                      )}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Lien doc */}
      <div className="mt-3 px-3 text-xs text-muted">
        Réf. test Z :{" "}
        <a
          href="https://en.wikipedia.org/wiki/Test_statistics#Two-proportion_z-test"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Wikipedia <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>
    </div>
  );
}

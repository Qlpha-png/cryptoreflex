"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { calculateFlatTax, calculatePlusValue, formatEur } from "@/lib/tax-fr";
import TaxResult from "./TaxResult";

interface StepConfig {
  id: keyof FormState;
  label: string;
  hint: string;
  placeholder: string;
}

interface FormState {
  acquisitionsTotales: string;
  valeurPortefeuilleActuelle: string;
  totalCessionsAnnee: string;
  valeurPortefeuilleAuMomentVente: string;
}

const STEPS: StepConfig[] = [
  {
    id: "acquisitionsTotales",
    label: "Combien avez-vous investi au total ?",
    hint: "Somme de tous vos achats crypto, en euros, depuis le début (frais d'achat inclus).",
    placeholder: "Ex. 5000",
  },
  {
    id: "valeurPortefeuilleActuelle",
    label: "Valeur actuelle de votre portefeuille ?",
    hint: "Valorisation totale de toutes vos cryptos au prix du jour.",
    placeholder: "Ex. 12000",
  },
  {
    id: "totalCessionsAnnee",
    label: "Combien avez-vous vendu cette année ?",
    hint: "Total des cessions vers euros (€) ou monnaie ayant cours légal en 2026. Les conversions crypto ↔ crypto ne comptent pas.",
    placeholder: "Ex. 4000",
  },
  {
    id: "valeurPortefeuilleAuMomentVente",
    label: "Valeur du portefeuille au moment de la vente ?",
    hint: "Valorisation totale de votre portefeuille (incluant la part vendue) juste avant la cession.",
    placeholder: "Ex. 10000",
  },
];

const INITIAL: FormState = {
  acquisitionsTotales: "",
  valeurPortefeuilleActuelle: "",
  totalCessionsAnnee: "",
  valeurPortefeuilleAuMomentVente: "",
};

/* ------------------------------------------------------------------ */
/*  Projection 5 ans — calcul itératif                                 */
/* ------------------------------------------------------------------ */

interface ProjectionRow {
  year: number;
  capitalBrut: number; // valeur du portefeuille brut année N
  plusValueAnnuelle: number; // gain de l'année (capital N - capital N-1)
  impotAnnuel: number; // PFU 30 % sur le gain de l'année (si réalisé)
  impotCumule: number; // somme des impôts années 1..N
  capitalNet: number; // capital brut - impôts cumulés
}

/**
 * Projection 5 ans à partir d'un capital initial et d'une perf annuelle estimée.
 *
 * Hypothèse simplificatrice : on calcule un PFU théorique sur les gains réalisés
 * chaque année (comme si tout était cédé en fin d'année). C'est volontairement
 * pessimiste vs un buy & hold pur (où aucun impôt n'est dû tant qu'on ne vend
 * pas), mais utile pour évaluer "et si je devais payer chaque année, ça donne
 * quoi ?". Le disclaimer le rappelle.
 */
function buildProjection(initial: number, perfPct: number): ProjectionRow[] {
  if (!Number.isFinite(initial) || initial <= 0) return [];
  const rate = perfPct / 100;
  const rows: ProjectionRow[] = [];
  let prev = initial;
  let impotCumule = 0;
  for (let y = 1; y <= 5; y++) {
    const capitalBrut = prev * (1 + rate);
    const plusValueAnnuelle = capitalBrut - prev;
    // PFU 30 % sur le gain annuel (positif uniquement)
    const impotAnnuel = plusValueAnnuelle > 0 ? plusValueAnnuelle * 0.3 : 0;
    impotCumule += impotAnnuel;
    const capitalNet = capitalBrut - impotCumule;
    rows.push({
      year: y,
      capitalBrut,
      plusValueAnnuelle,
      impotAnnuel,
      impotCumule,
      capitalNet,
    });
    prev = capitalBrut;
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TaxCalculator() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [showResult, setShowResult] = useState(false);
  const [showProjection, setShowProjection] = useState(false);

  // Performance annuelle estimée (% par an)
  const [perfPct, setPerfPct] = useState<string>("15");

  // Hydratation initiale depuis URL : ?invested=1000&perf=15
  // On lit une fois au mount pour pré-remplir, puis on synchronise via replace
  // (sans push) pour ne pas polluer l'historique.
  useEffect(() => {
    const invested = searchParams?.get("invested");
    const perf = searchParams?.get("perf");
    if (invested && Number.isFinite(parseFloat(invested))) {
      setForm((prev) => ({ ...prev, acquisitionsTotales: invested }));
    }
    if (perf && Number.isFinite(parseFloat(perf))) {
      setPerfPct(perf);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronise URL state quand "invested" ou "perf" changent (sans bruit historique)
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const invested = parseFloat(form.acquisitionsTotales);
    if (Number.isFinite(invested) && invested > 0) {
      params.set("invested", String(invested));
    } else {
      params.delete("invested");
    }
    const p = parseFloat(perfPct);
    if (Number.isFinite(p)) {
      params.set("perf", String(p));
    } else {
      params.delete("perf");
    }
    const qs = params.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    // replace (pas push) pour préserver l'UX back/forward
    router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.acquisitionsTotales, perfPct]);

  const isLastStep = step === STEPS.length - 1;
  const currentStep = STEPS[step];
  const currentValueRaw = form[currentStep.id];
  const currentValueNumber = parseFloat(currentValueRaw);
  const currentValid =
    Number.isFinite(currentValueNumber) && currentValueNumber > 0;

  const result = useMemo(() => {
    const acq = parseFloat(form.acquisitionsTotales);
    const vente = parseFloat(form.totalCessionsAnnee);
    const valPort = parseFloat(form.valeurPortefeuilleAuMomentVente);
    return calculatePlusValue({
      montantVente: vente,
      acquisitionsTotales: acq,
      valeurPortefeuille: valPort,
      totalCessionsAnnee: vente,
    });
  }, [form]);

  // Projection : on prend la valeur actuelle du portefeuille comme base de départ
  // (capital "ici et maintenant"), et la perf annuelle estimée.
  const projection = useMemo(() => {
    const base = parseFloat(form.valeurPortefeuilleActuelle);
    const p = parseFloat(perfPct);
    if (!Number.isFinite(base) || base <= 0) return [];
    if (!Number.isFinite(p)) return [];
    return buildProjection(base, p);
  }, [form.valeurPortefeuilleActuelle, perfPct]);

  function update(id: keyof FormState, value: string) {
    const cleaned = value.replace(",", ".").replace(/[^0-9.]/g, "");
    setForm((prev) => ({ ...prev, [id]: cleaned }));
  }

  function handleNext() {
    if (!currentValid) return;
    if (isLastStep) {
      setShowResult(true);
      return;
    }
    setStep((s) => s + 1);
  }

  function handlePrev() {
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  function handleReset() {
    setForm(INITIAL);
    setStep(0);
    setShowResult(false);
    setShowProjection(false);
  }

  const progress = ((step + (showResult ? 1 : 0)) / STEPS.length) * 100;

  return (
    <div
      id="calculateur"
      className="glass glow-border rounded-2xl p-6 sm:p-8"
      aria-labelledby="tax-calc-title"
    >
      {/* En-tête */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-soft">
          <Calculator className="h-5 w-5 text-background" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2
            id="tax-calc-title"
            className="font-display font-bold text-xl text-white"
          >
            Calculateur Fiscalité Crypto FR 2026
          </h2>
          <p className="text-sm text-muted">
            4 questions, formule officielle 150 VH bis, projection 5 ans optionnelle.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-accent-green/40 bg-accent-green/10 px-2.5 py-1 text-xs font-semibold text-accent-green">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          100 % anonyme
        </span>
      </div>

      {/* Toggle Affichage simple / avec projection */}
      <div className="mb-6 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowProjection((v) => !v)}
          aria-pressed={showProjection}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated/40 px-3 py-1.5 text-xs font-semibold text-fg/85 hover:border-primary/40
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {showProjection ? (
            <>
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              Affichage simple
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Affichage avec projection 5 ans
            </>
          )}
        </button>
      </div>

      {/* Barre de progression */}
      <div
        className="mb-6"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression du calculateur"
      >
        <div className="flex justify-between text-xs text-muted mb-2">
          <span>
            Étape {Math.min(step + 1, STEPS.length)} / {STEPS.length}
          </span>
          <span>{showResult ? "Résultat" : `${Math.round(progress)} %`}</span>
        </div>
        <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-soft transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Saisie / formulaire */}
      {!showResult && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNext();
          }}
          className="space-y-6"
          aria-live="polite"
        >
          <div>
            <label
              htmlFor={`field-${currentStep.id}`}
              className="block text-sm font-semibold text-white"
            >
              {currentStep.label}
            </label>
            <p className="mt-1 text-sm text-muted">{currentStep.hint}</p>
            <div className="mt-3 relative">
              <input
                id={`field-${currentStep.id}`}
                type="text"
                inputMode="decimal"
                autoFocus
                value={currentValueRaw}
                placeholder={currentStep.placeholder}
                onChange={(e) => update(currentStep.id, e.target.value)}
                aria-describedby={`hint-${currentStep.id}`}
                className="w-full rounded-xl bg-background border border-border px-4 py-4 pr-12
                           font-mono text-2xl text-white
                           focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-muted"
                aria-hidden="true"
              >
                €
              </span>
            </div>
            <p
              id={`hint-${currentStep.id}`}
              className="mt-2 text-xs text-muted"
            >
              Saisissez un montant en euros. Aucune donnée n'est envoyée à un serveur.
            </p>
          </div>

          {/* Récap des étapes précédentes */}
          {step > 0 && (
            <ul className="text-xs text-muted space-y-1 border-t border-border/60 pt-4">
              {STEPS.slice(0, step).map((s, i) => {
                const v = parseFloat(form[s.id]);
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    <Check
                      className="h-3.5 w-3.5 text-accent-green"
                      aria-hidden="true"
                    />
                    <span className="text-white/70">{s.label}</span>
                    <span className="ml-auto font-mono text-white">
                      {Number.isFinite(v) ? formatEur(v) : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(i)}
                      className="ml-2 text-primary-soft hover:underline"
                    >
                      Modifier
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 0}
              className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Précédent
            </button>
            <button
              type="submit"
              disabled={!currentValid}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLastStep ? "Calculer ma fiscalité" : "Étape suivante"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      )}

      {/* Résultat */}
      {showResult && (
        <div className="space-y-6">
          <TaxResult
            result={result}
            totalCessionsAnnee={parseFloat(form.totalCessionsAnnee)}
          />

          {/* Projection 5 ans (optionnelle) */}
          {showProjection && (
            <ProjectionPanel
              initialCapital={parseFloat(form.valeurPortefeuilleActuelle)}
              perfPct={perfPct}
              onPerfChange={setPerfPct}
              rows={projection}
            />
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 pt-6">
            <p className="text-xs text-muted">
              Vous pouvez modifier vos réponses à tout moment, vos données restent
              sur votre appareil.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResult(false)}
                className="btn-ghost"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Modifier
              </button>
              <button type="button" onClick={handleReset} className="btn-ghost">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Recommencer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProjectionPanel — sous-composant : input perf, tableau, mini-chart */
/* ------------------------------------------------------------------ */

function ProjectionPanel({
  initialCapital,
  perfPct,
  onPerfChange,
  rows,
}: {
  initialCapital: number;
  perfPct: string;
  onPerfChange: (v: string) => void;
  rows: ProjectionRow[];
}) {
  const valid = Number.isFinite(initialCapital) && initialCapital > 0 && rows.length > 0;
  const max = valid
    ? Math.max(...rows.map((r) => Math.max(r.capitalBrut, r.capitalNet)))
    : 0;

  // Synthèse 5 ans
  const last = rows[rows.length - 1];
  const totalImpot = last?.impotCumule ?? 0;
  const finalNet = last?.capitalNet ?? 0;
  const finalBrut = last?.capitalBrut ?? 0;

  return (
    <section
      className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
      aria-labelledby="projection-title"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-primary-soft text-sm font-semibold">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Projection sur 5 ans
          </div>
          <h3
            id="projection-title"
            className="mt-1 text-lg sm:text-xl font-bold text-white"
          >
            Et si tu cèdes chaque année à PFU 30 % ?
          </h3>
        </div>

        {/* Input perf annuelle */}
        <div className="shrink-0">
          <label htmlFor="perf-input" className="block text-xs text-muted mb-1">
            Performance annuelle estimée (%)
          </label>
          <div className="relative">
            <input
              id="perf-input"
              type="number"
              inputMode="decimal"
              step="1"
              min="-50"
              max="200"
              value={perfPct}
              onChange={(e) => onPerfChange(e.target.value)}
              className="w-32 rounded-lg bg-background border border-border px-3 py-2 pr-7
                         font-mono text-sm text-white
                         focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-describedby="perf-hint"
            />
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-muted text-xs"
              aria-hidden="true"
            >
              %
            </span>
          </div>
          <p id="perf-hint" className="mt-1 text-[11px] text-muted">
            ex : 15 % = +15 % par an
          </p>
        </div>
      </div>

      {!valid ? (
        <p className="mt-4 text-sm text-fg/70 flex items-start gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary-soft" aria-hidden="true" />
          Renseigne ta valeur de portefeuille actuelle (étape 2) pour activer la
          projection.
        </p>
      ) : (
        <>
          {/* Mini-chart SVG en barres : capital net par année */}
          <div className="mt-5">
            <p className="text-xs text-muted mb-2">
              Capital net après PFU (chaque barre = 1 année)
            </p>
            <BarChart rows={rows} max={max} initialCapital={initialCapital} />
          </div>

          {/* Tableau 5 lignes */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm" aria-label="Projection annuelle 5 ans">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-2 py-2">Année</th>
                  <th className="px-2 py-2 text-right">Capital brut</th>
                  <th className="px-2 py-2 text-right">Impôt cumulé</th>
                  <th className="px-2 py-2 text-right">Capital net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr className="text-fg/70">
                  <td className="px-2 py-2 font-mono text-xs">Aujourd'hui</td>
                  <td className="px-2 py-2 text-right font-mono">
                    {formatEur(initialCapital, { decimals: 0 })}
                  </td>
                  <td className="px-2 py-2 text-right font-mono">—</td>
                  <td className="px-2 py-2 text-right font-mono">
                    {formatEur(initialCapital, { decimals: 0 })}
                  </td>
                </tr>
                {rows.map((r) => (
                  <tr key={r.year} className="text-fg">
                    <td className="px-2 py-2 font-mono text-xs">N+{r.year}</td>
                    <td className="px-2 py-2 text-right font-mono">
                      {formatEur(r.capitalBrut, { decimals: 0 })}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-accent-rose">
                      {formatEur(r.impotCumule, { decimals: 0 })}
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-semibold text-accent-green">
                      {formatEur(r.capitalNet, { decimals: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Synthèse */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryTile
              label="Capital final brut"
              value={formatEur(finalBrut, { decimals: 0 })}
            />
            <SummaryTile
              label="Impôt total payé"
              value={formatEur(totalImpot, { decimals: 0 })}
              tone="rose"
            />
            <SummaryTile
              label="Net final après PFU"
              value={formatEur(finalNet, { decimals: 0 })}
              tone="green"
            />
          </div>

          <p className="mt-5 text-[11px] text-muted leading-relaxed">
            <Info className="inline h-3 w-3 -mt-0.5" aria-hidden="true" />{" "}
            Estimation à titre indicatif — taux PFU 2026 (30 %), fiscalité peut
            évoluer. Hypothèse : tu cèdes chaque année tes gains pour réaliser
            l'imposition. En buy &amp; hold pur (aucune cession), aucun impôt
            n'est dû tant que tu ne convertis pas en euros — la projection
            ci-dessus est donc volontairement pessimiste.
          </p>
        </>
      )}
    </section>
  );
}

function SummaryTile({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "green" | "rose";
}) {
  const toneClass =
    tone === "green"
      ? "text-accent-green"
      : tone === "rose"
      ? "text-accent-rose"
      : "text-white";
  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 font-mono font-bold text-lg ${toneClass}`}>{value}</div>
    </div>
  );
}

function BarChart({
  rows,
  max,
  initialCapital,
}: {
  rows: ProjectionRow[];
  max: number;
  initialCapital: number;
}) {
  // Inclut une barre "année 0" (capital initial) à gauche pour la lisibilité.
  const allBars = [
    { year: 0, capitalBrut: initialCapital, capitalNet: initialCapital },
    ...rows.map((r) => ({
      year: r.year,
      capitalBrut: r.capitalBrut,
      capitalNet: r.capitalNet,
    })),
  ];
  const width = 600;
  const height = 180;
  const padding = { top: 16, right: 12, bottom: 28, left: 44 };
  const chartH = height - padding.top - padding.bottom;
  const chartW = width - padding.left - padding.right;
  const barCount = allBars.length;
  // 2 barres par année (brut + net) → on calcule la largeur totale d'un slot
  const slotW = chartW / barCount;
  const barW = Math.max(8, slotW / 3);

  return (
    <svg
      role="img"
      aria-label={`Évolution du capital sur 5 ans : ${rows
        .map((r) => `année ${r.year} ${formatEur(r.capitalNet, { decimals: 0 })}`)
        .join(", ")}`}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
    >
      {/* Axe Y guide */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartH}
        stroke="currentColor"
        strokeOpacity="0.2"
      />
      {/* Axe X guide */}
      <line
        x1={padding.left}
        y1={padding.top + chartH}
        x2={width - padding.right}
        y2={padding.top + chartH}
        stroke="currentColor"
        strokeOpacity="0.2"
      />

      {allBars.map((b, idx) => {
        const cx = padding.left + slotW * idx + slotW / 2;
        const hBrut = max > 0 ? (b.capitalBrut / max) * chartH : 0;
        const hNet = max > 0 ? (b.capitalNet / max) * chartH : 0;
        const yBrut = padding.top + chartH - hBrut;
        const yNet = padding.top + chartH - hNet;
        const labelY = padding.top + chartH + 18;
        return (
          <g key={idx}>
            {/* Barre BRUT (derrière, plus claire) */}
            <rect
              x={cx - barW}
              y={yBrut}
              width={barW}
              height={hBrut}
              fill="#facc15"
              fillOpacity="0.4"
              rx="2"
            >
              <title>
                {b.year === 0 ? "Capital initial" : `Année N+${b.year} brut`} :{" "}
                {formatEur(b.capitalBrut, { decimals: 0 })}
              </title>
            </rect>
            {/* Barre NET (devant, plus opaque) */}
            <rect
              x={cx}
              y={yNet}
              width={barW}
              height={hNet}
              fill="#22c55e"
              rx="2"
            >
              <title>
                {b.year === 0 ? "Capital initial" : `Année N+${b.year} net`} :{" "}
                {formatEur(b.capitalNet, { decimals: 0 })}
              </title>
            </rect>
            {/* Label année */}
            <text
              x={cx}
              y={labelY}
              fontSize="11"
              fill="currentColor"
              fillOpacity="0.55"
              textAnchor="middle"
            >
              {b.year === 0 ? "0" : `N+${b.year}`}
            </text>
          </g>
        );
      })}

      {/* Légende compacte */}
      <g transform={`translate(${width - padding.right - 150}, ${padding.top - 4})`}>
        <rect x={0} y={0} width={10} height={10} fill="#facc15" fillOpacity="0.4" />
        <text x={14} y={9} fontSize="10" fill="currentColor" fillOpacity="0.7">
          Brut
        </text>
        <rect x={60} y={0} width={10} height={10} fill="#22c55e" />
        <text x={74} y={9} fontSize="10" fill="currentColor" fillOpacity="0.7">
          Net après PFU
        </text>
      </g>
    </svg>
  );
}

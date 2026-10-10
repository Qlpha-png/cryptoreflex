"use client";

/**
 * PlatformQuiz — filtre neutre des plateformes crypto autorisées en France (07/10/2026).
 *
 * Remplace le questionnaire « Vos 3 plateformes recommandées / Notre meilleur match » : l'AMF (actualité du
 * 04/08/2026) range les recommandations personnalisées sur l'utilisation de services sur crypto-actifs dans le
 * conseil soumis à agrément. Ici : des critères appuyés sur des relevés datés (lib/platform-filter.ts), la liste
 * complète des plateformes autorisées en France qui les remplissent, par ordre alphabétique, aucune note, aucun lien
 * rémunéré dans le résultat (liens vers nos fiches /avis).
 *
 * Navigation clavier : Tab, Entrée, chiffres 1-2 pour répondre, flèche gauche pour revenir.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, RefreshCcw, ShieldCheck } from "lucide-react";
import type { Platform } from "@/lib/platforms";
import { trackToolUsage } from "@/lib/analytics";
import ComparateurNotice from "@/components/ComparateurNotice";
import VerifieLe from "@/components/ui/VerifieLe";
import { datesDe, type DateFrais } from "@/lib/frais-libelle";
import {
  ANY_HINT,
  ANY_LABEL,
  CRITERIA,
  FILTER_DISCLAIMER,
  costCoverage,
  filterPlatforms,
  type FilterAnswers,
  type FilterChoice,
} from "@/lib/platform-filter";

interface Props {
  platforms: Platform[];
}

const TOTAL_STEPS = CRITERIA.length;

export default function PlatformQuiz({ platforms }: Props) {
  const [step, setStep] = useState(0); // 0..TOTAL_STEPS-1, ou TOTAL_STEPS = résultat
  const [answers, setAnswers] = useState<FilterAnswers>({});
  const liveRegionId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  const showResult = step >= TOTAL_STEPS;
  const result = useMemo(
    () => (showResult ? filterPlatforms(platforms, answers) : []),
    [showResult, platforms, answers]
  );

  useEffect(() => {
    if (showResult) {
      titleRef.current?.focus();
    } else {
      const t = setTimeout(() => firstOptionRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [step, showResult]);

  useEffect(() => {
    if (showResult) trackToolUsage("platform-filter", `result:${result.length}`);
  }, [showResult, result.length]);

  const current = !showResult ? CRITERIA[step] : null;

  /* Empêche un double clic (ou deux appuis sur « 1 ») de sauter un critère pendant la transition. */
  const advancing = useRef(false);
  function choose(value: FilterChoice) {
    if (!current || advancing.current) return;
    advancing.current = true;
    setAnswers((a) => ({ ...a, [current.key]: value }));
    window.setTimeout(() => {
      advancing.current = false;
      setStep((s) => s + 1);
    }, 280);
  }

  function goPrev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    trackToolUsage("platform-filter", "restart");
  }

  useEffect(() => {
    if (showResult || !current) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "1") choose("oui");
      else if (e.key === "2") choose("peu-importe");
      else if (e.key === "ArrowLeft" && step > 0) goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, current, showResult]);

  const options: { value: FilterChoice; label: string; hint: string }[] = current
    ? [
        { value: "oui", label: current.yesLabel, hint: current.yesHint },
        { value: "peu-importe", label: ANY_LABEL, hint: ANY_HINT },
      ]
    : [];

  return (
    <section
      role="form"
      aria-label="Filtre des plateformes crypto autorisées en France"
      className="glass rounded-3xl p-6 sm:p-10 relative overflow-hidden min-h-[60vh] flex flex-col"
    >
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Progression */}
      <div className="relative">
        <div className="flex items-center justify-between text-xs text-muted mb-3">
          <span aria-hidden="true">
            {showResult ? "Résultat" : `Critère ${step + 1} sur ${TOTAL_STEPS}`}
          </span>
          {!showResult && <span aria-hidden="true">{Math.round((step / TOTAL_STEPS) * 100)} %</span>}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={showResult ? TOTAL_STEPS : step}
          aria-label={`Progression du filtre : étape ${showResult ? TOTAL_STEPS : step + 1} sur ${TOTAL_STEPS}`}
          className="h-1.5 w-full bg-elevated rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-emphasized"
            style={{ width: `${((showResult ? TOTAL_STEPS : step) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div id={liveRegionId} aria-live="polite" className="sr-only">
        {showResult
          ? `Résultat du filtre : ${result.length} plateforme${result.length > 1 ? "s" : ""}.`
          : `Critère ${step + 1} sur ${TOTAL_STEPS} : ${current?.title ?? ""}`}
      </div>

      {/* CRITÈRE */}
      {!showResult && current && (
        <div
          key={step}
          aria-current="step"
          className="relative mt-6 flex-1 flex flex-col justify-center animate-quiz-slide"
        >
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg focus:outline-none"
          >
            {current.title}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-fg/70 max-w-2xl">{current.subtitle}</p>

          <div role="radiogroup" aria-label={current.title} className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt, idx) => {
              const isSelected = answers[current.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  ref={idx === 0 ? firstOptionRef : undefined}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => choose(opt.value)}
                  className={`group text-left rounded-2xl p-4 sm:p-5 border transition-all duration-fast
                              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                              focus-visible:ring-offset-2 focus-visible:ring-offset-background
                              ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-elevated/40 hover:border-primary/50 hover:bg-elevated"
                              }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono text-xs font-bold
                                  ${
                                    isSelected
                                      ? "bg-primary text-background"
                                      : "bg-elevated text-muted group-hover:text-primary-soft"
                                  }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-fg text-base sm:text-lg">{opt.label}</div>
                      <div className="mt-0.5 text-xs sm:text-sm text-muted">{opt.hint}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg
                         disabled:opacity-40 disabled:cursor-not-allowed
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-2 py-1"
              aria-label="Critère précédent"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Précédent
            </button>
            <p className="text-xs text-muted hidden sm:block">
              Astuce : appuyez sur{" "}
              <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-elevated text-fg">1-2</kbd> pour
              répondre
            </p>
          </div>
        </div>
      )}

      {/* RÉSULTAT */}
      {showResult && (
        <div className="relative mt-6 flex-1 animate-quiz-slide">
          <FilterResult
            platforms={platforms}
            answers={answers}
            titleRef={titleRef}
            onRestart={restart}
            onEdit={(idx) => setStep(idx)}
          />
        </div>
      )}

      <style>{`
        @keyframes quiz-slide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-quiz-slide {
          animation: quiz-slide 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-quiz-slide { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Résultat (exporté pour les tests de rendu)                         */
/* ------------------------------------------------------------------ */

export function FilterResult({
  platforms,
  answers,
  titleRef,
  onRestart,
  onEdit,
}: {
  platforms: Platform[];
  answers: FilterAnswers;
  titleRef?: React.Ref<HTMLHeadingElement>;
  onRestart?: () => void;
  onEdit?: (criterionIndex: number) => void;
}) {
  const list = filterPlatforms(platforms, answers);
  const { total, exact } = costCoverage(platforms);
  const active = CRITERIA.filter((c) => answers[c.key] === "oui");
  const n = list.length;
  /* Dates des relevés affichés sur les fiches : autorisation MiCA + les trois critères. */
  const dates: DateFrais[] = [
    ...list.map((p) => ({ date: p.mica.lastVerified ?? null, auto: false })),
    ...CRITERIA.flatMap((c) => list.flatMap((p) => c.dates(p))),
  ];

  return (
    <div>
      <h2
        ref={titleRef}
        tabIndex={-1}
        className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg focus:outline-none"
      >
        {active.length === 0
          ? `Les ${total} plateformes autorisées en France`
          : n === 0
            ? "Aucune plateforme autorisée en France ne remplit tous ces critères"
            : `${n} plateforme${n > 1 ? "s" : ""} sur les ${total} autorisées en France ${
                n > 1 ? "remplissent" : "remplit"
              } vos critères`}
      </h2>

      <p className="mt-3 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-fg/85">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary-soft" aria-hidden="true" />
        <span data-testid="filter-disclaimer">{FILTER_DISCLAIMER}</span>
      </p>

      <ComparateurNotice
        className="mt-3 max-w-3xl"
        critere={<>ordre alphabétique, sans note ni rang : la liste garde les plateformes qui remplissent les critères cochés.</>}
        liens={<>Les liens de cette liste mènent aux fiches du site et ne sont pas rémunérés.</>}
        perimetre={
          <>
            les {total} plateformes autorisées en France de notre base. D&apos;autres prestataires agréés peuvent servir la
            France sans figurer ici.
          </>
        }
      />

      {n > 0 && (
        <p className="mt-3 text-xs text-muted max-w-3xl">
          <strong className="text-fg/85">Ordre alphabétique.</strong> Pas de tri par coût :{" "}
          {exact === 0
            ? `aucune des ${total} plateformes ne publie le coût complet d'un achat de Bitcoin`
            : `${exact === 1 ? "une seule" : exact} plateforme${exact > 1 ? "s" : ""} sur ${total} ${
                exact > 1 ? "publient" : "publie"
              } le coût complet d'un achat de Bitcoin`}
          {" ; les autres publient un plafond, ajoutent une marge non chiffrée ou ne publient pas ce coût, et ces montants ne se comparent pas entre eux."}
          {" "}
          <VerifieLe dates={datesDe(dates)} famille="frais" label={dates.some((d) => d.date && d.auto) ? "Données des fiches relevées ou, pour les frais, contrôlées automatiquement" : "Données des fiches relevées"} age={false} />.
        </p>
      )}

      {n > 0 ? (
        <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Plateformes qui remplissent vos critères">
          {list.map((p) => (
            <li
              key={p.id}
              data-platform={p.id}
              className="rounded-2xl border border-border bg-elevated/40 p-4 sm:p-5 flex flex-col"
            >
              <h3 className="text-lg font-bold text-fg">{p.name}</h3>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-soft shrink-0" aria-hidden="true" />
                Agréée MiCA{p.mica.authority ? ` · ${p.mica.authority}` : ""}
              </p>
              <dl className="mt-3 space-y-1.5 text-xs">
                {CRITERIA.map((c) => (
                  <div key={c.key} className="flex flex-wrap justify-between gap-x-3">
                    <dt className="text-muted">{c.factLabel}</dt>
                    <dd className="ml-auto text-fg/85 text-right">{c.fact(p)}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href={`/avis/${p.id}`}
                className="mt-4 inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-fg/80 hover:bg-elevated hover:border-primary/30 transition-colors"
              >
                Lire la fiche {p.name}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-fg/70 max-w-xl">
          Passez un critère sur « {ANY_LABEL} » pour élargir la liste.
        </p>
      )}

      {/* Récapitulatif des critères */}
      <section className="mt-8" aria-label="Vos critères">
        <h4 className="text-sm font-semibold text-fg/85 uppercase tracking-wider">Vos critères</h4>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CRITERIA.map((c, idx) => (
            <li
              key={c.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-elevated/30 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted">{c.short}</div>
                <div className="text-sm text-fg truncate">{answers[c.key] === "oui" ? "Oui" : ANY_LABEL}</div>
              </div>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(idx)}
                  className="text-xs text-primary-soft hover:text-primary
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-1"
                >
                  Modifier
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/comparatif/frais"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="mt-1 font-bold text-fg">Comparer les coûts relevés</div>
          <div className="mt-1 text-xs text-muted">Le coût d&apos;un achat, plateforme par plateforme, avec ses sources.</div>
        </Link>
        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="text-left rounded-2xl border border-border bg-elevated/30 p-4 hover:border-primary/40 transition-colors
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex items-center gap-2 text-fg/75 text-sm font-semibold">
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Recommencer
            </div>
            <div className="mt-1 font-bold text-fg">Choisir d&apos;autres critères</div>
          </button>
        )}
      </div>
    </div>
  );
}

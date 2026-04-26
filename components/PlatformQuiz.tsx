"use client";

/**
 * PlatformQuiz — Quiz interactif "Quelle plateforme crypto pour toi ?".
 *
 * Pure CSS animations (slide subtil), respect strict de prefers-reduced-motion
 * (cf. globals.css @media). Aucune dépendance externe. Navigation clavier
 * complète (Tab, Enter, chiffres 1..4 pour sélection rapide).
 *
 * Source des plateformes : prop `platforms` injectée par la page server pour
 * éviter un re-fetch et conserver la SSR-friendliness du Hero.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import type { Platform } from "@/lib/platforms";
import { trackAffiliateClick, trackToolUsage } from "@/lib/analytics";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AnswerKey =
  | "profile"
  | "amount"
  | "frequency"
  | "priority"
  | "deposit"
  | "mica";

/**
 * Refonte 26/04/2026 (feedback utilisateur "plusieurs réponses ?")
 *
 * Une `Answer` est :
 *  - `string` pour une question single-select (Q1 profil, Q2 montant, Q6 MiCA)
 *  - `string[]` pour une question multi-select (Q3 frequence, Q4 priorite, Q5 depot)
 *
 * Helpers `getAnswer()` et `hasAnswer()` normalisent l'accès — toute la logique
 * de scoring travaille sur des `string[]` même pour les single (1 elem ou 0).
 */
type AnswerValue = string | string[];
type Answers = Partial<Record<AnswerKey, AnswerValue>>;

/** Normalise toute Answer en string[] (vide si undefined). Helper interne. */
function getAnswer(answers: Answers, key: AnswerKey): string[] {
  const v = answers[key];
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** Test si une question a la valeur `value` (que single ou multi). */
function hasAnswer(answers: Answers, key: AnswerKey, value: string): boolean {
  return getAnswer(answers, key).includes(value);
}

interface QuestionOption {
  /** Valeur stockée dans `answers[questionKey]`. */
  value: string;
  /** Texte visible dans la card. */
  label: string;
  /** Sous-texte facultatif. */
  hint?: string;
}

interface Question {
  key: AnswerKey;
  /** "single" = radio (1 réponse), "multi" = checkbox (plusieurs). */
  type: "single" | "multi";
  /** Limite supérieure de selections pour les multi (par defaut: pas de limite). */
  maxSelections?: number;
  title: string;
  subtitle?: string;
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    key: "profile",
    type: "single",
    title: "Tu débutes ou tu as déjà investi en crypto ?",
    subtitle:
      "On va calibrer la complexité de l'interface et le niveau de support requis.",
    options: [
      { value: "beginner", label: "Débutant", hint: "Premier achat, jamais utilisé d'exchange" },
      { value: "intermediate", label: "Intermédiaire", hint: "Quelques achats, bases acquises" },
      { value: "advanced", label: "Avancé", hint: "Trading actif, ordres limites, spot" },
    ],
  },
  {
    key: "amount",
    type: "single",
    title: "Combien comptes-tu investir au début ?",
    subtitle: "Cela influence la pertinence des dépôts minimums et la sécurité.",
    options: [
      { value: "tiny", label: "< 100 €", hint: "Tester sans engagement" },
      { value: "small", label: "100 – 1 000 €", hint: "Premier vrai capital" },
      { value: "medium", label: "1 000 – 10 000 €", hint: "Investissement sérieux" },
      { value: "large", label: "> 10 000 €", hint: "Patrimoine — sécurité maximale" },
    ],
  },
  {
    key: "frequency",
    type: "multi",
    maxSelections: 2,
    title: "Comment tu vas acheter (plusieurs réponses possibles) ?",
    subtitle:
      "Tu peux combiner — ex : DCA mensuel + quelques trades opportunistes.",
    options: [
      { value: "once", label: "Achat unique", hint: "Buy & hold long terme" },
      { value: "dca", label: "DCA mensuel", hint: "Achat récurrent automatique" },
      { value: "trader", label: "Trading actif", hint: "Plusieurs ordres / semaine" },
    ],
  },
  {
    key: "priority",
    type: "multi",
    maxSelections: 2,
    title: "Tes 2 priorités max — qu'est-ce qui compte vraiment ?",
    subtitle:
      "Choisis 1 ou 2 critères. Pondération : 1ère priorité × 2, 2ème × 1.",
    options: [
      { value: "fees", label: "Frais bas", hint: "Optimiser le coût total" },
      { value: "security", label: "Sécurité maximale", hint: "Cold storage, assurance, MiCA" },
      { value: "support_fr", label: "Support en français", hint: "Chat / téléphone FR" },
      { value: "catalog", label: "Catalogue large", hint: "Accès à beaucoup d'altcoins" },
    ],
  },
  {
    key: "deposit",
    type: "multi",
    maxSelections: 2,
    title: "Comment tu veux déposer (CB et SEPA cumulables) ?",
    subtitle: "CB = instantané mais 1.5-3 % de frais. SEPA = quasi gratuit, 1-24 h.",
    options: [
      { value: "card", label: "Carte bancaire", hint: "Instantané, frais 1.5-3 %" },
      { value: "sepa", label: "Virement SEPA", hint: "1-24 h, frais ~0 %" },
      { value: "any", label: "Peu importe", hint: "Les deux me vont" },
    ],
  },
  {
    key: "mica",
    type: "single",
    title: "Tu veux uniquement des plateformes 100 % MiCA-compliant ?",
    subtitle:
      "MiCA = règlement européen sur les crypto-actifs. Obligatoire en France juillet 2026.",
    options: [
      { value: "must", label: "Oui obligatoire", hint: "Filtre strict, exclut le reste" },
      { value: "prefer", label: "Préférable", hint: "Bonus mais pas bloquant" },
      { value: "any", label: "Peu importe", hint: "Je décide selon le reste" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Scoring                                                            */
/* ------------------------------------------------------------------ */

interface ScoreBreakdown {
  base: number;
  bonuses: number;
  total: number;
  /** Liste des raisons textuelles qui ont contribué au bonus — affichées
   *  dans le résultat pour expliquer pourquoi cette plateforme est dans le Top 3. */
  reasons: string[];
  excluded?: string; // raison d'exclusion si applicable
}

/**
 * Matrice de scoring du quiz — plus c'est haut, mieux la plateforme matche.
 *
 * Base de départ : `scoring.global` × 20 (note /5 → /100). On ajoute ensuite
 * des bonus pondérés selon la cohérence entre les réponses du user et les
 * caractéristiques de la plateforme. La logique privilégie l'EXCLUSION dure
 * quand l'utilisateur a une contrainte forte (MiCA obligatoire, dépôt min trop
 * élevé pour un montant < 100 €) plutôt que de juste baisser le score.
 *
 * Pondérations (synthèse) :
 *  - Profil débutant + UX > 4.5      → +12
 *  - Profil avancé + frais bas (4.5+) → +12
 *  - Q3 trader + spot taker faible    → +18 (taker < 0.15) / +10 (< 0.3)
 *  - Q3 DCA + frais instant bas       → +10 (instant < 1)
 *  - Q4 frais bas + scoring.fees      → +8 (>= 4) / +14 (>= 4.5)
 *  - Q4 sécurité + scoring.security   → +8 / +14 même seuils
 *  - Q4 support FR + frenchChat true  → +20  (sinon -8 si false)
 *  - Q4 catalogue + totalCount        → +12 (>= 300) / +6 (>= 200)
 *  - Q5 dépôt CB + p.deposit.methods inclut "CB" → +4 (sinon -10 si CB pas dispo)
 *  - Q5 dépôt SEPA + methods inclut "SEPA"        → +4 (sinon -10)
 *  - Q6 MiCA "must" + !micaCompliant  → EXCLUS
 *  - Q6 MiCA "prefer" + micaCompliant → +6
 *  - Q2 montant "tiny" + minEur > 25  → EXCLUS
 *  - Q2 montant "large" + security >= 4 → +10 ; insurance true → +6
 *
 * On retourne aussi le breakdown pour debug et l'éventuelle exclusion.
 * NB : les coefficients sont volontairement simples et auditables (pas d'IA).
 */
function scorePlatform(p: Platform, answers: Answers): ScoreBreakdown {
  const base = p.scoring.global * 20;
  let bonuses = 0;
  let excluded: string | undefined;
  const reasons: string[] = []; // explication par bonus appliqué

  // EXCLUSIONS dures
  if (hasAnswer(answers, "mica", "must") && !p.mica.micaCompliant) {
    excluded = "Pas MiCA-compliant";
  }
  if (hasAnswer(answers, "amount", "tiny") && p.deposit.minEur > 25) {
    excluded = "Dépôt minimum trop élevé pour < 100 €";
  }
  if (p.category === "wallet") {
    excluded = "Hardware wallet — pas une plateforme d'achat";
  }

  // PROFIL (single)
  if (hasAnswer(answers, "profile", "beginner") && p.scoring.ux >= 4.5) {
    bonuses += 12;
    reasons.push("Interface adaptée débutants");
  }
  if (hasAnswer(answers, "profile", "advanced") && p.scoring.fees >= 4.5) {
    bonuses += 12;
    reasons.push("Frais bas pour trader actif");
  }

  // FRÉQUENCE (multi : trader + dca + once peuvent cumuler)
  if (hasAnswer(answers, "frequency", "trader")) {
    if (p.fees.spotTaker < 0.15) {
      bonuses += 18;
      reasons.push("Frais taker ultra bas pour trading");
    } else if (p.fees.spotTaker < 0.3) {
      bonuses += 10;
      reasons.push("Frais taker corrects pour trading");
    }
  }
  if (hasAnswer(answers, "frequency", "dca") && p.fees.instantBuy < 1) {
    bonuses += 10;
    reasons.push("Achat instantané peu cher pour DCA");
  }

  // PRIORITÉ (multi avec pondération : 1ère priorite ×2, 2ème ×1)
  // L'utilisateur a déclaré ses priorités dans l'ordre — on respecte cet ordre.
  const priorityList = getAnswer(answers, "priority");
  priorityList.forEach((priority, idx) => {
    const weight = idx === 0 ? 2 : 1; // 1ère ×2, 2ème ×1
    if (priority === "fees") {
      if (p.scoring.fees >= 4.5) {
        bonuses += 14 * weight;
        reasons.push(idx === 0 ? "Frais bas (priorité #1)" : "Frais bas (priorité #2)");
      } else if (p.scoring.fees >= 4) {
        bonuses += 8 * weight;
      }
    }
    if (priority === "security") {
      if (p.scoring.security >= 4.5) {
        bonuses += 14 * weight;
        reasons.push(idx === 0 ? "Sécurité top (priorité #1)" : "Sécurité top (priorité #2)");
      } else if (p.scoring.security >= 4) {
        bonuses += 8 * weight;
      }
    }
    if (priority === "support_fr") {
      bonuses += (p.support.frenchChat ? 20 : -8) * weight;
      if (p.support.frenchChat) {
        reasons.push(idx === 0 ? "Support FR (priorité #1)" : "Support FR (priorité #2)");
      }
    }
    if (priority === "catalog") {
      if (p.cryptos.totalCount >= 300) {
        bonuses += 12 * weight;
        reasons.push(idx === 0 ? "Large catalogue (priorité #1)" : "Large catalogue (priorité #2)");
      } else if (p.cryptos.totalCount >= 200) {
        bonuses += 6 * weight;
      }
    }
  });

  // DÉPÔT (multi : card + sepa peuvent cumuler — chaque méthode dispo = bonus)
  if (hasAnswer(answers, "deposit", "card")) {
    const hasCard = p.deposit.methods.some((m) => m.toUpperCase().includes("CB"));
    bonuses += hasCard ? 4 : -10;
    if (hasCard) reasons.push("Dépôt carte bancaire dispo");
  }
  if (hasAnswer(answers, "deposit", "sepa")) {
    const hasSepa = p.deposit.methods.some((m) => m.toUpperCase().includes("SEPA"));
    bonuses += hasSepa ? 4 : -10;
    if (hasSepa) reasons.push("Virement SEPA dispo");
  }

  // MICA (single)
  if (hasAnswer(answers, "mica", "prefer") && p.mica.micaCompliant) {
    bonuses += 6;
    reasons.push("Conforme MiCA (préférence)");
  }

  // MONTANT large (single)
  if (hasAnswer(answers, "amount", "large")) {
    if (p.scoring.security >= 4) {
      bonuses += 10;
      reasons.push("Sécurité élevée pour gros patrimoine");
    }
    if (p.security.insurance) {
      bonuses += 6;
      reasons.push("Fonds assurés");
    }
  }

  return {
    base,
    bonuses,
    total: excluded ? -1 : base + bonuses,
    excluded,
    reasons,
  };
}

/**
 * Refonte 26/04/2026 (feedback utilisateur "résultat top 3 ?")
 *
 * On retourne maintenant les 3 meilleures plateformes au lieu de Top 1 + backup.
 * Justification UX :
 *  - Plus crédible (pas "voici LA meilleure", plus humble)
 *  - Pédagogique : l'utilisateur voit pourquoi #1 vs #2 vs #3 (raisons distinctes)
 *  - Conversion : 3 affiliés visibles plutôt qu'1
 *  - Liberté de choix utilisateur (offre vs imposition)
 */
interface QuizResultEntry {
  platform: Platform;
  score: ScoreBreakdown;
  rank: 1 | 2 | 3;
}
interface QuizResult {
  top3: QuizResultEntry[];
}

function computeResult(platforms: Platform[], answers: Answers): QuizResult | null {
  const scored = platforms
    .map((p) => ({ p, score: scorePlatform(p, answers) }))
    .filter((s) => !s.score.excluded)
    .sort((a, b) => b.score.total - a.score.total);

  if (scored.length === 0) return null;

  const top3: QuizResultEntry[] = scored.slice(0, 3).map((s, idx) => ({
    platform: s.p,
    score: s.score,
    rank: (idx + 1) as 1 | 2 | 3,
  }));

  return { top3 };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  platforms: Platform[];
}

const TOTAL_STEPS = QUESTIONS.length;

export default function PlatformQuiz({ platforms }: Props) {
  const [step, setStep] = useState(0); // 0..TOTAL_STEPS-1, ou TOTAL_STEPS = résultat
  const [answers, setAnswers] = useState<Answers>({});
  const liveRegionId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  const showResult = step >= TOTAL_STEPS;

  const result = useMemo(
    () => (showResult ? computeResult(platforms, answers) : null),
    [showResult, platforms, answers]
  );

  // Focus auto sur le 1er bouton de chaque step (a11y)
  useEffect(() => {
    if (showResult) {
      titleRef.current?.focus();
    } else {
      // petit délai pour laisser l'animation se rendre
      const t = setTimeout(() => firstOptionRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [step, showResult]);

  const currentQuestion = !showResult ? QUESTIONS[step] : null;

  function selectAnswer(value: string) {
    if (!currentQuestion) return;
    const isMulti = currentQuestion.type === "multi";
    const max = currentQuestion.maxSelections ?? Infinity;

    if (isMulti) {
      // Multi-select : toggle la valeur dans le tableau
      const current = getAnswer(answers, currentQuestion.key);
      const isAlreadySelected = current.includes(value);
      let next: string[];
      if (isAlreadySelected) {
        // Toggle off
        next = current.filter((v) => v !== value);
      } else {
        // Toggle on (mais respecte maxSelections : si depasse, retire le plus ancien)
        next = [...current, value];
        if (next.length > max) next = next.slice(-max);
      }
      setAnswers({ ...answers, [currentQuestion.key]: next });
      // PAS d'auto-advance pour les multi (l'utilisateur clique "Suivant" quand pret)
    } else {
      // Single-select : remplace + auto-advance
      setAnswers({ ...answers, [currentQuestion.key]: value });
      const goNext = () => setStep((s) => s + 1);
      if (typeof window !== "undefined") {
        window.setTimeout(goNext, 280);
      } else {
        goNext();
      }
    }
  }

  function goNext() {
    setStep((s) => s + 1);
  }

  function goPrev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    trackToolUsage("platform-quiz", "restart");
  }

  function jumpTo(targetStep: number) {
    if (targetStep >= 0 && targetStep <= TOTAL_STEPS) setStep(targetStep);
  }

  // Track : quand le user atteint l'écran résultat (top 1 = id principal logge)
  useEffect(() => {
    if (showResult && result && result.top3[0]) {
      trackToolUsage("platform-quiz", `result:${result.top3[0].platform.id}`);
    }
  }, [showResult, result]);

  // Raccourcis clavier 1/2/3/4 → sélection rapide
  useEffect(() => {
    if (showResult || !currentQuestion) return;
    function onKey(e: KeyboardEvent) {
      // ignore si l'utilisateur est dans un champ de saisie
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= currentQuestion!.options.length) {
        selectAnswer(currentQuestion!.options[n - 1].value);
      } else if (e.key === "ArrowLeft" && step > 0) {
        goPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentQuestion, showResult]);

  /* ----------------------------- render ----------------------------- */

  return (
    <section
      role="form"
      aria-label="Quiz plateforme crypto"
      className="glass rounded-3xl p-6 sm:p-10 relative overflow-hidden min-h-[60vh] flex flex-col"
    >
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Progress bar */}
      <div className="relative">
        <div className="flex items-center justify-between text-xs text-muted mb-3">
          <span aria-hidden="true">
            {showResult ? "Résultat" : `Question ${step + 1} sur ${TOTAL_STEPS}`}
          </span>
          {!showResult && (
            <span aria-hidden="true">
              {Math.round(((step) / TOTAL_STEPS) * 100)} %
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={showResult ? TOTAL_STEPS : step}
          aria-label={`Progression du quiz : étape ${showResult ? TOTAL_STEPS : step + 1} sur ${TOTAL_STEPS}`}
          className="h-1.5 w-full bg-elevated rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-emphasized"
            style={{
              width: `${((showResult ? TOTAL_STEPS : step) / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Live region pour SR */}
      <div id={liveRegionId} aria-live="polite" className="sr-only">
        {showResult
          ? `Résultat du quiz : ${result?.top3[0]?.platform.name ?? "aucune plateforme ne correspond"}.`
          : `Étape ${step + 1} sur ${TOTAL_STEPS} : ${currentQuestion?.title ?? ""}`}
      </div>

      {/* QUESTION */}
      {!showResult && currentQuestion && (
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
            {currentQuestion.title}
          </h2>
          {currentQuestion.subtitle && (
            <p className="mt-2 text-sm sm:text-base text-fg/70 max-w-2xl">
              {currentQuestion.subtitle}
            </p>
          )}

          {/* Options : single = role=radiogroup + aria-checked, multi = role=group
              + aria-pressed (toggle multi-select). Visuel partage le meme look,
              juste le badge de gauche change (chiffre 1-9 vs checkmark). */}
          <div
            role={currentQuestion.type === "multi" ? "group" : "radiogroup"}
            aria-label={currentQuestion.title}
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {currentQuestion.options.map((opt, idx) => {
              const isMulti = currentQuestion.type === "multi";
              const isSelected = isMulti
                ? hasAnswer(answers, currentQuestion.key, opt.value)
                : answers[currentQuestion.key] === opt.value;
              const ariaProps = isMulti
                ? { "aria-pressed": isSelected }
                : { role: "radio", "aria-checked": isSelected };
              return (
                <button
                  key={opt.value}
                  ref={idx === 0 ? firstOptionRef : undefined}
                  type="button"
                  {...ariaProps}
                  onClick={() => selectAnswer(opt.value)}
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
                                      ? "bg-primary text-white"
                                      : "bg-elevated text-muted group-hover:text-primary-soft"
                                  }`}
                    >
                      {isSelected && isMulti ? "✓" : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-fg text-base sm:text-lg">
                        {opt.label}
                      </div>
                      {opt.hint && (
                        <div className="mt-0.5 text-xs sm:text-sm text-muted">
                          {opt.hint}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Helper texte multi-select : combien sélectionnés + max */}
          {currentQuestion.type === "multi" && (
            <p className="mt-3 text-xs text-muted">
              {getAnswer(answers, currentQuestion.key).length} / {currentQuestion.maxSelections ?? currentQuestion.options.length} sélectionné(s)
              {currentQuestion.maxSelections ? ` (max ${currentQuestion.maxSelections})` : ""}
              {" — "}clique sur "Suivant" quand tu as fini.
            </p>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg
                         disabled:opacity-40 disabled:cursor-not-allowed
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-2 py-1"
              aria-label="Question précédente"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Précédent
            </button>
            {currentQuestion.type === "multi" ? (
              <button
                type="button"
                onClick={goNext}
                disabled={getAnswer(answers, currentQuestion.key).length === 0}
                className="btn-primary text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <p className="text-[11px] text-muted hidden sm:block">
                Astuce — appuie sur <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-elevated text-fg">1-{currentQuestion.options.length}</kbd> pour répondre
              </p>
            )}
          </div>
        </div>
      )}

      {/* RESULT */}
      {showResult && (
        <div className="relative mt-6 flex-1 animate-quiz-slide">
          {result ? (
            <ResultView
              result={result}
              answers={answers}
              onRestart={restart}
              onEditAnswer={(qIdx) => jumpTo(qIdx)}
            />
          ) : (
            <NoResultView onRestart={restart} />
          )}
        </div>
      )}

      {/* Animation slide subtile (CSS pur, désactivée par prefers-reduced-motion) */}
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
/*  Sub-views                                                          */
/* ------------------------------------------------------------------ */

function ResultView({
  result,
  answers,
  onRestart,
  onEditAnswer,
}: {
  result: QuizResult;
  answers: Answers;
  onRestart: () => void;
  onEditAnswer: (qIdx: number) => void;
}) {
  // Refonte 26/04/2026 : Top 3 au lieu de Top 1 + backup
  const { top3 } = result;

  return (
    <div>
      <div className="flex items-center gap-2 text-primary-soft text-sm font-semibold">
        <Trophy className="h-4 w-4" aria-hidden="true" />
        Tes 3 plateformes recommandées
      </div>
      <p className="mt-1 text-xs text-muted max-w-2xl">
        Classement basé sur tes réponses + notre méthodologie publique. Compare,
        choisis selon tes préférences perso.
      </p>

      {/* Top 3 grille (1 carte par rang) */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {top3.map((entry) => (
          <Top3Card key={entry.platform.id} entry={entry} />
        ))}
      </div>

      {/* Récap des réponses */}
      <section className="mt-8" aria-label="Récap de tes réponses">
        <h4 className="text-sm font-semibold text-fg/85 uppercase tracking-wider">
          Tes réponses
        </h4>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUESTIONS.map((q, idx) => {
            // Refonte 26/04/2026 : answer peut etre string OU string[] selon
            // que la question est single ou multi. On affiche tous les labels
            // separes par " + " pour les multi.
            const answerValues = getAnswer(answers, q.key);
            const labels = answerValues
              .map((v) => q.options.find((o) => o.value === v)?.label)
              .filter(Boolean);
            const displayLabel = labels.length ? labels.join(" + ") : "—";
            return (
              <li
                key={q.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-elevated/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted">
                    Q{idx + 1}
                  </div>
                  <div className="text-sm text-fg truncate">
                    {displayLabel}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onEditAnswer(idx)}
                  className="text-xs text-primary-soft hover:text-primary
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                             focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-1"
                >
                  Modifier
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* CTA cross-promo + restart */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/wizard/premier-achat"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="flex items-center gap-2 text-primary-soft text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Passer à l'action
          </div>
          <div className="mt-1 font-bold text-fg">Lancer l'assistant "premier achat"</div>
          <div className="mt-1 text-xs text-muted">
            5 étapes pour faire ton premier achat sereinement.
          </div>
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="text-left rounded-2xl border border-border bg-elevated/30 p-4 hover:border-primary/40 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="flex items-center gap-2 text-fg/75 text-sm font-semibold">
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Refaire le quiz
          </div>
          <div className="mt-1 font-bold text-fg">Tester d'autres réponses</div>
          <div className="mt-1 text-xs text-muted">
            Compare la reco selon ton profil.
          </div>
        </button>
      </div>
    </div>
  );
}

function NoResultView({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="text-center py-8">
      <h3 className="text-2xl font-extrabold text-fg">
        Aucune plateforme ne matche ce profil
      </h3>
      <p className="mt-2 text-fg/70 max-w-md mx-auto">
        Tes contraintes sont peut-être trop strictes (ex : MiCA obligatoire +
        dépôt min très bas). Assouplis une réponse et réessaie.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-6 btn-primary"
      >
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        Refaire le quiz
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 font-mono font-semibold text-fg">{value}</dd>
    </div>
  );
}

/**
 * Top3Card — carte unique d'une plateforme dans le Top 3 du quiz.
 * Visuel : médaille (or/argent/bronze) + nom + score + raisons + CTA affilie.
 * Style : la #1 a un glow gold accentué, les #2 et #3 plus discrets.
 */
const RANK_STYLES: Record<1 | 2 | 3, { medal: string; bg: string; border: string; label: string }> = {
  1: {
    medal: "🥇",
    bg: "bg-primary/10",
    border: "border-primary/50 shadow-[0_0_30px_-8px_rgba(245,165,36,0.4)]",
    label: "Notre meilleur match",
  },
  2: {
    medal: "🥈",
    bg: "bg-elevated/60",
    border: "border-border",
    label: "Très bonne alternative",
  },
  3: {
    medal: "🥉",
    bg: "bg-elevated/40",
    border: "border-border/60",
    label: "À considérer aussi",
  },
};

function Top3Card({ entry }: { entry: QuizResultEntry }) {
  const { platform: p, score, rank } = entry;
  const style = RANK_STYLES[rank];
  // 3 raisons max affichees pour ne pas surcharger
  const topReasons = score.reasons.slice(0, 3);

  return (
    <article
      className={`relative rounded-2xl border p-5 ${style.bg} ${style.border} flex flex-col`}
    >
      {/* Header : médaille + label rang */}
      <div className="flex items-center gap-2 text-xs font-semibold text-primary-soft uppercase tracking-wider">
        <span className="text-2xl leading-none" aria-hidden="true">
          {style.medal}
        </span>
        <span>{style.label}</span>
      </div>

      {/* Nom + score */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <h4 className={rank === 1 ? "text-2xl font-extrabold" : "text-xl font-bold"}>
          {rank === 1 ? <span className="gradient-text">{p.name}</span> : <span className="text-fg">{p.name}</span>}
        </h4>
        <span
          className="text-xs font-mono rounded-full bg-primary/15 text-primary-soft px-2 py-0.5 whitespace-nowrap shrink-0"
          aria-label={`Note Cryptoreflex ${p.scoring.global} sur 5`}
        >
          {p.scoring.global}/5
        </span>
      </div>

      <p className="mt-2 text-sm text-fg/75 line-clamp-2">{p.tagline}</p>

      {/* Pourquoi ce match (basé sur les bonus appliqués) */}
      {topReasons.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-xs text-fg/85" role="list">
          {topReasons.map((reason) => (
            <li key={reason} className="flex items-start gap-1.5">
              <span className="text-primary-soft mt-0.5" aria-hidden="true">
                ✓
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Stats compactes (frais + MiCA) */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <div className="text-muted uppercase tracking-wider">Frais taker</div>
          <div className="mt-0.5 font-mono font-semibold text-fg">{p.fees.spotTaker}%</div>
        </div>
        <div>
          <div className="text-muted uppercase tracking-wider">MiCA</div>
          <div className="mt-0.5 font-mono font-semibold text-fg">
            {p.mica.micaCompliant ? "Conforme" : "En cours"}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-5 flex flex-col gap-2 text-sm">
        <a
          href={p.affiliateUrl}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={() => trackAffiliateClick(p.id, `platform-quiz-rank-${rank}`)}
          className={
            rank === 1
              ? "btn-primary justify-center text-sm py-2.5"
              : "inline-flex items-center justify-center gap-1 rounded-lg bg-primary text-background px-3 py-2 font-semibold hover:bg-primary-glow transition-colors"
          }
        >
          Visiter {p.name}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <Link
          href={`/avis/${p.id}`}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-fg/80 hover:bg-elevated hover:border-primary/30 transition-colors"
        >
          Lire notre avis détaillé
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <p className="mt-2 text-[10px] text-muted text-center">
        Lien sponsorisé — <Link href="/transparence" className="underline hover:text-fg">commission Cryptoreflex</Link>
      </p>
    </article>
  );
}

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

type Answers = Partial<Record<AnswerKey, string>>;

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
  title: string;
  subtitle?: string;
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    key: "profile",
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
    title: "Tu vas trader souvent ou DCA mensuel ?",
    subtitle:
      "Le coût total dépend autant des frais que de leur fréquence d'application.",
    options: [
      { value: "once", label: "Achat unique", hint: "Buy & hold long terme" },
      { value: "dca", label: "DCA mensuel", hint: "Achat récurrent automatique" },
      { value: "trader", label: "Trading actif", hint: "Plusieurs ordres / semaine" },
    ],
  },
  {
    key: "priority",
    title: "Ce qui compte le plus pour toi ?",
    subtitle: "Une seule réponse — celle qui pèsera le plus dans le score.",
    options: [
      { value: "fees", label: "Frais bas", hint: "Optimiser le coût total" },
      { value: "security", label: "Sécurité maximale", hint: "Cold storage, assurance, MiCA" },
      { value: "support_fr", label: "Support en français", hint: "Chat / téléphone FR" },
      { value: "catalog", label: "Catalogue large", hint: "Accès à beaucoup d'altcoins" },
    ],
  },
  {
    key: "deposit",
    title: "Comment tu veux déposer ?",
    subtitle: "CB = instantané mais 1.5-3 % de frais. SEPA = quasi gratuit, 1-24 h.",
    options: [
      { value: "card", label: "Carte bancaire", hint: "Instantané, frais 1.5-3 %" },
      { value: "sepa", label: "Virement SEPA", hint: "1-24 h, frais ~0 %" },
      { value: "any", label: "Peu importe", hint: "Les deux dispos m'arrange" },
    ],
  },
  {
    key: "mica",
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

  // EXCLUSIONS dures
  if (answers.mica === "must" && !p.mica.micaCompliant) {
    excluded = "Pas MiCA-compliant";
  }
  if (answers.amount === "tiny" && p.deposit.minEur > 25) {
    excluded = "Dépôt minimum trop élevé pour < 100 €";
  }
  // Hardware wallets : pas pertinents comme "plateforme d'achat"
  if (p.category === "wallet") {
    excluded = "Hardware wallet — pas une plateforme d'achat";
  }

  // PROFIL
  if (answers.profile === "beginner" && p.scoring.ux >= 4.5) bonuses += 12;
  if (answers.profile === "advanced" && p.scoring.fees >= 4.5) bonuses += 12;

  // FRÉQUENCE
  if (answers.frequency === "trader") {
    if (p.fees.spotTaker < 0.15) bonuses += 18;
    else if (p.fees.spotTaker < 0.3) bonuses += 10;
  }
  if (answers.frequency === "dca" && p.fees.instantBuy < 1) bonuses += 10;

  // PRIORITÉ
  if (answers.priority === "fees") {
    if (p.scoring.fees >= 4.5) bonuses += 14;
    else if (p.scoring.fees >= 4) bonuses += 8;
  }
  if (answers.priority === "security") {
    if (p.scoring.security >= 4.5) bonuses += 14;
    else if (p.scoring.security >= 4) bonuses += 8;
  }
  if (answers.priority === "support_fr") {
    bonuses += p.support.frenchChat ? 20 : -8;
  }
  if (answers.priority === "catalog") {
    if (p.cryptos.totalCount >= 300) bonuses += 12;
    else if (p.cryptos.totalCount >= 200) bonuses += 6;
  }

  // DÉPÔT
  if (answers.deposit === "card") {
    bonuses += p.deposit.methods.some((m) => m.toUpperCase().includes("CB"))
      ? 4
      : -10;
  }
  if (answers.deposit === "sepa") {
    bonuses += p.deposit.methods.some((m) => m.toUpperCase().includes("SEPA"))
      ? 4
      : -10;
  }

  // MICA
  if (answers.mica === "prefer" && p.mica.micaCompliant) bonuses += 6;

  // MONTANT large
  if (answers.amount === "large") {
    if (p.scoring.security >= 4) bonuses += 10;
    if (p.security.insurance) bonuses += 6;
  }

  return {
    base,
    bonuses,
    total: excluded ? -1 : base + bonuses,
    excluded,
  };
}

interface QuizResult {
  top: Platform;
  backup?: Platform;
}

function computeResult(platforms: Platform[], answers: Answers): QuizResult | null {
  const scored = platforms
    .map((p) => ({ p, score: scorePlatform(p, answers) }))
    .filter((s) => !s.score.excluded)
    .sort((a, b) => b.score.total - a.score.total);

  if (scored.length === 0) return null;
  return {
    top: scored[0].p,
    backup: scored[1]?.p,
  };
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
    const next: Answers = { ...answers, [currentQuestion.key]: value };
    setAnswers(next);
    // Avance auto à la question suivante après ~280ms (laisse voir la sélection)
    const goNext = () => setStep((s) => s + 1);
    if (typeof window !== "undefined") {
      window.setTimeout(goNext, 280);
    } else {
      goNext();
    }
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

  // Track : quand le user atteint l'écran résultat
  useEffect(() => {
    if (showResult && result) {
      trackToolUsage("platform-quiz", `result:${result.top.id}`);
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
          ? `Résultat du quiz : ${result?.top.name ?? "aucune plateforme ne correspond"}.`
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

          <div
            role="radiogroup"
            aria-label={currentQuestion.title}
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = answers[currentQuestion.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  ref={idx === 0 ? firstOptionRef : undefined}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
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
                      {idx + 1}
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
            <p className="text-[11px] text-muted hidden sm:block">
              Astuce — appuie sur <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-elevated text-fg">1-{currentQuestion.options.length}</kbd> pour répondre
            </p>
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
  const { top, backup } = result;

  return (
    <div>
      <div className="flex items-center gap-2 text-primary-soft text-sm font-semibold">
        <Trophy className="h-4 w-4" aria-hidden="true" />
        Notre recommandation pour toi
      </div>

      {/* Top platform */}
      <article className="mt-3 glass glow-border rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                <span className="gradient-text">{top.name}</span>
              </h3>
              <p className="mt-2 text-fg/80 max-w-xl">{top.tagline}</p>
            </div>
            <span className="badge-info shrink-0" aria-label={`Score Cryptoreflex ${top.scoring.global} sur 5`}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {top.scoring.global}/5
            </span>
          </div>

          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <Stat label="Frais spot taker" value={`${top.fees.spotTaker}%`} />
            <Stat
              label="Dépôt min"
              value={`${top.deposit.minEur} €`}
            />
            <Stat
              label="Support FR"
              value={top.support.frenchChat ? "Oui (chat)" : "Anglais"}
            />
            <Stat
              label="MiCA"
              value={top.mica.micaCompliant ? "Conforme" : "En cours"}
            />
          </dl>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <a
              href={top.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackAffiliateClick(top.id, "platform-quiz-top")}
              className="btn-primary"
            >
              Voir le site officiel
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link href={`/avis/${top.id}`} className="btn-ghost">
              Lire l'avis Cryptoreflex
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>

      {/* Backup */}
      {backup && (
        <article className="mt-4 rounded-2xl border border-border bg-elevated/40 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs text-muted font-semibold uppercase tracking-wider">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            Plan B
          </div>
          <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h4 className="text-xl font-bold text-fg">{backup.name}</h4>
              <p className="mt-1 text-sm text-fg/75">{backup.tagline}</p>
            </div>
            <span className="text-xs font-mono rounded-full bg-primary/15 text-primary-soft px-2.5 py-1 whitespace-nowrap">
              {backup.scoring.global}/5
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <a
              href={backup.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackAffiliateClick(backup.id, "platform-quiz-backup")}
              className="text-xs font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1"
            >
              Voir le site
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            <Link
              href={`/avis/${backup.id}`}
              className="text-xs font-semibold text-fg/85 hover:text-fg inline-flex items-center gap-1"
            >
              Lire l'avis
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </article>
      )}

      {/* Récap des réponses */}
      <section className="mt-8" aria-label="Récap de tes réponses">
        <h4 className="text-sm font-semibold text-fg/85 uppercase tracking-wider">
          Tes réponses
        </h4>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUESTIONS.map((q, idx) => {
            const ans = answers[q.key];
            const opt = q.options.find((o) => o.value === ans);
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
                    {opt?.label ?? "—"}
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

"use client";

/**
 * CryptoQuiz — Quiz "Quelle crypto pour ton profil ?".
 *
 * Pattern UX inspiré de PlatformQuiz : steps, focus auto, raccourcis 1-4,
 * animation slide subtile (CSS pur, prefers-reduced-motion respecté).
 *
 * Source des cryptos : prop `cryptos` injectée par la page server pour éviter
 * un re-fetch et conserver la SSR-friendliness du Hero.
 *
 * SCORING — voir matrice détaillée dans `scoreCrypto()`. Logique additive +
 * exclusions douces (filtrage des hidden-gems pour profils "pas du tout"
 * familier avec la blockchain). 6 questions, 4 options chacune (sauf Q6).
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  RefreshCcw,
  Sparkles,
  Target,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import type { AnyCrypto } from "@/lib/cryptos";
import { trackToolUsage } from "@/lib/analytics";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AnswerKey =
  | "risk"
  | "horizon"
  | "projectType"
  | "techFamiliarity"
  | "capital"
  | "strategy";

type Answers = Partial<Record<AnswerKey, string>>;

interface QuestionOption {
  value: string;
  label: string;
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
    key: "risk",
    title: "Quel niveau de risque tu acceptes ?",
    subtitle:
      "Plus le risque accepté est élevé, plus on peut s'orienter vers des cryptos petites ou émergentes.",
    options: [
      { value: "very_low", label: "Très faible", hint: "Préserver le capital avant tout" },
      { value: "moderate", label: "Modéré", hint: "Volatilité ok mais pas folle" },
      { value: "high", label: "Élevé", hint: "Prêt à voir -50 % sans paniquer" },
      { value: "very_high", label: "Très élevé", hint: "Je vise la 10x quitte à tout perdre" },
    ],
  },
  {
    key: "horizon",
    title: "Tu investis sur quel horizon ?",
    subtitle: "L'horizon temporel oriente la priorité entre stabilité et upside.",
    options: [
      { value: "lt_1y", label: "Moins d'1 an", hint: "Court terme, trading" },
      { value: "1_3y", label: "1 à 3 ans", hint: "Moyen terme, cycle marché" },
      { value: "3_10y", label: "3 à 10 ans", hint: "Buy & hold structurel" },
      { value: "10y_plus", label: "10 ans et plus", hint: "Conviction très long terme" },
    ],
  },
  {
    key: "projectType",
    title: "Quel type de projet t'attire le plus ?",
    subtitle: "Une seule réponse — celle qui pèsera le plus dans le matching.",
    options: [
      { value: "store_of_value", label: "Réserve de valeur", hint: "Or numérique, anti-inflation" },
      { value: "smart_contracts", label: "Smart contracts / DeFi", hint: "Apps décentralisées, finance" },
      { value: "payments", label: "Paiements rapides", hint: "Transferts internationaux, micro-paiements" },
      { value: "memecoins", label: "Memecoins / hype", hint: "Communauté, narratifs viraux" },
    ],
  },
  {
    key: "techFamiliarity",
    title: "Tu connais bien la blockchain ?",
    subtitle:
      "Plus la familiarité est faible, plus on recommande des cryptos majeures, faciles à acheter et stocker.",
    options: [
      { value: "none", label: "Pas du tout", hint: "Je débute totalement" },
      { value: "basics", label: "Bases", hint: "Je sais ce qu'est un wallet" },
      { value: "good", label: "Bien", hint: "DeFi, staking, je connais" },
      { value: "expert", label: "Expert", hint: "Je lis les whitepapers" },
    ],
  },
  {
    key: "capital",
    title: "Combien tu peux mettre au début ?",
    subtitle: "Pour calibrer la pertinence (gros wallets = privilégier la sécurité).",
    options: [
      { value: "tiny", label: "Moins de 100 €", hint: "Tester le marché" },
      { value: "small", label: "100 – 1 000 €", hint: "Premier vrai capital" },
      { value: "medium", label: "1 000 – 10 000 €", hint: "Investissement sérieux" },
      { value: "large", label: "10 000 € et plus", hint: "Patrimoine — sécurité maximale" },
    ],
  },
  {
    key: "strategy",
    title: "Tu préfères diversifier ou concentrer ?",
    subtitle: "Concentration = conviction forte sur 1-2 actifs. Diversification = répartir le risque.",
    options: [
      { value: "diversify", label: "Diversifier", hint: "Mix Top 10 + petites caps" },
      { value: "concentrate", label: "Concentrer 1-2 cryptos", hint: "Forte conviction" },
      { value: "no_opinion", label: "Pas d'avis", hint: "Recommandation libre" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Scoring — matrice transparente                                     */
/* ------------------------------------------------------------------ */

interface CryptoScore {
  base: number;
  bonuses: number;
  total: number;
  excluded?: string;
}

/**
 * Matrice de scoring transparente — la logique privilégie le matching
 * profil/projet plutôt qu'un classement fixe.
 *
 * BASE de départ
 * - Top10 : base = 50 (cryptos établies, point de départ)
 * - Hidden-gem : base = 30 (moins d'historique)
 *
 * BONUS PAR QUESTION
 *
 * Q1 — Tolérance risque
 *   "very_low"   + Top10 + riskLevel ≤ Faible       → +25
 *   "moderate"   + Top10 + riskLevel ≤ Modéré       → +15
 *   "high"       → +5 quel que soit, +10 hidden-gem
 *   "very_high"  → +20 hidden-gem, +10 memecoins
 *
 * Q2 — Horizon
 *   "lt_1y"      + memecoins (DOGE/SHIB)             → +10
 *   "1_3y"       + Top10                              → +8
 *   "3_10y"      + BTC/ETH/SOL                        → +12
 *   "10y_plus"   + BTC                                → +20  / + ETH +12
 *
 * Q3 — Type projet (clé de matching le plus pondéré)
 *   "store_of_value"   → BTC +30 ; tron(USDT) +5
 *   "smart_contracts"  → ETH +30 ; SOL +25 ; ADA +15 ; AVAX +18 ; NEAR +18
 *   "payments"         → XRP +30 ; tron +20 ; DOGE +10 ; LTC +25 (si présent)
 *   "memecoins"        → DOGE +30 ; SHIB/PEPE bonus si jamais ajoutés
 *
 * Q4 — Familiarité tech
 *   "none"       → BTC +15 / ETH +10, EXCLUS hidden-gems (trop techniques)
 *   "basics"     → bonus Top10 (+8), légère pénalité hidden-gems (-5)
 *   "good"       → neutre, hidden-gems +5
 *   "expert"     → hidden-gems +12
 *
 * Q5 — Capital
 *   "tiny"       → memecoins +5 (montants symboliques OK), hidden-gems -3
 *   "small"      → Top10 +5
 *   "medium"     → BTC/ETH +5 (conviction long terme)
 *   "large"      → BTC +15, ETH +10 (sécurité), pénalise high-risk -10
 *
 * Q6 — Stratégie
 *   "diversify"      → bonus +5 toutes hidden-gems
 *   "concentrate"    → bonus +10 BTC/ETH (cryptos évidentes pour conviction forte)
 *   "no_opinion"     → neutre
 *
 * EXCLUSIONS DURES
 * - "none" + hidden-gem → exclu (trop technique)
 * - very_low risk + memecoin (DOGE) → exclu (volatilité incompatible)
 *
 * Résultat = top 1 + 2 backups (cryptos non exclues triées desc).
 */
function scoreCrypto(c: AnyCrypto, answers: Answers): CryptoScore {
  const isGem = c.kind === "hidden-gem";
  let base = isGem ? 30 : 50;
  let bonuses = 0;
  let excluded: string | undefined;

  const id = c.id;
  const cat = c.category.toLowerCase();
  const riskLevel = c.kind === "top10" ? c.riskLevel : null;

  // Identifications utiles pour matching
  const isBtc = id === "bitcoin";
  const isEth = id === "ethereum";
  const isSol = id === "solana";
  const isXrp = id === "xrp";
  const isDoge = id === "dogecoin";
  const isAda = id === "cardano";
  const isAvax = id === "avalanche";
  const isTron = id === "tron";
  const isLink = id === "chainlink";
  const isBnb = id === "bnb";
  const isMemecoin = cat.includes("memecoin");
  const isStablecoinChain = cat.includes("stablecoin") || isTron;
  const isSmartContract = cat.includes("smart") || isEth || isSol || isAda || isAvax;
  const isStoreOfValue = cat.includes("réserve") || isBtc;
  const isPayments = cat.includes("paiement") || cat.includes("paiements");

  /* ---------------- Q1 — Tolérance au risque ---------------- */
  if (answers.risk === "very_low") {
    if (riskLevel === "Faible") bonuses += 25;
    else if (riskLevel === "Très faible") bonuses += 25;
    if (isGem) excluded = "Risque incompatible avec une tolérance très faible";
    if (isMemecoin) excluded = "Memecoin trop volatil pour ce profil";
  } else if (answers.risk === "moderate") {
    if (riskLevel === "Faible" || riskLevel === "Modéré") bonuses += 15;
    if (isMemecoin) bonuses -= 8;
  } else if (answers.risk === "high") {
    bonuses += 5;
    if (isGem) bonuses += 10;
  } else if (answers.risk === "very_high") {
    if (isGem) bonuses += 20;
    if (isMemecoin) bonuses += 10;
    // Pénalise très légèrement BTC/ETH (déjà mature, pas de "très haut potentiel")
    if (isBtc || isEth) bonuses -= 5;
  }

  /* ---------------- Q2 — Horizon ---------------- */
  if (answers.horizon === "lt_1y" && isMemecoin) bonuses += 10;
  if (answers.horizon === "1_3y" && c.kind === "top10") bonuses += 8;
  if (answers.horizon === "3_10y" && (isBtc || isEth || isSol)) bonuses += 12;
  if (answers.horizon === "10y_plus") {
    if (isBtc) bonuses += 20;
    else if (isEth) bonuses += 12;
    else if (isGem) bonuses -= 5; // moins de visibilité long terme
  }

  /* ---------------- Q3 — Type de projet (le plus pondéré) ---------------- */
  if (answers.projectType === "store_of_value") {
    if (isBtc) bonuses += 30;
    else if (isStoreOfValue) bonuses += 20;
    else if (isStablecoinChain) bonuses += 5;
  }
  if (answers.projectType === "smart_contracts") {
    if (isEth) bonuses += 30;
    else if (isSol) bonuses += 25;
    else if (isAvax) bonuses += 18;
    else if (isAda) bonuses += 15;
    else if (isSmartContract) bonuses += 12;
    else if (isLink) bonuses += 15; // oracle infra DeFi
  }
  if (answers.projectType === "payments") {
    if (isXrp) bonuses += 30;
    else if (isTron) bonuses += 20;
    else if (isDoge) bonuses += 10;
    else if (isPayments) bonuses += 18;
  }
  if (answers.projectType === "memecoins") {
    if (isDoge) bonuses += 30;
    else if (isMemecoin) bonuses += 22;
    else bonuses -= 5; // pénalise les non-memecoins si user veut du meme
  }

  /* ---------------- Q4 — Familiarité tech ---------------- */
  if (answers.techFamiliarity === "none") {
    if (isBtc) bonuses += 15;
    else if (isEth) bonuses += 10;
    if (isGem) excluded = excluded ?? "Hidden gem trop technique pour un débutant";
  } else if (answers.techFamiliarity === "basics") {
    if (c.kind === "top10") bonuses += 8;
    if (isGem) bonuses -= 5;
  } else if (answers.techFamiliarity === "good") {
    if (isGem) bonuses += 5;
  } else if (answers.techFamiliarity === "expert") {
    if (isGem) bonuses += 12;
  }

  /* ---------------- Q5 — Capital ---------------- */
  if (answers.capital === "tiny") {
    if (isMemecoin) bonuses += 5;
    if (isGem) bonuses -= 3;
  } else if (answers.capital === "small") {
    if (c.kind === "top10") bonuses += 5;
  } else if (answers.capital === "medium") {
    if (isBtc || isEth) bonuses += 5;
  } else if (answers.capital === "large") {
    if (isBtc) bonuses += 15;
    else if (isEth) bonuses += 10;
    if (isMemecoin || isGem) bonuses -= 10;
  }

  /* ---------------- Q6 — Stratégie ---------------- */
  if (answers.strategy === "diversify" && isGem) bonuses += 5;
  if (answers.strategy === "concentrate" && (isBtc || isEth)) bonuses += 10;

  // BNB/Tron/Chainlink reçoivent un léger malus si aucun matching projet
  // (sinon ils gagnent par défaut sur le base score Top10 sans signal fort).
  if (
    !excluded &&
    (isBnb || isTron || isLink) &&
    answers.projectType !== "smart_contracts" &&
    answers.projectType !== "payments"
  ) {
    bonuses -= 3;
  }

  return {
    base,
    bonuses,
    total: excluded ? -1 : base + bonuses,
    excluded,
  };
}

interface QuizResult {
  top: AnyCrypto;
  backups: AnyCrypto[];
}

function computeResult(cryptos: AnyCrypto[], answers: Answers): QuizResult | null {
  const scored = cryptos
    .map((c) => ({ c, score: scoreCrypto(c, answers) }))
    .filter((s) => !s.score.excluded)
    .sort((a, b) => b.score.total - a.score.total);

  if (scored.length === 0) return null;
  return {
    top: scored[0].c,
    backups: scored.slice(1, 3).map((s) => s.c),
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  cryptos: AnyCrypto[];
}

const TOTAL_STEPS = QUESTIONS.length;

export default function CryptoQuiz({ cryptos }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const liveRegionId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  const showResult = step >= TOTAL_STEPS;

  const result = useMemo(
    () => (showResult ? computeResult(cryptos, answers) : null),
    [showResult, cryptos, answers]
  );

  // Focus auto sur le 1er bouton (a11y) — pattern PlatformQuiz
  useEffect(() => {
    if (showResult) {
      titleRef.current?.focus();
    } else {
      const t = setTimeout(() => firstOptionRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [step, showResult]);

  const currentQuestion = !showResult ? QUESTIONS[step] : null;

  function selectAnswer(value: string) {
    if (!currentQuestion) return;
    const next: Answers = { ...answers, [currentQuestion.key]: value };
    setAnswers(next);
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
    trackToolUsage("crypto-quiz", "restart");
  }

  function jumpTo(targetStep: number) {
    if (targetStep >= 0 && targetStep <= TOTAL_STEPS) setStep(targetStep);
  }

  // Track quand l'utilisateur arrive sur le résultat
  useEffect(() => {
    if (showResult && result) {
      trackToolUsage("crypto-quiz", `result:${result.top.id}`);
    }
  }, [showResult, result]);

  // Raccourcis clavier 1-4
  useEffect(() => {
    if (showResult || !currentQuestion) return;
    function onKey(e: KeyboardEvent) {
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
      aria-label="Quiz crypto pour ton profil"
      className="glass rounded-3xl p-6 sm:p-10 relative overflow-hidden min-h-[60vh] flex flex-col"
    >
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Progress */}
      <div className="relative">
        <div className="flex items-center justify-between text-xs text-muted mb-3">
          <span aria-hidden="true">
            {showResult ? "Résultat" : `Question ${step + 1} sur ${TOTAL_STEPS}`}
          </span>
          {!showResult && (
            <span aria-hidden="true">{Math.round((step / TOTAL_STEPS) * 100)} %</span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={showResult ? TOTAL_STEPS : step}
          aria-label={`Progression du quiz : étape ${
            showResult ? TOTAL_STEPS : step + 1
          } sur ${TOTAL_STEPS}`}
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

      <div id={liveRegionId} aria-live="polite" className="sr-only">
        {showResult
          ? `Résultat du quiz : ${result?.top.name ?? "aucune crypto ne correspond"}.`
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
              Astuce — appuie sur{" "}
              <kbd className="font-mono px-1 py-0.5 rounded border border-border bg-elevated text-fg">
                1-{currentQuestion.options.length}
              </kbd>{" "}
              pour répondre
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
              onEditAnswer={jumpTo}
            />
          ) : (
            <NoResultView onRestart={restart} />
          )}
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
  const { top, backups } = result;
  const topRiskOrFiability =
    top.kind === "top10"
      ? `Risque ${top.riskLevel.toLowerCase()}`
      : `Fiabilité ${top.reliability.score.toFixed(1)}/10`;

  return (
    <div>
      <div className="flex items-center gap-2 text-primary-soft text-sm font-semibold">
        <Trophy className="h-4 w-4" aria-hidden="true" />
        Notre recommandation pour ton profil
      </div>

      {/* Top crypto */}
      <article className="mt-3 glass glow-border rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">
                {top.kind === "hidden-gem" ? "Hidden Gem" : `Top ${top.rank} mondial`}
              </div>
              <h3 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">
                <span className="gradient-text">{top.name}</span>{" "}
                <span className="text-fg/60 font-mono text-2xl">{top.symbol}</span>
              </h3>
              <p className="mt-2 text-fg/80 max-w-xl">{top.tagline}</p>
            </div>
            <span
              className="badge-info shrink-0"
              aria-label={`${top.category}, ${topRiskOrFiability}`}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {top.category}
            </span>
          </div>

          <p className="mt-5 text-sm text-fg/85 leading-relaxed">{top.what}</p>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <Link href={`/cryptos/${top.id}`} className="btn-primary">
              Voir la fiche complète {top.symbol}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/cryptos/${top.id}/acheter-en-france`}
              className="btn-ghost"
            >
              Comment l'acheter en France
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>

      {/* Backups */}
      {backups.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {backups.map((b) => (
            <article
              key={b.id}
              className="rounded-2xl border border-border bg-elevated/40 p-5"
            >
              <div className="flex items-center gap-2 text-xs text-muted font-semibold uppercase tracking-wider">
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
                Plan B
              </div>
              <div className="mt-2 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-lg font-bold text-fg">
                    {b.name}{" "}
                    <span className="text-muted font-mono text-sm">{b.symbol}</span>
                  </h4>
                  <p className="mt-1 text-xs text-fg/75 line-clamp-2">{b.tagline}</p>
                </div>
                <span className="text-[10px] font-mono rounded-full bg-primary/15 text-primary-soft px-2 py-0.5 whitespace-nowrap shrink-0">
                  {b.category}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <Link
                  href={`/cryptos/${b.id}`}
                  className="text-xs font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1"
                >
                  Voir la fiche
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
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
                  <div className="text-sm text-fg truncate">{opt?.label ?? "—"}</div>
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
          href="/quiz/plateforme"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                     focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="flex items-center gap-2 text-primary-soft text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Étape suivante
          </div>
          <div className="mt-1 font-bold text-fg">
            Maintenant choisis ta plateforme
          </div>
          <div className="mt-1 text-xs text-muted">
            6 questions pour trouver l'exchange régulé MiCA adapté.
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
        Aucune crypto ne matche ce profil
      </h3>
      <p className="mt-2 text-fg/70 max-w-md mx-auto">
        Tes contraintes sont peut-être trop strictes (ex : tolérance très faible
        + horizon &lt; 1 an + memecoins). Assouplis une réponse et réessaie.
      </p>
      <button type="button" onClick={onRestart} className="mt-6 btn-primary">
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        Refaire le quiz
      </button>
    </div>
  );
}

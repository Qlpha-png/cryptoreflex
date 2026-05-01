"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCw,
  Share2,
  Twitter,
  Sparkles,
} from "lucide-react";
import { getQuizFor, type CryptoQuiz as CryptoQuizData } from "@/lib/crypto-quizzes";

interface Props {
  cryptoId: string;
  cryptoName: string;
  cryptoSymbol: string;
}

type GameState = "idle" | "playing" | "finished";

/**
 * CryptoQuiz — quiz interactif "Connais-tu vraiment {crypto} ?".
 * Client Component. Render null si pas de quiz éditorial pour cette crypto.
 *
 * Flow : start → 8 questions avec feedback immédiat → score final +
 * suggestions selon score + lead magnet newsletter si > 6/8.
 */
export default function CryptoQuiz({ cryptoId, cryptoName, cryptoSymbol }: Props) {
  // Récupère le quiz une fois (utile pour gating "render null si absent")
  const [quiz] = useState<CryptoQuizData | null>(() => getQuizFor(cryptoId));
  const [state, setState] = useState<GameState>("idle");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  // Reset si on change de crypto
  useEffect(() => {
    setState("idle");
    setCurrentIdx(0);
    setSelectedIdx(null);
    setScore(0);
    setShowFeedback(false);
  }, [cryptoId]);

  if (!quiz) return null;

  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentIdx];

  const handleStart = () => {
    setState("playing");
    setCurrentIdx(0);
    setSelectedIdx(null);
    setScore(0);
    setShowFeedback(false);
  };

  const handleAnswer = (idx: number) => {
    if (showFeedback) return;
    setSelectedIdx(idx);
    setShowFeedback(true);
    if (idx === currentQuestion.correctIdx) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < totalQuestions) {
      setCurrentIdx((i) => i + 1);
      setSelectedIdx(null);
      setShowFeedback(false);
    } else {
      setState("finished");
    }
  };

  const finalMessage = (() => {
    const ratio = score / totalQuestions;
    if (ratio >= 0.875) {
      return {
        title: `Expert ${cryptoSymbol} !`,
        sub: "Tu maîtrises mieux que 95 % des investisseurs crypto FR. Bravo.",
        color: "text-accent-green",
      };
    }
    if (ratio >= 0.625) {
      return {
        title: "Bien joué !",
        sub: "Tu maîtrises les fondamentaux. Lis la fiche complète pour aller plus loin.",
        color: "text-primary-soft",
      };
    }
    if (ratio >= 0.375) {
      return {
        title: "À retravailler",
        sub: "Quelques bases mais des trous à combler. La fiche ci-dessus est faite pour ça.",
        color: "text-amber-300",
      };
    }
    return {
      title: "À découvrir",
      sub: `Pas grave — explore la fiche ${cryptoName} ci-dessus, et reviens dans 1 semaine.`,
      color: "text-accent-rose",
    };
  })();

  const shareText = `J'ai fait ${score}/${totalQuestions} au quiz ${cryptoSymbol} sur Cryptoreflex 🎯`;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/cryptos/${cryptoId}#quiz`
      : `https://cryptoreflex.fr/cryptos/${cryptoId}#quiz`;

  return (
    <section
      id="quiz"
      className="scroll-mt-24 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/5 via-background to-background p-6 sm:p-8"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 grid place-items-center h-11 w-11 rounded-xl bg-amber-500/15 text-amber-300">
          <Trophy className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
            Connais-tu vraiment {cryptoName} ?
          </h2>
          <p className="mt-2 text-sm text-fg/75">
            {totalQuestions} questions, 2 min, sans piège — juste de la pédagogie.
            Score partageable.
          </p>
        </div>
      </div>

      {/* IDLE */}
      {state === "idle" && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleStart}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-base font-bold text-background hover:bg-amber-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Sparkles className="h-4 w-4" />
            Commencer le quiz
          </button>
        </div>
      )}

      {/* PLAYING */}
      {state === "playing" && currentQuestion && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-muted">
              Question {currentIdx + 1} / {totalQuestions}
            </span>
            <span className="font-mono text-fg/70">
              Score : {score} / {currentIdx + (showFeedback ? 1 : 0)}
            </span>
          </div>
          {/* Progress bar */}
          <div
            className="h-1 rounded-full bg-elevated overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalQuestions}
            aria-valuenow={currentIdx + 1}
          >
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-primary transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          <h3 className="text-lg font-bold text-fg">{currentQuestion.q}</h3>

          <div className="grid gap-2 sm:grid-cols-2">
            {currentQuestion.choices.map((choice, idx) => {
              const isSelected = selectedIdx === idx;
              const isCorrect = idx === currentQuestion.correctIdx;
              let style =
                "border-border bg-surface hover:border-primary/40 hover:bg-primary/5";
              if (showFeedback) {
                if (isCorrect) {
                  style = "border-accent-green bg-accent-green/10 text-accent-green";
                } else if (isSelected) {
                  style = "border-accent-rose bg-accent-rose/10 text-accent-rose";
                } else {
                  style = "border-border bg-surface/40 opacity-50";
                }
              }
              return (
                <button
                  key={`${currentIdx}-${idx}`}
                  type="button"
                  onClick={() => handleAnswer(idx)}
                  disabled={showFeedback}
                  className={`relative rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-all ${style} disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
                >
                  <span className="font-mono text-xs text-muted mr-2">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {choice}
                  {showFeedback && isCorrect && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-green" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent-rose" />
                  )}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className="rounded-xl border border-border bg-elevated/40 p-4 text-sm text-fg/85 leading-relaxed">
              <strong className="text-fg">Explication :</strong>{" "}
              {currentQuestion.explanation}
            </div>
          )}

          {showFeedback && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary/90 transition-colors"
              >
                {currentIdx + 1 < totalQuestions ? "Question suivante" : "Voir mon score"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* FINISHED */}
      {state === "finished" && (
        <div className="mt-6 space-y-5 text-center">
          <div className="font-mono text-5xl font-extrabold text-fg tabular-nums">
            {score}
            <span className="text-2xl text-muted"> / {totalQuestions}</span>
          </div>
          <div>
            <h3 className={`text-xl font-bold ${finalMessage.color}`}>
              {finalMessage.title}
            </h3>
            <p className="mt-2 text-sm text-fg/80">{finalMessage.sub}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
            >
              <RotateCw className="h-4 w-4" />
              Recommencer
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
            >
              <Twitter className="h-4 w-4" />
              Partager sur X
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg hover:border-primary/40 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Copier le lien
            </button>
          </div>

          {score / totalQuestions >= 0.75 && (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-left">
              <p className="text-sm text-fg/85">
                <strong className="text-fg">Bravo !</strong> Reçois la newsletter
                Cryptoreflex (3 min de lecture chaque matin) — actus crypto FR sans
                hype, fiscalité, MiCA.
              </p>
              <Link
                href="/newsletter"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-background hover:bg-primary/90 transition-colors"
              >
                S&apos;inscrire à la newsletter →
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

"use client";

/**
 * <TrackQuiz /> — Quiz interactif de validation d'un track.
 *
 *  - Affiche les 5 questions une par une (UX progressive, pas overwhelming).
 *  - Score final affiché à la fin avec feedback question par question.
 *  - Si score >= PASSING_SCORE, le parcours est marqué « quiz validé »
 *    (persisté en localStorage via recordQuizAttempt).
 *  - L'utilisateur peut retenter le quiz autant de fois qu'il veut.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { getNextTrack, type TrackId } from "@/lib/academy-tracks";
import { recordQuizAttempt } from "@/lib/academy-progress";
import {
  PASSING_SCORE,
  type QuizQuestion,
} from "@/lib/academy-quizzes";

interface TrackQuizProps {
  trackId: TrackId;
  trackTitle: string;
  questions: QuizQuestion[];
}

type Phase = "playing" | "results";

/**
 * Ordre d'affichage des réponses, mélangé de façon DÉTERMINISTE à partir de
 * l'id de la question (PRNG mulberry32 seedé par un hash FNV-1a de l'id).
 * Déterministe = identique côté serveur et client (aucun mismatch d'hydratation),
 * mais varié d'une question à l'autre : la bonne réponse n'est jamais toujours
 * à la même position. Le scoring continue d'utiliser l'index ORIGINAL.
 */
function seededOrder(id: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function TrackQuiz({
  trackId,
  trackTitle,
  questions,
}: TrackQuizProps) {
  const [phase, setPhase] = useState<Phase>("playing");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    new Array(questions.length).fill(-1)
  );
  const score = useMemo(
    () =>
      answers.reduce(
        (acc, ans, i) => acc + (ans === questions[i].correctIndex ? 1 : 0),
        0
      ),
    [answers, questions]
  );
  // Ordre mélangé (déterministe) des réponses, par question.
  const orders = useMemo(
    () => questions.map((qq) => seededOrder(qq.id, qq.choices.length)),
    [questions]
  );
  const passed = score >= PASSING_SCORE;
  const nextTrack = getNextTrack(trackId);

  // Persiste le résultat (localStorage) à l'affichage des résultats — réussi
  // OU non : sert au dashboard pour le badge « quiz validé » ET pour ressortir les
  // notions ratées (« à revoir »).
  useEffect(() => {
    if (phase !== "results") return;
    const wrong = questions
      .filter((qq, i) => answers[i] !== qq.correctIndex)
      .map((qq) => ({ id: qq.id, q: qq.question }));
    recordQuizAttempt(trackId, score, passed, wrong);
  }, [phase, passed, trackId, score, questions, answers]);

  function selectAnswer(choiceIdx: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = choiceIdx;
      return next;
    });
  }

  function next() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setPhase("results");
    }
  }

  function retry() {
    setAnswers(new Array(questions.length).fill(-1));
    setCurrentIdx(0);
    setPhase("playing");
  }

  /* -------------------------- Phase: Playing -------------------------- */

  if (phase === "playing") {
    const q = questions[currentIdx];
    const userAnswer = answers[currentIdx];
    return (
      <section
        aria-label={`Quiz ${trackTitle} — question ${currentIdx + 1} sur ${questions.length}`}
        className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
      >
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-mono">
            Question {currentIdx + 1} / {questions.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            Score requis : {PASSING_SCORE} / {questions.length}
          </span>
        </div>

        {/* Progress bar quiz */}
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-elevated"
          role="progressbar"
          aria-valuenow={currentIdx + 1}
          aria-valuemin={1}
          aria-valuemax={questions.length}
        >
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
            style={{
              width: `${((currentIdx + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <h2 className="mt-6 text-xl font-bold tracking-tight text-fg sm:text-2xl">
          {q.question}
        </h2>

        <fieldset className="mt-5 space-y-3">
          <legend className="sr-only">Choix de réponse pour : {q.question}</legend>
          {orders[currentIdx].map((origIdx, pos) => {
            const choice = q.choices[origIdx];
            const isSelected = userAnswer === origIdx;
            return (
              <label
                key={origIdx}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${
                  isSelected
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-elevated/40 hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={origIdx}
                  checked={isSelected}
                  onChange={() => selectAnswer(origIdx)}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                  aria-label={`Choix ${pos + 1} : ${choice}`}
                />
                <span className="flex-1 text-fg/90">{choice}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="text-sm text-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← Précédente
          </button>
          <button
            type="button"
            onClick={next}
            disabled={userAnswer === -1}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {currentIdx === questions.length - 1 ? "Voir mon score" : "Question suivante"}
          </button>
        </div>
      </section>
    );
  }

  /* -------------------------- Phase: Results -------------------------- */

  return (
    <section
      aria-label={`Résultats du quiz ${trackTitle}`}
      className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
    >
      {/*
        Wrapper aria-live=polite : annonce le résultat aux lecteurs d'écran
        dès l'apparition (passage de phase "playing" → "results"). aria-atomic
        pour relire toute la zone (titre + score) plutôt que les diffs.
        WCAG 4.1.3 — Status Messages.
      */}
      <header
        className="text-center"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full ${
            passed
              ? "bg-success-fg/15 text-success-fg"
              : "bg-warning-soft text-warning-fg"
          }`}
        >
          {passed ? (
            <Award className="h-8 w-8" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-8 w-8" aria-hidden="true" />
          )}
        </div>
        <h2 className="mt-4 text-2xl font-bold text-fg sm:text-3xl">
          {passed ? "Bravo, quiz validé !" : "Pas encore validé"}
        </h2>
        <p className="mt-2 text-sm text-fg/80">
          Ton score : <strong className="text-primary-glow">{score}</strong> /{" "}
          {questions.length}{" "}
          {passed
            ? "— parcours validé, bravo !"
            : `— il te faut ${PASSING_SCORE} bonnes réponses pour valider.`}
        </p>
      </header>

      {/* Détail des réponses — aria-live polite pour le feedback question par
          question (annonce le détail après le score global, dans l'ordre). */}
      <p className="mt-8 text-center text-xs text-muted">
        Comprends ta note : pour chaque question,{" "}
        <span className="font-medium text-success-fg">en vert la bonne réponse</span>,{" "}
        <span className="font-medium text-danger-fg">en rouge ton erreur</span> s&apos;il y en a une, et le « pourquoi » juste en dessous.
      </p>
      <ol
        className="mt-4 space-y-3"
        aria-label="Détail des réponses"
        aria-live="polite"
      >
        {questions.map((q, i) => {
          const userAns = answers[i];
          const correct = userAns === q.correctIndex;
          return (
            <li
              key={q.id}
              className={`rounded-xl border p-4 text-sm ${
                correct
                  ? "border-success-fg/30 bg-success-fg/5"
                  : "border-danger-fg/30 bg-danger-fg/5"
              }`}
            >
              <div className="flex items-start gap-2">
                {correct ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success-fg"
                    aria-label="Bonne réponse"
                  />
                ) : (
                  <XCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-danger-fg"
                    aria-label="Mauvaise réponse"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-fg">
                    <span className="mr-1 font-mono text-muted">Q{i + 1}.</span>
                    {q.question}
                  </p>

                  {/* Toutes les options, color-codées : l'apprenti voit
                      exactement où il a juste et où il s'est trompé. */}
                  <ul className="mt-3 space-y-1.5" aria-label="Correction des choix">
                    {orders[i].map((origIdx) => {
                      const choice = q.choices[origIdx];
                      const isCorrectChoice = origIdx === q.correctIndex;
                      const isUserChoice = origIdx === userAns;
                      const cls = isCorrectChoice
                        ? "border-success-fg/50 bg-success-fg/10 text-fg"
                        : isUserChoice
                          ? "border-danger-fg/50 bg-danger-fg/10 text-fg"
                          : "border-border bg-background/30 text-fg/55";
                      return (
                        <li
                          key={origIdx}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${cls}`}
                        >
                          {isCorrectChoice ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success-fg" aria-label="Bonne réponse" />
                          ) : isUserChoice ? (
                            <XCircle className="h-4 w-4 shrink-0 text-danger-fg" aria-label="Ton choix, incorrect" />
                          ) : (
                            <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                          )}
                          <span className="flex-1">{choice}</span>
                          {isCorrectChoice && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-success-fg">
                              Bonne réponse
                            </span>
                          )}
                          {isUserChoice && !isCorrectChoice && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-danger-fg">
                              Ton choix
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {userAns < 0 && (
                    <p className="mt-2 text-xs font-medium text-warning-fg">
                      Tu n&apos;as pas répondu à cette question.
                    </p>
                  )}

                  <p className="mt-2 rounded-lg bg-background/40 px-3 py-2 text-xs text-fg/75">
                    <span className="font-semibold text-primary-soft">Pourquoi : </span>
                    {q.explanation}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated/40 px-4 py-2.5 text-sm font-semibold text-fg/90 hover:border-primary/40"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refaire le quiz
        </button>
        <Link
          href={`/academie/${trackId}`}
          className="text-sm text-muted hover:text-fg"
        >
          ← Retour au parcours
        </Link>
      </div>

      {/* Fil du cursus : où aller après ce quiz validé */}
      {passed && nextTrack && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
          <p className="text-sm text-muted">Prêt pour la suite ?</p>
          <Link
            href={`/academie/${nextTrack.id}`}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-primary-glow"
          >
            Parcours suivant : {nextTrack.title}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {passed && !nextTrack && (
        <p className="mt-6 text-center text-sm font-semibold text-primary-glow">
          🎓 Tu as validé tout le cursus de l&apos;académie. Bravo !
        </p>
      )}
    </section>
  );
}

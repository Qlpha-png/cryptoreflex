"use client";

/**
 * <TrackQuiz /> — Quiz interactif de validation d'un track.
 *
 *  - Affiche les 5 questions une par une (UX progressive, pas overwhelming).
 *  - Score final affiché à la fin avec feedback question par question.
 *  - Si score >= PASSING_SCORE, débloque la section certificat (input nom +
 *    bouton télécharger). Le téléchargement appelle /api/academy/certificate.
 *  - L'utilisateur peut retenter le quiz autant de fois qu'il veut.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Download,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { TrackId } from "@/lib/academy-tracks";
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
  const [name, setName] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const score = useMemo(
    () =>
      answers.reduce(
        (acc, ans, i) => acc + (ans === questions[i].correctIndex ? 1 : 0),
        0
      ),
    [answers, questions]
  );
  const passed = score >= PASSING_SCORE;

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
    setDownloadError(null);
  }

  async function downloadCertificate() {
    if (!name.trim() || name.trim().length < 2) {
      setDownloadError("Merci de renseigner un nom (2 caractères min).");
      return;
    }
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/academy/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, name: name.trim() }),
      });
      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificat-cryptoreflex-${trackId}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error
          ? err.message
          : "Impossible de générer le certificat. Réessaye."
      );
    } finally {
      setDownloading(false);
    }
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
          {q.choices.map((choice, idx) => {
            const isSelected = userAnswer === idx;
            return (
              <label
                key={idx}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${
                  isSelected
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-elevated/40 hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={idx}
                  checked={isSelected}
                  onChange={() => selectAnswer(idx)}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                  aria-label={`Choix ${idx + 1} : ${choice}`}
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
      <header className="text-center">
        <div
          className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full ${
            passed
              ? "bg-emerald-500/15 text-emerald-300"
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
            ? "— tu peux télécharger ton certificat ci-dessous."
            : `— il te faut ${PASSING_SCORE} bonnes réponses pour valider.`}
        </p>
      </header>

      {/* Détail des réponses */}
      <ol className="mt-8 space-y-3">
        {questions.map((q, i) => {
          const userAns = answers[i];
          const correct = userAns === q.correctIndex;
          return (
            <li
              key={q.id}
              className={`rounded-xl border p-4 text-sm ${
                correct
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-rose-500/30 bg-rose-500/5"
              }`}
            >
              <div className="flex items-start gap-2">
                {correct ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                    aria-label="Bonne réponse"
                  />
                ) : (
                  <XCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                    aria-label="Mauvaise réponse"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-fg">{q.question}</p>
                  <p className="mt-1.5 text-fg/80">
                    <span className="text-muted">Ta réponse : </span>
                    {userAns >= 0 ? q.choices[userAns] : "Aucune"}
                  </p>
                  {!correct && (
                    <p className="mt-1 text-fg/80">
                      <span className="text-muted">Bonne réponse : </span>
                      {q.choices[q.correctIndex]}
                    </p>
                  )}
                  <p className="mt-2 text-xs italic text-fg/70">
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

      {/* Certificate section — visible only if passed */}
      {passed && (
        <div className="mt-10 rounded-2xl border border-primary/40 bg-primary/5 p-6">
          <h3 className="text-lg font-bold text-fg">
            Télécharger ton certificat
          </h3>
          <p className="mt-1 text-sm text-fg/80">
            Personnalise ton certificat avec ton nom (ou pseudo). Aucune donnée
            n&apos;est stockée côté serveur.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <label className="flex-1">
              <span className="sr-only">Nom à inscrire sur le certificat</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ton nom ou pseudo"
                maxLength={60}
                aria-label="Nom à inscrire sur le certificat"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-fg placeholder:text-muted focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <button
              type="button"
              onClick={downloadCertificate}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-primary-glow disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {downloading ? "Génération…" : "Télécharger"}
            </button>
          </div>
          {downloadError && (
            <p className="mt-2 text-xs text-rose-300" role="alert">
              {downloadError}
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted">
            Le fichier généré est une page HTML A4 imprimable — fais Ctrl/Cmd +
            P puis &quot;Enregistrer en PDF&quot;.
          </p>
        </div>
      )}
    </section>
  );
}

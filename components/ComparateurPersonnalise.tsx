"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Info } from "lucide-react";
import {
  QUIZ_QUESTIONS,
  getTop3,
  type QuizAnswers,
  type Experience,
  type IntentType,
  type Priority,
  type PlatformRecommendation,
} from "@/lib/personalized-comparison-engine";
import { getPlatformById } from "@/lib/platforms";
import AffiliateLink from "@/components/AffiliateLink";
import { track } from "@/lib/analytics";

const TOTAL_STEPS = QUIZ_QUESTIONS.length;

interface PartialAnswers {
  monthlyAmount?: number;
  frequency?: QuizAnswers["frequency"];
  experience?: Experience;
  priority?: Priority;
  intent?: IntentType;
}

export default function ComparateurPersonnalise() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PartialAnswers>({});
  const [showResults, setShowResults] = useState(false);

  const question = QUIZ_QUESTIONS[step];
  const isLast = step === TOTAL_STEPS - 1;

  function selectOption(value: string | number) {
    const next: PartialAnswers = { ...answers };
    if (question.id === "monthlyAmount") next.monthlyAmount = value as number;
    if (question.id === "frequency") next.frequency = value as QuizAnswers["frequency"];
    if (question.id === "experience") next.experience = value as Experience;
    if (question.id === "priority") next.priority = value as Priority;
    if (question.id === "intent") next.intent = value as IntentType;
    setAnswers(next);
    if (!isLast) {
      setStep(step + 1);
    } else {
      setShowResults(true);
    }
  }

  function reset() {
    setStep(0);
    setAnswers({});
    setShowResults(false);
  }

  if (showResults && answers.monthlyAmount && answers.frequency && answers.experience && answers.priority && answers.intent) {
    return (
      <Results
        answers={{
          monthlyAmountEur: answers.monthlyAmount,
          frequency: answers.frequency,
          experience: answers.experience,
          priority: answers.priority,
          intent: answers.intent,
        }}
        onReset={reset}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-elevated overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <span className="text-xs text-white/60 whitespace-nowrap">
          {step + 1} / {TOTAL_STEPS}
        </span>
      </div>

      {/* Question */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        <h3 className="text-xl font-bold text-white">{question.label}</h3>
        <div className="mt-4 grid gap-3">
          {question.options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => selectOption(opt.value)}
              className="rounded-xl border border-border bg-elevated/40 px-4 py-3 text-left text-white hover:border-primary/60 hover:bg-primary/5 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nav */}
      {step > 0 && (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Précédent
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-white/50 hover:text-white/80"
          >
            Recommencer
          </button>
        </div>
      )}
    </div>
  );
}

function Results({ answers, onReset }: { answers: QuizAnswers; onReset: () => void }) {
  const [recos, setRecos] = useState<PlatformRecommendation[]>([]);

  useEffect(() => {
    const top3 = getTop3(answers);
    setRecos(top3);
    track("comparateur-perso-result-shown", {
      priority: answers.priority,
      intent: answers.intent,
      experience: answers.experience,
      best_match: top3[0]?.platform.id ?? "none",
    });
  }, [answers]);

  return (
    <div className="space-y-6">
      <div className="glass glow-border rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-primary-soft" />
          <div>
            <span className="badge-info">Reco personnalisée</span>
            <h3 className="mt-2 text-xl font-bold text-white">
              Tes 3 plateformes les plus adaptées
            </h3>
            <p className="mt-1 text-sm text-white/70">
              Calculé à partir de tes 5 réponses : {answers.monthlyAmountEur} €/mois,
              priorité {answers.priority}, profil {answers.experience}, usage {answers.intent}.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {recos.map((reco, idx) => (
          <RecoCard key={reco.platform.id} reco={reco} rank={idx + 1} />
        ))}
      </div>

      {/* Lead capture optionnel — non bloquant pour le résultat */}
      <div className="glass rounded-2xl p-6">
        <h4 className="font-bold text-white">Reçois ces recommandations par email</h4>
        <p className="mt-1 text-sm text-white/70">
          On t'envoie un récap PDF + nos alertes quand une nouvelle plateforme MiCA arrive.
        </p>
        <Link
          href="/ressources?source=comparateur-perso"
          className="mt-4 btn-primary inline-flex"
        >
          Recevoir mon récap
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-white/70 hover:text-white"
        >
          Refaire le quiz
        </button>
        <Link href="/comparatif" className="text-sm text-primary-soft hover:text-primary-glow">
          Voir tout le comparatif
        </Link>
      </div>

      {/* Disclaimer YMYL */}
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-xs text-white/70">
        <div className="flex gap-2">
          <Info className="h-4 w-4 shrink-0 text-amber-300" />
          <p>
            <strong className="text-amber-200">Reco indicative :</strong>{" "}
            ce comparateur est un outil d'aide à la décision basé sur l'audit
            interne Cryptoreflex (Q1 2026). Les notes par axe sont mises à jour
            chaque trimestre. Vérifie toujours la conformité MiCA via notre{" "}
            <Link href="/outils/verificateur-mica" className="text-primary-soft underline">
              vérificateur MiCA
            </Link>{" "}
            avant inscription.
          </p>
        </div>
      </div>
    </div>
  );
}

function RecoCard({ reco, rank }: { reco: PlatformRecommendation; rank: number }) {
  const platform = getPlatformById(reco.platform.id);
  return (
    <div className={`glass rounded-2xl p-6 ${rank === 1 ? "glow-border" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-primary-soft">#{rank}</span>
            <h4 className="text-lg font-bold text-white">{reco.platform.name}</h4>
          </div>
          <p className="mt-1 text-sm text-white/70">{reco.platform.reasonShort}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-primary-soft">{reco.finalScore}</p>
          <p className="text-[10px] uppercase tracking-wide text-white/50">Score perso</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <ScoreBadge label="Prix" value={reco.breakdown.prix} />
        <ScoreBadge label="UX" value={reco.breakdown.ux} />
        <ScoreBadge label="Sécu" value={reco.breakdown.securite} />
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/avis/${reco.platform.reviewSlug}`}
          className="text-sm text-primary-soft hover:text-primary-glow"
        >
          Lire l'avis détaillé →
        </Link>
        {platform && (
          <AffiliateLink
            href={platform.affiliateUrl}
            platform={reco.platform.id}
            placement="comparateur-perso-reco"
            ctaText={`S'inscrire sur ${reco.platform.name}`}
            className="btn-primary inline-flex justify-center text-sm"
          >
            S'inscrire
            <ArrowRight className="h-4 w-4" />
          </AffiliateLink>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-elevated/40 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-white/50">{label}</p>
      <p className="font-bold text-white">{value}/10</p>
    </div>
  );
}

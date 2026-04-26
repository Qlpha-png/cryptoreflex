"use client";

/**
 * QuizExchange — Quiz interactif "Trouve ton exchange en 60 sec".
 *
 * Différenciation majeure du site (audit competitor 26-04 : aucun concurrent
 * FR n'a de quiz interactif). Pattern éprouvé : 30-50 % des completers
 * s'inscrivent à la newsletter (lead magnet ultra-converting).
 *
 * Architecture :
 *  - Logique de scoring : `lib/quiz-scoring.ts` (pure, testable)
 *  - SEO + JSON-LD     : `app/quiz/trouve-ton-exchange/page.tsx` (server)
 *  - Ce composant      : UI + state machine + tracking Plausible
 *
 * A11y :
 *  - radiogroup avec aria-checked, role radio
 *  - Live region pour annonces lecteur d'écran
 *  - Focus auto sur 1er bouton à chaque step
 *  - Keyboard nav : Tab + chiffres 1-4 + ArrowLeft
 *  - prefers-reduced-motion respecté (CSS)
 *  - Tap targets ≥48px (min-h-[60px] sur les cards)
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Mail,
  RefreshCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

import type { Platform } from "@/lib/platforms";
import {
  computeQuizResult,
  isComplete,
  type QuizAnswerKey,
  type QuizAnswers,
  type QuizResult,
} from "@/lib/quiz-scoring";
import { track, trackAffiliateClick, trackNewsletterSignup } from "@/lib/analytics";

/* -------------------------------------------------------------------------- */
/*  Définition des questions                                                   */
/* -------------------------------------------------------------------------- */

interface Option {
  value: string;
  label: string;
  hint?: string;
}

interface Question {
  key: QuizAnswerKey;
  title: string;
  subtitle?: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    key: "amount",
    title: "Combien comptes-tu investir au démarrage ?",
    subtitle:
      "Cela influence la pertinence des dépôts minimums et la priorité sécurité.",
    options: [
      { value: "tiny", label: "Moins de 100 €", hint: "Test sans engagement" },
      { value: "small", label: "100 – 1 000 €", hint: "Démarrage sérieux" },
      { value: "medium", label: "1 000 – 10 000 €", hint: "Build long terme" },
      { value: "large", label: "Plus de 10 000 €", hint: "Portefeuille conséquent" },
    ],
  },
  {
    key: "frequency",
    title: "À quelle fréquence comptes-tu acheter / vendre ?",
    subtitle:
      "Le coût total dépend autant des frais que de leur fréquence d'application.",
    options: [
      { value: "hodl", label: "Une fois et plus toucher", hint: "HODL long terme" },
      { value: "dca", label: "DCA mensuel automatique", hint: "Achat récurrent" },
      { value: "occasional", label: "Quelques fois par mois", hint: "Opportuniste" },
      { value: "trader", label: "Plusieurs fois par semaine", hint: "Trader actif" },
    ],
  },
  {
    key: "level",
    title: "Quel est ton niveau actuel en crypto ?",
    subtitle: "On va calibrer la complexité de l'interface recommandée.",
    options: [
      { value: "beginner", label: "Total débutant", hint: "Jamais acheté" },
      { value: "novice", label: "Quelques crypto", hint: "Bases acquises mais limites" },
      { value: "intermediate", label: "Intermédiaire", hint: "Concepts maîtrisés" },
      { value: "advanced", label: "Avancé", hint: "DeFi, futures, on-chain" },
    ],
  },
  {
    key: "priority",
    title: "Qu'est-ce qui compte le plus pour toi ?",
    subtitle: "Une seule réponse — c'est elle qui pèsera le plus dans le score.",
    options: [
      { value: "security", label: "Sécurité maximale", hint: "Régulation MiCA, cold storage" },
      { value: "fees", label: "Frais les plus bas", hint: "Optimiser le coût total" },
      { value: "ux", label: "Interface ultra simple", hint: "Pas envie de me prendre la tête" },
      { value: "catalog", label: "Catalogue le plus large", hint: "Accès à beaucoup d'altcoins" },
    ],
  },
  {
    key: "staking",
    title: "Veux-tu faire du staking (rendements passifs) ?",
    subtitle: "Le staking permet de gagner des intérêts sur certaines crypto bloquées.",
    options: [
      { value: "yes", label: "Oui, c'est important", hint: "Rendements passifs prioritaires" },
      { value: "optional", label: "Optionnel, un plus", hint: "Bonus mais pas bloquant" },
      { value: "no_hodl", label: "Pas vraiment", hint: "Je préfère acheter et garder" },
      { value: "no_trader", label: "Non, je veux trader", hint: "Pas de fonds bloqués" },
    ],
  },
  {
    key: "withdrawal",
    title: "Tu veux retirer tes crypto vers ton wallet personnel ?",
    subtitle:
      "Auto-custody = tu détiens tes clés privées (Ledger, Trezor) plutôt que la plateforme.",
    options: [
      { value: "must", label: "Oui obligatoire", hint: "Auto-custody priority" },
      { value: "optional", label: "Optionnel, parfois", hint: "Selon les montants" },
      { value: "never", label: "Non, je laisse sur la plateforme", hint: "Simplicité avant tout" },
    ],
  },
];

const TOTAL_STEPS = QUESTIONS.length;

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                        */
/* -------------------------------------------------------------------------- */

interface Props {
  platforms: Platform[];
}

export default function QuizExchange({ platforms }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [hasStarted, setHasStarted] = useState(false);
  const liveRegionId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  const showResult = step >= TOTAL_STEPS;

  const result: QuizResult | null = useMemo(() => {
    if (!showResult || !isComplete(answers)) return null;
    return computeQuizResult(platforms, answers);
  }, [showResult, platforms, answers]);

  const currentQuestion = !showResult ? QUESTIONS[step] : null;

  /* ---------------- Tracking : Quiz Started (1er click) ------------------ */
  useEffect(() => {
    if (hasStarted) return;
    if (Object.keys(answers).length === 1) {
      setHasStarted(true);
      track("Quiz Started", { quiz: "trouve-ton-exchange" });
    }
  }, [answers, hasStarted]);

  /* ---------------- Tracking : Quiz Completed (résultat) ----------------- */
  useEffect(() => {
    if (showResult && result && result.top3[0]) {
      track("Quiz Completed", {
        quiz: "trouve-ton-exchange",
        profil: result.profile.id,
        top1Platform: result.top3[0].platform.id,
      });
    }
  }, [showResult, result]);

  /* ---------------- Focus a11y à chaque step ----------------------------- */
  useEffect(() => {
    if (showResult) {
      titleRef.current?.focus();
    } else {
      const t = setTimeout(() => firstOptionRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [step, showResult]);

  /* ---------------- Handlers --------------------------------------------- */

  const selectAnswer = useCallback(
    (value: string) => {
      if (!currentQuestion) return;
      const next: QuizAnswers = { ...answers, [currentQuestion.key]: value };
      setAnswers(next);
      // Avance auto après ~280 ms (laisse voir la sélection)
      const goNext = () => setStep((s) => s + 1);
      if (typeof window !== "undefined") {
        window.setTimeout(goNext, 280);
      } else {
        goNext();
      }
    },
    [answers, currentQuestion]
  );

  function goPrev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setHasStarted(false);
    track("Quiz Restarted", { quiz: "trouve-ton-exchange" });
  }

  /* ---------------- Raccourcis clavier 1-4 + ArrowLeft ------------------- */
  useEffect(() => {
    if (showResult || !currentQuestion) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
        return;
      const n = parseInt(e.key, 10);
      if (
        !Number.isNaN(n) &&
        currentQuestion &&
        n >= 1 &&
        n <= currentQuestion.options.length
      ) {
        selectAnswer(currentQuestion.options[n - 1].value);
      } else if (e.key === "ArrowLeft" && step > 0) {
        goPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, currentQuestion, showResult, selectAnswer]);

  /* ---------------- Render ----------------------------------------------- */

  return (
    <section
      role="form"
      aria-label="Quiz Trouve ton exchange en 60 sec"
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
              {Math.round((step / TOTAL_STEPS) * 100)} %
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={showResult ? TOTAL_STEPS : step}
          aria-label={`Progression : étape ${
            showResult ? TOTAL_STEPS : step + 1
          } sur ${TOTAL_STEPS}`}
          className="h-1.5 w-full bg-elevated rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out"
            style={{
              width: `${((showResult ? TOTAL_STEPS : step) / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Live region pour SR */}
      <div id={liveRegionId} aria-live="polite" className="sr-only">
        {showResult
          ? `Résultat : ${result?.profile.label ?? "calcul en cours"}.`
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
                  className={`group text-left rounded-2xl p-4 sm:p-5 border min-h-[60px] transition-all duration-150
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

          {/* Nav précédent */}
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
      {showResult && result && (
        <div className="relative mt-6 flex-1 animate-quiz-slide">
          <ResultView result={result} onRestart={restart} />
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

/* -------------------------------------------------------------------------- */
/*  Sous-vues : Résultat                                                       */
/* -------------------------------------------------------------------------- */

function ResultView({
  result,
  onRestart,
}: {
  result: QuizResult;
  onRestart: () => void;
}) {
  const { top3, profile, rejected } = result;

  return (
    <div>
      {/* Profil — gold gradient card */}
      <article className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 sm:p-8">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/25 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary-soft text-sm font-semibold">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Ton profil
          </div>
          <h3 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="gradient-text">{profile.label}</span>
          </h3>
          <p className="mt-3 text-fg/85 max-w-2xl">{profile.summary}</p>
        </div>
      </article>

      {/* Top 3 plateformes */}
      <section className="mt-8" aria-label="Plateformes recommandées">
        <h4 className="text-sm font-semibold text-fg/85 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary-soft" aria-hidden="true" />
          Top 3 pour ton profil
        </h4>

        <ol className="mt-4 grid grid-cols-1 gap-3">
          {top3.length === 0 && (
            <li className="rounded-2xl border border-border bg-elevated/40 p-6 text-center text-fg/70">
              Aucune plateforme ne matche ce profil — tes contraintes sont
              peut-être trop strictes. Refais le quiz en assouplissant une
              réponse.
            </li>
          )}
          {top3.map((sp, idx) => (
            <PlatformCard
              key={sp.platform.id}
              rank={idx + 1}
              platform={sp.platform}
              rationale={sp.rationale}
            />
          ))}
        </ol>
      </section>

      {/* Pourquoi pas les autres ? */}
      {rejected.length > 0 && (
        <section className="mt-8" aria-label="Plateformes écartées">
          <details className="group rounded-2xl border border-border bg-elevated/30 p-5">
            <summary className="cursor-pointer text-sm font-semibold text-fg/85 hover:text-fg flex items-center justify-between">
              <span>Pourquoi pas les autres plateformes ?</span>
              <span className="text-xs text-muted group-open:hidden">
                Voir les {rejected.length} écartées
              </span>
            </summary>
            <ul className="mt-4 space-y-2 text-sm text-fg/75">
              {rejected.map((r) => (
                <li
                  key={r.platform.id}
                  className="flex items-start gap-2 border-b border-border/40 pb-2 last:border-0"
                >
                  <AlertCircle
                    className="h-4 w-4 text-muted shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="font-semibold text-fg">
                      {r.platform.name}
                    </span>{" "}
                    — <span className="text-fg/70">{r.reason}</span>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {/* Lead magnet : email capture */}
      <LeadMagnetForm profileId={profile.id} top1Id={top3[0]?.platform.id} />

      {/* Actions : refaire / partager */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="mt-1 font-bold text-fg">Tester d&apos;autres réponses</div>
          <div className="mt-1 text-xs text-muted">
            Compare la reco selon ton profil.
          </div>
        </button>
        <ShareButton profile={profile.label} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card plateforme dans le top 3                                              */
/* -------------------------------------------------------------------------- */

function PlatformCard({
  rank,
  platform,
  rationale,
}: {
  rank: number;
  platform: Platform;
  rationale: string;
}) {
  const isTop = rank === 1;

  return (
    <li
      className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-colors ${
        isTop
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-elevated/40 hover:border-primary/30"
      }`}
    >
      {isTop && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      )}
      <div className="relative flex items-start gap-4">
        {/* Rank badge */}
        <span
          aria-hidden="true"
          className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl font-extrabold text-lg
                      ${
                        isTop
                          ? "bg-primary text-white"
                          : "bg-elevated text-fg/80 border border-border"
                      }`}
        >
          {rank}
        </span>

        {/* Logo */}
        <div className="shrink-0 hidden sm:block">
          <Image
            src={platform.logo}
            alt=""
            width={48}
            height={48}
            className="rounded-xl bg-elevated p-1.5"
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h5 className="text-xl sm:text-2xl font-extrabold text-fg">
              {platform.name}
            </h5>
            <span
              className="text-xs font-mono rounded-full bg-primary/15 text-primary-soft px-2.5 py-1 whitespace-nowrap"
              aria-label={`Score Cryptoreflex ${platform.scoring.global} sur 5`}
            >
              {platform.scoring.global}/5
            </span>
          </div>
          <p className="mt-2 text-sm text-fg/80">{rationale}</p>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <a
              href={platform.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() =>
                trackAffiliateClick(
                  platform.id,
                  "quiz-exchange-result",
                  `Découvrir ${platform.name}`
                )
              }
              className={isTop ? "btn-primary" : "btn-ghost"}
            >
              Découvrir {platform.name}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              href={`/avis/${platform.id}`}
              className="text-sm font-semibold text-fg/85 hover:text-fg inline-flex items-center gap-1
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-1"
              onClick={() =>
                track("Quiz Affiliate Click", {
                  platform: platform.id,
                  type: "review-link",
                  rank,
                })
              }
            >
              Lire l&apos;avis
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Lead magnet : formulaire email Beehiiv                                     */
/* -------------------------------------------------------------------------- */

function LeadMagnetForm({
  profileId,
  top1Id,
}: {
  profileId: string;
  top1Id?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [mocked, setMocked] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!valid) {
      setStatus("error");
      setErrorMsg("Adresse email invalide. Vérifie le format (ex : prenom@email.com).");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: "quiz-exchange",
          utm: {
            source: "cryptoreflex",
            medium: "quiz",
            campaign: `quiz-exchange-${profileId}`,
          },
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        mocked?: boolean;
      };

      if (!res.ok || !json.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Une erreur est survenue. Réessaie.");
        return;
      }

      setStatus("success");
      setMocked(!!json.mocked);
      trackNewsletterSignup("quiz-exchange");
      track("Quiz Email Signup", {
        quiz: "trouve-ton-exchange",
        profil: profileId,
        ...(top1Id ? { top1Platform: top1Id } : {}),
      });

      if (!json.mocked) {
        try {
          document.cookie =
            "cr_newsletter_subscribed=1; path=/; max-age=31536000; samesite=lax";
        } catch {
          /* SSR-safe */
        }
      }
    } catch {
      setStatus("error");
      setErrorMsg("Une erreur est survenue. Réessaie dans un instant.");
    }
  }

  return (
    <section
      className="mt-8 glass rounded-2xl p-6 sm:p-8 border border-primary/20"
      aria-labelledby="quiz-leadmagnet-title"
    >
      {status !== "success" ? (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="badge-trust">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Sans spam, désinscription en 1 clic
            </span>
          </div>

          <h4
            id="quiz-leadmagnet-title"
            className="text-xl sm:text-2xl font-extrabold text-fg leading-tight"
          >
            Reçois ta recommandation perso{" "}
            <span className="gradient-text">+ guide PDF</span> par email.
          </h4>
          <p className="mt-2 text-sm text-fg/75 max-w-2xl">
            On t&apos;envoie ton résultat détaillé + le PDF &laquo;&nbsp;Acheter sa
            première crypto en France 2026&nbsp;&raquo; (12 pages, méthode
            pas-à-pas).
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-5 flex flex-col sm:flex-row gap-3"
            noValidate
          >
            <label htmlFor="quiz-email" className="sr-only">
              Adresse email
            </label>
            <input
              id="quiz-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="prenom@email.com"
              aria-invalid={status === "error"}
              aria-describedby={
                status === "error" ? "quiz-email-error" : "quiz-email-hint"
              }
              disabled={status === "loading"}
              className="flex-1 rounded-xl bg-background border border-border px-4 py-3 text-fg
                         placeholder:text-muted focus:outline-none focus:border-primary/60
                         focus:ring-2 focus:ring-primary/30 disabled:opacity-50 min-h-[48px]"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed shrink-0 min-h-[48px]"
            >
              {status === "loading" ? "Envoi…" : "Recevoir ma reco"}
              {status !== "loading" && (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </form>

          <p
            id="quiz-email-hint"
            className="mt-3 text-xs text-muted"
          >
            Ton email est uniquement utilisé pour t&apos;envoyer le résultat et la
            newsletter quotidienne (3 min/jour).
          </p>

          {status === "error" && (
            <div
              id="quiz-email-error"
              role="alert"
              className="mt-3 inline-flex items-center gap-2 text-sm text-accent-rose"
            >
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {errorMsg}
            </div>
          )}
        </>
      ) : (
        <div role="status" aria-live="polite">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-green/15 text-accent-green">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="badge-trust">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {mocked ? "Email noté" : "Inscription confirmée"}
            </span>
          </div>
          <h4 className="text-xl sm:text-2xl font-extrabold text-fg">
            {mocked ? "Email bien noté" : "Bienvenue ! Vérifie ta boîte mail."}
          </h4>
          <p className="mt-2 text-sm text-fg/75 max-w-2xl">
            {mocked ? (
              <>
                Newsletter en cours de configuration — on te recontactera dès
                que c&apos;est prêt. En attendant, télécharge ton guide&nbsp;:
              </>
            ) : (
              <>
                Un email de confirmation vient de t&apos;être envoyé à{" "}
                <strong className="text-fg">{email}</strong>. Clique sur le lien
                pour activer ton inscription et recevoir le guide PDF.
              </>
            )}
          </p>
          <div className="mt-4">
            <a
              href="/lead-magnets/acheter-premiere-crypto-france-2026.pdf"
              download
              className="btn-primary"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Télécharger le guide PDF
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bouton de partage (Web Share API + fallback copie URL)                     */
/* -------------------------------------------------------------------------- */

function ShareButton({ profile }: { profile: string }) {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : "https://www.cryptoreflex.fr/quiz/trouve-ton-exchange";
    const text = `J'ai fait le quiz Cryptoreflex — mon profil est "${profile}". Trouve le tien :`;

    track("Quiz Share Click", { quiz: "trouve-ton-exchange", profil: profile });

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Quiz : Trouve ton exchange crypto idéal",
          text,
          url,
        });
        return;
      } catch {
        /* fallback ci-dessous */
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="text-left rounded-2xl border border-border bg-elevated/30 p-4 hover:border-primary/40 transition-colors
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="Partager le quiz"
    >
      <div className="flex items-center gap-2 text-fg/75 text-sm font-semibold">
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Partager
      </div>
      <div className="mt-1 font-bold text-fg">
        {shared ? "Lien copié dans le presse-papier" : "Partager le quiz"}
      </div>
      <div className="mt-1 text-xs text-muted">
        Aide tes proches à trouver leur exchange.
      </div>
    </button>
  );
}

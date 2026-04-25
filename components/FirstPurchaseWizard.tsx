"use client";

/**
 * FirstPurchaseWizard — Assistant pas-à-pas pour le premier achat crypto.
 *
 * 5 étapes guidées qui combinent éducation + interaction. Pure CSS animations,
 * focus management entre steps, prefers-reduced-motion respecté. Aucune
 * dépendance externe.
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bitcoin,
  CheckCircle2,
  CreditCard,
  Euro,
  ExternalLink,
  RefreshCcw,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { Platform } from "@/lib/platforms";
import { trackAffiliateClick, trackToolUsage } from "@/lib/analytics";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AmountChoice = "0" | "100" | "500" | "1000" | "more";
type CryptoChoice = "BTC" | "ETH" | "SOL";
type PaymentChoice = "card" | "sepa";

interface Choices {
  amount?: AmountChoice;
  crypto?: CryptoChoice;
  platformId?: string;
  payment?: PaymentChoice;
}

const STEP_LABELS = [
  "Pourquoi",
  "Quelle crypto",
  "Plateforme",
  "Paiement",
  "Récap",
] as const;

const TOTAL_STEPS = STEP_LABELS.length;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const AMOUNT_OPTIONS: { value: AmountChoice; label: string; numeric: number }[] = [
  { value: "0", label: "0 €", numeric: 0 },
  { value: "100", label: "100 €", numeric: 100 },
  { value: "500", label: "500 €", numeric: 500 },
  { value: "1000", label: "1 000 €", numeric: 1000 },
  { value: "more", label: "Plus de 1 000 €", numeric: 2000 },
];

const CRYPTOS: { value: CryptoChoice; name: string; pitch: string; for: string }[] = [
  {
    value: "BTC",
    name: "Bitcoin",
    pitch: "L'or numérique. La crypto la plus sûre, la plus liquide, la plus régulée.",
    for: "Idéal pour un premier achat — référence absolue.",
  },
  {
    value: "ETH",
    name: "Ethereum",
    pitch: "La blockchain qui fait tourner DeFi, NFT, stablecoins. Plus volatile.",
    for: "Idéal si tu veux exposer au reste de l'écosystème.",
  },
  {
    value: "SOL",
    name: "Solana",
    pitch: "Layer 1 ultra rapide et peu coûteux. Plus risqué, plus volatile.",
    for: "Pour les profils plus tolérants au risque.",
  },
];

/**
 * Filtre les plateformes recommandées débutant FR :
 *  - support FR (chat)
 *  - MiCA-compliant
 *  - dépôt min ≤ 25 €
 *  - catégorie ≠ wallet
 * Triées par scoring.global desc, top 3.
 */
function getBeginnerFrPlatforms(platforms: Platform[]): Platform[] {
  return platforms
    .filter(
      (p) =>
        p.category !== "wallet" &&
        p.support.frenchChat &&
        p.mica.micaCompliant &&
        p.deposit.minEur <= 25
    )
    .sort((a, b) => b.scoring.global - a.scoring.global)
    .slice(0, 3);
}

function amountToNumber(a?: AmountChoice): number {
  return AMOUNT_OPTIONS.find((o) => o.value === a)?.numeric ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  platforms: Platform[];
}

export default function FirstPurchaseWizard({ platforms }: Props) {
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<Choices>({});
  const titleRef = useRef<HTMLHeadingElement>(null);
  const liveRegionId = useId();

  const beginnerPlatforms = useMemo(
    () => getBeginnerFrPlatforms(platforms),
    [platforms]
  );

  const selectedPlatform = useMemo(
    () => beginnerPlatforms.find((p) => p.id === choices.platformId),
    [beginnerPlatforms, choices.platformId]
  );

  // Focus auto entre steps
  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [step]);

  // Track : entrée sur l'étape récap
  useEffect(() => {
    if (step === 4 && selectedPlatform) {
      trackToolUsage("first-purchase-wizard", `recap:${selectedPlatform.id}`);
    }
  }, [step, selectedPlatform]);

  function next() {
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  function reset() {
    setChoices({});
    setStep(0);
    trackToolUsage("first-purchase-wizard", "restart");
  }

  // Validation par étape (pour activer "Suivant")
  const canProceed = (() => {
    if (step === 0) return !!choices.amount;
    if (step === 1) return !!choices.crypto;
    if (step === 2) return !!choices.platformId;
    if (step === 3) return !!choices.payment;
    return true;
  })();

  const amountNumeric = amountToNumber(choices.amount);

  return (
    <section
      role="region"
      aria-label={`Assistant premier achat — étape ${step + 1} sur ${TOTAL_STEPS}`}
      className="relative"
    >
      {/* Stepper */}
      <ol
        aria-label="Étapes de l'assistant"
        className="mb-6 flex items-center justify-between gap-1 sm:gap-3"
      >
        {STEP_LABELS.map((label, idx) => {
          const isCurrent = idx === step;
          const isDone = idx < step;
          return (
            <li
              key={label}
              className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0"
            >
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`shrink-0 inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs sm:text-sm font-bold border transition-colors
                            ${
                              isDone
                                ? "bg-primary border-primary text-white"
                                : isCurrent
                                ? "bg-primary/15 border-primary text-primary-soft"
                                : "bg-elevated border-border text-muted"
                            }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  idx + 1
                )}
              </span>
              <span
                className={`hidden md:inline text-sm truncate ${
                  isCurrent ? "text-fg font-semibold" : "text-muted"
                }`}
              >
                {label}
              </span>
              {idx < STEP_LABELS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`flex-1 h-px ${isDone ? "bg-primary" : "bg-border"}`}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div id={liveRegionId} aria-live="polite" className="sr-only">
        Étape {step + 1} sur {TOTAL_STEPS} : {STEP_LABELS[step]}
      </div>

      {/* Card par étape — min-h pour ne pas sauter visuellement entre les steps */}
      <article
        key={step}
        className="glass rounded-3xl p-6 sm:p-10 min-h-[60vh] flex flex-col animate-wizard-slide relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex-1 flex flex-col">
          {step === 0 && (
            <Step1Why
              titleRef={titleRef}
              amount={choices.amount}
              onSelect={(v) => setChoices({ ...choices, amount: v })}
            />
          )}
          {step === 1 && (
            <Step2Crypto
              titleRef={titleRef}
              amount={amountNumeric}
              crypto={choices.crypto}
              onSelect={(v) => setChoices({ ...choices, crypto: v })}
            />
          )}
          {step === 2 && (
            <Step3Platform
              titleRef={titleRef}
              platforms={beginnerPlatforms}
              platformId={choices.platformId}
              onSelect={(id) => setChoices({ ...choices, platformId: id })}
            />
          )}
          {step === 3 && (
            <Step4Payment
              titleRef={titleRef}
              amount={amountNumeric}
              payment={choices.payment}
              onSelect={(v) => setChoices({ ...choices, payment: v })}
            />
          )}
          {step === 4 && (
            <Step5Recap
              titleRef={titleRef}
              choices={choices}
              platform={selectedPlatform}
              amount={amountNumeric}
              onReset={reset}
              onEditStep={(i) => setStep(i)}
            />
          )}
        </div>

        {/* Navigation */}
        {step < TOTAL_STEPS - 1 && (
          <div className="relative mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={prev}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg
                         disabled:opacity-40 disabled:cursor-not-allowed
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-2 py-1"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Précédent
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canProceed}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed
                         disabled:hover:translate-y-0 disabled:hover:bg-primary"
            >
              Suivant
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </article>

      <style>{`
        @keyframes wizard-slide {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-wizard-slide {
          animation: wizard-slide 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-wizard-slide { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Step views                                                         */
/* ------------------------------------------------------------------ */

function StepHeader({
  titleRef,
  eyebrow,
  title,
  subtitle,
}: {
  titleRef: React.RefObject<HTMLHeadingElement>;
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-primary-soft">
        {eyebrow}
      </div>
      <h2
        ref={titleRef}
        tabIndex={-1}
        className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-fg focus:outline-none"
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm sm:text-base text-fg/75 max-w-2xl">{subtitle}</p>
      )}
    </div>
  );
}

/* ------------------------------ Step 1 ---------------------------- */

function Step1Why({
  titleRef,
  amount,
  onSelect,
}: {
  titleRef: React.RefObject<HTMLHeadingElement>;
  amount?: AmountChoice;
  onSelect: (v: AmountChoice) => void;
}) {
  return (
    <>
      <StepHeader
        titleRef={titleRef}
        eyebrow="Étape 1 — On commence par le pourquoi"
        title="Pourquoi acheter du Bitcoin ou Ethereum en 2026 ?"
        subtitle="3 raisons courantes : stocker de la valeur hors système bancaire, exposer son patrimoine à un actif décorrélé, ou simplement apprendre. Mais avant de se lancer — soyons honnêtes sur le risque."
      />

      <ul className="mt-6 space-y-3 text-sm text-fg/85">
        <li className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Volatilité &gt; actions :</strong> ±10 % par jour est normal,
            -50 % en quelques mois aussi.
          </span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Aucune garantie :</strong> ce n'est pas couvert par le FGDR,
            même sur une plateforme régulée.
          </span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Horizon long :</strong> historiquement, BTC sur 4+ ans a
            toujours surperformé. Sur 3 mois, c'est la loterie.
          </span>
        </li>
      </ul>

      <fieldset className="mt-8">
        <legend className="text-base font-semibold text-fg">
          Combien tu peux te permettre de perdre&nbsp;?
        </legend>
        <p className="mt-1 text-xs text-muted">
          Pas combien tu peux <em>investir</em> — combien tu peux perdre sans
          changer ton mode de vie. C'est la seule règle qui compte.
        </p>
        <div role="radiogroup" className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {AMOUNT_OPTIONS.map((opt) => {
            const isSelected = amount === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(opt.value)}
                className={`px-3 py-3 rounded-xl border text-sm font-semibold transition-colors
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                            focus-visible:ring-offset-2 focus-visible:ring-offset-background
                            ${
                              isSelected
                                ? "border-primary bg-primary/10 text-fg"
                                : "border-border bg-elevated/40 text-fg/80 hover:border-primary/50"
                            }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Disclaimer */}
      <div
        role="note"
        className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-100 text-xs sm:text-sm"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong className="text-amber-200">Investis seulement ce que tu peux perdre.</strong>{" "}
          La crypto reste un actif spéculatif — pas un livret d'épargne.
        </p>
      </div>
    </>
  );
}

/* ------------------------------ Step 2 ---------------------------- */

function Step2Crypto({
  titleRef,
  amount,
  crypto,
  onSelect,
}: {
  titleRef: React.RefObject<HTMLHeadingElement>;
  amount: number;
  crypto?: CryptoChoice;
  onSelect: (v: CryptoChoice) => void;
}) {
  // Reco contextuelle
  const recoCryptos: CryptoChoice[] =
    amount <= 100 ? ["BTC"] : amount <= 1000 ? ["BTC", "ETH"] : ["BTC", "ETH"];
  const isReco = (c: CryptoChoice) => recoCryptos.includes(c);

  return (
    <>
      <StepHeader
        titleRef={titleRef}
        eyebrow="Étape 2 — Quelle crypto pour toi"
        title="Bitcoin, Ethereum ou Solana ?"
        subtitle={
          amount <= 100
            ? "Pour ton premier achat, on recommande Bitcoin — la référence, la plus sûre, la plus régulée."
            : "Tu peux mixer 80 % BTC / 20 % ETH pour rester équilibré. Solana = pour les profils plus tolérants au risque."
        }
      />

      <div role="radiogroup" className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CRYPTOS.map((c) => {
          const isSelected = crypto === c.value;
          const reco = isReco(c.value);
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(c.value)}
              className={`text-left rounded-2xl p-5 border transition-colors h-full flex flex-col
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                          focus-visible:ring-offset-2 focus-visible:ring-offset-background
                          ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-elevated/40 hover:border-primary/50"
                          }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bitcoin
                    className={`h-5 w-5 ${
                      c.value === "BTC"
                        ? "text-primary"
                        : c.value === "ETH"
                        ? "text-accent-cyan"
                        : "text-accent-green"
                    }`}
                    aria-hidden="true"
                  />
                  <h3 className="font-bold text-lg text-fg">
                    {c.name}{" "}
                    <span className="font-mono text-sm text-muted">{c.value}</span>
                  </h3>
                </div>
                {reco && (
                  <span className="badge-info text-[10px]">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Recommandé
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-fg/80">{c.pitch}</p>
              <p className="mt-3 text-xs text-muted">{c.for}</p>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------ Step 3 ---------------------------- */

function Step3Platform({
  titleRef,
  platforms,
  platformId,
  onSelect,
}: {
  titleRef: React.RefObject<HTMLHeadingElement>;
  platforms: Platform[];
  platformId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <StepHeader
        titleRef={titleRef}
        eyebrow="Étape 3 — Sur quelle plateforme ?"
        title="3 plateformes débutant FR — MiCA-compliant"
        subtitle="Filtrées sur : support en français, conformité MiCA, dépôt minimum ≤ 25 €. Triées par notre score global."
      />

      <div role="radiogroup" className="mt-6 space-y-3">
        {platforms.map((p) => {
          const isSelected = platformId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(p.id)}
              className={`w-full text-left rounded-2xl p-5 border transition-colors
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                          focus-visible:ring-offset-2 focus-visible:ring-offset-background
                          ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-elevated/40 hover:border-primary/50"
                          }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg text-fg">{p.name}</h3>
                    <span className="text-xs font-mono rounded-full bg-primary/15 text-primary-soft px-2 py-0.5">
                      {p.scoring.global}/5
                    </span>
                    {p.badge && (
                      <span className="text-[10px] uppercase tracking-wider text-primary-soft">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-fg/75">{p.tagline}</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-muted">Frais spot</dt>
                  <dd className="font-mono text-fg">{p.fees.spotTaker}%</dd>
                </div>
                <div>
                  <dt className="text-muted">Dépôt min</dt>
                  <dd className="font-mono text-fg">{p.deposit.minEur} €</dd>
                </div>
                <div>
                  <dt className="text-muted">Support FR</dt>
                  <dd className="text-accent-green font-semibold">Chat FR</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>

      {/* Cross-promo : si user hésite, lui proposer le quiz */}
      <aside className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-fg">
              Tu hésites entre les trois&nbsp;?
            </h3>
            <p className="mt-1 text-xs text-fg/75">
              Lance le quiz "quelle plateforme pour toi" — 6 questions courtes
              pour une reco personnalisée.
            </p>
          </div>
          <Link
            href="/quiz/plateforme"
            className="text-xs font-semibold text-primary-soft hover:text-primary inline-flex items-center gap-1
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                       focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            Lancer le quiz
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------ Step 4 ---------------------------- */

function Step4Payment({
  titleRef,
  amount,
  payment,
  onSelect,
}: {
  titleRef: React.RefObject<HTMLHeadingElement>;
  amount: number;
  payment?: PaymentChoice;
  onSelect: (v: PaymentChoice) => void;
}) {
  const recommendSepa = amount > 200;

  return (
    <>
      <StepHeader
        titleRef={titleRef}
        eyebrow="Étape 4 — Méthode de paiement"
        title="Carte bancaire ou virement SEPA ?"
        subtitle={
          recommendSepa
            ? `Pour un montant de ${amount} €, on recommande le virement SEPA — l'écart de frais devient significatif au-delà de 200 €.`
            : "Pour un petit montant, l'écart de frais est faible. Choisis selon ta préférence vitesse / coût."
        }
      />

      <div role="radiogroup" className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PaymentOption
          isSelected={payment === "card"}
          onClick={() => onSelect("card")}
          Icon={CreditCard}
          title="Carte bancaire"
          speed="Instantané (5 sec)"
          fees="1.5 % – 3 %"
          pros={["Achat en quelques secondes", "Pas besoin d'IBAN"]}
          cons={["Frais élevés", "Plafond CB journalier"]}
          recommended={!recommendSepa}
        />
        <PaymentOption
          isSelected={payment === "sepa"}
          onClick={() => onSelect("sepa")}
          Icon={Euro}
          title="Virement SEPA"
          speed="1 – 24 h"
          fees="0 % – 0.5 %"
          pros={["Frais minimes", "Adapté aux gros montants"]}
          cons={["Délai de réception", "Setup IBAN initial"]}
          recommended={recommendSepa}
        />
      </div>
    </>
  );
}

function PaymentOption({
  isSelected,
  onClick,
  Icon,
  title,
  speed,
  fees,
  pros,
  cons,
  recommended,
}: {
  isSelected: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  speed: string;
  fees: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onClick}
      className={`text-left rounded-2xl p-5 border transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                  focus-visible:ring-offset-2 focus-visible:ring-offset-background
                  ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-elevated/40 hover:border-primary/50"
                  }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-primary-soft" />
          <h3 className="font-bold text-lg text-fg">{title}</h3>
        </div>
        {recommended && (
          <span className="badge-info text-[10px]">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Recommandé
          </span>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted">Vitesse</dt>
          <dd className="mt-0.5 font-semibold text-fg">{speed}</dd>
        </div>
        <div>
          <dt className="text-muted">Frais</dt>
          <dd className="mt-0.5 font-semibold text-fg">{fees}</dd>
        </div>
      </dl>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <ul className="space-y-1.5">
          {pros.map((p) => (
            <li key={p} className="flex gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent-green" aria-hidden="true" />
              <span className="text-fg/85">{p}</span>
            </li>
          ))}
        </ul>
        <ul className="space-y-1.5">
          {cons.map((c) => (
            <li key={c} className="flex gap-1.5 text-fg/75">
              <span aria-hidden="true" className="font-bold mt-0.5 text-accent-rose">−</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

/* ------------------------------ Step 5 ---------------------------- */

function Step5Recap({
  titleRef,
  choices,
  platform,
  amount,
  onReset,
  onEditStep,
}: {
  titleRef: React.RefObject<HTMLHeadingElement>;
  choices: Choices;
  platform: Platform | undefined;
  amount: number;
  onReset: () => void;
  onEditStep: (i: number) => void;
}) {
  const cryptoLabel = CRYPTOS.find((c) => c.value === choices.crypto)?.name ?? "—";
  const paymentLabel =
    choices.payment === "card" ? "Carte bancaire" : choices.payment === "sepa" ? "Virement SEPA" : "—";

  // Suggestion de petit montant pour se familiariser
  const startSmall = amount > 100 ? Math.min(50, Math.max(10, Math.round(amount * 0.1))) : 25;

  return (
    <>
      <StepHeader
        titleRef={titleRef}
        eyebrow="Étape 5 — Récap + lancement"
        title="Tout est prêt — voici ton plan"
        subtitle="Tu peux modifier n'importe quel choix en cliquant sur la ligne correspondante."
      />

      <ul className="mt-6 space-y-2">
        <RecapRow
          label="Budget"
          value={amount === 0 ? "Pas encore décidé" : `${amount} €`}
          onEdit={() => onEditStep(0)}
        />
        <RecapRow label="Crypto" value={cryptoLabel} onEdit={() => onEditStep(1)} />
        <RecapRow
          label="Plateforme"
          value={platform ? `${platform.name} (${platform.scoring.global}/5)` : "—"}
          onEdit={() => onEditStep(2)}
        />
        <RecapRow label="Paiement" value={paymentLabel} onEdit={() => onEditStep(3)} />
      </ul>

      {platform && (
        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center gap-2 text-primary-soft text-sm font-semibold">
            <Rocket className="h-4 w-4" aria-hidden="true" />
            Tu es prêt
          </div>
          <p className="mt-2 text-fg/85 text-sm">
            Pour te familiariser sans stress, fais d'abord un achat de{" "}
            <strong className="text-fg">{startSmall} € de {cryptoLabel}</strong> sur{" "}
            <strong className="text-fg">{platform.name}</strong>. Tu valideras le
            flow complet (KYC, dépôt, ordre) à coût minimal.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={platform.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackAffiliateClick(platform.id, "first-purchase-wizard-cta")}
              className="btn-primary"
            >
              Aller sur {platform.name}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link href={`/avis/${platform.id}`} className="btn-ghost">
              Relire l'avis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/methodologie"
              className="text-xs font-semibold text-muted hover:text-fg
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                         focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
            >
              Notre méthodologie
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="btn-ghost"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Recommencer
        </button>
        <p className="text-xs text-muted">
          La sécurité après l'achat (2FA, wallet hardware) est traitée dans les
          fiches plateforme.
        </p>
      </div>
    </>
  );
}

function RecapRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-elevated/30 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
        <div className="text-sm font-semibold text-fg truncate">{value}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-primary-soft hover:text-primary
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                   focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded px-2 py-1"
      >
        Modifier
      </button>
    </li>
  );
}


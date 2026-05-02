"use client";

/**
 * <CalculateurFiscalite /> — Client Component interactif
 * ------------------------------------------------------
 * Form + state + calculs pour /outils/calculateur-fiscalite.
 *
 * Inputs : total cessions, total achats, frais courtage, régime fiscal,
 *          TMI (si Barème/BIC), reports antérieurs (optionnel).
 * Output : plus-value nette, impôt total, ventilation IR/PS/cotisations,
 *          revenu net, tableau récap.
 *
 * Lead magnet : à l'affichage du résultat, propose une capture email
 * (checklist Cerfa 2086 + 2042-C) qui POST /api/newsletter/subscribe avec
 * source "inline" (whitelisted) et trigger un événement Plausible
 * "Calculator Email Signup".
 *
 * Aucune dépendance externe — React natif + Tailwind + lucide icons (déjà
 * dans le projet).
 */

import { useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  computeTax,
  formatEuro,
  formatPercent,
  regimeLabel,
  TMI_VALUES,
  type FiscaliteInput,
  type Regime,
  type TmiRate,
} from "@/lib/fiscalite";
import { track, trackAffiliateClick } from "@/lib/analytics";
import CountUp from "@/components/animations/CountUp";
import PdfModal from "@/components/calculateur-fiscalite/PdfModal";

/* -------------------------------------------------------------------------- */
/*  Types & constantes                                                        */
/* -------------------------------------------------------------------------- */

interface FormState {
  totalCessions: string;
  totalAchats: string;
  fraisCourtage: string;
  regime: Regime;
  tmi: TmiRate;
  reportablePrevious: string;
}

const INITIAL: FormState = {
  totalCessions: "",
  totalAchats: "",
  fraisCourtage: "",
  regime: "pfu",
  tmi: 0.30,
  reportablePrevious: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TMI_LABELS: Record<string, string> = {
  "0.11": "11 % — revenu net imposable de 11 295 € à 28 797 €",
  "0.30": "30 % — revenu net imposable de 28 798 € à 82 341 €",
  "0.41": "41 % — revenu net imposable de 82 342 € à 177 106 €",
  "0.45": "45 % — au-delà de 177 106 €",
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Convertit un champ texte → nombre (gère virgule décimale fr). */
function parseEuroInput(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Sanitize input on change : autorise digits, point, virgule. */
function sanitizeNumeric(value: string): string {
  return value.replace(/[^0-9.,]/g, "").replace(/(,.*),/g, "$1");
}

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                       */
/* -------------------------------------------------------------------------- */

export default function CalculateurFiscalite() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [showResult, setShowResult] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  // Tracking : calc-fiscal-start émis 1x dès le premier input utilisateur
  const [hasStarted, setHasStarted] = useState(false);

  // Lead magnet state
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [emailMsg, setEmailMsg] = useState("");

  // PDF modal state (Phase 3 / A3 — export PDF lead magnet)
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  /* --------- Calcul mémoïsé ------------------------------------------------ */
  const result = useMemo(() => {
    const input: FiscaliteInput = {
      totalCessions: parseEuroInput(form.totalCessions),
      totalAchats: parseEuroInput(form.totalAchats),
      fraisCourtage: parseEuroInput(form.fraisCourtage),
      regime: form.regime,
      tmi: form.tmi,
      reportablePrevious: parseEuroInput(form.reportablePrevious),
    };
    return computeTax(input);
  }, [form]);

  /* --------- Validation ---------------------------------------------------- */
  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    const cessions = parseEuroInput(form.totalCessions);
    const achats = parseEuroInput(form.totalAchats);
    const frais = parseEuroInput(form.fraisCourtage);
    const reports = parseEuroInput(form.reportablePrevious);

    if (cessions < 0) next.totalCessions = "Le montant ne peut pas être négatif.";
    if (achats < 0) next.totalAchats = "Le montant ne peut pas être négatif.";
    if (frais < 0) next.fraisCourtage = "Le montant ne peut pas être négatif.";
    if (reports < 0)
      next.reportablePrevious = "Le montant ne peut pas être négatif.";

    if (cessions === 0 && achats === 0) {
      next.totalCessions = "Renseigne au moins un montant de cessions.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /* --------- Handlers ------------------------------------------------------ */
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Tracking : calc-fiscal-start (1× / page) au premier input non-vide
    if (!hasStarted && typeof value === "string" && value.length > 0) {
      setHasStarted(true);
      track("calc-fiscal-start", { tool: "tax-calculator-fr" });
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setShowResult(true);
    // Plausible : usage de l'outil + résultat affiché (audit CRO 26-04)
    track("Tool Usage", { tool: "tax-calculator-fr", action: "compute" });
    track("calc-fiscal-result-shown", {
      tool: "tax-calculator-fr",
      regime: form.regime,
    });
    // Scroll vers le résultat (mobile friendly)
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        document
          .getElementById("calc-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function handleReset() {
    setForm(INITIAL);
    setShowResult(false);
    setErrors({});
    setEmail("");
    setEmailState("idle");
    setEmailMsg("");
    setPdfModalOpen(false);
  }

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailMsg("");
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailState("error");
      setEmailMsg("Adresse email invalide.");
      return;
    }
    setEmailState("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: "inline",
          utm: {
            source: "calculator",
            medium: "tool",
            campaign: "fiscalite-checklist-2026",
          },
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEmailState("error");
        setEmailMsg(data.error || "Inscription impossible. Réessaie.");
        return;
      }
      setEmailState("success");
      setEmailMsg(
        "C'est noté ! La checklist Cerfa 2086 + 2042-C arrive dans ta boîte mail.",
      );
      // Plausible : conversion email
      track("Calculator Email Signup", {
        tool: "tax-calculator-fr",
        regime: form.regime,
      });
    } catch (err) {
      setEmailState("error");
      setEmailMsg(
        err instanceof Error ? err.message : "Erreur réseau. Réessaie.",
      );
    }
  }

  const needsTmi = form.regime === "bareme" || form.regime === "bic";

  /* --------- Render -------------------------------------------------------- */
  return (
    <div
      className="glass glow-border rounded-2xl p-6 sm:p-8"
      aria-labelledby="calc-fiscalite-title"
    >
      {/* En-tête */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-soft"
          aria-hidden="true"
        >
          <Calculator className="h-5 w-5 text-background" />
        </div>
        <div className="flex-1">
          <h2
            id="calc-fiscalite-title"
            className="font-display font-bold text-xl text-white"
          >
            Calcule ton impôt crypto 2026
          </h2>
          <p className="text-sm text-muted">
            Renseigne tes totaux de l'année et choisis ton régime fiscal.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Calcul local
        </span>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {/* Total cessions */}
        <NumericField
          id="totalCessions"
          label="Total des cessions de l'année (€)"
          hint="Somme de toutes tes ventes crypto vers euros (ou achats de biens/services). Exclut les conversions crypto ↔ crypto."
          value={form.totalCessions}
          onChange={(v) => update("totalCessions", v)}
          error={errors.totalCessions}
          placeholder="Ex. 8000"
        />

        {/* Total achats */}
        <NumericField
          id="totalAchats"
          label="Total des achats correspondants (€)"
          hint="Prix d'acquisition des cryptos vendues (somme des montants investis pour ces cessions)."
          value={form.totalAchats}
          onChange={(v) => update("totalAchats", v)}
          error={errors.totalAchats}
          placeholder="Ex. 5000"
        />

        {/* Frais de courtage */}
        <NumericField
          id="fraisCourtage"
          label="Frais de courtage cumulés (€)"
          hint="Total des frais payés à tes plateformes (achat, vente, retrait, conversion)."
          value={form.fraisCourtage}
          onChange={(v) => update("fraisCourtage", v)}
          error={errors.fraisCourtage}
          placeholder="Ex. 80"
        />

        {/* Régime fiscal */}
        <fieldset>
          <legend className="block text-sm font-semibold text-white mb-2">
            Régime fiscal applicable
          </legend>
          <div role="radiogroup" className="grid sm:grid-cols-3 gap-2">
            <RegimeOption
              value="pfu"
              current={form.regime}
              title="PFU 30 %"
              subtitle="Par défaut (occasionnel)"
              onChange={(v) => update("regime", v)}
            />
            <RegimeOption
              value="bareme"
              current={form.regime}
              title="Barème IR"
              subtitle="Option (11 / 30 / 41 / 45 %)"
              onChange={(v) => update("regime", v)}
            />
            <RegimeOption
              value="bic"
              current={form.regime}
              title="BIC pro"
              subtitle="Trading habituel"
              onChange={(v) => update("regime", v)}
            />
          </div>
        </fieldset>

        {/* TMI : visible uniquement si Barème ou BIC */}
        {needsTmi && (
          <div>
            <label
              htmlFor="tmi-select"
              className="block text-sm font-semibold text-white"
            >
              Tranche marginale d'imposition (TMI)
            </label>
            <p className="mt-1 text-sm text-muted">
              Ta tranche maximale d'IR. Si tu hésites, garde 30 % (cas le plus
              fréquent).
            </p>
            <select
              id="tmi-select"
              value={String(form.tmi)}
              onChange={(e) =>
                update("tmi", parseFloat(e.target.value) as TmiRate)
              }
              className="mt-2 w-full rounded-xl bg-background border border-border px-4 py-3 text-white
                         focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {TMI_VALUES.map((rate) => (
                <option key={rate} value={String(rate)}>
                  {TMI_LABELS[String(rate)]}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reports antérieurs (optionnel) */}
        <NumericField
          id="reportablePrevious"
          label="Plus-values antérieures reportables (€) — optionnel"
          hint="Reports de plus-values d'années précédentes (rare pour particulier ; pertinent en BIC)."
          value={form.reportablePrevious}
          onChange={(v) => update("reportablePrevious", v)}
          error={errors.reportablePrevious}
          placeholder="0"
        />

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn-ghost"
            aria-label="Réinitialiser le formulaire"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Réinitialiser
          </button>
          <button type="submit" className="btn-primary">
            Calculer mon impôt
            <Calculator className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      {/* Résultat */}
      {showResult && (
        <div
          id="calc-result"
          className="mt-8 border-t border-border/60 pt-8"
          aria-live="polite"
        >
          <ResultPanel
            result={result}
            tmi={form.tmi}
            inputs={{
              cessions: parseEuroInput(form.totalCessions),
              achats: parseEuroInput(form.totalAchats),
              frais: parseEuroInput(form.fraisCourtage),
              reports: parseEuroInput(form.reportablePrevious),
            }}
            email={email}
            emailState={emailState}
            emailMsg={emailMsg}
            onEmailChange={setEmail}
            onEmailSubmit={handleEmailSubmit}
          />

          {/* CTA "Télécharger ma simulation PDF" (Phase 3 / A3) */}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setPdfModalOpen(true);
                track("calc-pdf-modal-open", { tool: "tax-calculator-fr" });
              }}
              className="btn-primary"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Télécharger ma simulation PDF
            </button>
          </div>

          {/* Encart Waltio (post-résultat) — bénéfice ciblé selon profil */}
          <div className="mt-8">
            <WaltioPostResultCta
              taxAmount={result.impotTotal}
              isExonere={result.exonere}
              regime={form.regime}
            />
          </div>
        </div>
      )}

      {/* Modal email gate → preview-pdf */}
      <PdfModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        input={{
          totalCessions: parseEuroInput(form.totalCessions),
          totalAchats: parseEuroInput(form.totalAchats),
          fraisCourtage: parseEuroInput(form.fraisCourtage),
          regime: form.regime,
          tmi: form.tmi,
          reportablePrevious: parseEuroInput(form.reportablePrevious),
        }}
        result={result}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  WaltioPostResultCta — encart promotionnel après le calcul                 */
/*                                                                            */
/*  Inline pour rester dans un Client Component sans import dynamique.        */
/*  - CTA #1 (interne) → /outils/declaration-fiscale-crypto                   */
/*  - CTA #2 (affilié) → Waltio direct, tagué sponsored noopener noreferrer   */
/*    + label « Lien d'affiliation publicitaire » (loi Influenceurs juin 2023)*/
/* -------------------------------------------------------------------------- */

interface WaltioPostResultCtaProps {
  taxAmount: number;
  isExonere: boolean;
  regime: Regime;
}

function WaltioPostResultCta({
  taxAmount,
  isExonere,
  regime,
}: WaltioPostResultCtaProps) {
  // URL d'affiliation Waltio — synchronisée avec data/fiscal-tools.json.
  // Hardcodée ici pour rester côté client sans import data JSON inutile.
  const waltioAffiliateUrl =
    "https://waltio.com?ref=cryptoreflex&utm_source=cryptoreflex&utm_medium=affiliate&utm_campaign=calculator-post-result";

  function handleAffiliateClick() {
    trackAffiliateClick(
      "waltio",
      "post-result",
      "Économise 40h sur ta déclaration crypto",
    );
  }

  function handleInternalClick() {
    track("Internal CTA", {
      placement: "calculator-post-result",
      target: "/outils/declaration-fiscale-crypto",
    });
  }

  // Headline contextuel selon le profil fiscal (CRO 26-04)
  // - Exonéré (≤ 305 €) : focus sur 3916-bis (obligatoire même sans impôt)
  // - Régime BIC : focus expert-comptable / pro
  // - Gros impôt > 1000 € : focus optimisation (moins-values reportables, etc.)
  // - Cas standard : focus économie de temps
  let headline: string;
  let pitch: string;
  if (isExonere) {
    headline = "Tu es exonéré — mais le 3916-bis reste obligatoire";
    pitch =
      "Même sans impôt à payer, chaque compte ouvert sur Binance, Kraken ou Coinbase doit être déclaré (formulaire 3916-bis). 750 € à 1 500 € d'amende par compte oublié. Waltio le pré-remplit automatiquement à partir de tes connexions API.";
  } else if (regime === "bic") {
    headline = "BIC professionnel : ton expert-comptable va t'aimer";
    pitch =
      "Au régime BIC, ton expert-comptable facture 600 € à 5 000 € selon le volume. Waltio Pro (549 €/an) fournit un dossier propre avec accès partagé : tu divises sa facture par 2 ou 3 et tu gardes un audit-trail complet en cas de contrôle.";
  } else if (taxAmount >= 1000) {
    headline = `Économise potentiellement des centaines d'€ sur ces ${formatEuro(
      taxAmount,
    )}`;
    pitch =
      "Sur un impôt élevé, chaque moins-value oubliée et chaque frais non déduit te coûtent cher. Waltio retrouve automatiquement tes moins-values reportables (10 ans), tous tes frais de cession et te calcule le bon arbitrage PFU vs barème. Plan Hodler 79 € (vs 600 € chez un comptable).";
  } else {
    headline = "Économise 40 h sur ta déclaration crypto";
    pitch =
      "Notre calculateur te donne le montant. Waltio (édité en France) connecte tes exchanges, calcule chaque cession au prorata article 150 VH bis et génère le Cerfa 2086 + 3916-bis prêts à téléverser sur impots.gouv.fr en 30 minutes au lieu d'un week-end entier.";
  }

  return (
    <section
      aria-labelledby="waltio-post-result-title"
      className="rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-soft"
          aria-hidden="true"
        >
          <Calculator className="h-5 w-5 text-background" />
        </div>
        <div className="flex-1">
          <h4
            id="waltio-post-result-title"
            className="font-display font-bold text-white"
          >
            <span aria-hidden="true">🎯 </span>
            {headline}
          </h4>
          <p className="mt-2 text-sm text-white/75">
            {pitch}{" "}
            <strong className="text-primary-soft">
              -30 % avec le code CRYPTOREFLEX
            </strong>{" "}
            (jusqu'au 31 mai 2026).
          </p>

          {/* Trust strip — bénéfices clés (à remplacer par vrais témoignages
              quand collectés ; volontairement factuel et conservateur). */}
          <ul className="mt-3 grid sm:grid-cols-3 gap-2 text-xs text-white/70">
            <li className="flex items-center gap-1.5">
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0 text-success"
                aria-hidden="true"
              />
              220+ exchanges connectés
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0 text-success"
                aria-hidden="true"
              />
              Cerfa 2086 + 3916-bis prêts
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0 text-success"
                aria-hidden="true"
              />
              Support client en français
            </li>
          </ul>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <a
              href="/outils/declaration-fiscale-crypto"
              onClick={handleInternalClick}
              className="btn-ghost justify-center text-sm"
            >
              Comparatif Waltio vs Koinly vs CoinTracking
            </a>
            <a
              href={waltioAffiliateUrl}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              aria-label="Lien d'affiliation publicitaire vers Waltio"
              onClick={handleAffiliateClick}
              data-affiliate-platform="waltio"
              data-affiliate-placement="post-result"
              className="btn-primary justify-center text-sm"
            >
              Essayer Waltio gratuitement
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-2 text-[10px] text-muted/70">
            Lien d'affiliation publicitaire — Cryptoreflex perçoit une
            commission. <a href="/transparence" className="underline">En savoir plus</a>.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function NumericField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(sanitizeNumeric(e.target.value));
  }
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-white">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-2 relative">
        <input
          id={id}
          name={id}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={`${hint ? hintId : ""} ${error ? errorId : ""}`.trim()}
          className={`w-full rounded-xl bg-background border px-4 py-3 pr-10
                     font-mono text-base text-white
                     focus:outline-none focus:ring-2
                     ${
                       error
                         ? "border-danger/60 focus:border-danger focus:ring-danger/30"
                         : "border-border focus:border-primary/60 focus:ring-primary/20"
                     }`}
        />
        <span
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-muted text-sm"
          aria-hidden="true"
        >
          €
        </span>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-sm text-danger-fg flex items-center gap-1.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function RegimeOption({
  value,
  current,
  title,
  subtitle,
  onChange,
}: {
  value: Regime;
  current: Regime;
  title: string;
  subtitle: string;
  onChange: (v: Regime) => void;
}) {
  const checked = current === value;
  return (
    <label
      className={`relative flex flex-col gap-1 rounded-xl border px-4 py-3 cursor-pointer transition-colors
                  focus-within:ring-2 focus-within:ring-primary/40
                  ${
                    checked
                      ? "border-primary/60 bg-primary/10 text-white"
                      : "border-border bg-background hover:border-primary/40 text-white/85"
                  }`}
    >
      <input
        type="radio"
        name="regime"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span className="font-semibold text-sm">{title}</span>
      <span className="text-xs text-muted">{subtitle}</span>
      {checked && (
        <CheckCircle2
          className="absolute top-2 right-2 h-4 w-4 text-primary"
          aria-hidden="true"
        />
      )}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/*  ResultPanel — affichage du calcul + lead magnet                           */
/* -------------------------------------------------------------------------- */

interface ResultInputs {
  cessions: number;
  achats: number;
  frais: number;
  reports: number;
}

function ResultPanel({
  result,
  tmi,
  inputs,
  email,
  emailState,
  emailMsg,
  onEmailChange,
  onEmailSubmit,
}: {
  result: ReturnType<typeof computeTax>;
  tmi: TmiRate;
  inputs: ResultInputs;
  email: string;
  emailState: "idle" | "loading" | "success" | "error";
  emailMsg: string;
  onEmailChange: (v: string) => void;
  onEmailSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const showCotisations = result.regime === "bic";

  // Cas 1 : exonéré (≤ 305 €)
  if (result.exonere) {
    return (
      <div className="space-y-6">
        <h3 className="font-display text-lg sm:text-xl font-bold text-white">
          Tu es exonéré d'impôt sur tes plus-values crypto
        </h3>
        <div className="rounded-xl border border-success/40 bg-success/10 p-5 text-sm text-white/90 flex gap-3">
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-success mt-0.5"
            aria-hidden="true"
          />
          <p>
            Le total de tes cessions de l'année est inférieur ou égal au seuil
            d'exonération de <strong>305 €</strong>. Aucun impôt n'est dû sur
            tes plus-values crypto pour 2026. Pense malgré tout à déclarer tes
            comptes étrangers (formulaire <strong>3916-bis</strong>).
          </p>
        </div>
        <EmailCapture
          email={email}
          state={emailState}
          message={emailMsg}
          onChange={onEmailChange}
          onSubmit={onEmailSubmit}
        />
      </div>
    );
  }

  // Cas 2 : déficit (PV nette ≤ 0)
  if (result.deficit) {
    return (
      <div className="space-y-6">
        <h3 className="font-display text-lg sm:text-xl font-bold text-white">
          Tu es en moins-value cette année
        </h3>
        <div className="rounded-xl border border-info/40 bg-info/10 p-5 text-sm text-white/90 flex gap-3">
          <Info
            className="h-5 w-5 shrink-0 text-info-fg mt-0.5"
            aria-hidden="true"
          />
          <p>
            Ta plus-value nette est de <strong>{formatEuro(result.plusValueNette)}</strong>{" "}
            (déficit). Aucun impôt n'est dû. Pour un particulier au régime
            PFU/Barème, cette moins-value n'est <strong>pas reportable</strong>{" "}
            sur les années suivantes — elle ne s'impute que sur les plus-values
            crypto de la même année.
          </p>
        </div>
        <BreakdownTable
          result={result}
          inputs={inputs}
          showCotisations={showCotisations}
        />
        <EmailCapture
          email={email}
          state={emailState}
          message={emailMsg}
          onChange={onEmailChange}
          onSubmit={onEmailSubmit}
        />
      </div>
    );
  }

  // Cas 3 : imposable
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted">
          Régime : {regimeLabel(result.regime)}
          {(result.regime === "bareme" || result.regime === "bic") && (
            <> — TMI {formatPercent(tmi, 0)}</>
          )}
        </p>
        <h3 className="mt-1 font-display text-lg sm:text-2xl font-bold text-white">
          Impôt total estimé :{" "}
          {/* BATCH 37 — animation count-up sur le résultat principal (audit
              Motion Expert) : effet "machine à sous" qui crée anticipation +
              signal "résultat prêt". 0 dépendance externe. */}
          <span className="text-primary-soft">
            <CountUp
              value={result.impotTotal}
              duration={900}
              format={(n) => formatEuro(Math.round(n))}
            />
          </span>
        </h3>
        <p className="mt-1 text-sm text-muted">
          Taux effectif global : {formatPercent(result.tauxEffectif)}.
        </p>
      </header>

      {/* Tuiles synthèse */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryTile
          label="Plus-value nette"
          value={formatEuro(result.plusValueNette)}
          tone="neutral"
        />
        <SummaryTile
          label="Impôt sur le revenu"
          value={formatEuro(result.montantIR)}
          tone="rose"
        />
        <SummaryTile
          label="Prélèvements sociaux"
          value={formatEuro(result.montantPS)}
          tone="rose"
        />
        <SummaryTile
          label="Net après impôt"
          value={formatEuro(result.netApresImpot)}
          tone="green"
        />
      </div>

      {showCotisations && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-white/90 flex gap-3">
          <Info
            className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
            aria-hidden="true"
          />
          <p>
            En BIC, on a estimé en plus{" "}
            <strong>{formatEuro(result.cotisationsSociales)}</strong> de
            cotisations sociales URSSAF (~22 %). À affiner avec ton expert-comptable
            (micro-BIC, TNS classique, abattement forfaitaire).
          </p>
        </div>
      )}

      <BreakdownTable
        result={result}
        inputs={inputs}
        showCotisations={showCotisations}
      />

      <EmailCapture
        email={email}
        state={emailState}
        message={emailMsg}
        onChange={onEmailChange}
        onSubmit={onEmailSubmit}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "green" | "rose";
}) {
  const toneClass =
    tone === "green"
      ? "text-success-fg"
      : tone === "rose"
      ? "text-danger-fg"
      : "text-white";
  return (
    <div className="rounded-xl border border-border bg-elevated/50 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`mt-1 font-mono font-bold text-base sm:text-lg ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function BreakdownTable({
  result,
  inputs,
  showCotisations,
}: {
  result: ReturnType<typeof computeTax>;
  inputs: ResultInputs;
  showCotisations: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-sm"
        aria-label="Ventilation détaillée du calcul fiscal"
      >
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
            <th className="px-2 py-2 font-medium">Poste</th>
            <th className="px-2 py-2 font-medium text-right">Montant</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          <Row label="Total cessions (brut)" value={inputs.cessions} />
          <Row label="Total achats" value={inputs.achats} />
          <Row label="Frais de courtage" value={inputs.frais} />
          {inputs.reports > 0 && (
            <Row label="Reports antérieurs" value={inputs.reports} />
          )}
          <Row
            label="Plus-value brute (cessions − achats − frais)"
            value={result.plusValueBrute}
          />
          <Row
            label="Plus-value nette imposable"
            value={result.plusValueNette}
            emphasis
          />
          <Row label="Impôt sur le revenu" value={result.montantIR} negative />
          <Row
            label="Prélèvements sociaux 17,2 %"
            value={result.montantPS}
            negative
          />
          {showCotisations && (
            <Row
              label="Cotisations sociales URSSAF (~22 %)"
              value={result.cotisationsSociales}
              negative
            />
          )}
          <Row label="Impôt total" value={result.impotTotal} negative emphasis />
          <Row
            label="Net après impôt"
            value={result.netApresImpot}
            positive
            emphasis
          />
        </tbody>
      </table>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
  negative,
  positive,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
  negative?: boolean;
  positive?: boolean;
}) {
  const colorClass = negative
    ? "text-danger-fg"
    : positive
    ? "text-success-fg"
    : "text-white/90";
  const fontClass = emphasis ? "font-bold" : "";
  return (
    <tr>
      <td className={`px-2 py-2 ${fontClass} text-white/85`}>{label}</td>
      <td
        className={`px-2 py-2 text-right font-mono ${fontClass} ${colorClass}`}
      >
        {formatEuro(value)}
      </td>
    </tr>
  );
}

/* -------------------------------------------------------------------------- */
/*  EmailCapture — lead magnet (Beehiiv via /api/newsletter/subscribe)        */
/* -------------------------------------------------------------------------- */

function EmailCapture({
  email,
  state,
  message,
  onChange,
  onSubmit,
}: {
  email: string;
  state: "idle" | "loading" | "success" | "error";
  message: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  if (state === "success") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-success/40 bg-success/10 p-5 text-sm text-white/90 flex gap-3"
      >
        <CheckCircle2
          className="h-5 w-5 shrink-0 text-success mt-0.5"
          aria-hidden="true"
        />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="lead-magnet-title"
      className="rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <Mail
          className="h-5 w-5 shrink-0 text-primary-soft mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1">
          <h4
            id="lead-magnet-title"
            className="font-display font-bold text-white"
          >
            Reçois la checklist Cerfa 2086 + déclaration 2042-C
          </h4>
          <p className="mt-1 text-sm text-white/75">
            Pas-à-pas pour reporter tes cessions sur les bons formulaires, avec
            les pièges à éviter. Gratuit, désinscription en 1 clic.
          </p>
          <form
            onSubmit={onSubmit}
            className="mt-4 flex flex-col sm:flex-row gap-2"
            noValidate
          >
            <label htmlFor="lead-email" className="sr-only">
              Adresse email
            </label>
            <input
              id="lead-email"
              type="email"
              required
              autoComplete="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => onChange(e.target.value)}
              aria-invalid={state === "error"}
              aria-describedby={message ? "lead-msg" : undefined}
              disabled={state === "loading"}
              className="flex-1 rounded-xl bg-background border border-border px-4 py-3 text-white
                         focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20
                         disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Envoi…
                </>
              ) : (
                <>
                  Recevoir la checklist
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
          {state === "error" && message && (
            <p
              id="lead-msg"
              role="alert"
              className="mt-2 text-sm text-danger-fg flex items-center gap-1.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {message}
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted">
            En t'inscrivant, tu reçois aussi notre newsletter hebdo crypto FR.
            Tes données ne sont jamais revendues.
          </p>
        </div>
      </div>
    </section>
  );
}

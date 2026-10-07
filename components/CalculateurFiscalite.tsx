"use client";

/**
 * <CalculateurFiscalite /> — Client Component interactif
 * ------------------------------------------------------
 * Form + state + calculs pour /outils/calculateur-fiscalite.
 *
 * Inputs : total cessions, total achats, frais courtage, régime fiscal,
 *          TMI (si Barème/BNC), déficits BNC reportés (optionnel, BNC seulement).
 * Output : plus-value nette, impôt total, ventilation IR/PS,
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
import { waltioAffiliateUrl as waltioAffiliateUrlWith } from "@/lib/partner-links";
import CountUp from "@/components/animations/CountUp";
import PdfModal from "@/components/calculateur-fiscalite/PdfModal";

/* -------------------------------------------------------------------------- */
/*  Types & constantes                                                        */
/* -------------------------------------------------------------------------- */

interface FormState {
  totalCessions: string;
  totalAchats: string;
  valeurPortefeuille: string;
  fraisCourtage: string;
  regime: Regime;
  tmi: TmiRate;
  reportablePrevious: string;
}

const INITIAL: FormState = {
  totalCessions: "",
  totalAchats: "",
  valeurPortefeuille: "",
  fraisCourtage: "",
  regime: "pfu",
  tmi: 0.30,
  reportablePrevious: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Barème IR 2026 (revenus 2025), bornes revalorisées +0,9 % par la LFI 2026.
// Source : service-public.gouv.fr A18045 / economie.gouv.fr (vérifié 2026-06-14).
const TMI_LABELS: Record<string, string> = {
  "0.11": "11 % — revenu net imposable de 11 601 € à 29 579 €",
  "0.30": "30 % — revenu net imposable de 29 580 € à 84 577 €",
  "0.41": "41 % — revenu net imposable de 84 578 € à 181 917 €",
  "0.45": "45 % — au-delà de 181 917 €",
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
      valeurPortefeuille: parseEuroInput(form.valeurPortefeuille),
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
    const valeur = parseEuroInput(form.valeurPortefeuille);
    const reports = parseEuroInput(form.reportablePrevious);

    if (cessions < 0) next.totalCessions = "Le montant ne peut pas être négatif.";
    if (achats < 0) next.totalAchats = "Le montant ne peut pas être négatif.";
    if (frais < 0) next.fraisCourtage = "Le montant ne peut pas être négatif.";
    if (valeur < 0) next.valeurPortefeuille = "Le montant ne peut pas être négatif.";
    if (valeur > 0 && valeur < cessions)
      next.valeurPortefeuille =
        "La valeur du portefeuille ne peut pas être inférieure au montant vendu : la part vendue en fait partie.";
    if (reports < 0)
      next.reportablePrevious = "Le montant ne peut pas être négatif.";

    if (cessions === 0 && achats === 0) {
      next.totalCessions = "Renseignez au moins un montant de cessions.";
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
        setEmailMsg(data.error || "Inscription impossible. Réessayez.");
        return;
      }
      setEmailState("success");
      // 06/10/2026 : « La checklist arrive dans votre boîte mail » était faux — l'inscription (newsletter) n'envoie
      // aucune checklist. Le PDF est proposé en téléchargement direct dans l'écran de succès.
      setEmailMsg("C'est noté : vous êtes inscrit à la newsletter. Votre checklist est prête :");
      // Plausible : conversion email
      track("Calculator Email Signup", {
        tool: "tax-calculator-fr",
        regime: form.regime,
      });
    } catch (err) {
      setEmailState("error");
      setEmailMsg(
        err instanceof Error ? err.message : "Erreur réseau. Réessayez.",
      );
    }
  }

  const needsTmi = form.regime === "bareme" || form.regime === "bnc";

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
            className="font-display font-bold text-xl text-fg-max"
          >
            Calculez votre impôt crypto 2026
          </h2>
          <p className="text-sm text-muted">
            Renseignez vos totaux de l'année et choisissez votre régime fiscal.
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
          hint="Somme de toutes vos ventes crypto vers euros (ou achats de biens/services). Exclut les conversions crypto ↔ crypto."
          value={form.totalCessions}
          onChange={(v) => update("totalCessions", v)}
          error={errors.totalCessions}
          placeholder="Ex. 8000"
        />

        {/* Prix total d'acquisition (ligne 220, net des fractions déjà imputées) */}
        <NumericField
          id="totalAchats"
          label="Prix total d'acquisition de votre portefeuille (€)"
          hint="Tout ce que vous avez payé en euros pour l'ensemble de vos cryptos détenues juste avant la vente (ligne 220 du 2086), moins les fractions déjà imputées lors de ventes antérieures (ligne 221). Si vous avez tout vendu : la somme de vos achats."
          value={form.totalAchats}
          onChange={(v) => update("totalAchats", v)}
          error={errors.totalAchats}
          placeholder="Ex. 5000"
        />

        {/* Valeur globale du portefeuille (ligne 212) — audit 03/10/2026 : sans elle, « cessions − achats »
            sous-estimait lourdement la plus-value d'une vente partielle */}
        <NumericField
          id="valeurPortefeuille"
          label="Valeur globale du portefeuille au moment de la vente (€) — facultatif"
          hint="Valeur de toutes vos cryptos juste avant la vente, part vendue comprise (ligne 212). Laissez vide si vous avez vendu la totalité de votre portefeuille. Plusieurs ventes dans l'année : indiquez la valeur au moment de la principale, ou utilisez le générateur Cerfa 2086 pour un calcul ligne par ligne."
          value={form.valeurPortefeuille}
          onChange={(v) => update("valeurPortefeuille", v)}
          error={errors.valeurPortefeuille}
          placeholder="Ex. 15000"
        />

        {/* Frais de cession (ligne 214) */}
        <NumericField
          id="fraisCourtage"
          label="Frais de cession (€)"
          hint="Commissions prélevées par vos plateformes sur les ventes (ligne 214) : elles réduisent le prix de cession, pas le quotient. Les frais d'achat : ajoutez-les à vos achats si vous retenez cette lecture de la ligne 220. Les frais de retrait, le gas de vos transferts et swaps et les abonnements ne sont pas déductibles."
          value={form.fraisCourtage}
          onChange={(v) => update("fraisCourtage", v)}
          error={errors.fraisCourtage}
          placeholder="Ex. 80"
        />

        {/* Régime fiscal */}
        <fieldset>
          <legend className="block text-sm font-semibold text-fg-max mb-2">
            Régime fiscal applicable
          </legend>
          <div role="radiogroup" className="grid sm:grid-cols-3 gap-2">
            <RegimeOption
              value="pfu"
              current={form.regime}
              title="PFU 31,4 %"
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
              value="bnc"
              current={form.regime}
              title="BNC"
              subtitle="Trader comme un pro (rare)"
              onChange={(v) => update("regime", v)}
            />
          </div>
          {/* Art. 92, 2-1° bis CGI depuis le 01/01/2023 ; BOFiP BOI-BNC-CHAMP-10-10-20-40 § 1080 (« cas d'espèce exceptionnels »). */}
          {form.regime === "bnc" && (
            <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-fg-max/90">
              Régime rare, réservé à celui qui trade toute l&apos;année comme un professionnel
              (opérations nombreuses, outils et techniques de trader), sans que ce soit son métier.
              En cas de doute, c&apos;est le PFU qui s&apos;applique. Si le trading est votre métier
              (régime BIC), ce simulateur ne convient pas : voyez un expert-comptable.
            </p>
          )}
        </fieldset>

        {/* TMI : visible uniquement si Barème ou BNC */}
        {needsTmi && (
          <div>
            <label
              htmlFor="tmi-select"
              className="block text-sm font-semibold text-fg-max"
            >
              Tranche marginale d'imposition (TMI)
            </label>
            <p className="mt-1 text-sm text-muted">
              Votre tranche maximale d'IR. Si vous hésitez, gardez 30 % (cas le
              plus fréquent).
            </p>
            <select
              id="tmi-select"
              value={String(form.tmi)}
              onChange={(e) =>
                update("tmi", parseFloat(e.target.value) as TmiRate)
              }
              className="mt-2 w-full rounded-xl bg-background border border-border px-4 py-3 text-fg-max
                         focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {TMI_VALUES.map((rate) => (
                <option key={rate} value={String(rate)}>
                  {TMI_LABELS[rate.toFixed(2)]}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Déficits reportables : régime BNC uniquement (art. 156-I-2° : 6 ans, sur des BNC non
            professionnels). Pour un particulier (PFU ou barème), la moins-value ne se reporte pas
            d'une année sur l'autre : le champ est masqué et ignoré par le moteur (audit 03/10/2026). */}
        {form.regime === "bnc" && (
          <NumericField
            id="reportablePrevious"
            label="Déficits BNC des 6 dernières années (€) — optionnel"
            hint="Réservé au régime BNC : un déficit se déduit de vos bénéfices BNC non professionnels des 6 années suivantes. Pour un particulier (PFU ou barème), les moins-values crypto ne se reportent pas."
            value={form.reportablePrevious}
            onChange={(v) => update("reportablePrevious", v)}
            error={errors.reportablePrevious}
            placeholder="0"
          />
        )}

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
              valeur: parseEuroInput(form.valeurPortefeuille),
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
  // URL d'affiliation Waltio — vrai lien tracé (lib/partner-links.ts, 06/10/2026 : « ?ref=cryptoreflex » ne l'était pas).
  const waltioAffiliateUrl = waltioAffiliateUrlWith({
    utm_source: "cryptoreflex",
    utm_medium: "affiliate",
    utm_campaign: "calculator-post-result",
  });

  function handleAffiliateClick() {
    trackAffiliateClick(
      "waltio",
      "post-result",
      "Économisez 40h sur votre déclaration crypto",
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
  // - Régime BNC : focus expert-comptable
  // - Gros impôt > 1000 € : focus optimisation (compensation des moins-values, etc.)
  // - Cas standard : focus économie de temps
  let headline: string;
  let pitch: string;
  if (isExonere) {
    headline = "Vous êtes exonéré — mais le 3916-bis reste obligatoire";
    pitch =
      "Même sans impôt à payer, chaque compte ouvert sur une plateforme étrangère (Kraken, Coinbase, ou Binance pour les années où vous y aviez un compte) doit être déclaré (formulaire 3916-bis). 750 € d’amende par compte oublié, 1 500 € si la valeur des comptes dépasse 50 000 €. Waltio le pré-remplit automatiquement à partir de vos connexions API.";
  } else if (regime === "bnc") {
    headline = "Régime BNC : faites valider votre calcul";
    pitch =
      "Le régime BNC est rare et son calcul exact n'est pas fixé par l'administration pour les cryptos : faites valider votre situation par un expert-comptable. Un export Waltio propre (Smart 249 €/an jusqu'à 10 000 transactions) peut alléger son travail, et vous gardez l'historique détaillé en cas de contrôle.";
  } else if (taxAmount >= 1000) {
    headline = `Économisez potentiellement des centaines d'€ sur ces ${formatEuro(
      taxAmount,
    )}`;
    pitch =
      "Sur un impôt élevé, chaque moins-value oubliée et chaque frais non déduit vous coûtent cher. Waltio retrouve automatiquement vos moins-values de l'année (imputables sur vos plus-values crypto), tous vos frais de cession et vous calcule le bon arbitrage PFU vs barème. Plan Starter 99 €/an jusqu'à 1 000 transactions (vs 600 € et plus chez un comptable).";
  } else {
    headline = "Économisez 40 h sur votre déclaration crypto";
    pitch =
      "Notre calculateur vous donne le montant. Waltio (édité en France) connecte vos exchanges, calcule chaque cession au prorata article 150 VH bis et prépare le Cerfa 2086 + 3916-bis à recopier sur impots.gouv.fr, bien plus vite qu'à la main.";
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
            className="font-display font-bold text-fg-max"
          >
            <span aria-hidden="true">🎯 </span>
            {headline}
          </h4>
          <p className="mt-2 text-sm text-fg-max/75">
            {pitch}{" "}
            <strong className="text-primary-soft">
              Rapport fiscal dès 39 €/an
            </strong>{" "}
            (tarifs sur le site de Waltio).
          </p>

          {/* Trust strip — bénéfices clés (à remplacer par vrais témoignages
              quand collectés ; volontairement factuel et conservateur). */}
          <ul className="mt-3 grid sm:grid-cols-3 gap-2 text-xs text-fg-max/70">
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
      <label htmlFor={id} className="block text-sm font-semibold text-fg-max">
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
                     font-mono text-base text-fg-max
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
                      ? "border-primary/60 bg-primary/10 text-fg-max"
                      : "border-border bg-background hover:border-primary/40 text-fg-max/85"
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
  /** Valeur globale du portefeuille au moment de la vente (ligne 212), 0 si non renseignée. */
  valeur: number;
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
  const isBnc = result.regime === "bnc";

  // Cas 1 : exonéré (≤ 305 €)
  if (result.exonere) {
    return (
      <div className="space-y-6">
        <h3 className="font-display text-lg sm:text-xl font-bold text-fg-max">
          Vous êtes exonéré d'impôt sur vos plus-values crypto
        </h3>
        <div className="rounded-xl border border-success/40 bg-success/10 p-5 text-sm text-fg-max/90 flex gap-3">
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-success mt-0.5"
            aria-hidden="true"
          />
          <p>
            Le total de vos cessions de l'année est inférieur ou égal au seuil
            d'exonération de <strong>305 €</strong>. Aucun impôt n'est dû sur
            vos plus-values crypto pour 2026. Pensez malgré tout à déclarer vos
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
        <h3 className="font-display text-lg sm:text-xl font-bold text-fg-max">
          Vous êtes en moins-value cette année
        </h3>
        <div className="rounded-xl border border-info/40 bg-info/10 p-5 text-sm text-fg-max/90 flex gap-3">
          <Info
            className="h-5 w-5 shrink-0 text-info-fg mt-0.5"
            aria-hidden="true"
          />
          {isBnc ? (
            <p>
              Votre résultat est de <strong>{formatEuro(result.plusValueNette)}</strong>{" "}
              (déficit). Aucun impôt n&apos;est dû. Au régime BNC, ce déficit se déduit de vos
              bénéfices BNC non professionnels des <strong>6 années suivantes</strong>, jamais de
              votre revenu global.
            </p>
          ) : (
            <p>
              Votre plus-value nette est de <strong>{formatEuro(result.plusValueNette)}</strong>{" "}
              (déficit). Aucun impôt n'est dû. Pour un particulier au régime
              PFU/Barème, cette moins-value n'est <strong>pas reportable</strong>{" "}
              sur les années suivantes — elle ne s'impute que sur les plus-values
              crypto de la même année.
            </p>
          )}
        </div>
        <BreakdownTable result={result} inputs={inputs} />
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
          {(result.regime === "bareme" || result.regime === "bnc") && (
            <> — TMI {formatPercent(tmi, 0)}</>
          )}
        </p>
        <h3 className="mt-1 font-display text-lg sm:text-2xl font-bold text-fg-max">
          Impôt total estimé :{" "}
          {/* BATCH 37 — animation count-up sur le résultat principal (audit
              Motion Expert) : effet "machine à sous" qui crée anticipation +
              signal "résultat prêt". 0 dépendance externe. */}
          <span className="text-primary-soft">
            <CountUp
              value={result.impotTotal}
              duration={900}
              format={(n) => formatEuro(n)} /* au centime : « 5 636,30 € », pas « 5636,00 € » (audit 03/10/2026) */
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

      {isBnc && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-fg-max/90 flex gap-3">
          <Info
            className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
            aria-hidden="true"
          />
          <p>
            Estimation BNC : impôt sur le revenu à votre tranche (sans recalcul complet du
            barème) + 18,6 % de prélèvements sociaux, sans cotisation d&apos;indépendant et sans
            seuil de 305 €. Le micro-BNC (abattement de 34 %) n&apos;est pas calculé : pour des
            ventes de cryptos, l&apos;administration n&apos;a pas défini ce que sont ses « recettes ».
          </p>
        </div>
      )}

      {/* Décote (art. 197 CGI, revenus 2025 : 897 € / 1 483 € − 45,25 % de l'impôt brut) : à TMI 11 %, chaque euro ajouté coûte
          alors ≈ 16 % d'IR, plus que les 12,8 % du PFU ; le calcul « TMI × plus-value » l'ignore (05/10/2026). */}
      {result.regime === "bareme" && tmi <= 0.11 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-fg-max/90 flex gap-3">
          <Info
            className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
            aria-hidden="true"
          />
          <p>
            Estimation simplifiée : votre tranche est appliquée à toute la plus-value. Si elle vous
            fait changer de tranche, ou si votre impôt bénéficie de la <strong>décote</strong> (impôt
            brut inférieur à 1 982 € pour une personne seule, 3 277 € pour un couple, revenus 2025),
            l&apos;impôt réel au barème est plus élevé : à TMI 11 %, chaque euro ajouté coûte alors
            environ 16 %, plus que les 12,8 % du PFU. Vérifiez avec le simulateur d&apos;impots.gouv
            avant de cocher la case 3CN.
          </p>
        </div>
      )}

      <BreakdownTable result={result} inputs={inputs} />

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
      : "text-fg-max";
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
}: {
  result: ReturnType<typeof computeTax>;
  inputs: ResultInputs;
}) {
  const partPct = (result.partCedee * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return (
    <div className="overflow-x-auto">
      {result.methode === "tout_vendu" && inputs.achats > 0 && (
        <p className="mb-3 text-xs text-muted">
          Hypothèse : tout votre portefeuille a été vendu (fraction imputée = tout le prix
          d&apos;acquisition). Si vous n&apos;avez vendu qu&apos;une partie, renseignez la valeur
          globale du portefeuille au moment de la vente (ligne 212).
        </p>
      )}
      <table
        className="w-full text-sm"
        aria-label="Ventilation détaillée du calcul fiscal"
      >
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
            <th className="px-2 py-2 font-medium">Poste</th>
            <th className="px-2 py-2 font-medium text-right whitespace-nowrap">Montant</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          <Row label="Prix de cession (l. 213, brut)" value={inputs.cessions} />
          <Row label="Frais de cession (l. 214)" value={inputs.frais} />
          <Row label="Prix total d'acquisition du portefeuille (l. 220 − l. 221)" value={inputs.achats} />
          {result.methode === "prorata" && (
            <Row label="Valeur globale du portefeuille (l. 212)" value={inputs.valeur} />
          )}
          <Row
            label={
              result.methode === "prorata"
                ? `Fraction du prix d'acquisition imputée (${partPct} % du portefeuille cédé)`
                : "Fraction du prix d'acquisition imputée (tout vendu : 100 %)"
            }
            value={result.fractionAcquisition}
          />
          {result.regime === "bnc" && inputs.reports > 0 && (
            <Row label="Déficits BNC reportés (6 ans)" value={inputs.reports} />
          )}
          <Row
            label="Plus-value brute (l. 224 : cession nette de frais − fraction imputée)"
            value={result.plusValueBrute}
          />
          <Row
            label={result.regime === "bnc" ? "Bénéfice BNC imposable (estimation)" : "Plus-value nette imposable"}
            value={result.plusValueNette}
            emphasis
          />
          <Row label="Impôt sur le revenu" value={result.montantIR} negative />
          <Row
            label="Prélèvements sociaux 18,6 %"
            value={result.montantPS}
            negative
          />
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
    : "text-fg-max/90";
  const fontClass = emphasis ? "font-bold" : "";
  return (
    <tr>
      <td className={`px-2 py-2 ${fontClass} text-fg-max/85`}>{label}</td>
      <td
        className={`px-2 py-2 text-right font-mono whitespace-nowrap ${fontClass} ${colorClass}`}
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
        className="rounded-2xl border border-success/40 bg-success/10 p-5 text-sm text-fg-max/90 flex gap-3"
      >
        <CheckCircle2
          className="h-5 w-5 shrink-0 text-success mt-0.5"
          aria-hidden="true"
        />
        <div>
          <p>{message}</p>
          <a
            href="/lead-magnets/checklist-declaration-crypto-2026.pdf"
            download
            className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary-soft underline hover:text-primary-glow"
          >
            Télécharger la checklist (PDF)
          </a>
        </div>
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
            className="font-display font-bold text-fg-max"
          >
            La checklist Cerfa 2086 + déclaration 2042-C (PDF)
          </h4>
          <p className="mt-1 text-sm text-fg-max/75">
            Pas-à-pas pour reporter vos cessions sur les bons formulaires, avec
            les pièges à éviter. Gratuite, téléchargeable dès votre inscription.
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
              aria-required="true"
              autoComplete="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => onChange(e.target.value)}
              aria-invalid={state === "error"}
              aria-describedby={message ? "lead-msg" : undefined}
              disabled={state === "loading"}
              className="flex-1 rounded-xl bg-background border border-border px-4 py-3 text-fg-max
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
                  Obtenir la checklist
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
            En vous inscrivant, vous êtes inscrit à notre newsletter crypto FR (sans spam,
            désinscription en 1 clic). Vos données ne sont jamais revendues.
          </p>
        </div>
      </div>
    </section>
  );
}

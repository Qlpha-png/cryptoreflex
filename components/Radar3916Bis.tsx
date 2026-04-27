"use client";

/**
 * Radar3916Bis — Détecteur d'amendes 3916-bis pour exchanges crypto étrangers.
 *
 * Wizard 4 étapes :
 *  1. Sélection des exchanges utilisés (multi-select avec icones)
 *  2. Pour chaque exchange sélectionné : confirmation entité + année d'ouverture
 *  3. Récapitulatif : exposition financière (somme amendes potentielles)
 *  4. Instructions exactes pour déclarer sur impots.gouv.fr (rubrique 3916-bis)
 *
 * Conformité légale (BOI-CF-CPF-30-20 + CGI art. 1736 IV bis) :
 *  - Amende 1 500 € par compte non déclaré (pays coopératif)
 *  - Amende 10 000 € par compte non déclaré (pays non-coopératif : Seychelles, BVI, etc.)
 *  - Toute personne physique fiscalement domiciliée en France doit déclarer même si compte vide
 *
 * UX :
 *  - Pure CSS animations (pas de framer-motion)
 *  - Focus management entre steps
 *  - prefers-reduced-motion respecté
 *  - Local state seulement (pas d'envoi serveur en V1)
 *  - Possibilité d'imprimer / exporter le récapitulatif
 *
 * Anti-trompeur (DGCCRF L121-2) :
 *  - Disclaimer permanent : "outil d'aide, vérifie sur ton compte personnel"
 *  - Champs marqués "À vérifier" reproduits clairement dans le récap
 *  - Aucune affirmation que l'exchange EST tel pays sans warning de vérification
 *  - Lien officiel impots.gouv.fr fourni pour la déclaration finale
 */

import { useState, useEffect, useMemo, useId, useRef } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Info,
  ExternalLink,
  Printer,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import psanData from "@/data/psan-3916-bis.json";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Entity {
  label: string;
  legalName: string;
  address?: string;
  registrationNumber?: string;
  country: string;
  isNonCooperative: boolean;
  amendeRisque: number;
}

interface Exchange {
  id: string;
  name: string;
  logo: string;
  verifiedFields: string[];
  warning?: string;
  entities: Entity[];
  officialLegalUrl: string;
  instruction: string;
}

interface UserAccount {
  exchangeId: string;
  entityIndex: number;
  yearOpened: string; // "2021"
  declaredBefore: boolean;
}

const STEPS = ["Tes exchanges", "Détails comptes", "Récapitulatif", "Déclarer"] as const;

/* -------------------------------------------------------------------------- */
/*  Composant                                                                 */
/* -------------------------------------------------------------------------- */

export default function Radar3916Bis() {
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Record<string, UserAccount>>({});
  const headingId = useId();
  const stepRef = useRef<HTMLDivElement>(null);

  const exchanges = psanData.exchanges as Exchange[];

  // Focus le titre du step à chaque changement (a11y)
  useEffect(() => {
    if (stepRef.current) {
      stepRef.current.focus();
    }
  }, [step]);

  // Calcul de l'exposition totale aux amendes
  const exposure = useMemo(() => {
    let total = 0;
    let countCooperative = 0;
    let countNonCooperative = 0;
    selectedIds.forEach((id) => {
      const account = accounts[id];
      if (!account) return;
      const ex = exchanges.find((e) => e.id === id);
      const entity = ex?.entities[account.entityIndex];
      if (!entity) return;
      if (!account.declaredBefore) {
        total += entity.amendeRisque;
        if (entity.isNonCooperative) countNonCooperative++;
        else countCooperative++;
      }
    });
    return { total, countCooperative, countNonCooperative };
  }, [selectedIds, accounts, exchanges]);

  const canGoNext = useMemo(() => {
    if (step === 0) return selectedIds.length > 0;
    if (step === 1) {
      // Tous les comptes sélectionnés ont leurs détails remplis
      return selectedIds.every((id) => accounts[id]?.yearOpened);
    }
    return true;
  }, [step, selectedIds, accounts]);

  /* ------------------------------------------------------------------ */
  /*  Step Handlers                                                      */
  /* ------------------------------------------------------------------ */

  const toggleExchange = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        // Cleanup orphan accounts
        setAccounts((acc) => {
          const newAcc = { ...acc };
          delete newAcc[id];
          return newAcc;
        });
        return next;
      }
      // Default entity = première entité disponible
      const ex = exchanges.find((e) => e.id === id);
      if (ex) {
        setAccounts((acc) => ({
          ...acc,
          [id]: {
            exchangeId: id,
            entityIndex: 0,
            yearOpened: "",
            declaredBefore: false,
          },
        }));
      }
      return [...prev, id];
    });
  };

  const updateAccount = (id: string, patch: Partial<UserAccount>) => {
    setAccounts((acc) => ({
      ...acc,
      [id]: { ...acc[id], ...patch },
    }));
  };

  const reset = () => {
    setStep(0);
    setSelectedIds([]);
    setAccounts({});
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <section
      aria-labelledby={headingId}
      className="glass rounded-2xl border border-border overflow-hidden"
    >
      {/* Header avec progress steps */}
      <header className="border-b border-border bg-elevated/40 px-5 sm:px-6 py-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-warning/15 text-warning border border-warning/30">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id={headingId}
                className="text-lg font-extrabold text-fg leading-tight"
              >
                Radar 3916-bis
              </h2>
              <p className="text-xs text-muted">
                Détecte tes amendes potentielles en 2 minutes
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <ol className="flex items-center gap-1 text-xs" aria-label="Étapes">
            {STEPS.map((label, idx) => (
              <li key={label} className="flex items-center gap-1">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums ${
                    idx === step
                      ? "bg-primary text-elevated border-primary"
                      : idx < step
                      ? "bg-success/20 text-success border-success/40"
                      : "bg-elevated text-muted border-border"
                  }`}
                  aria-current={idx === step ? "step" : undefined}
                >
                  {idx < step ? "✓" : idx + 1}
                </span>
                {idx < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`h-px w-3 sm:w-6 ${
                      idx < step ? "bg-success/40" : "bg-border"
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </header>

      {/* Step content */}
      <div
        ref={stepRef}
        tabIndex={-1}
        className="p-5 sm:p-6 focus:outline-none"
        aria-live="polite"
      >
        {step === 0 && (
          <Step1Exchanges
            exchanges={exchanges}
            selectedIds={selectedIds}
            onToggle={toggleExchange}
          />
        )}
        {step === 1 && (
          <Step2Details
            exchanges={exchanges.filter((e) => selectedIds.includes(e.id))}
            accounts={accounts}
            onUpdate={updateAccount}
          />
        )}
        {step === 2 && (
          <Step3Recap
            exchanges={exchanges.filter((e) => selectedIds.includes(e.id))}
            accounts={accounts}
            exposure={exposure}
            onPrint={handlePrint}
          />
        )}
        {step === 3 && (
          <Step4Declare
            exchanges={exchanges.filter((e) => selectedIds.includes(e.id))}
            accounts={accounts}
          />
        )}
      </div>

      {/* Footer navigation */}
      <footer className="border-t border-border bg-elevated/40 px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (step === 0 ? reset() : setStep((s) => s - 1))}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg transition-colors min-h-[44px] px-2"
        >
          {step === 0 ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Réinitialiser
            </>
          ) : (
            <>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Précédent
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted hidden sm:inline">
            Étape {step + 1} sur {STEPS.length}
          </span>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canGoNext}
              className="btn-primary min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={reset}
              className="btn-primary min-h-[44px]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Refaire un check
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 1 — Sélection des exchanges                                          */
/* -------------------------------------------------------------------------- */

function Step1Exchanges({
  exchanges,
  selectedIds,
  onToggle,
}: {
  exchanges: Exchange[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-base font-bold text-fg mb-1">
        Sur quels exchanges as-tu eu un compte ?
      </h3>
      <p className="text-sm text-fg/70 mb-5">
        Sélectionne <strong>tous les exchanges</strong> où tu as ouvert un compte
        (même fermé, même vide). Le 3916-bis doit être déclaré pour chacun.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {exchanges.map((ex) => {
          const isSelected = selectedIds.includes(ex.id);
          const hasNonCoop = ex.entities.some((e) => e.isNonCooperative);
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => onToggle(ex.id)}
              aria-pressed={isSelected}
              className={`relative rounded-xl border p-3 text-left min-h-[80px] transition-all hover:border-primary/40 ${
                isSelected
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_rgba(255,196,64,0.2)]"
                  : "border-border bg-elevated/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-sm text-fg">{ex.name}</span>
                {isSelected && (
                  <CheckCircle2
                    className="h-4 w-4 text-primary shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>
              {hasNonCoop && (
                <span
                  className="mt-1 inline-flex items-center gap-1 text-[10px] text-warning font-semibold"
                  title="Pays non-coopératif possible : amende 10 000 € si non déclaré"
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  Risque 10 k€
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-muted flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        Aucune donnée n&apos;est envoyée sur internet — tout reste dans ton
        navigateur. Tu peux fermer la fenêtre, rien n&apos;est sauvegardé.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 2 — Détails par compte                                               */
/* -------------------------------------------------------------------------- */

function Step2Details({
  exchanges,
  accounts,
  onUpdate,
}: {
  exchanges: Exchange[];
  accounts: Record<string, UserAccount>;
  onUpdate: (id: string, patch: Partial<UserAccount>) => void;
}) {
  return (
    <div>
      <h3 className="text-base font-bold text-fg mb-1">
        Précise tes comptes
      </h3>
      <p className="text-sm text-fg/70 mb-5">
        Pour chaque exchange, sélectionne l&apos;entité contractante (regarde
        sur tes anciens emails de bienvenue ou tes Mentions Légales) et
        l&apos;année d&apos;ouverture.
      </p>

      <ul className="space-y-3">
        {exchanges.map((ex) => {
          const account = accounts[ex.id];
          if (!account) return null;

          return (
            <li
              key={ex.id}
              className="rounded-xl border border-border bg-elevated/30 p-4"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="font-bold text-sm text-fg">{ex.name}</h4>
                <a
                  href={ex.officialLegalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary-soft hover:text-primary inline-flex items-center gap-1 underline"
                >
                  Mentions légales
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>

              {ex.warning && (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 p-2.5 text-xs text-warning-fg">
                  <AlertCircle
                    className="h-4 w-4 text-warning shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="leading-relaxed">{ex.warning}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs">
                  <span className="block font-semibold text-fg/80 mb-1.5">
                    Entité contractante
                  </span>
                  <select
                    value={account.entityIndex}
                    onChange={(e) =>
                      onUpdate(ex.id, { entityIndex: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-fg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  >
                    {ex.entities.map((entity, idx) => (
                      <option key={idx} value={idx}>
                        {entity.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs">
                  <span className="block font-semibold text-fg/80 mb-1.5">
                    Année d&apos;ouverture
                  </span>
                  <select
                    value={account.yearOpened}
                    onChange={(e) =>
                      onUpdate(ex.id, { yearOpened: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-fg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  >
                    <option value="">— Choisir —</option>
                    {Array.from({ length: 12 }, (_, i) => 2026 - i).map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-3 flex items-start gap-2 text-xs text-fg/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={account.declaredBefore}
                  onChange={(e) =>
                    onUpdate(ex.id, { declaredBefore: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border bg-elevated text-primary focus-visible:ring-primary/50"
                />
                <span>
                  J&apos;ai déjà déclaré ce compte sur le 3916-bis les années
                  précédentes
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 3 — Récapitulatif (exposition financière)                           */
/* -------------------------------------------------------------------------- */

function Step3Recap({
  exchanges,
  accounts,
  exposure,
  onPrint,
}: {
  exchanges: Exchange[];
  accounts: Record<string, UserAccount>;
  exposure: { total: number; countCooperative: number; countNonCooperative: number };
  onPrint: () => void;
}) {
  const undeclared = exchanges.filter(
    (ex) => !accounts[ex.id]?.declaredBefore
  );
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="print:text-fg print:bg-white">
      {/* Hero exposition */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 mb-5 ${
          exposure.total === 0
            ? "border-success/40 bg-success/10"
            : exposure.total >= 10000
            ? "border-danger/40 bg-danger/10"
            : "border-warning/40 bg-warning/10"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
          Exposition financière estimée
        </p>
        <p
          className={`text-4xl sm:text-5xl font-extrabold font-mono tabular-nums ${
            exposure.total === 0
              ? "text-success"
              : exposure.total >= 10000
              ? "text-danger"
              : "text-warning-fg"
          }`}
        >
          {fmt(exposure.total)} €
        </p>
        <p className="mt-2 text-sm text-fg/80">
          {exposure.total === 0
            ? "Aucune amende potentielle — bravo, tu es à jour."
            : `Amende potentielle si ${exposure.countCooperative + exposure.countNonCooperative} compte(s) restent non déclaré(s).`}
        </p>

        {(exposure.countCooperative > 0 || exposure.countNonCooperative > 0) && (
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {exposure.countCooperative > 0 && (
              <li className="rounded-lg bg-elevated/60 border border-border p-2.5">
                <span className="font-bold text-fg">
                  {exposure.countCooperative} compte(s)
                </span>{" "}
                pays coopératif → {fmt(exposure.countCooperative * 1500)} € (1
                500 €/compte)
              </li>
            )}
            {exposure.countNonCooperative > 0 && (
              <li className="rounded-lg bg-danger/10 border border-danger/30 p-2.5">
                <span className="font-bold text-danger">
                  {exposure.countNonCooperative} compte(s)
                </span>{" "}
                pays NON-coopératif →{" "}
                {fmt(exposure.countNonCooperative * 10000)} € (10 000 €/compte)
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Liste détaillée */}
      <h3 className="text-base font-bold text-fg mb-3">
        Détail de tes {exchanges.length} compte(s)
      </h3>
      <ul className="space-y-2">
        {exchanges.map((ex) => {
          const account = accounts[ex.id];
          if (!account) return null;
          const entity = ex.entities[account.entityIndex];
          if (!entity) return null;

          return (
            <li
              key={ex.id}
              className={`rounded-xl border p-3 sm:p-4 ${
                account.declaredBefore
                  ? "border-success/40 bg-success/5"
                  : "border-border bg-elevated/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-fg">{ex.name}</span>
                    {entity.isNonCooperative && (
                      <span className="text-[10px] font-bold uppercase rounded-full bg-danger/15 text-danger border border-danger/30 px-2 py-0.5">
                        Non-coopératif
                      </span>
                    )}
                    {account.declaredBefore && (
                      <span className="text-[10px] font-bold uppercase rounded-full bg-success/15 text-success border border-success/30 px-2 py-0.5">
                        Déjà déclaré
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-fg/70 mt-1">
                    {entity.label} · Pays&nbsp;: {entity.country} · Ouvert
                    en&nbsp;{account.yearOpened || "—"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Entité&nbsp;: {entity.legalName}
                  </p>
                </div>
                {!account.declaredBefore && (
                  <span
                    className={`text-sm font-mono tabular-nums font-extrabold whitespace-nowrap ${
                      entity.isNonCooperative ? "text-danger" : "text-warning-fg"
                    }`}
                  >
                    {fmt(entity.amendeRisque)} €
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {undeclared.length > 0 && (
        <div className="mt-5 flex items-center justify-end print:hidden">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-soft hover:text-primary border border-border rounded-lg px-3 py-2 hover:bg-elevated/60 transition-colors min-h-[44px]"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimer / Sauvegarder en PDF
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-muted leading-relaxed">
        <strong className="text-fg">Source légale :</strong>{" "}
        {psanData.legal.boi} · {psanData.legal.cgi}. Le calcul d&apos;exposition
        est indicatif et basé sur les informations publiquement disponibles. Tu
        restes responsable de ta déclaration finale.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 4 — Instructions impots.gouv.fr                                      */
/* -------------------------------------------------------------------------- */

function Step4Declare({
  exchanges,
  accounts,
}: {
  exchanges: Exchange[];
  accounts: Record<string, UserAccount>;
}) {
  const undeclared = exchanges.filter(
    (ex) => !accounts[ex.id]?.declaredBefore
  );

  if (undeclared.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success border border-success/30 mb-4">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-extrabold text-fg mb-2">
          Tu es à jour !
        </h3>
        <p className="text-sm text-fg/70 max-w-md mx-auto">
          Tous tes comptes ont déjà été déclarés les années précédentes.
          N&apos;oublie pas de les redéclarer chaque année tant qu&apos;ils sont
          ouverts (même vides).
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-base font-bold text-fg mb-1">
        Comment déclarer sur impots.gouv.fr
      </h3>
      <p className="text-sm text-fg/70 mb-5">
        Voici les étapes exactes à suivre pour déclarer tes{" "}
        <strong>{undeclared.length} compte(s)</strong> avant la deadline (mai-juin
        2026 typiquement).
      </p>

      <ol className="space-y-3">
        {[
          {
            title: "Connecte-toi à impots.gouv.fr",
            text: "Avec ton numéro fiscal et mot de passe (ou FranceConnect).",
            link: "https://www.impots.gouv.fr/accueil",
            linkLabel: "Ouvrir impots.gouv.fr",
          },
          {
            title: "Accède à ta déclaration de revenus",
            text: "Onglet « Déclarer mes revenus ». Sur la 1ère page de la déclaration, coche la case « Comptes ouverts, détenus, utilisés ou clos à l'étranger » (case 8UU).",
          },
          {
            title: "Remplis un formulaire 3916-bis par compte",
            text: `Pour chacun de tes ${undeclared.length} compte(s), tu remplis un formulaire séparé avec : nom de l'établissement, adresse, n° d'identification, date d'ouverture, date de clôture (si applicable).`,
          },
          {
            title: "Reporte les infos depuis ton récap Cryptoreflex",
            text: "Utilise le récapitulatif que tu viens de générer (étape précédente) — il contient toutes les infos nécessaires.",
          },
          {
            title: "Valide et imprime ton accusé de réception",
            text: "Après validation, télécharge l'accusé de réception PDF. Garde-le 6 ans (durée de prescription fiscale).",
          },
        ].map((s, idx) => (
          <li
            key={s.title}
            className="rounded-xl border border-border bg-elevated/40 p-4"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-bold tabular-nums"
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-fg">{s.title}</p>
                <p className="mt-1 text-xs text-fg/70 leading-relaxed">
                  {s.text}
                </p>
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-primary underline"
                  >
                    {s.linkLabel}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-xl bg-warning/10 border border-warning/30 p-4 text-xs text-warning-fg leading-relaxed">
        <p className="flex items-start gap-2">
          <AlertTriangle
            className="h-4 w-4 text-warning shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>
            <strong>Rappel légal :</strong> l&apos;obligation de déclarer
            s&apos;applique chaque année tant que le compte est ouvert, même
            sans mouvement. La prescription fiscale est de 6 ans (10 ans pour
            les comptes en pays non-coopératif). Si tu as oublié de déclarer
            sur les années passées, une régularisation spontanée auprès de la
            DGFiP est généralement traitée plus favorablement qu&apos;un
            redressement.
          </span>
        </p>
      </div>
    </div>
  );
}

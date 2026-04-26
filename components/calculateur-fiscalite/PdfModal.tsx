"use client";

/**
 * <PdfModal /> — Email gate pour le téléchargement du PDF de simulation.
 *
 * Flow client en 3 étapes :
 *   1. "form" : input email + bouton "Continuer".
 *   2. "loading" : POST /api/calculateur-pdf-lead (Beehiiv subscribe + KV store
 *      + Resend email).
 *   3. "success" : confirmation + bouton "Voir et imprimer mon PDF" qui ouvre
 *      `/outils/calculateur-fiscalite/preview-pdf/[sessionId]` dans un nouvel
 *      onglet (l'utilisateur déclenche window.print() depuis cette page via le
 *      CTA flottant).
 *
 * Accessibilité :
 *   - role="dialog", aria-modal="true", aria-labelledby pointant sur le H2.
 *   - Focus trap minimal (focus initial sur le champ email, Escape ferme).
 *   - Bouton de fermeture libellé.
 *
 * Privacy : message explicite RGPD, désinscription en 1 clic.
 */

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  X,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { track } from "@/lib/analytics";
import type { FiscaliteInput, FiscaliteResult } from "@/lib/fiscalite";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface PdfModalProps {
  open: boolean;
  onClose: () => void;
  /** Inputs + résultat à snapshotter dans le PDF. */
  input: FiscaliteInput;
  result: FiscaliteResult;
}

type Step = "form" | "loading" | "success" | "error";

export default function PdfModal({
  open,
  onClose,
  input,
  result,
}: PdfModalProps) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ------------- Reset state à chaque ouverture ------------- */
  useEffect(() => {
    if (open) {
      setStep("form");
      setErrorMsg("");
      setSessionId(null);
      // Focus initial sur le champ email (UX + a11y)
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  /* ------------- Escape pour fermer + focus trap minimal ------------- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* ------------- Lock scroll en arrière-plan ------------- */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  /* ------------- Submit ------------- */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      setStep("error");
      setErrorMsg("Adresse email invalide.");
      return;
    }

    setStep("loading");
    try {
      const res = await fetch("/api/calculateur-pdf-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          calculationData: { input, result },
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        sessionId?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.sessionId) {
        setStep("error");
        setErrorMsg(data.error || "Une erreur est survenue. Réessaie.");
        return;
      }
      setSessionId(data.sessionId);
      setStep("success");

      // Tracking Plausible — tier dérivé du montant impôt total
      const tier =
        result.impotTotal <= 100
          ? "petit"
          : result.impotTotal <= 1000
          ? "moyen"
          : "gros";
      track("calc-pdf-download", {
        tool: "tax-calculator-fr",
        regime: result.regime,
        tier,
      });
    } catch (err) {
      setStep("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Erreur réseau. Réessaie.",
      );
    }
  }

  /* ------------- Open preview ------------- */
  function handleOpenPreview() {
    if (!sessionId) return;
    const url = `/outils/calculateur-fiscalite/preview-pdf/${sessionId}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  /* ------------- Render ------------- */
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.18s_ease-out]"
      onClick={(e) => {
        // Click backdrop → close (sauf si dans la modal)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="glass glow-border relative w-full max-w-md rounded-2xl p-6 sm:p-7 animate-[slideUp_0.22s_ease-out]"
      >
        {/* Bouton fermer */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
          className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* ============================ STEP : FORM / ERROR ============================ */}
        {(step === "form" || step === "error") && (
          <>
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-soft"
                aria-hidden="true"
              >
                <FileText className="h-5 w-5 text-background" />
              </div>
              <div className="flex-1">
                <h2
                  id="pdf-modal-title"
                  className="font-display text-lg font-bold text-white"
                >
                  Télécharge ta simulation en PDF
                </h2>
                <p className="mt-1 text-sm text-white/75">
                  Reçois ta simulation par email + nos{" "}
                  <strong className="text-primary-soft">5 conseils fiscalité crypto</strong>{" "}
                  (gratuits).
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3" noValidate>
              <label htmlFor="pdf-modal-email" className="sr-only">
                Adresse email
              </label>
              <input
                ref={inputRef}
                id="pdf-modal-email"
                type="email"
                required
                autoComplete="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={step === "error"}
                aria-describedby={errorMsg ? "pdf-modal-msg" : undefined}
                className="w-full rounded-xl bg-background border border-border px-4 py-3 text-white placeholder-muted focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {step === "error" && errorMsg && (
                <p
                  id="pdf-modal-msg"
                  role="alert"
                  className="text-sm text-danger-fg flex items-center gap-1.5"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {errorMsg}
                </p>
              )}
              <button type="submit" className="btn-primary w-full">
                Continuer
                <Mail className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] text-white/60">
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-primary-soft mt-0.5"
                aria-hidden="true"
              />
              <p>
                Ton email reste confidentiel. Utilisé uniquement pour cette
                simulation et notre newsletter mensuelle. Désinscription en 1
                clic, données jamais revendues.
              </p>
            </div>
          </>
        )}

        {/* ============================ STEP : LOADING ============================ */}
        {step === "loading" && (
          <div className="py-6 text-center">
            <Loader2
              className="mx-auto h-10 w-10 animate-spin text-primary-soft"
              aria-hidden="true"
            />
            <h2
              id="pdf-modal-title"
              className="mt-4 font-display text-lg font-bold text-white"
            >
              Préparation de ta simulation…
            </h2>
            <p className="mt-1 text-sm text-white/70">
              On enregistre ton calcul et on t'envoie un récap par email.
            </p>
          </div>
        )}

        {/* ============================ STEP : SUCCESS ============================ */}
        {step === "success" && (
          <div className="py-2 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success"
              aria-hidden="true"
            >
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2
              id="pdf-modal-title"
              className="mt-4 font-display text-lg font-bold text-white"
            >
              C'est prêt !
            </h2>
            <p className="mt-1 text-sm text-white/75">
              Ta simulation et nos 5 conseils arrivent dans ta boîte mail.
              Ouvre l'aperçu pour l'imprimer en PDF.
            </p>
            <button
              type="button"
              onClick={handleOpenPreview}
              className="btn-primary mt-5 w-full"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Voir et imprimer mon PDF
            </button>
            <p className="mt-3 text-[11px] text-muted">
              S'ouvre dans un nouvel onglet — utilise « Imprimer » puis
              « Enregistrer en PDF ».
            </p>
          </div>
        )}

        {/* Animations keyframes (scope-local via global pour Tailwind animate-[]) */}
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
`,
          }}
        />
      </div>
    </div>
  );
}

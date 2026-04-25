"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/**
 * NewsletterModal — version contrôlée du NewsletterPopup.
 *
 * Différence majeure avec NewsletterPopup :
 *  - Pas d'auto-déclenchement (exit-intent / scroll). Le parent décide quand ouvrir.
 *  - Reçoit `open` + `onClose` en props (composant 100% contrôlé).
 *  - Utilisé notamment par <MobileStickyBar /> sur le bouton "Newsletter".
 *
 * Lead magnet identique au popup pour cohérence (même PDF, même messaging).
 */

const COOKIE_SUBSCRIBED = "cr_newsletter_subscribed";
const LEAD_MAGNET_URL = "/lead-magnets/guide-plateformes-crypto-2026.pdf";

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const maxAge = Math.round(days * 86400);
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

interface NewsletterModalProps {
  open: boolean;
  onClose: () => void;
  /** Source de tracking (ex: "mobile-bar", "footer-cta"). Défaut: "modal". */
  source?: string;
}

export default function NewsletterModal({
  open,
  onClose,
  source = "modal",
}: NewsletterModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap minimal + Escape pour fermer.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset du formulaire à chaque ouverture (évite état persistant).
  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrorMsg("");
    }
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setErrorMsg("Adresse email invalide.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source,
          utm: { source: "cryptoreflex", medium: source, campaign: "lead-magnet-pdf" },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Une erreur est survenue. Réessaie.");
        return;
      }

      setStatus("success");
      setCookie(COOKIE_SUBSCRIBED, "1", 365);
    } catch {
      setStatus("error");
      setErrorMsg("Service indisponible. Réessaie plus tard.");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nl-modal-title"
        tabIndex={-1}
        className="relative max-w-lg w-full glass rounded-2xl p-6 sm:p-8 outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>

        {status !== "success" ? (
          <>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-6 w-6" />
            </span>

            <h2
              id="nl-modal-title"
              className="mt-4 text-xl sm:text-2xl font-extrabold text-fg leading-tight"
            >
              Reçois le <span className="gradient-text">guide PDF gratuit</span>
            </h2>

            <p className="mt-2 text-sm text-fg/80">
              <strong className="text-fg">"Les 10 plateformes crypto à utiliser en France
              en 2026"</strong> — comparatif complet, frais réels, statut MiCA, fiabilité.
              Envoyé après inscription à la newsletter (3 min/jour).
            </p>

            <ul className="mt-4 space-y-1.5 text-sm text-fg/75">
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                Frais réels comparés (sans le marketing)
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                Plateformes enregistrées AMF / MiCA-compliant
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                Méthode pas-à-pas pour ta première crypto
              </li>
            </ul>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3" noValidate>
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="ton.email@exemple.com"
                aria-label="Adresse email"
                aria-invalid={status === "error"}
                disabled={status === "loading"}
                className="rounded-xl bg-background border border-border px-4 py-3 text-fg
                           placeholder:text-muted focus:outline-none focus:border-primary/60
                           focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Inscription…" : (
                  <>
                    <Download className="h-4 w-4" />
                    Recevoir le guide gratuit
                  </>
                )}
              </button>
            </form>

            {status === "error" && (
              <p role="alert" className="mt-3 text-xs text-accent-rose inline-flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {errorMsg}
              </p>
            )}

            <p className="mt-4 text-[11px] text-muted flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Sans spam — désinscription en 1 clic. RGPD-compliant.
            </p>
          </>
        ) : (
          <>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-green/15 text-accent-green">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-xl sm:text-2xl font-extrabold text-fg">
              Parfait ! Voici ton guide.
            </h2>
            <p className="mt-2 text-sm text-fg/80">
              Confirmation envoyée à <strong>{email}</strong>. Tu peux télécharger le PDF
              tout de suite :
            </p>
            <a
              href={LEAD_MAGNET_URL}
              download
              className="btn-primary w-full mt-5 justify-center"
              onClick={() => setTimeout(onClose, 400)}
            >
              <Download className="h-4 w-4" />
              Télécharger le guide PDF
            </a>
          </>
        )}
      </div>
    </div>
  );
}

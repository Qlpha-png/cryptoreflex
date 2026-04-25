"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
} from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * NewsletterInline — formulaire compact, droppable n'importe où.
 *
 * Usages :
 *  - Sidebar d'article
 *  - Bas d'article ("Tu as aimé ? Reçois la suite par email")
 *  - Footer
 *  - Page outils (juste après un calculateur)
 *
 * Props :
 *  - source : tracking analytics (vers Beehiiv UTM campaign)
 *  - variant : "default" (carte glass) | "minimal" (juste le form)
 *  - title / subtitle : override du copy par défaut
 *  - leadMagnet : si true, mentionne le PDF en bonus
 *
 * États : idle -> loading -> (success | error)
 * Le "success" affiche une pop-in (overlay) avec lien direct vers le PDF.
 */

type Variant = "default" | "minimal";

interface NewsletterInlineProps {
  source?: "blog-cta" | "footer" | "inline" | "newsletter-page";
  variant?: Variant;
  title?: string;
  subtitle?: string;
  leadMagnet?: boolean;
  ctaLabel?: string;
}

const LEAD_MAGNET_URL = "/lead-magnets/guide-plateformes-crypto-2026.pdf";

export default function NewsletterInline({
  source = "inline",
  variant = "default",
  title = "La newsletter quotidienne crypto FR",
  subtitle = "3 infos crypto qui comptent, en 3 minutes, chaque matin.",
  leadMagnet = true,
  ctaLabel = "S'abonner",
}: NewsletterInlineProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPopin, setShowPopin] = useState(false);
  // FIX P0 audit-fonctionnel-live-final #3 : flag mocked renvoyé par l'API.
  const [mocked, setMocked] = useState(false);
  const popinRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

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
          utm: { source: "cryptoreflex", medium: "website", campaign: source },
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        mocked?: boolean;
      };

      if (!res.ok || !json.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Une erreur est survenue. Réessaie dans un instant.");
        return;
      }

      setStatus("success");
      setShowPopin(true);
      // FIX P0 audit-fonctionnel-live-final #3 : si mocked, pas de cookie
      // (l'utilisateur doit pouvoir se ré-inscrire quand l'infra sera prête)
      // et on track un event dédié pour comptabiliser ces leads en attente.
      if (json.mocked) {
        setMocked(true);
        track("Newsletter Signup Mocked", { source });
      } else {
        setMocked(false);
        // Marque le succès en cookie pour la logique de NewsletterPopup (no double-prompt)
        try {
          document.cookie = "cr_newsletter_subscribed=1; path=/; max-age=31536000; samesite=lax";
        } catch {
          /* SSR-safe */
        }
      }
    } catch {
      setStatus("error");
      setErrorMsg("Service indisponible. Réessaie plus tard.");
    }
  }

  // Focus management : quand la pop-in s'ouvre, on déplace le focus dessus
  useEffect(() => {
    if (showPopin && popinRef.current) {
      popinRef.current.focus();
    }
  }, [showPopin]);

  // Esc pour fermer la pop-in
  useEffect(() => {
    if (!showPopin) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPopin(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPopin]);

  const wrapperClass =
    variant === "default"
      ? "glass rounded-2xl p-5 sm:p-6"
      : "bg-transparent";

  return (
    <>
      <div className={wrapperClass}>
        {variant === "default" && (
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-fg leading-tight truncate">{title}</h3>
              <p className="text-xs text-muted">{subtitle}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2" noValidate>
          <label htmlFor={`nl-inline-${source}`} className="sr-only">
            Adresse email
          </label>
          <input
            id={`nl-inline-${source}`}
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
            aria-describedby={status === "error" ? `nl-inline-err-${source}` : undefined}
            disabled={status === "loading" || status === "success"}
            className="flex-1 min-w-0 rounded-xl bg-background border border-border px-4 py-2.5 text-sm text-fg
                       placeholder:text-muted focus:outline-none focus:border-primary/60
                       focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="btn-primary text-sm py-2.5 px-4 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            {status === "loading" ? "…" : ctaLabel}
            {status !== "loading" && status !== "success" && (
              <ArrowRight className="h-4 w-4" />
            )}
            {status === "success" && <CheckCircle2 className="h-4 w-4" />}
          </button>
        </form>

        {leadMagnet && variant === "default" && status === "idle" && (
          <p className="mt-3 text-xs text-muted">
            <span className="text-primary-soft font-medium">Bonus :</span> guide PDF
            "10 plateformes crypto à utiliser en France 2026" à l'inscription.
          </p>
        )}

        {status === "error" && (
          <p
            id={`nl-inline-err-${source}`}
            role="alert"
            className="mt-2 text-xs text-accent-rose inline-flex items-center gap-1.5"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {errorMsg}
          </p>
        )}

        {status === "success" && !showPopin && (
          <p
            className={`mt-2 text-xs inline-flex items-center gap-1.5 ${
              mocked ? "text-amber-300" : "text-accent-green"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {mocked
              ? "Email noté — newsletter en cours de configuration."
              : "Inscription confirmée — vérifie ta boîte mail."}
          </p>
        )}
      </div>

      {/* Pop-in succès — overlay accessible (role=dialog, focus trap basique) */}
      {showPopin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-up"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPopin(false);
          }}
          role="presentation"
        >
          <div
            ref={popinRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nl-popin-title"
            tabIndex={-1}
            className="relative max-w-md w-full glass rounded-2xl p-6 sm:p-8 outline-none"
          >
            <button
              type="button"
              onClick={() => setShowPopin(false)}
              aria-label="Fermer"
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-green/15 text-accent-green">
              <CheckCircle2 className="h-6 w-6" />
            </span>

            {/* FIX P0 audit-fonctionnel-live-final #3 : copy honnête en mode mocked. */}
            <h2 id="nl-popin-title" className="mt-4 text-xl sm:text-2xl font-extrabold text-fg">
              {mocked ? "Email bien noté" : "Bienvenue à bord !"}
            </h2>

            <p className="mt-2 text-sm text-fg/75">
              {mocked ? (
                <>
                  Newsletter en cours de configuration — ton email{" "}
                  <strong>{email}</strong> a été noté côté Cryptoreflex, on te
                  recontactera dès que c&apos;est prêt. En attendant, télécharge
                  ton guide :
                </>
              ) : (
                <>
                  Un email de confirmation est en route vers <strong>{email}</strong>.
                  Pendant ce temps, télécharge ton guide PDF :
                </>
              )}
            </p>

            <a
              href={LEAD_MAGNET_URL}
              download
              className="btn-primary w-full mt-5 justify-center"
              onClick={() => {
                // Petit délai puis ferme la pop-in pour ne pas bloquer la nav
                setTimeout(() => setShowPopin(false), 300);
              }}
            >
              <Download className="h-4 w-4" />
              Télécharger le guide (PDF, 1.2 Mo)
            </a>

            <p className="mt-3 text-xs text-muted text-center">
              Pas reçu l'email après 5 min ? Vérifie tes spams.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

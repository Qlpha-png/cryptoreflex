"use client";

import { useEffect, useState, FormEvent } from "react";
import { Mail, X, CheckCircle2, AlertCircle } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * NewsletterStickyBar — barre flottante mobile-first (md:hidden) qui apparait
 * apres un seuil temps OU scroll. Pensee comme un canal de capture passive
 * complementaire au popup exit-intent et aux NewsletterInline en bas d'article.
 *
 * Pourquoi un composant separe de MobileStickyBar ?
 *  - MobileStickyBar = nav contextuelle (Lire / Plateformes / Newsletter modal)
 *  - NewsletterStickyBar = formulaire inline 1-clic, optimise pour conversion
 *    (l'utilisateur n'a pas a ouvrir une modale supplementaire)
 *  - Permet d'A/B-tester ou desactiver independamment via env var / flag.
 *
 * Triggers :
 *  - Apparition apres 30 secondes sur la page OU 50 % de scroll (ce qui arrive en premier)
 *  - Dismiss persistant 7 jours via localStorage (cle: cr_nl_sticky_dismiss_until)
 *  - Hide definitif si cookie cr_newsletter_subscribed=1 (deja inscrit)
 *  - Hide sur /newsletter et /merci (pas de double prompt)
 *
 * Conformite RGPD :
 *  - Mention "desabonnement 1 clic" visible
 *  - Email envoye a /api/newsletter/subscribe (consentement explicite par submit)
 *  - localStorage non-tracking (pas de PII), juste un timestamp de dismiss.
 */

const DISMISS_KEY = "cr_nl_sticky_dismiss_until";
const DISMISS_DAYS = 7;
const SHOW_AFTER_MS = 30_000;
const SCROLL_THRESHOLD = 0.5;
const SUPPRESSED_PATHS = ["/newsletter", "/merci"];

function isAlreadySubscribed(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|; )cr_newsletter_subscribed=1(?:;|$)/.test(document.cookie);
}

function isDismissActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const until = parseInt(window.localStorage.getItem(DISMISS_KEY) ?? "0", 10);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function persistDismiss() {
  if (typeof window === "undefined") return;
  try {
    const until = Date.now() + DISMISS_DAYS * 86_400_000;
    window.localStorage.setItem(DISMISS_KEY, String(until));
  } catch {
    /* localStorage indisponible (mode prive) — silent fallback */
  }
}

export default function NewsletterStickyBar() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Suppression precoce : path bloque, deja inscrit, ou dismiss actif.
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (SUPPRESSED_PATHS.some((p) => path.startsWith(p))) return;
    if (isAlreadySubscribed()) return;
    if (isDismissActive()) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let opened = false;

    const openOnce = () => {
      if (opened) return;
      opened = true;
      setOpen(true);
      track("Newsletter Sticky Shown", { path });
    };

    // Trigger 1 : timer 30 sec.
    timeoutId = setTimeout(openOnce, SHOW_AFTER_MS);

    // Trigger 2 : scroll 50 %.
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      const ratio = window.scrollY / docH;
      if (ratio >= SCROLL_THRESHOLD) openOnce();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const onDismiss = () => {
    setOpen(false);
    persistDismiss();
    track("Newsletter Sticky Dismissed", {});
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setErrorMsg("Email invalide.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: "sticky-bar-mobile",
          utm: { source: "cryptoreflex", medium: "sticky-bar", campaign: "mobile-bottom" },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        mocked?: boolean;
      };
      if (!res.ok || !json.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Erreur. Reessaie.");
        return;
      }
      setStatus("success");
      track("Newsletter Sticky Subscribed", { mocked: !!json.mocked });
      // Pose le cookie d'inscription si non mocked → suppression future legitime.
      if (!json.mocked) {
        try {
          document.cookie =
            "cr_newsletter_subscribed=1; path=/; max-age=31536000; samesite=lax";
        } catch {
          /* SSR-safe */
        }
      }
      // Auto-close apres 3 sec sur succes.
      setTimeout(() => setOpen(false), 3_000);
    } catch {
      setStatus("error");
      setErrorMsg("Service indisponible.");
    }
  };

  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="Inscription newsletter rapide"
      // Audit mobile 26/04/2026 : caché sur écrans courts (<640px de hauteur)
      // pour ne pas empiler 3 bandeaux (cookies + newsletter + sticky bar) qui
      // mangeaient ~25 % du viewport sur petit smartphone. La règle
      // `[@media(max-height:640px)]:hidden` est une syntaxe arbitraire Tailwind
      // qui s'applique sans avoir à configurer un breakpoint custom.
      className="md:hidden [@media(max-height:640px)]:hidden fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.4)] animate-fade-in-up"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 text-fg">
            <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold leading-tight">
              Recois la newsletter quotidienne
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fermer la barre newsletter"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-fg hover:bg-elevated"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {status !== "success" ? (
          <form onSubmit={onSubmit} className="flex gap-2" noValidate>
            <label htmlFor="nl-sticky-email" className="sr-only">
              Adresse email
            </label>
            <input
              id="nl-sticky-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              disabled={status === "loading"}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="ton@email.fr"
              aria-invalid={status === "error"}
              className="flex-1 min-w-0 rounded-lg bg-elevated border border-border px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-primary/60"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-primary text-sm py-2 px-3 shrink-0 disabled:opacity-60"
            >
              {status === "loading" ? "..." : "S'abonner"}
            </button>
          </form>
        ) : (
          <p className="text-xs text-accent-green inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Inscription confirmee — verifie ta boite mail.
          </p>
        )}

        {status === "error" && (
          <p
            role="alert"
            className="mt-1.5 text-xs text-accent-rose inline-flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {errorMsg}
          </p>
        )}

        <p className="mt-1.5 text-[10px] text-muted leading-snug">
          3 min/jour, gratuit, desabonnement 1 clic. RGPD-compliant (Beehiiv).
        </p>
      </div>
    </div>
  );
}

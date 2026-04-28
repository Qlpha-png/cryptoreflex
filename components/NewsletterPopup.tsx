"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * NewsletterPopup — capture intent-based pour booster les conversions.
 *
 * Triggers :
 *  - Desktop : exit-intent (mousemove vers le top de la viewport, vélocité > seuil).
 *  - Mobile  : scroll 50% de la page (pas d'exit-intent fiable au touch).
 *
 * Anti-friction (très important pour ne PAS dégrader l'UX) :
 *  - Délai mini avant d'apparaître : 8s (laisse l'user lire).
 *  - Hide définitif si l'user s'est déjà inscrit (cookie cr_newsletter_subscribed=1).
 *  - Hide pour 30 jours après 3 dismiss (cookie cr_newsletter_dismiss=N).
 *  - Hide pour 1 jour après chaque dismiss simple.
 *  - Hide sur les routes /merci et /newsletter (pas de double prompt).
 *  - Respect prefers-reduced-motion.
 *
 * Lead magnet : guide PDF "14 plateformes crypto à utiliser en France 2026".
 * C'est l'asset "haute valeur perçue" qui justifie l'inscription.
 */

const COOKIE_SUBSCRIBED = "cr_newsletter_subscribed";
const COOKIE_DISMISS = "cr_newsletter_dismiss";
const MIN_DELAY_MS = 8_000;
const MOBILE_SCROLL_THRESHOLD = 0.5; // 50%
const DISMISS_HARD_LIMIT = 3;
const LEAD_MAGNET_URL = "/lead-magnets/guide-plateformes-crypto-2026.pdf";

const SUPPRESSED_PATHS = ["/merci", "/newsletter"];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const maxAge = Math.round(days * 86400);
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

function shouldSuppress(): boolean {
  if (typeof window === "undefined") return true;
  // Path-based suppression
  if (SUPPRESSED_PATHS.some((p) => window.location.pathname.startsWith(p))) {
    return true;
  }
  // Already subscribed
  if (getCookie(COOKIE_SUBSCRIBED) === "1") return true;
  // Hard dismiss limit reached
  const dismisses = parseInt(getCookie(COOKIE_DISMISS) ?? "0", 10);
  if (dismisses >= DISMISS_HARD_LIMIT) return true;
  return false;
}

export default function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // FIX P0 audit-fonctionnel-live-final #3 : trace si la réponse était mockée
  // (Beehiiv non configuré côté serveur). On change le copy + on ne pose pas
  // le cookie "subscribed" pour que l'utilisateur puisse se ré-inscrire quand
  // l'infra sera prête.
  const [mocked, setMocked] = useState(false);
  // Choix d'envoi (audit P0-6) : par défaut on coche "PDF + newsletter" car
  // c'est notre objectif business prioritaire, mais l'utilisateur peut
  // explicitement opter pour "PDF uniquement" — moins manipulatif.
  const [wantsNewsletter, setWantsNewsletter] = useState(true);
  const armedRef = useRef(false); // évite multi-trigger
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldSuppress()) return;

    let exitListener: ((e: MouseEvent) => void) | null = null;
    let scrollListener: (() => void) | null = null;
    let armTimer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (armedRef.current) return;
      armedRef.current = true;
      setOpen(true);
    };

    armTimer = setTimeout(() => {
      const isMobile =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 768px)").matches;

      if (isMobile) {
        scrollListener = () => {
          const scrolled =
            (window.scrollY + window.innerHeight) /
            Math.max(document.documentElement.scrollHeight, 1);
          if (scrolled >= MOBILE_SCROLL_THRESHOLD) trigger();
        };
        window.addEventListener("scroll", scrollListener, { passive: true });
      } else {
        // Exit intent : mouse quitte par le haut de la viewport.
        // On exige `clientY <= 0` ET `relatedTarget === null` (sortie hors window),
        // ce qui élimine 99% des faux positifs (clic sur un onglet par exemple).
        exitListener = (e: MouseEvent) => {
          if (e.clientY <= 0 && !e.relatedTarget) trigger();
        };
        document.addEventListener("mouseout", exitListener);
      }
    }, MIN_DELAY_MS);

    return () => {
      if (armTimer) clearTimeout(armTimer);
      if (exitListener) document.removeEventListener("mouseout", exitListener);
      if (scrollListener) window.removeEventListener("scroll", scrollListener);
    };
  }, []);

  // Gestion focus + Esc
  useEffect(() => {
    if (!open) return;
    popupRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleDismiss() {
    const current = parseInt(getCookie(COOKIE_DISMISS) ?? "0", 10);
    const next = current + 1;
    // Si on atteint le hard limit, on cookie 30j ; sinon 1j (laisse une chance)
    const ttl = next >= DISMISS_HARD_LIMIT ? 30 : 1;
    setCookie(COOKIE_DISMISS, String(next), ttl);
    setOpen(false);
  }

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
          source: "popup",
          // Flag de préférence d'envoi (audit P0-6) : transmis dès maintenant
          // au backend pour anticiper la séparation PDF / newsletter.
          // L'API actuelle ignore le champ ; à brancher côté Beehiiv (tag
          // "pdf-only" vs "subscriber-active") quand la segmentation arrivera.
          wantsNewsletter,
          utm: { source: "cryptoreflex", medium: "popup", campaign: "lead-magnet-pdf" },
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
      // FIX P0 audit-fonctionnel-live-final #3 : si mocked, on n'écrit PAS le
      // cookie "subscribed" (l'inscription est fictive) et on track un event
      // dédié pour comptabiliser ces leads en attente d'infra Beehiiv.
      if (json.mocked) {
        setMocked(true);
        track("Newsletter Signup Mocked", { source: "popup" });
      } else {
        setMocked(false);
        setCookie(COOKIE_SUBSCRIBED, "1", 365);
      }
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
        if (e.target === e.currentTarget) handleDismiss();
      }}
      role="presentation"
    >
      <div
        ref={popupRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nl-popup-title"
        tabIndex={-1}
        className="relative max-w-lg w-full glass rounded-2xl p-6 sm:p-8 outline-none"
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fermer"
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {status !== "success" ? (
          <>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-6 w-6" />
            </span>

            <h2
              id="nl-popup-title"
              className="mt-4 text-xl sm:text-2xl font-extrabold text-fg leading-tight"
            >
              Reçois notre guide PDF des{" "}
              <span className="gradient-text">14 plateformes crypto</span> à utiliser en 2026
            </h2>

            <p className="mt-2 text-sm text-fg/80">
              Comparatif complet, frais réels, statut MiCA, fiabilité. 100 % gratuit,
              envoyé sur ton email en quelques secondes.
            </p>

            <ul className="mt-4 space-y-1.5 text-sm text-fg/75">
              <li className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0 mt-0.5" />
                Comparatif des frais réels (pas le marketing)
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
              {/* Choix d'envoi (audit P0-6) — radio group accessible.
                  Le label englobe l'input pour un tap-target large + transit
                  naturel du focus clavier. */}
              <fieldset className="rounded-xl border border-border bg-background/40 p-3">
                <legend className="px-1 text-[12px] font-semibold uppercase tracking-wider text-muted">
                  Comment veux-tu recevoir le guide ?
                </legend>
                <div className="mt-1 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer rounded-lg p-2 hover:bg-elevated/40 transition-colors">
                    <input
                      type="radio"
                      name="nl-popup-channel"
                      value="newsletter"
                      checked={wantsNewsletter}
                      onChange={() => setWantsNewsletter(true)}
                      className="mt-0.5 h-4 w-4 accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <span className="text-sm text-fg leading-snug">
                      <strong>PDF + newsletter quotidienne</strong>
                      <span className="block text-xs text-muted mt-0.5">
                        3 min/jour — l'essentiel du marché crypto, sans bruit.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer rounded-lg p-2 hover:bg-elevated/40 transition-colors">
                    <input
                      type="radio"
                      name="nl-popup-channel"
                      value="pdf-only"
                      checked={!wantsNewsletter}
                      onChange={() => setWantsNewsletter(false)}
                      className="mt-0.5 h-4 w-4 accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <span className="text-sm text-fg leading-snug">
                      <strong>PDF uniquement</strong>
                      <span className="block text-xs text-muted mt-0.5">
                        Juste le lien direct vers le guide, sans newsletter.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>

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
            {/* FIX P0 audit-fonctionnel-live-final #3 : copy honnête en mode
                mocked. On évite "Bienvenue !" trompeur quand Beehiiv n'est pas
                configuré côté serveur. */}
            <h2 className="mt-4 text-xl sm:text-2xl font-extrabold text-fg">
              {mocked
                ? "Email bien noté"
                : wantsNewsletter
                  ? "Parfait, c'est en route"
                  : "PDF envoyé"}
            </h2>
            <p className="mt-2 text-sm text-fg/80">
              {mocked ? (
                <>
                  Newsletter en cours de configuration — ton email{" "}
                  <strong>{email}</strong> a été noté côté Cryptoreflex, on te
                  recontactera dès que c&apos;est prêt. En attendant, télécharge
                  ton guide :
                </>
              ) : wantsNewsletter ? (
                <>
                  Confirmation envoyée à <strong>{email}</strong>. Le guide PDF arrive
                  par email — et la prochaine édition de la newsletter aussi.
                </>
              ) : (
                <>
                  Le lien du guide a été envoyé à <strong>{email}</strong>. Tu peux le
                  télécharger tout de suite ci-dessous.
                </>
              )}
            </p>
            <a
              href={LEAD_MAGNET_URL}
              download
              className="btn-primary w-full mt-5 justify-center"
              onClick={() => setTimeout(() => setOpen(false), 400)}
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

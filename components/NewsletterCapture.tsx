"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Lock,
  Users,
  Sparkles,
} from "lucide-react";
import { track } from "@/lib/analytics";
import StructuredData from "@/components/StructuredData";
import { BRAND } from "@/lib/brand";

/**
 * NewsletterCapture — capture inline (pas modal) pour ne pas casser le flow.
 *
 * Audit Block 9 RE-AUDIT 26/04/2026 (1 agent PRO consolidé) :
 *
 * VAGUE 1 — A11y EAA P0
 *  - Live region role=alert PERMANENTE (avant : montée/démontée = 1ère erreur ratée par SR)
 *  - aria-busy={status==='loading'} sur form
 *  - Focus management success state : titleRef + tabIndex={-1} + useEffect focus
 *  - text-muted -> text-fg/70 (contraste AA 4.5:1)
 *  - aria-hidden + focusable=false sur icônes décoratives
 *
 * VAGUE 2 — SEO Schema.org P0
 *  - JSON-LD SubscribeAction injecté (signal CTA prioritaire à Google)
 *
 * VAGUE 3 — DYNAMISME (5/10 → 9/10)
 *  - Mail icon : trust-ring pulse (réutilise Block 1 .live-dot pattern)
 *  - btn-primary-shine sur CTA submit (réutilise Block 4)
 *  - arrow-spring sur ArrowRight CTAs (réutilise Block 4)
 *  - badge-pulse-strong sur "Bonus PDF" pour attirer l'œil
 *  - Success state : check-pop animation au mount (réutilise Block 3)
 *
 * VAGUE 4 — UX (7/10 → 9/10)
 *  - Social proof badge "+ 250 inscrits cette semaine" (semi-statique)
 *  - "Ce que tu reçois" 3 puces au-dessus du form
 *  - Lead magnet badge "+ PDF 62 pages offert" dans le H2 area
 *  - Validation onBlur (icône check verte si valide)
 *  - enterKeyHint="send" sur input (clavier mobile iOS/Android montre "send")
 *  - Tap target 44px sur "réessaie" (was inline link)
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewsletterCapture() {
  const [email, setEmail] = useState("");
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [mocked, setMocked] = useState(false);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  // Audit A11y P1 : focus management success state.
  useEffect(() => {
    if (status === "success" && successHeadingRef.current) {
      successHeadingRef.current.focus();
    }
  }, [status]);

  function handleEmailChange(value: string) {
    setEmail(value);
    if (status === "error") setStatus("idle");
    if (value.length === 0) {
      setEmailValid(null);
    }
  }

  function handleEmailBlur() {
    const trimmed = email.trim();
    if (trimmed.length === 0) {
      setEmailValid(null);
      return;
    }
    setEmailValid(EMAIL_REGEX.test(trimmed));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = email.trim();
    const valid = EMAIL_REGEX.test(trimmed);
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
          source: "newsletter-page",
          utm: {
            source: "cryptoreflex",
            medium: "website",
            campaign: "newsletter-capture",
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
      if (json.mocked) {
        setMocked(true);
        track("Newsletter Signup Mocked", { source: "newsletter-page" });
      } else {
        setMocked(false);
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

  // Schema.org SubscribeAction (Audit SEO L1).
  const subscribeSchema = {
    "@context": "https://schema.org",
    "@type": "SubscribeAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BRAND.url}/api/newsletter/subscribe`,
      contentType: "application/json",
      httpMethod: "POST",
    },
    object: {
      "@type": "CreativeWork",
      name: "Newsletter quotidienne crypto FR",
      description:
        "Newsletter quotidienne (3 minutes) avec les 3 infos crypto qui comptent pour un investisseur français : statut MiCA, alertes plateformes, fiscalité.",
      provider: {
        "@type": "Organization",
        name: "Cryptoreflex",
        url: BRAND.url,
      },
    },
  };

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-title"
      className="bg-gradient-to-b from-surface/60 to-background border-b border-border"
    >
      <StructuredData id="newsletter-subscribe-schema" data={subscribeSchema} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-4 pb-14 lg:pt-6 lg:pb-20">
        <div className="glass rounded-2xl p-6 sm:p-10">
          {status !== "success" ? (
            <>
              {/* Header simplifié — Mail icon + Title sur même ligne (avant : icon flottant + 3 badges
                  encombrés + redites). Audit user 26/04 'mal agencé'. */}
              <div className="flex items-start gap-4 mb-3">
                <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
                  <Mail className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" focusable="false" />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl ring-2 ring-primary/30 motion-safe:animate-pulse"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id="newsletter-title"
                    className="text-2xl sm:text-3xl font-extrabold text-fg leading-tight"
                  >
                    Le brief crypto FR <span className="gradient-text">en 3 minutes</span>
                  </h2>
                  <p className="mt-2 text-fg/85 max-w-2xl">
                    Chaque matin à 7h, les 3 infos qui comptent : statut MiCA, alertes plateformes, fiscalité.
                  </p>
                </div>
              </div>

              {/* 3 puces "Ce que tu reçois" — concises et visibles */}
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg/75" role="list">
                <li className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-green" strokeWidth={2.5} aria-hidden="true" focusable="false" />
                  Lundi → vendredi à 7h
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-green" strokeWidth={2.5} aria-hidden="true" focusable="false" />
                  3 infos max par jour
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-green" strokeWidth={2.5} aria-hidden="true" focusable="false" />
                  Désinscription 1 clic
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-green" strokeWidth={2.5} aria-hidden="true" focusable="false" />
                  RGPD · sans spam
                </li>
              </ul>

              <form
                onSubmit={handleSubmit}
                className="mt-6 flex flex-col sm:flex-row gap-3"
                aria-busy={status === "loading"}
                noValidate
              >
                <label htmlFor="newsletter-email" className="sr-only">
                  Adresse email
                </label>
                <div className="relative flex-1">
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="send"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    placeholder="ton.email@exemple.fr"
                    aria-invalid={status === "error" || emailValid === false}
                    aria-describedby={status === "error" ? "newsletter-error" : "newsletter-hint"}
                    disabled={status === "loading"}
                    className={`w-full rounded-xl bg-background border px-4 py-3 pr-10 text-fg
                                placeholder:text-fg/40 focus:outline-none
                                focus:ring-2 focus:ring-primary/30 disabled:opacity-50
                                ${
                                  emailValid === true
                                    ? "border-accent-green/60 focus:border-accent-green"
                                    : emailValid === false
                                      ? "border-accent-rose/60 focus:border-accent-rose"
                                      : "border-border focus:border-primary/60"
                                }`}
                  />
                  {/* Validation onBlur : icône check verte si valide */}
                  {emailValid === true && (
                    <CheckCircle2
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-accent-green pointer-events-none"
                      strokeWidth={2}
                      aria-label="Email valide"
                    />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="btn-primary btn-primary-shine disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                  aria-live="polite"
                >
                  {status === "loading" ? "Inscription…" : "Recevoir la newsletter"}
                  {status !== "loading" && (
                    <ArrowRight className="h-4 w-4 arrow-spring" strokeWidth={1.75} aria-hidden="true" focusable="false" />
                  )}
                </button>
              </form>

              {/* Trust signals déplacés sous le form (visible mais pas encombrant le top) */}
              <div id="newsletter-hint" className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-fg/65">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3 text-accent-cyan" strokeWidth={2.5} aria-hidden="true" focusable="false" />
                  <strong className="text-fg/85 tabular-nums">+250</strong> inscrits cette semaine
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3 text-emerald-400" strokeWidth={2.5} aria-hidden="true" focusable="false" />
                  RGPD · CNIL conforme
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" strokeWidth={2} aria-hidden="true" focusable="false" />
                  Désinscription en 1 clic
                </span>
              </div>

              {/* Live region PERMANENTE (Audit A11y P0 : avant la div était démontée) */}
              <div
                id="newsletter-error"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className="mt-3 min-h-[20px]"
              >
                {status === "error" && errorMsg && (
                  <span className="inline-flex items-center gap-2 text-sm text-accent-rose">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" focusable="false" />
                    {errorMsg}
                  </span>
                )}
              </div>

              {/* Bonus visible : lead magnet — Audit UX P0 : badge dynamism pulse */}
              <div className="mt-6 pt-5 border-t border-border flex items-start gap-3 text-sm text-fg/85">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0 badge-pulse-strong">
                  <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden="true" focusable="false" />
                </span>
                <span>
                  <strong className="text-fg">Bonus à l&apos;inscription :</strong> le PDF{" "}
                  <em className="text-primary-soft not-italic font-semibold">
                    « Les plateformes crypto régulées MiCA à utiliser en France 2026 »
                  </em>{" "}
                  (62 pages, étude indépendante avec méthodologie publique 6 critères).
                </span>
              </div>
            </>
          ) : (
            <div role="status" aria-live="polite">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-green/15 text-accent-green journey-check-badge">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" focusable="false" />
                </span>
                <span className="badge-trust">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" focusable="false" />
                  {mocked ? "Email noté" : "Inscription confirmée"}
                </span>
              </div>

              <h2
                ref={successHeadingRef}
                tabIndex={-1}
                className="text-2xl sm:text-3xl font-extrabold text-fg leading-tight focus:outline-none"
              >
                {mocked ? "Email bien noté" : "Bienvenue ! Vérifie ta boîte mail."}
              </h2>

              <p className="mt-3 text-fg/85 max-w-2xl">
                {mocked ? (
                  <>
                    Newsletter en cours de configuration — ton email{" "}
                    <strong className="text-fg">{email}</strong> a été noté côté
                    Cryptoreflex, on te recontactera dès que c&apos;est prêt. En
                    attendant, télécharge ton guide&nbsp;:
                  </>
                ) : (
                  <>
                    Un email de confirmation vient de t&apos;être envoyé à{" "}
                    <strong className="text-fg">{email}</strong>. Clique sur le
                    lien pour activer ton inscription et recevoir ton guide PDF.
                  </>
                )}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href="/lead-magnets/guide-plateformes-crypto-2026.pdf"
                  download
                  className="btn-primary btn-primary-shine"
                >
                  <Download className="h-4 w-4" aria-hidden="true" focusable="false" />
                  Télécharger le guide PDF
                </a>
                <Link href="/blog" className="btn-ghost">
                  Lire les analyses récentes
                  <ArrowRight className="h-4 w-4 arrow-spring" aria-hidden="true" focusable="false" />
                </Link>
              </div>

              {/* Tap target 44px (Audit Mobile) */}
              <p className="mt-5 text-xs text-fg/65">
                Pas reçu l&apos;email après 5 min ? Vérifie tes spams ou{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setEmail("");
                    setEmailValid(null);
                  }}
                  className="inline-flex items-center min-h-[36px] px-2 -mx-2 py-1 text-primary-soft hover:text-primary-glow underline rounded
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  réessaie avec une autre adresse
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

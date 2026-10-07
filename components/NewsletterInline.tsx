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
  source?: "blog-cta" | "footer" | "inline" | "newsletter-page" | "pro-waitlist" | "sidebar" | "bottom-article" | "hero";
  variant?: Variant;
  title?: string;
  subtitle?: string;
  leadMagnet?: boolean;
  ctaLabel?: string;
  /** Affiche un preview "Voici un exemple du dernier email" sous le formulaire. */
  showPreview?: boolean;
  /**
   * FIX #2 audit conversion 2026-04-26 — copy contextualisé par sujet d'article.
   * Si fourni et qu'aucun title/subtitle explicite n'est passé, le composant
   * applique un copy ciblé (ex: contexte "fiscalite" → "Reçois nos analyses
   * fiscales crypto FR 2026"). Booste typiquement +30-50% la conversion vs
   * copy générique (benchmark conservatif e-commerce/SaaS FR).
   */
  context?: "fiscalite" | "securite" | "trading" | "debutant" | "actualites" | "defi" | "regulation";
}

const LEAD_MAGNET_URL = "/lead-magnets/guide-plateformes-crypto-2026.pdf";

/**
 * Defaults de copy par contexte (source). Ne sont appliques que si le caller
 * ne fournit pas explicitement title/subtitle/ctaLabel.
 *
 * Pourquoi ? Le meme composant est utilise sur 5+ surfaces (sidebar, bottom
 * d'article, hero, footer, newsletter page). Forcer un copy generique partout
 * baisse la conversion ; un copy contextuel (ex: "Tu as aime cet article ?
 * Recois la suite par email" en bottom-article) peut faire +20-40 % de signup
 * (benchmark conservatif a verifier en A/B Plausible).
 */
const COPY_DEFAULTS: Record<
  string,
  { title: string; subtitle: string; ctaLabel: string }
> = {
  // 06/10/2026 : aucun rythme promis (quotidien, 7h, chaque mardi, hebdo…) — aucune édition n'est envoyée par le code.
  "bottom-article": {
    title: "Vous avez aimé cet article ?",
    subtitle: "Recevez la newsletter : l'essentiel de la crypto en français, sans spam.",
    ctaLabel: "Recevoir la newsletter",
  },
  sidebar: {
    title: "Newsletter crypto FR",
    subtitle: "L'essentiel de la crypto en français. Sans hype, sans pub.",
    ctaLabel: "M'abonner",
  },
  hero: {
    title: "Recevoir la newsletter",
    subtitle: "Gratuit. Désinscription en 1 clic. Guide PDF offert.",
    ctaLabel: "Recevoir la newsletter",
  },
  "newsletter-page": {
    title: "Inscription à la newsletter",
    subtitle: "Gratuit. Désinscription en 1 clic. Guide PDF offert.",
    ctaLabel: "Recevoir la newsletter",
  },
};

/**
 * Copy ciblé par contexte d'article (FIX #2 audit conversion 2026-04-26).
 * Appliqué uniquement si `context` est fourni ET qu'aucun title/subtitle
 * explicite n'override.
 */
const CONTEXT_COPY: Record<
  NonNullable<NewsletterInlineProps["context"]>,
  { title: string; subtitle: string; ctaLabel: string }
> = {
  fiscalite: {
    title: "Optimisez votre fisca crypto 2026",
    subtitle:
      "Les points de fiscalité FR qui comptent (PFU, Cerfa 2086, BNC pro) et les échéances à ne pas rater.",
    ctaLabel: "Recevoir la newsletter",
  },
  securite: {
    title: "Restez à l'abri des arnaques crypto",
    subtitle:
      "Nouvelles arnaques en France, piratages de plateformes, bonnes pratiques wallet.",
    ctaLabel: "Recevoir la newsletter",
  },
  trading: {
    title: "Le récap trading crypto FR",
    subtitle:
      "Niveaux clés BTC/ETH et actualité macro, expliqués sans jargon.",
    ctaLabel: "Recevoir la newsletter",
  },
  debutant: {
    title: "Démarrez la crypto sans vous faire avoir",
    subtitle:
      "Les bases expliquées simplement, et l'essentiel de l'actu crypto en français.",
    ctaLabel: "Recevoir la newsletter",
  },
  actualites: {
    title: "L'essentiel de l'actu crypto FR",
    subtitle:
      "Régulation, marché, plateformes : ce qui compte vraiment, sans hype.",
    ctaLabel: "Recevoir la newsletter",
  },
  defi: {
    title: "DeFi crypto, version pédagogique",
    subtitle:
      "Protocoles audités, rendements réels, risques expliqués.",
    ctaLabel: "Recevoir la newsletter",
  },
  regulation: {
    title: "MiCA & AMF : tout comprendre",
    subtitle:
      "Suivi des décisions régulateurs FR/UE et impact concret sur votre portefeuille.",
    ctaLabel: "Recevoir la newsletter",
  },
};

export default function NewsletterInline({
  source = "inline",
  variant = "default",
  title,
  subtitle,
  leadMagnet = true,
  ctaLabel,
  showPreview = false,
  context,
}: NewsletterInlineProps) {
  // Précédence du copy : props explicites > context d'article > defaults par source > generic.
  // Le contexte ciblé d'article a priorité sur le default de source car plus pertinent
  // (ex : un article fiscalité bénéficie d'un copy fisca plutôt que "blog-cta" générique).
  const ctxArticle = context ? CONTEXT_COPY[context] : undefined;
  const ctxDefault = COPY_DEFAULTS[source];
  const resolvedTitle =
    title ?? ctxArticle?.title ?? ctxDefault?.title ?? "La newsletter crypto FR";
  const resolvedSubtitle =
    subtitle ??
    ctxArticle?.subtitle ??
    ctxDefault?.subtitle ??
    "L'essentiel de la crypto en français, sans spam.";
  const resolvedCtaLabel =
    ctaLabel ?? ctxArticle?.ctaLabel ?? ctxDefault?.ctaLabel ?? "S'abonner";
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
        setErrorMsg(json.error ?? "Une erreur est survenue. Réessayez dans un instant.");
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
      setErrorMsg("Service indisponible. Réessayez plus tard.");
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
              {/* plus de truncate (06/10/2026) : le titre était coupé (« La newsletter quotidienne crypt… ») */}
              <h3 className="text-base font-bold text-fg leading-tight">{resolvedTitle}</h3>
              <p className="text-xs text-muted">{resolvedSubtitle}</p>
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
            aria-required="true"
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
          {/* data-allow-invalid (06/10/2026) : sinon form:has(input:invalid) le grise à .55 tant que le champ
              est vide (« S'abonner », « Recevoir les alertes sécu » à 3,49:1) ; la saisie est vérifiée au clic. */}
          <button
            type="submit"
            data-allow-invalid
            disabled={status === "loading" || status === "success"}
            className="btn-primary text-sm py-2.5 px-4 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            {status === "loading" ? "…" : resolvedCtaLabel}
            {status !== "loading" && status !== "success" && (
              <ArrowRight className="h-4 w-4" />
            )}
            {status === "success" && <CheckCircle2 className="h-4 w-4" />}
          </button>
        </form>

        {leadMagnet && variant === "default" && status === "idle" && (
          <p className="mt-3 text-xs text-muted">
            <span className="text-primary-soft font-medium">Bonus :</span> guide PDF
            "Les plateformes crypto régulées MiCA à utiliser en France 2026" à l'inscription.
          </p>
        )}

        {showPreview && variant === "default" && status === "idle" && (
          <details className="mt-3 group">
            <summary className="cursor-pointer text-xs text-primary-soft hover:text-primary inline-flex items-center gap-1 list-none">
              <span className="group-open:rotate-90 transition-transform inline-block">→</span>
              {/* 06/10/2026 : présenté comme « le dernier email » alors qu'aucune édition n'est envoyée → exemple fictif assumé */}
              Voir un exemple de format
            </summary>
            <div className="mt-2 rounded-lg border border-border bg-elevated/40 p-3 text-xs text-fg/70 leading-relaxed">
              <p className="font-semibold text-fg">[Cryptoreflex] Bitpanda décroche son agrément MiCA — 3 conséquences pour vous</p>
              <p className="mt-1.5 italic text-muted">Exemple fictif, pour illustrer le format</p>
              <p className="mt-2">
                1/ <strong>Bitpanda Asset Management AG</strong> rejoint la liste des entités conformes à MiCA dans l'UE.
                Ce que ça change concrètement…
              </p>
              <p className="mt-1">
                2/ <strong>Marché</strong> : BTC consolide entre 95 et 102 k$, ETH teste la résistance des 3 800 $.
              </p>
              <p className="mt-1">
                3/ <strong>Fisca FR</strong> : rappel — déclaration crypto 2025 ouverte dès avril 2026.
              </p>
            </div>
          </details>
        )}

        {status === "error" && (
          <p
            id={`nl-inline-err-${source}`}
            role="alert"
            className="mt-2 text-xs text-danger-fg inline-flex items-center gap-1.5"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {errorMsg}
          </p>
        )}

        {status === "success" && !showPopin && (
          <p
            className={`mt-2 text-xs inline-flex items-center gap-1.5 ${
              mocked ? "text-primary-soft" : "text-accent-green"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {mocked
              ? "Email noté — newsletter en cours de configuration."
              : "Inscription enregistrée, merci !"}
          </p>
        )}
      </div>

      {/* Pop-in succès — overlay accessible (role=dialog, focus trap basique) */}
      {showPopin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-scrim/70 backdrop-blur-sm animate-fade-in-up"
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
                  Newsletter en cours de configuration — votre email{" "}
                  <strong>{email}</strong> a été noté côté Cryptoreflex, on vous
                  recontactera dès que c&apos;est prêt. En attendant, téléchargez
                  votre guide :
                </>
              ) : (
                <>
                  Un email de confirmation est en route vers <strong>{email}</strong>.
                  Pendant ce temps, téléchargez votre guide PDF :
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
              Télécharger le guide (PDF, 57 pages)
            </a>

            <p className="mt-3 text-xs text-muted text-center">
              Pas reçu l'email après 5 min ? Vérifiez vos spams.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

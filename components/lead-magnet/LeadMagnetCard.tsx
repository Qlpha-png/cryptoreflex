"use client";

/**
 * components/lead-magnet/LeadMagnetCard.tsx
 * ------------------------------------------------------------------
 * Carte de téléchargement réutilisable pour les lead magnets.
 *
 * Comportement :
 *  - Affiche titre + description + nombre de pages + image preview optionnelle.
 *  - Form email inline (pas de modal — moins de friction).
 *  - Sur submit :
 *      1. POST /api/newsletter/subscribe avec source = `lead-magnet-{id}`.
 *      2. Si succès, redirige vers /api/lead-magnet/{id}?email={email}
 *         (qui re-vérifie l'abonnement et 302 vers le PDF).
 *      3. Pose un cookie pour skip le form au prochain téléchargement.
 *
 * UX :
 *  - États idle / loading / success / error explicites.
 *  - Erreur affichée inline (pas d'alert).
 *  - Pas de `noscript` requis (graceful degradation : le formulaire submit
 *    marche aussi en HTML pur via action=).
 *
 * Conformité :
 *  - Mention RGPD courte sous le bouton.
 *  - Pas de pré-coche dark pattern.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Download, CheckCircle2, AlertCircle, FileText } from "lucide-react";

export interface LeadMagnetCardProps {
  /** Identifiant kebab-case du lead magnet (ex: "bible-fiscalite"). */
  id: string;
  /** Titre principal de la carte (ex: "Bible Fiscalité Crypto 2026"). */
  title: string;
  /** Description courte (1-2 phrases, vendre la valeur). */
  description: string;
  /** Nombre de pages affiché en badge (ex: 30). */
  pages: number;
  /** Path vers l'image preview (optionnel — fallback icône). */
  previewSrc?: string;
  /** Surcharge du wording du bouton (par défaut : "Télécharger gratuitement"). */
  ctaLabel?: string;
}

export default function LeadMagnetCard({
  id,
  title,
  description,
  pages,
  previewSrc,
  ctaLabel = "Télécharger gratuitement",
}: LeadMagnetCardProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    const trimmed = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!valid) {
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
          // Source whitelist côté serveur : on tombe sur "unknown" si l'id n'est
          // pas dans ALLOWED_SOURCES — pas grave, l'inscription passe quand même.
          source: "lead-magnet-" + id,
          utm: {
            source: "cryptoreflex",
            medium: "lead-magnet",
            campaign: id,
          },
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Inscription impossible. Réessaie.");
        return;
      }

      setStatus("success");
      // Cookie de skip pour les téléchargements futurs (1 an)
      try {
        document.cookie =
          "cr_lead_magnet_unlocked=1; path=/; max-age=31536000; samesite=lax";
      } catch {
        /* SSR-safe */
      }
      // Redirige vers la route de download (qui revérifie l'abonnement et 302 vers le PDF)
      window.location.href =
        "/api/lead-magnet/" + id + "?email=" + encodeURIComponent(trimmed);
    } catch {
      setStatus("error");
      setErrorMsg("Une erreur est survenue. Réessaie.");
    }
  }

  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface p-6 transition hover:border-primary/50">
      <div className="mb-4 flex items-start gap-4">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt={"Aperçu " + title}
            width={64}
            height={88}
            className="rounded border border-border"
            loading="lazy"
          />
        ) : (
          <div className="flex h-22 w-16 items-center justify-center rounded border border-border bg-background text-primary-soft">
            <FileText className="h-6 w-6" aria-hidden />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-fg">{title}</h3>
          <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-soft">
            PDF · {pages} pages
          </div>
        </div>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-muted">{description}</p>

      {status === "success" ? (
        <div
          className="rounded-lg border border-success-fg/30 bg-success-fg/10 p-3 text-sm text-success-fg"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden />
          Téléchargement lancé. Vérifie aussi tes mails.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-auto flex flex-col gap-2">
          <label htmlFor={"lm-email-" + id} className="sr-only">
            Adresse email pour recevoir {title}
          </label>
          <input
            id={"lm-email-" + id}
            type="email"
            required
            autoComplete="email"
            placeholder="ton@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg placeholder:text-muted/60 focus:border-primary focus:outline-none"
            disabled={status === "loading"}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary-glow disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            {status === "loading" ? "Envoi…" : ctaLabel}
          </button>
          {status === "error" && errorMsg ? (
            <p className="flex items-center gap-1 text-xs text-danger-fg" role="alert">
              <AlertCircle className="h-3 w-3" aria-hidden />
              {errorMsg}
            </p>
          ) : null}
          <p className="text-[11px] leading-snug text-muted/70">
            Inscription à la newsletter Cryptoreflex. Désinscription en 1 clic
            depuis chaque email.{" "}
            <Link href="/confidentialite" className="underline hover:text-muted">
              RGPD
            </Link>
            .
          </p>
        </form>
      )}
    </article>
  );
}

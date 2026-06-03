"use client";

/**
 * components/lead-magnet/LeadMagnetCard.tsx
 * ------------------------------------------------------------------
 * Carte de téléchargement réutilisable pour les lead magnets.
 *
 * 100 % gratuit, accès direct :
 *  - Le PDF se télécharge DIRECTEMENT via un lien `/api/lead-magnet/{id}`
 *    (302 vers le fichier statique). Aucun email requis, aucun blocage.
 *  - Sous le bouton, un champ email FACULTATIF permet de s'abonner à la
 *    newsletter pour être prévenu des mises à jour. Il ne conditionne JAMAIS
 *    l'accès au PDF.
 *
 * UX :
 *  - Bouton principal = lien `<a>` (fonctionne sans JS, ouvre le PDF).
 *  - Opt-in newsletter : états idle / loading / success / error inline.
 *
 * Conformité :
 *  - Mention RGPD courte sous le champ.
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
  /** Surcharge du wording du bouton (par défaut : "Télécharger le PDF gratuitement"). */
  ctaLabel?: string;
}

export default function LeadMagnetCard({
  id,
  title,
  description,
  pages,
  previewSrc,
  ctaLabel = "Télécharger le PDF gratuitement",
}: LeadMagnetCardProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  // Lien de téléchargement direct (302 vers le PDF statique). Accessible
  // sans email — c'est l'action principale de la carte.
  const downloadHref = "/api/lead-magnet/" + id;

  // Opt-in newsletter FACULTATIF : s'inscrire pour être prévenu des mises à
  // jour. N'affecte pas le téléchargement (le PDF reste accessible sans).
  async function onSubmitOptIn(e: FormEvent<HTMLFormElement>) {
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
            PDF · {pages} pages · Gratuit
          </div>
        </div>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-muted">{description}</p>

      {/* Action principale : téléchargement direct, sans email. */}
      <a
        href={downloadHref}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary-glow"
      >
        <Download className="h-4 w-4" aria-hidden />
        {ctaLabel}
      </a>

      {/* Opt-in newsletter facultatif — n'affecte pas le téléchargement. */}
      {status === "success" ? (
        <div
          className="mt-3 rounded-lg border border-success-fg/30 bg-success-fg/10 p-3 text-sm text-success-fg"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden />
          C'est noté — tu seras prévenu des mises à jour.
        </div>
      ) : (
        <form onSubmit={onSubmitOptIn} className="mt-3 flex flex-col gap-2">
          <label
            htmlFor={"lm-email-" + id}
            className="text-[11px] leading-snug text-muted"
          >
            Optionnel : laisse ton email pour être prévenu des mises à jour.
          </label>
          <div className="flex gap-2">
            <input
              id={"lm-email-" + id}
              type="email"
              autoComplete="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none"
              disabled={status === "loading"}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg transition hover:border-primary/50 disabled:opacity-50"
            >
              {status === "loading" ? "Envoi…" : "M'abonner"}
            </button>
          </div>
          {status === "error" && errorMsg ? (
            <p className="flex items-center gap-1 text-xs text-danger-fg" role="alert">
              <AlertCircle className="h-3 w-3" aria-hidden />
              {errorMsg}
            </p>
          ) : null}
          <p className="text-[11px] leading-snug text-muted/70">
            Newsletter Cryptoreflex, facultative. Désinscription en 1 clic depuis
            chaque email.{" "}
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

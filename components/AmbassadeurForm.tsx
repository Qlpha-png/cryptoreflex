"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { safeNavigate } from "@/lib/safe-navigate";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { submitAmbassadeur, type FormResult } from "@/lib/partnership-forms";
import { BRAND } from "@/lib/brand";

/**
 * Formulaire client wrappant la Server Action `submitAmbassadeur`.
 *
 * Pourquoi un client wrapper plutôt que d'attacher l'action directement à
 * <form action={...}> ?
 *  - On veut un état UI riche : loading, success, error inline (pas de full
 *    reload de page), accessibilité (aria-live), tracking analytics.
 *  - L'action serveur reste callable hors-JS (bot crawler, lynx, etc.) si on
 *    voulait dégrader, mais ici on accepte JS-only car c'est un form de
 *    candidature long.
 */

const CHANNEL_OPTIONS = [
  "YouTube",
  "X / Twitter",
  "Blog / Site web",
  "Podcast",
  "Discord / Telegram",
  "Newsletter",
  "Autre",
];

export default function AmbassadeurForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<FormResult | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const r = await submitAmbassadeur(formData);
      setResult(r);
      if (r.ok) {
        form.reset();
        // Redirect vers la page merci pour faciliter le tracking conversion
        // (analytics event "ambassadeur_apply_submit" déclenché côté merci).
        // BATCH 53 — wallet-aware safe nav
        safeNavigate(router, "/ambassadeurs/merci");
      }
    });
  }

  if (result?.ok) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="glass glow-border rounded-2xl p-6 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-success mx-auto" aria-hidden="true" />
        <h3 className="mt-3 text-xl font-bold text-white">Candidature envoyée</h3>
        <p className="mt-2 text-sm text-white/75">
          Merci ! Nous étudions chaque candidature manuellement et te répondons
          sous 5 jours ouvrés à l&apos;adresse fournie.
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="btn-ghost mt-5 text-sm"
        >
          Soumettre une autre candidature
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass glow-border rounded-2xl p-6 sm:p-8 space-y-5"
      noValidate
    >
      <fieldset disabled={isPending} className="space-y-5">
        <legend className="sr-only">Formulaire de candidature ambassadeur</legend>

        {/* Honeypot anti-spam — invisible aux humains, rempli par les bots. */}
        <div aria-hidden="true" className="hidden" style={{ position: "absolute", left: "-9999px" }}>
          <label>
            Ne pas remplir
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amb-name" className="block text-sm font-medium text-white mb-1.5">
              Nom complet <span className="text-danger">*</span>
            </label>
            <input
              id="amb-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              maxLength={120}
              className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Ex: Julien Dupont"
            />
          </div>
          <div>
            <label htmlFor="amb-email" className="block text-sm font-medium text-white mb-1.5">
              Email <span className="text-danger">*</span>
            </label>
            <input
              id="amb-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={200}
              className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="contact@exemple.fr"
            />
          </div>
        </div>

        <div>
          <label htmlFor="amb-profile" className="block text-sm font-medium text-white mb-1.5">
            Lien vers ton profil principal <span className="text-danger">*</span>
          </label>
          <input
            id="amb-profile"
            name="profileUrl"
            type="url"
            required
            inputMode="url"
            maxLength={500}
            className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="https://youtube.com/@toi"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amb-channel" className="block text-sm font-medium text-white mb-1.5">
              Canal principal
            </label>
            <select
              id="amb-channel"
              name="channel"
              className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              defaultValue=""
            >
              <option value="" disabled>
                — Sélectionne —
              </option>
              {CHANNEL_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amb-audience" className="block text-sm font-medium text-white mb-1.5">
              Taille d&apos;audience
            </label>
            <input
              id="amb-audience"
              name="audience"
              type="text"
              maxLength={200}
              className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Ex: 5K abonnés YouTube + 800 newsletter"
            />
          </div>
        </div>

        <div>
          <label htmlFor="amb-message" className="block text-sm font-medium text-white mb-1.5">
            Pourquoi rejoindre Cryptoreflex ?
          </label>
          <textarea
            id="amb-message"
            name="message"
            rows={4}
            maxLength={2000}
            className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Parle-nous brièvement de ton contenu et de ton audience…"
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            id="amb-consent"
            name="consent"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-border bg-elevated/60 text-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
          <label htmlFor="amb-consent" className="text-xs text-white/70 leading-relaxed">
            J&apos;accepte que mes données (nom, email, lien profil) soient envoyées à
            l&apos;équipe partenariats de {BRAND.name} pour étudier ma candidature.
            Stockées 12 mois max. Droit d&apos;accès / suppression à tout moment via{" "}
            <Link href="/confidentialite" className="text-primary-soft underline hover:text-primary">
              notre politique RGPD
            </Link>
            .
          </label>
        </div>

        {result && !result.ok && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger-fg"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{result.error}</span>
          </div>
        )}

        <button type="submit" className="btn-primary w-full" aria-busy={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Envoi en cours…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Envoyer ma candidature
            </>
          )}
        </button>
      </fieldset>
    </form>
  );
}

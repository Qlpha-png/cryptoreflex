"use client";

import { useState, useTransition, FormEvent } from "react";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { submitContact, type FormResult } from "@/lib/partnership-forms";
import { BRAND } from "@/lib/brand";

interface ContactFormProps {
  /** Type pré-sélectionné (override). */
  defaultType?: "general" | "partenariats" | "presse";
}

export default function ContactForm({ defaultType = "general" }: ContactFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<FormResult | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const r = await submitContact(formData);
      setResult(r);
      if (r.ok) form.reset();
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
        <h3 className="mt-3 text-xl font-bold text-white">Message envoyé</h3>
        <p className="mt-2 text-sm text-white/75">
          Merci. Nous te répondons sous 48h ouvrées (réponses presse :
          généralement plus rapide).
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="btn-ghost mt-5 text-sm"
        >
          Envoyer un autre message
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
        <legend className="sr-only">Formulaire de contact</legend>

        <div>
          <label htmlFor="ct-type" className="block text-sm font-medium text-white mb-1.5">
            Type de demande
          </label>
          <select
            id="ct-type"
            name="type"
            defaultValue={defaultType}
            className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="general">Question générale</option>
            <option value="partenariats">Partenariats / sponsoring</option>
            <option value="presse">Presse / journaliste</option>
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ct-name" className="block text-sm font-medium text-white mb-1.5">
              Nom
            </label>
            <input
              id="ct-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={120}
              className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Optionnel"
            />
          </div>
          <div>
            <label htmlFor="ct-email" className="block text-sm font-medium text-white mb-1.5">
              Email <span className="text-danger">*</span>
            </label>
            <input
              id="ct-email"
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
          <label htmlFor="ct-subject" className="block text-sm font-medium text-white mb-1.5">
            Sujet
          </label>
          <input
            id="ct-subject"
            name="subject"
            type="text"
            maxLength={200}
            className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Bref résumé de ta demande"
          />
        </div>

        <div>
          <label htmlFor="ct-message" className="block text-sm font-medium text-white mb-1.5">
            Message <span className="text-danger">*</span>
          </label>
          <textarea
            id="ct-message"
            name="message"
            required
            rows={6}
            maxLength={4000}
            className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Détaille ta demande, on te répond dans les 48h ouvrées."
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            id="ct-consent"
            name="consent"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-border bg-elevated/60 text-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
          <label htmlFor="ct-consent" className="text-xs text-white/70 leading-relaxed">
            J&apos;accepte que mon email et mon message soient envoyés à
            l&apos;équipe {BRAND.name}. Conservation 12 mois max. Suppression sur
            demande à <span className="text-fg">{BRAND.email}</span>. Voir{" "}
            <Link href="/confidentialite" className="text-primary-soft underline hover:text-primary">
              politique RGPD
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
              Envoyer le message
            </>
          )}
        </button>
      </fieldset>
    </form>
  );
}

"use client";

import { useState, useTransition, FormEvent } from "react";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { submitSponsoring, type FormResult } from "@/lib/partnership-forms";
import { BRAND } from "@/lib/brand";

const OFFERS = [
  "Article sponsorisé (1 500 €)",
  "Display affiliate premium (500 €/mois)",
  "Sponsor newsletter (300 €)",
  "Pack 3 articles + 1 mois display (4 000 €)",
  "Autre / sur-mesure",
];

const BUDGETS = [
  "< 500 €",
  "500 € – 1 500 €",
  "1 500 € – 5 000 €",
  "> 5 000 €",
];

export default function SponsoringForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<FormResult | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const r = await submitSponsoring(formData);
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
        <h3 className="mt-3 text-xl font-bold text-white">Demande envoyée</h3>
        <p className="mt-2 text-sm text-white/75">
          Merci ! Notre équipe partenariats te répond sous 48h ouvrées avec un
          devis détaillé et un planning de publication.
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="btn-ghost mt-5 text-sm"
        >
          Soumettre une autre demande
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
        <legend className="sr-only">Formulaire de demande de sponsoring</legend>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sp-company" className="block text-sm font-medium text-white mb-1.5">
              Société / marque <span className="text-danger">*</span>
            </label>
            <input
              id="sp-company"
              name="company"
              type="text"
              required
              autoComplete="organization"
              maxLength={120}
              className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Ex: BitNova SAS"
            />
          </div>
          <div>
            <label htmlFor="sp-contact" className="block text-sm font-medium text-white mb-1.5">
              Nom du contact
            </label>
            <input
              id="sp-contact"
              name="contact"
              type="text"
              autoComplete="name"
              maxLength={120}
              className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Ex: Sophie Martin"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sp-email" className="block text-sm font-medium text-white mb-1.5">
            Email professionnel <span className="text-danger">*</span>
          </label>
          <input
            id="sp-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={200}
            className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="contact@bitnova.fr"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sp-offer" className="block text-sm font-medium text-white mb-1.5">
              Offre souhaitée
            </label>
            <select
              id="sp-offer"
              name="offer"
              defaultValue=""
              className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="" disabled>
                — Sélectionne —
              </option>
              {OFFERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sp-budget" className="block text-sm font-medium text-white mb-1.5">
              Budget indicatif
            </label>
            <select
              id="sp-budget"
              name="budget"
              defaultValue=""
              className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="" disabled>
                — Sélectionne —
              </option>
              {BUDGETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="sp-message" className="block text-sm font-medium text-white mb-1.5">
            Brief & contexte
          </label>
          <textarea
            id="sp-message"
            name="message"
            rows={5}
            maxLength={2000}
            className="w-full rounded-lg bg-elevated/60 border border-border px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Présente brièvement votre produit, l'objectif (acquisition, awareness, lancement), la cible idéale et la deadline souhaitée."
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            id="sp-consent"
            name="consent"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-border bg-elevated/60 text-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
          <label htmlFor="sp-consent" className="text-xs text-white/70 leading-relaxed">
            J&apos;accepte que les informations soumises soient transmises à
            l&apos;équipe partenariats de {BRAND.name} dans le seul but d&apos;étudier
            cette demande commerciale. Conservation 24 mois max. Droits RGPD via{" "}
            <Link href="/confidentialite" className="text-primary-soft underline hover:text-primary">
              notre politique
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
              Envoyer ma demande
            </>
          )}
        </button>
      </fieldset>
    </form>
  );
}

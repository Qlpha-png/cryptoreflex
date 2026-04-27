"use client";

import { useState, FormEvent } from "react";
import { Loader2, CheckCircle2, ArrowRight, Mail } from "lucide-react";

/**
 * ResetPasswordForm — Demande d'envoi d'email de reset.
 *
 * Flow :
 *  1. POST /api/auth/reset-password { email }
 *  2. Supabase envoie email avec lien sécurisé
 *  3. User clique → /api/auth/callback?next=/mon-compte/mot-de-passe
 *  4. Sur /mon-compte/mot-de-passe → définit nouveau pwd
 */
export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur inattendue");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <CheckCircle2
          className="h-10 w-10 text-success mx-auto mb-3"
          aria-hidden="true"
        />
        <h2 className="text-lg font-bold text-fg mb-2">Email envoyé&nbsp;!</h2>
        <p className="text-sm text-fg/75 leading-relaxed">
          Si ce compte existe, un email avec un lien de réinitialisation vient
          d&apos;être envoyé. Le lien expire dans 1&nbsp;heure.
        </p>
        <p className="mt-4 text-xs text-muted">
          Pas reçu&nbsp;?{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-primary-soft underline hover:text-primary"
          >
            Réessayer
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
      <label className="block">
        <span className="block text-sm font-semibold text-fg mb-2">
          Ton email
        </span>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            autoComplete="email"
            className="w-full rounded-lg border border-border bg-elevated pl-10 pr-4 py-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary focus-visible:outline-none"
            disabled={loading}
          />
        </div>
      </label>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className="btn-primary btn-primary-shine w-full min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Envoi en cours…
          </>
        ) : (
          <>
            Recevoir le lien de réinitialisation
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}

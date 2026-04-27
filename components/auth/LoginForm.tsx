"use client";

import { useState, FormEvent } from "react";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

/**
 * LoginForm — Formulaire magic link.
 *
 * Flow :
 *  1. User entre email + clic
 *  2. POST /api/auth/login → Supabase envoie magic link
 *  3. Affichage success "Vérifie ta boîte mail"
 *  4. User clique le lien dans son email → callback → /mon-compte
 */
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
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
        <h2 className="text-lg font-bold text-fg mb-2">
          Email envoyé !
        </h2>
        <p className="text-sm text-fg/75 leading-relaxed">
          Vérifie ta boîte mail (et tes spams) — clique sur le lien pour te
          connecter. Le lien expire dans 1 heure.
        </p>
        <p className="mt-4 text-xs text-muted">
          Pas reçu ?{" "}
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
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.com"
          autoComplete="email"
          className="w-full rounded-lg border border-border bg-elevated px-4 py-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary focus-visible:outline-none"
          disabled={loading}
        />
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
            Envoi en cours...
          </>
        ) : (
          <>
            Recevoir mon lien magique
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="text-xs text-muted text-center">
        Aucun mot de passe à retenir. Sécurisé par Supabase Auth.
      </p>
    </form>
  );
}

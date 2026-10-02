"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, ArrowRight, Mail, KeyRound } from "lucide-react";

/**
 * SignupForm — Inscription « email d'abord ».
 *
 * SÉCURITÉ (audit 2026-10-01) : aucun mot de passe n'est choisi avant la
 * preuve de l'email. Sinon, un tiers pourrait inscrire l'adresse d'une
 * victime avec SON mot de passe ; si la victime cliquait le lien reçu, le
 * tiers aurait accès au compte. Le mot de passe se choisit juste après le
 * clic (/mon-compte/mot-de-passe).
 *
 * Soumission → POST /api/auth/signup → « vérifiez votre boîte mail ».
 */
export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{
    needsConfirmation: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Reflex Cards : ?next=/cartes/jouer → le lien de confirmation ramène au jeu (liste fermée côté serveur)
        body: JSON.stringify(new URLSearchParams(window.location.search).get("next") === "/cartes/jouer" ? { email, next: "/cartes/jouer" } : { email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      if (data.needsConfirmation) {
        setDone({
          needsConfirmation: true,
          message: data.message || "Vérifiez votre boîte mail.",
        });
      } else {
        // Compte créé + connecté immédiatement
        window.location.href = new URLSearchParams(window.location.search).get("next") === "/cartes/jouer" ? "/cartes/jouer" : "/mon-compte";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setLoading(false);
    }
  }

  if (done?.needsConfirmation) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <CheckCircle2
          className="h-10 w-10 text-success mx-auto mb-3"
          aria-hidden="true"
        />
        <h2 className="text-lg font-bold text-fg mb-2">
          Vérifiez votre boîte mail
        </h2>
        <p className="text-sm text-fg/75 leading-relaxed">
          {done.message} Le lien de confirmation expire dans 1&nbsp;heure.
        </p>
        <p className="mt-4 text-xs text-muted">
          Pas reçu&nbsp;? Regardez dans les spams, ou{" "}
          <Link
            href="/connexion"
            className="text-primary-soft underline hover:text-primary"
          >
            recevez un lien de connexion
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
      <label className="block">
        <span className="block text-sm font-semibold text-fg mb-2">Email</span>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <input
            type="email"
            required
            aria-required="true"
            aria-describedby="signup-pwd-note"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            autoComplete="email"
            className="w-full rounded-lg border border-border bg-elevated pl-10 pr-4 py-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary focus-visible:outline-none"
            disabled={loading}
          />
        </div>
      </label>

      <p
        id="signup-pwd-note"
        className="flex items-start gap-2 text-xs text-fg/70 leading-relaxed"
      >
        <KeyRound className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted" aria-hidden="true" />
        <span>
          Vous choisirez votre mot de passe juste après avoir confirmé votre
          email. C&apos;est ce qui empêche quiconque de créer un compte à votre
          place.
        </span>
      </p>

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
            Création du compte…
          </>
        ) : (
          <>
            Créer mon compte
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="text-xs text-muted text-center leading-relaxed">
        En créant un compte vous acceptez nos{" "}
        <Link
          href="/mentions-legales"
          className="text-primary-soft hover:text-primary underline"
        >
          mentions légales
        </Link>{" "}
        et notre{" "}
        <Link
          href="/confidentialite"
          className="text-primary-soft hover:text-primary underline"
        >
          politique de confidentialité
        </Link>
        .
      </p>
    </form>
  );
}

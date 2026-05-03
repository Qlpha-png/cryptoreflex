"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";

/**
 * SignupForm — Inscription email + mot de passe.
 *
 * Validation password live (UX inspirée Stripe, Notion) :
 *  - 8 caractères min
 *  - Mélange lettres + chiffres ou symboles
 *  - Indicateur de force visuel
 *
 * Soumission → POST /api/auth/signup → confirmation email OU connexion directe.
 */
export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{
    needsConfirmation: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pwdChecks = {
    length: password.length >= 8,
    mix: /[a-zA-Z]/.test(password) && /[\d\W]/.test(password),
  };
  const pwdStrong = pwdChecks.length && pwdChecks.mix;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pwdStrong) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      if (data.needsConfirmation) {
        setDone({
          needsConfirmation: true,
          message: data.message || "Vérifie ta boîte mail.",
        });
      } else {
        // Compte créé + connecté immédiatement
        window.location.href = "/mon-compte";
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
          Compte créé&nbsp;!
        </h2>
        <p className="text-sm text-fg/75 leading-relaxed">
          {done.message} Le lien de confirmation expire dans 1&nbsp;heure.
        </p>
        <p className="mt-4 text-xs text-muted">
          Pas reçu&nbsp;?{" "}
          <Link
            href="/connexion"
            className="text-primary-soft underline hover:text-primary"
          >
            Tu peux te connecter directement
          </Link>{" "}
          dès la confirmation.
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            autoComplete="email"
            className="w-full rounded-lg border border-border bg-elevated pl-10 pr-4 py-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary focus-visible:outline-none"
            disabled={loading}
          />
        </div>
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-fg mb-2">
          Mot de passe
        </span>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <input
            type={showPwd ? "text" : "password"}
            required
            aria-required="true"
            aria-describedby={password.length > 0 ? "signup-pwd-rules" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Au moins 8 caractères"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            className="w-full rounded-lg border border-border bg-elevated pl-10 pr-11 py-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary focus-visible:outline-none"
            disabled={loading}
          />
          <button
            type="button"
            // BATCH 25 a11y — stopPropagation pour éviter que le click bubble
            // jusqu'au <label> parent et toggle le focus de l'input par
            // accident. aria-pressed pour annoncer l'état toggle au SR.
            onClick={(e) => {
              e.stopPropagation();
              setShowPwd((v) => !v);
            }}
            // BATCH 47a a11y P0 — tap target 44x44 (h-9 w-9 dans un input
            // h-12 = ne depasse pas, OK). Avant : 24px = WCAG 2.5.5 fail.
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-9 w-9 text-muted hover:text-fg hover:bg-elevated focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none rounded-md transition-colors"
            aria-label={
              showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            aria-pressed={showPwd}
          >
            {showPwd ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Live validation — BATCH 25 a11y : id="signup-pwd-rules" lié à
            l'input via aria-describedby, le SR annonce les règles vivantes. */}
        {password.length > 0 && (
          <div id="signup-pwd-rules" className="mt-2 space-y-1">
            <PwdCheck ok={pwdChecks.length} label="8 caractères minimum" />
            <PwdCheck
              ok={pwdChecks.mix}
              label="Lettres + chiffres ou symboles"
            />
          </div>
        )}
      </label>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email || !pwdStrong}
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
        En créant un compte tu acceptes nos{" "}
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

function PwdCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${
        ok ? "text-success" : "text-muted"
      }`}
    >
      {ok ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : (
        <X className="h-3 w-3" aria-hidden="true" />
      )}
      {label}
    </div>
  );
}

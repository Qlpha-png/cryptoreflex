"use client";

import { useState, FormEvent } from "react";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";

/**
 * UpdatePasswordForm — Formulaire de définition/changement de mot de passe.
 *
 * Cas d'usage :
 *  1. User vient du flow reset (session active après callback)
 *  2. User authentifié (Stripe ou magic link) veut définir un pwd pour la 1ère fois
 *  3. User authentifié veut changer son pwd
 *
 * POST /api/auth/update-password { password } → succès → redirect /mon-compte
 */
export default function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwdChecks = {
    length: password.length >= 8,
    mix: /[a-zA-Z]/.test(password) && /[\d\W]/.test(password),
    match: password.length > 0 && password === confirmPassword,
  };
  const pwdValid = pwdChecks.length && pwdChecks.mix && pwdChecks.match;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pwdValid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      setSuccess(true);
      // Redirect après 2 sec pour laisser voir le succès
      setTimeout(() => {
        window.location.href = "/mon-compte";
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <CheckCircle2
          className="h-10 w-10 text-success mx-auto mb-3"
          aria-hidden="true"
        />
        <h2 className="text-lg font-bold text-fg mb-2">
          Mot de passe enregistré&nbsp;!
        </h2>
        <p className="text-sm text-fg/75 leading-relaxed">
          Tu pourras désormais te connecter avec ton email et ce mot de passe.
        </p>
        <p className="mt-4 text-xs text-muted">Redirection en cours…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
      <label className="block">
        <span className="block text-sm font-semibold text-fg mb-2">
          Nouveau mot de passe
        </span>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <input
            type={showPwd ? "text" : "password"}
            required
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
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
            aria-label={
              showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
          >
            {showPwd ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-fg mb-2">
          Confirme ton mot de passe
        </span>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            aria-hidden="true"
          />
          <input
            type={showPwd ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Le même que ci-dessus"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            className="w-full rounded-lg border border-border bg-elevated pl-10 pr-4 py-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary focus-visible:outline-none"
            disabled={loading}
          />
        </div>
      </label>

      {/* Live validation */}
      {(password.length > 0 || confirmPassword.length > 0) && (
        <div className="space-y-1">
          <PwdCheck ok={pwdChecks.length} label="8 caractères minimum" />
          <PwdCheck
            ok={pwdChecks.mix}
            label="Lettres + chiffres ou symboles"
          />
          <PwdCheck
            ok={pwdChecks.match}
            label="Les deux mots de passe correspondent"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !pwdValid}
        className="btn-primary btn-primary-shine w-full min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Enregistrement…
          </>
        ) : (
          <>
            Enregistrer le mot de passe
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
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

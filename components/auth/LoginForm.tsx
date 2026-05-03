"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

/**
 * LoginForm — Formulaire de connexion à 2 modes.
 *
 * Mode 1 (DEFAULT) : email + mot de passe → /api/auth/login-password
 * Mode 2 (FALLBACK) : email seul → magic link → /api/auth/login
 *
 * Pourquoi password en default :
 *  - Friction zéro pour les users récurrents (pas d'aller-retour email)
 *  - Toujours fonctionnel même si SMTP / inbox spam pose problème
 *  - Respecte la demande user "pas tout le temps demander un mail"
 *
 * Magic link reste dispo pour :
 *  - Users qui ont oublié leur mot de passe (lien de reset à part)
 *  - Users créés via Stripe webhook qui n'ont pas encore défini de pwd
 */
export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Identifiants invalides");
      }

      // Connecté — full reload pour que le middleware récupère le cookie
      window.location.href = "/mon-compte";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setLoading(false);
    }
  }

  async function handleMagicSubmit(e: FormEvent) {
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

  // === Magic link sent confirmation ===
  if (sent) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <CheckCircle2
          className="h-10 w-10 text-success mx-auto mb-3"
          aria-hidden="true"
        />
        <h2 className="text-lg font-bold text-fg mb-2">Email envoyé&nbsp;!</h2>
        <p className="text-sm text-fg/75 leading-relaxed">
          Vérifie ta boîte mail (et tes spams) — clique sur le lien pour te
          connecter. Le lien expire dans 1 heure.
        </p>
        <p className="mt-4 text-xs text-muted">
          Pas reçu&nbsp;?{" "}
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setMode("password");
            }}
            className="text-primary-soft underline hover:text-primary"
          >
            Utilise plutôt ton mot de passe
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {/* Toggle mode.
          BATCH 49b a11y P1 (audit /compte) — ajout aria-controls + id sur
          les tabs + role="tabpanel" + aria-labelledby sur les forms pour
          que NVDA/JAWS/VoiceOver puisse annoncer correctement le panneau
          actif quand l'user navigue Tab keyboard. Sans ces liens, le
          screen reader prononçait juste "Mot de passe / Lien magique"
          sans contexte de quel form etait visible. */}
      <div
        role="tablist"
        aria-label="Méthode de connexion"
        className="grid grid-cols-2 gap-1 rounded-lg bg-elevated/60 p-1 border border-border"
      >
        <button
          role="tab"
          type="button"
          id="login-tab-password"
          aria-controls="login-panel-password"
          aria-selected={mode === "password"}
          tabIndex={mode === "password" ? 0 : -1}
          onClick={() => {
            setMode("password");
            setError(null);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition min-h-[44px] ${
            mode === "password"
              ? "bg-primary text-bg shadow-sm"
              : "text-fg/70 hover:text-fg"
          }`}
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          Mot de passe
        </button>
        <button
          role="tab"
          type="button"
          id="login-tab-magic"
          aria-controls="login-panel-magic"
          aria-selected={mode === "magic"}
          tabIndex={mode === "magic" ? 0 : -1}
          onClick={() => {
            setMode("magic");
            setError(null);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition min-h-[44px] ${
            mode === "magic"
              ? "bg-primary text-bg shadow-sm"
              : "text-fg/70 hover:text-fg"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Lien magique
        </button>
      </div>

      {/* PASSWORD MODE */}
      {mode === "password" && (
        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-4"
          role="tabpanel"
          id="login-panel-password"
          aria-labelledby="login-tab-password"
        >
          <label className="block">
            <span className="block text-sm font-semibold text-fg mb-2">
              Email
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

          <label className="block">
            <div className="flex items-center justify-between mb-2">
              <span className="block text-sm font-semibold text-fg">
                Mot de passe
              </span>
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs text-primary-soft hover:text-primary underline"
              >
                Oublié&nbsp;?
              </Link>
            </div>
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
                placeholder="Ton mot de passe"
                autoComplete="current-password"
                className="w-full rounded-lg border border-border bg-elevated pl-10 pr-11 py-3 text-base text-fg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary focus-visible:outline-none"
                disabled={loading}
              />
              {/* BATCH 47a a11y P0 : tap target 44x44px (avant: 16px = WCAG
                  2.5.5 fail). aria-pressed pour annoncer l'etat current
                  aux lecteurs d'ecran. Position absolute mais bord interieur
                  inset-y-1 + right-1 + h-9 w-9 dans un input h-12 = ne
                  depasse pas le perimetre input. */}
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-9 w-9 rounded-md text-muted hover:text-fg hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
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
          </label>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn-primary btn-primary-shine w-full min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Connexion…
              </>
            ) : (
              <>
                Se connecter
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>

          <p className="text-xs text-muted text-center">
            Pas encore de compte&nbsp;?{" "}
            <Link
              href="/inscription"
              className="text-primary-soft hover:text-primary underline font-semibold"
            >
              Crée-en un en 30 sec
            </Link>
          </p>
        </form>
      )}

      {/* MAGIC LINK MODE */}
      {mode === "magic" && (
        <form
          onSubmit={handleMagicSubmit}
          className="space-y-4"
          role="tabpanel"
          id="login-panel-magic"
          aria-labelledby="login-tab-magic"
        >
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
                Recevoir mon lien magique
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>

          <p className="text-xs text-muted text-center leading-relaxed">
            Aucun mot de passe à retenir. Le lien arrive en 30&nbsp;sec.
          </p>
        </form>
      )}
    </div>
  );
}

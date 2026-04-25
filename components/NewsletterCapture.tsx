"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Clock,
  AlertCircle,
  Download,
} from "lucide-react";

/**
 * NewsletterCapture — capture inline (pas modal) pour ne pas casser le flow.
 * V1 : mock submission. À brancher sur Beehiiv API plus tard.
 *
 * Critique conversion :
 *  - Promesse explicite (3 min, sans spam)
 *  - Lead magnet PDF en récompense (réduit la friction)
 *  - Désinscription one-click mentionnée (RGPD + réassurance)
 */
export default function NewsletterCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    // Validation simple côté client
    const trimmed = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!valid) {
      setStatus("error");
      setErrorMsg("Adresse email invalide. Vérifie le format (ex : prenom@email.com).");
      return;
    }

    setStatus("loading");

    try {
      // Mock API call — à remplacer par fetch('/api/newsletter') vers Beehiiv
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Une erreur est survenue. Réessaie dans un instant.");
    }
  }

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-title"
      className="border-y border-border bg-gradient-to-b from-surface/60 to-background"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="glass rounded-2xl p-6 sm:p-10">
          {status !== "success" ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Mail className="h-5 w-5" />
                </span>
                <span className="badge-trust">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Sans spam, 1 clic pour se désinscrire
                </span>
              </div>

              <h2
                id="newsletter-title"
                className="text-2xl sm:text-3xl font-extrabold text-fg leading-tight"
              >
                La newsletter quotidienne crypto FR{" "}
                <span className="gradient-text">en 3 minutes</span>.
              </h2>

              <p className="mt-3 text-fg/75 max-w-2xl">
                Chaque matin à 7h : les 3 infos crypto qui comptent vraiment pour un investisseur français,
                résumées en français clair. Statut MiCA, alertes plateformes, fiscalité.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 flex flex-col sm:flex-row gap-3" noValidate>
                <label htmlFor="newsletter-email" className="sr-only">
                  Adresse email
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  placeholder="prenom@email.com"
                  aria-invalid={status === "error"}
                  aria-describedby={status === "error" ? "newsletter-error" : "newsletter-hint"}
                  disabled={status === "loading"}
                  className="flex-1 rounded-xl bg-background border border-border px-4 py-3 text-fg
                             placeholder:text-muted focus:outline-none focus:border-primary/60
                             focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                >
                  {status === "loading" ? "Inscription…" : "Recevoir la newsletter"}
                  {status !== "loading" && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p id="newsletter-hint" className="mt-3 text-xs text-muted flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Newsletter quotidienne 3 min, sans spam — désinscription en 1 clic.
              </p>

              {status === "error" && (
                <div
                  id="newsletter-error"
                  role="alert"
                  className="mt-3 inline-flex items-center gap-2 text-sm text-accent-rose"
                >
                  <AlertCircle className="h-4 w-4" />
                  {errorMsg}
                </div>
              )}

              {/* Bonus visible : lead magnet teasé pour booster conversion */}
              <div className="mt-6 pt-5 border-t border-border flex items-start gap-3 text-sm text-fg/70">
                <Download className="h-4 w-4 text-primary-soft mt-0.5 shrink-0" />
                <span>
                  <strong className="text-fg">Bonus à l'inscription :</strong> le PDF "Acheter sa première
                  crypto en France en 2026" (12 pages, méthode pas-à-pas).
                </span>
              </div>
            </>
          ) : (
            <div role="status" aria-live="polite">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-green/15 text-accent-green">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <span className="badge-trust">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Inscription confirmée
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-fg leading-tight">
                Bienvenue ! Vérifie ta boîte mail.
              </h2>

              <p className="mt-3 text-fg/75 max-w-2xl">
                Un email de confirmation vient de t'être envoyé à <strong className="text-fg">{email}</strong>.
                Clique sur le lien pour activer ton inscription et recevoir ton guide PDF.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href="/lead-magnets/acheter-premiere-crypto-france-2026.pdf"
                  download
                  className="btn-primary"
                >
                  <Download className="h-4 w-4" />
                  Télécharger le guide PDF
                </a>
                <Link href="/blog" className="btn-ghost">
                  Lire les analyses récentes
                </Link>
              </div>

              <p className="mt-5 text-xs text-muted">
                Pas reçu l'email après 5 min ? Vérifie tes spams ou{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setEmail("");
                  }}
                  className="text-primary-soft hover:underline"
                >
                  réessaie avec une autre adresse
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

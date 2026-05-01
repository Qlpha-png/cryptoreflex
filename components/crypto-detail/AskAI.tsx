"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Loader2,
  Lock,
  AlertCircle,
  Bot,
  ArrowRight,
} from "lucide-react";

interface Props {
  cryptoId: string;
  cryptoName: string;
  cryptoSymbol: string;
}

interface UserPlanResponse {
  plan: string;
  isPro: boolean;
  isAuthenticated: boolean;
}

const SUGGESTED_QUESTIONS = (name: string, symbol: string) => [
  `${name} est-il sécurisé pour un débutant français ?`,
  `Quelle est la différence entre ${symbol} et Bitcoin ?`,
  `Quels sont les vrais risques de ${name} en 2026 ?`,
  `Comment ${name} se positionne face à ses concurrents ?`,
];

/**
 * AskAI — Q&A IA contextuelle par fiche crypto, RÉSERVÉ aux abonnés Pro.
 *
 * 3 états visuels :
 *  - Free / non-auth : encart "lock" + CTA Pro + suggestions de questions
 *    en preview (mais input désactivé)
 *  - Pro authentifié : input fonctionnel + bouton envoyer + affichage réponse
 *  - Loading / Error : feedback inline
 *
 * Backend : POST /api/ask/{cryptoId} avec gating triple (auth + plan + rate limit)
 *
 * Pas de streaming pour simplicité initiale — on attend la réponse complète,
 * affichage fade-in. Streaming SSE possible en V2.
 */
export default function AskAI({ cryptoId, cryptoName, cryptoSymbol }: Props) {
  const [plan, setPlan] = useState<UserPlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPlan(data);
      })
      .catch(() => {
        if (!cancelled) setPlan({ plan: "free", isPro: false, isAuthenticated: false });
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAsk = async (q: string) => {
    if (!plan?.isPro) return;
    if (!q.trim() || q.length < 5) {
      setError("Question trop courte (minimum 5 caractères).");
      return;
    }
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      // Honeypot : `website` reste TOUJOURS vide côté client (champ invisible
      // dans le DOM ci-dessous). Si rempli côté serveur → bot détecté.
      const res = await fetch(`/api/ask/${cryptoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: q, website: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue.");
        return;
      }
      setAnswer(data.answer);
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(question);
  };

  const isPro = plan?.isPro ?? false;
  const suggestions = SUGGESTED_QUESTIONS(cryptoName, cryptoSymbol);

  return (
    <section
      id="ask-ai"
      className="scroll-mt-24 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-8"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 grid place-items-center h-11 w-11 rounded-xl bg-primary/15 text-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">
              Pose ta question sur {cryptoName}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> Pro · IA
            </span>
          </div>
          <p className="mt-2 text-sm text-fg/75">
            Réponses contextualisées propulsées par Claude Haiku — réservé aux
            abonnés Soutien. <strong className="text-fg">Limité à 20 questions/jour</strong>,
            <strong className="text-fg"> 5/heure</strong>, et uniquement sur la crypto
            ou la fiscalité crypto FR. Pas de conseil financier (juste de la pédagogie).
          </p>
        </div>
      </div>

      {/* État Free / non-auth : preview + CTA */}
      {!planLoading && !isPro && (
        <div className="mt-6">
          <div className="relative rounded-2xl border border-border bg-surface/60 p-5">
            <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm rounded-2xl z-10">
              <div className="text-center px-6 py-4 rounded-xl border border-primary/30 bg-background/90 shadow-2xl max-w-sm">
                <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
                <h3 className="text-base font-bold text-fg">
                  Réservé aux abonnés Soutien
                </h3>
                <p className="mt-2 text-xs text-fg/75">
                  Active ton abonnement pour poser jusqu&apos;à 20 questions par jour
                  à notre IA contextuelle, entraînée sur la fiche complète de chaque
                  crypto.
                </p>
                <Link
                  href="/pro#plans"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-background hover:bg-primary/90 transition-colors"
                >
                  Devenir Soutien — 2,99 € / mois
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            {/* Preview blurred */}
            <div className="opacity-60">
              <div className="text-xs text-muted mb-2 font-semibold">
                Exemples de questions disponibles :
              </div>
              <div className="space-y-2">
                {suggestions.map((q) => (
                  <div
                    key={q}
                    className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-fg/70"
                  >
                    « {q} »
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* État Pro authentifié : input + suggestions cliquables */}
      {!planLoading && isPro && (
        <div className="mt-6 space-y-4">
          <form onSubmit={onSubmit} className="flex gap-2 flex-col sm:flex-row">
            {/* Honeypot anti-bot — invisible utilisateur, visible des bots
                qui remplissent automatiquement tous les champs. Si rempli côté
                serveur → 400 silencieux. Style absolute + opacity 0 pour
                rester non-cliquable même pour les screen readers. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                opacity: 0,
                pointerEvents: "none",
                left: "-9999px",
              }}
            />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Pose ta question sur ${cryptoName}...`}
              minLength={5}
              maxLength={500}
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg placeholder:text-muted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={loading}
              aria-label="Question à l'IA"
            />
            <button
              type="submit"
              disabled={loading || question.trim().length < 5}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Réflexion...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Demander
                </>
              )}
            </button>
          </form>

          {/* Suggestions cliquables */}
          {!answer && !loading && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted mb-2">
                Suggestions
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuestion(q);
                      handleAsk(q);
                    }}
                    className="text-xs rounded-full border border-border bg-surface px-3 py-1.5 hover:border-primary/40 hover:bg-primary/5 text-fg/85 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="rounded-xl border border-accent-rose/30 bg-accent-rose/5 p-4 flex items-start gap-2 text-sm text-accent-rose">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Réponse */}
          {answer && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-soft">
                  Réponse IA · Claude Haiku
                </span>
              </div>
              <div className="text-sm text-fg/90 leading-relaxed whitespace-pre-wrap">
                {answer}
              </div>
              <div className="mt-4 text-[11px] text-muted border-t border-border/50 pt-3">
                Réponse IA générique — non un conseil financier. Cryptoreflex
                n&apos;est pas PSAN. Limite : 20 questions par jour.
              </div>
            </div>
          )}
        </div>
      )}

      {planLoading && (
        <div className="mt-6 h-32 rounded-xl bg-surface/40 animate-pulse" />
      )}

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.4s ease-out; }
      `}</style>
    </section>
  );
}

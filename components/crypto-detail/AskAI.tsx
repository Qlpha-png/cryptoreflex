"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Loader2,
  Lock,
  AlertCircle,
  Bot,
  ArrowRight,
  Square,
} from "lucide-react";
import { useVariant } from "@/lib/abtest-client";
import { trackVariantConversion } from "@/lib/abtest";

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

/** SSE event types — DOIT rester aligné avec app/api/ask/[cryptoId]/route.ts */
type AskStreamEvent =
  | {
      type: "meta";
      crypto: { id: string; name: string; symbol: string };
      model: string;
    }
  | { type: "text"; text: string }
  | { type: "done"; inputTokens: number; outputTokens: number }
  | { type: "error"; message: string };

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
 * Backend : POST /api/ask/{cryptoId} en STREAMING SSE (depuis 2026-05-02).
 * Time-to-first-token ~400ms vs 4-8s en non-streamé. Format event JSON :
 * meta / text / done / error.
 *
 * Le client gère :
 *  - Détection du Content-Type pour distinguer SSE (200) vs erreur JSON (4xx/5xx)
 *  - Parser SSE manuel (split sur \n\n, parse JSON par event)
 *  - Curseur clignotant ▌ tant que stream ouvert
 *  - Bouton Stop pour interrompre via AbortController
 *  - Cleanup auto au démontage (useEffect return)
 */
/* A/B `askai_cta_v1` — 3 variants pour le CTA Soutien sur lock AskAI :
 *  - control  : "Devenir un Soutien — 2,99 € / mois"        → /pro#plans
 *  - discount : "Débloquer pour 2,99 € — sans engagement"   → /pro#plans
 *  - trial    : "Essayer gratuitement 7j"                   → /pro?trial=1
 *
 * Le hook `useVariant` est appelé inconditionnellement (règle des hooks),
 * mais il n'a d'impact UI que dans la branche `!isPro` plus bas. Tracking
 * conversion `click_pro_cta` au click du CTA. La conversion `checkout_complete`
 * reste à instrumenter côté webhook Stripe (hors scope V1).
 */
const ASKAI_EXPERIMENT_ID = "askai_cta_v1";

export default function AskAI({ cryptoId, cryptoName, cryptoSymbol }: Props) {
  const [plan, setPlan] = useState<UserPlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const askAiVariant = useVariant(ASKAI_EXPERIMENT_ID);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [waitingFirstToken, setWaitingFirstToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  // Cleanup : si le composant démonte en plein stream → abort
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setWaitingFirstToken(false);
  }, []);

  const handleAsk = async (q: string) => {
    if (!plan?.isPro) return;
    if (!q.trim() || q.length < 5) {
      setError("Question trop courte (minimum 5 caractères).");
      return;
    }

    // Si un stream est déjà en cours → on l'annule
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setAnswer("");
    setStreaming(true);
    setWaitingFirstToken(true);

    try {
      const res = await fetch(`/api/ask/${cryptoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: q, website: "" }),
        signal: controller.signal,
      });

      // Si la réponse n'est PAS un SSE → c'est une erreur JSON pré-stream
      // (rate limit, plan, validation, injection, on-topic, honeypot...)
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("text/event-stream")) {
        let errorMsg = "Erreur inconnue.";
        try {
          const data = await res.json();
          errorMsg = data.error ?? errorMsg;
        } catch {
          errorMsg = `Erreur HTTP ${res.status}.`;
        }
        setError(errorMsg);
        setStreaming(false);
        setWaitingFirstToken(false);
        return;
      }

      // Lecture SSE
      const reader = res.body?.getReader();
      if (!reader) {
        setError("Stream indisponible (navigateur trop ancien ?).");
        setStreaming(false);
        setWaitingFirstToken(false);
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse les events SSE complets (séparés par \n\n)
        let sepIdx = buffer.indexOf("\n\n");
        while (sepIdx !== -1) {
          const rawEvent = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          sepIdx = buffer.indexOf("\n\n");

          // Format : "data: {json}" — supporte aussi les events multi-lignes
          // mais Anthropic n'en envoie pas ici.
          const dataLine = rawEvent
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const jsonStr = dataLine.slice(6);
          let event: AskStreamEvent;
          try {
            event = JSON.parse(jsonStr) as AskStreamEvent;
          } catch {
            continue;
          }

          if (event.type === "text") {
            setWaitingFirstToken(false);
            setAnswer((prev) => prev + event.text);
          } else if (event.type === "error") {
            setError(event.message);
            setStreaming(false);
            setWaitingFirstToken(false);
            return;
          } else if (event.type === "done") {
            setStreaming(false);
            setWaitingFirstToken(false);
            return;
          }
          // Event "meta" : on l'ignore pour l'instant (pourrait servir à
          // afficher le modèle utilisé en live).
        }
      }
      // Stream fermé sans event "done" → on considère que c'est OK
      setStreaming(false);
      setWaitingFirstToken(false);
    } catch (err) {
      // AbortError (user a cliqué Stop ou démontage) → silencieux
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError("Connexion interrompue. Réessaie.");
      setStreaming(false);
      setWaitingFirstToken(false);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
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
                  href={
                    askAiVariant === "trial" ? "/pro?trial=1" : "/pro#plans"
                  }
                  onClick={() =>
                    trackVariantConversion(
                      ASKAI_EXPERIMENT_ID,
                      askAiVariant,
                      "click_pro_cta",
                    )
                  }
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-background hover:bg-primary/90 transition-colors"
                >
                  {askAiVariant === "discount"
                    ? "Débloquer pour 2,99 € — sans engagement"
                    : askAiVariant === "trial"
                      ? "Essayer gratuitement 7j"
                      : "Devenir un Soutien — 2,99 € / mois"}
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
              disabled={streaming}
              aria-label="Question à l'IA"
            />
            {streaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-rose/15 border border-accent-rose/40 px-5 py-3 text-sm font-semibold text-accent-rose hover:bg-accent-rose/25 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-rose focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Arrêter la génération"
              >
                <Square className="h-4 w-4" fill="currentColor" />
                Arrêter
              </button>
            ) : (
              <button
                type="submit"
                disabled={question.trim().length < 5}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                <Send className="h-4 w-4" />
                Demander
              </button>
            )}
          </form>

          {/* Suggestions cliquables */}
          {!answer && !streaming && (
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

          {/* Loader pré-premier-token */}
          {waitingFirstToken && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-2 text-sm text-primary-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Réflexion en cours…</span>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="rounded-xl border border-accent-rose/30 bg-accent-rose/5 p-4 flex items-start gap-2 text-sm text-accent-rose">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Réponse — affichée dès le premier token, curseur clignotant pendant stream */}
          {(answer || streaming) && !waitingFirstToken && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-soft">
                  Réponse IA · Claude Haiku{streaming ? " · streaming…" : ""}
                </span>
              </div>
              <div className="text-sm text-fg/90 leading-relaxed whitespace-pre-wrap">
                {answer}
                {streaming && (
                  <span
                    className="inline-block w-[0.55em] h-[1em] align-text-bottom ml-0.5 bg-primary animate-cursor-blink"
                    aria-hidden="true"
                  />
                )}
              </div>
              {!streaming && (
                <div className="mt-4 text-[11px] text-muted border-t border-border/50 pt-3">
                  Réponse IA générique — non un conseil financier. Cryptoreflex
                  n&apos;est pas PSAN. Limite : 20 questions par jour.
                </div>
              )}
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
        @keyframes cursorBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .animate-cursor-blink { animation: cursorBlink 1s step-end infinite; }
      `}</style>
    </section>
  );
}

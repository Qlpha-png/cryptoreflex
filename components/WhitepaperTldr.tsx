"use client";

/**
 * <WhitepaperTldr /> — Composant signature de Cryptoreflex.
 *
 * Permet a un utilisateur de coller le texte d'un whitepaper crypto et
 * d'obtenir une analyse structurée (résumé + red flags + score BS).
 *
 * V1 : appelle l'API `/api/analyze-whitepaper` qui exécute une analyse
 * heuristique pure (sans IA). V2 : bascule LLM via OpenRouter.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  Loader2,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import type {
  RedFlag,
  Severity,
  Verdict,
  WhitepaperAnalysis,
} from "@/lib/whitepaper-analyzer";

const MAX_INPUT_LENGTH = 30_000;
const MIN_INPUT_LENGTH = 200;

type InputMode = "text" | "url";

export default function WhitepaperTldr() {
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<WhitepaperAnalysis | null>(null);

  const charCount = text.length;
  const canAnalyze = useMemo(() => {
    if (loading) return false;
    if (mode === "text") return charCount >= MIN_INPUT_LENGTH && charCount <= MAX_INPUT_LENGTH;
    return url.trim().length > 8;
  }, [mode, charCount, url, loading]);

  async function handleAnalyze() {
    setError(null);
    setAnalysis(null);
    setLoading(true);
    try {
      const body =
        mode === "text" ? { text } : { url: url.trim() };
      const res = await fetch("/api/analyze-whitepaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `Erreur HTTP ${res.status}`);
      }
      setAnalysis(data as WhitepaperAnalysis);
      // Scroll doux vers les resultats
      setTimeout(() => {
        const el = document.getElementById("wp-tldr-results");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setText("");
    setUrl("");
    setAnalysis(null);
    setError(null);
  }

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Carte input                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div id="wp-tldr-input" className="glass glow-border rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-cyan">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-white">
              Analyser un whitepaper
            </h2>
            <p className="text-sm text-muted">
              Colle le texte ou une URL — analyse en moins de 5 secondes
            </p>
          </div>
        </div>

        {/* Tabs mode */}
        <div className="mb-4 inline-flex rounded-xl border border-border bg-elevated/40 p-1">
          <TabButton
            active={mode === "text"}
            onClick={() => setMode("text")}
            icon={<FileText className="h-4 w-4" />}
            label="Coller le texte"
          />
          <TabButton
            active={mode === "url"}
            onClick={() => setMode("url")}
            icon={<LinkIcon className="h-4 w-4" />}
            label="URL PDF (V1.1)"
            disabled
          />
        </div>

        {mode === "text" ? (
          <div>
            <label htmlFor="wp-input-text" className="sr-only">
              Texte du whitepaper
            </label>
            <textarea
              id="wp-input-text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_INPUT_LENGTH))}
              placeholder="Colle ici le texte intégral du whitepaper (introduction, problématique, solution, tokenomics, équipe, roadmap...)"
              rows={12}
              className="w-full rounded-xl bg-background border border-border px-4 py-3 text-white text-sm
                         focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20
                         font-mono resize-y"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>
                Min {MIN_INPUT_LENGTH} caracteres — Max{" "}
                {MAX_INPUT_LENGTH.toLocaleString("fr-FR")} caracteres
              </span>
              <span
                className={
                  charCount > MAX_INPUT_LENGTH * 0.95
                    ? "text-accent-rose font-semibold"
                    : charCount >= MIN_INPUT_LENGTH
                      ? "text-accent-green"
                      : ""
                }
              >
                {charCount.toLocaleString("fr-FR")} / {MAX_INPUT_LENGTH.toLocaleString("fr-FR")}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="wp-input-url" className="sr-only">
              URL du whitepaper PDF
            </label>
            <input
              id="wp-input-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemple.com/whitepaper.pdf"
              className="w-full rounded-xl bg-background border border-border px-4 py-3 text-white
                         focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled
            />
            <p className="mt-2 text-xs text-muted">
              Le support des URL PDF arrive en V1.1. Pour l'instant, copie-colle le texte directement.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="inline-flex items-center justify-center gap-2 rounded-xl
                       bg-gradient-to-r from-primary to-accent-cyan px-6 py-3
                       font-semibold text-white shadow-lg
                       hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed
                       transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Analyser
              </>
            )}
          </button>

          {(text || url || analysis) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-xl
                         border border-border bg-elevated/40 px-4 py-3
                         font-medium text-white/80 hover:text-white hover:border-primary/40
                         transition"
            >
              <RefreshCcw className="h-4 w-4" />
              Recommencer
            </button>
          )}

          <p className="text-xs text-muted sm:ml-auto">
            Aucune donnée n'est stockée. Analyse stateless côté serveur.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-accent-rose/40 bg-accent-rose/10 p-4 text-sm text-accent-rose">
            <strong>Erreur :</strong> {error}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Resultats                                                         */}
      {/* ----------------------------------------------------------------- */}
      {analysis && (
        <div id="wp-tldr-results" className="space-y-6">
          <VerdictCard score={analysis.score} verdict={analysis.verdict} />

          <div className="grid md:grid-cols-2 gap-6">
            <SummaryCard title="Problème adresse" body={analysis.summary.problem} />
            <SummaryCard title="Solution technique" body={analysis.summary.solution} />
          </div>

          <TokenomicsCard tokenomics={analysis.summary.tokenomics} />
          <TeamCard team={analysis.summary.team} />
          <RedFlagsCard redFlags={analysis.redFlags} />

          <p className="text-xs text-muted leading-relaxed">
            {analysis.disclaimer} — Moteur : <code>{analysis.meta.engine}</code> —
            {" "}
            {analysis.meta.durationMs}ms — {analysis.meta.inputLength.toLocaleString("fr-FR")} caracteres
            {analysis.meta.inputTruncated && " (texte tronque)"}
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */

function TabButton({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition
                  ${active
                    ? "bg-primary text-white"
                    : "text-white/70 hover:text-white"}
                  ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}

function VerdictCard({ score, verdict }: { score: number; verdict: Verdict }) {
  const config = verdictConfig(verdict);
  const Icon = config.icon;
  return (
    <div
      className={`glass glow-border rounded-2xl p-6 sm:p-8 border ${config.borderClass}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-2xl ${config.bgClass}`}
        >
          <Icon className={`h-10 w-10 ${config.iconClass}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm uppercase tracking-wide text-muted">Verdict</p>
          <h3 className={`text-3xl sm:text-4xl font-extrabold ${config.textClass}`}>
            {verdict}
          </h3>
          <p className="mt-1 text-sm text-white/70">{config.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm uppercase tracking-wide text-muted">Score BS</p>
          <p className={`font-mono font-extrabold text-5xl ${config.textClass}`}>
            {score}
            <span className="text-2xl text-white/40">/100</span>
          </p>
        </div>
      </div>

      {/* Jauge */}
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-elevated/60">
        <div
          className={`h-full ${config.bgGauge}`}
          style={{ width: `${score}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-muted">
        <span>0 Sérieux</span>
        <span>30</span>
        <span>60</span>
        <span>100 Suspect</span>
      </div>
    </div>
  );
}

function SummaryCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/80 leading-relaxed">{body}</p>
    </div>
  );
}

function TokenomicsCard({
  tokenomics,
}: {
  tokenomics: WhitepaperAnalysis["summary"]["tokenomics"];
}) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-bold text-white mb-4">Tokenomics</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat
          label="Supply totale"
          value={tokenomics.totalSupply ?? "Non détectée"}
          warn={!tokenomics.totalSupply}
        />
        <Stat
          label="Allocation équipe"
          value={tokenomics.teamAllocation ?? "Non détectée"}
          warn={!tokenomics.teamAllocation}
        />
        <Stat
          label="Vesting / lock"
          value={tokenomics.hasVesting ? "Oui" : "Non detecte"}
          warn={!tokenomics.hasVesting}
          good={tokenomics.hasVesting}
        />
      </div>
      {tokenomics.raw && tokenomics.raw !== "Section tokenomics non détectée." && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-muted hover:text-white/70">
            Voir l'extrait detecte
          </summary>
          <p className="mt-2 text-xs text-white/60 leading-relaxed border-l-2 border-border pl-3">
            {tokenomics.raw}
          </p>
        </details>
      )}
    </div>
  );
}

function TeamCard({ team }: { team: WhitepaperAnalysis["summary"]["team"] }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-white mb-2">Équipe</h3>
          {team.isAnonymous ? (
            <p className="text-sm text-accent-rose flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Équipe anonyme ou non clairement identifiable (red flag)
            </p>
          ) : (
            <p className="text-sm text-accent-green flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Membres identifies dans le texte
            </p>
          )}
          {team.mentions.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {team.mentions.map((m) => (
                <li
                  key={m}
                  className="rounded-full border border-border bg-elevated/40 px-3 py-1 text-xs text-white/80"
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {team.raw && team.raw !== "Section équipe non détectée." && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-muted hover:text-white/70">
            Voir l'extrait detecte
          </summary>
          <p className="mt-2 text-xs text-white/60 leading-relaxed border-l-2 border-border pl-3">
            {team.raw}
          </p>
        </details>
      )}
    </div>
  );
}

function RedFlagsCard({ redFlags }: { redFlags: RedFlag[] }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white">Risques détectés</h3>
        <span className="text-xs text-muted">
          {redFlags.length} red flag{redFlags.length > 1 ? "s" : ""}
        </span>
      </div>

      {redFlags.length === 0 ? (
        <div className="rounded-xl border border-accent-green/30 bg-accent-green/10 p-4">
          <p className="text-sm text-accent-green flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Aucun red flag majeur detecte par l'analyse heuristique.
          </p>
          <p className="mt-2 text-xs text-white/60">
            Cela ne signifie pas que le projet est sans risque — l'absence de détection
            ne remplace pas une lecture humaine attentive du whitepaper complet.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {redFlags.map((flag) => (
            <li
              key={flag.id}
              className="rounded-xl border border-border bg-elevated/30 p-4"
            >
              <div className="flex items-start gap-3">
                <SeverityBadge severity={flag.severity} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">
                    {flag.label}
                  </p>
                  {flag.matched && (
                    <p className="mt-1 text-xs text-white/60 italic">
                      &laquo; {flag.matched.length > 200 ? `${flag.matched.slice(0, 200)}...` : flag.matched} &raquo;
                    </p>
                  )}
                </div>
                <span className="text-xs font-mono text-white/50 whitespace-nowrap">
                  +{flag.points} pts · {flag.id}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const config: Record<Severity, { label: string; bg: string; text: string }> = {
    low: { label: "Faible", bg: "bg-yellow-500/15", text: "text-yellow-400" },
    medium: { label: "Moyen", bg: "bg-orange-500/15", text: "text-orange-400" },
    high: { label: "Eleve", bg: "bg-red-500/15", text: "text-red-400" },
    critical: { label: "Critique", bg: "bg-red-700/20", text: "text-red-300" },
  };
  const c = config[severity];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

function Stat({
  label,
  value,
  warn,
  good,
}: {
  label: string;
  value: string;
  warn?: boolean;
  good?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1 font-semibold ${
          good ? "text-accent-green" : warn ? "text-accent-rose" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers visuels                                                           */
/* -------------------------------------------------------------------------- */

function verdictConfig(verdict: Verdict) {
  switch (verdict) {
    case "Sérieux":
      return {
        icon: ShieldCheck,
        subtitle: "Aucun red flag majeur detecte",
        textClass: "text-accent-green",
        iconClass: "text-accent-green",
        bgClass: "bg-accent-green/15",
        borderClass: "border-accent-green/30",
        bgGauge: "bg-accent-green",
      };
    case "Mitigé":
      return {
        icon: ShieldQuestion,
        subtitle: "Quelques signaux a investiguer",
        textClass: "text-orange-400",
        iconClass: "text-orange-400",
        bgClass: "bg-orange-500/15",
        borderClass: "border-orange-500/30",
        bgGauge: "bg-orange-500",
      };
    case "Suspect":
    default:
      return {
        icon: ShieldAlert,
        subtitle: "Plusieurs red flags critiques",
        textClass: "text-accent-rose",
        iconClass: "text-accent-rose",
        bgClass: "bg-accent-rose/15",
        borderClass: "border-accent-rose/40",
        bgGauge: "bg-accent-rose",
      };
  }
}

"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  calculateFlatTax,
  formatEur,
  type PlusValueResult,
} from "@/lib/tax-fr";

interface TaxResultProps {
  result: PlusValueResult;
  /** Total annuel des cessions, pour rappeler le seuil 305 €. */
  totalCessionsAnnee?: number;
}

export default function TaxResult({ result, totalCessionsAnnee }: TaxResultProps) {
  const flat = calculateFlatTax(result.plusValue);
  const isProfit = result.plusValue > 0 && !result.exonere;
  const isDeficit = result.deficit;

  return (
    <div
      className="glass glow-border rounded-2xl p-6 sm:p-8 animate-fade-in-up"
      role="region"
      aria-labelledby="tax-result-title"
    >
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h3
            id="tax-result-title"
            className="font-display font-bold text-xl text-white"
          >
            Ton estimation fiscale
          </h3>
          <p className="text-sm text-muted">
            Calcul indicatif basé sur l'article 150 VH bis du CGI
          </p>
        </div>
        <span
          className={`badge ${
            isProfit
              ? "border-primary/40 bg-primary/10 text-primary-soft"
              : isDeficit
              ? "border-accent-rose/40 bg-accent-rose/10 text-accent-rose"
              : "border-accent-green/40 bg-accent-green/10 text-accent-green"
          }`}
        >
          {isProfit ? (
            <>
              <TrendingUp className="h-3.5 w-3.5" /> Plus-value
            </>
          ) : isDeficit ? (
            <>
              <TrendingDown className="h-3.5 w-3.5" /> Moins-value
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Exonéré
            </>
          )}
        </span>
      </div>

      {/* Bandeau exonération 305 € */}
      {result.exonere && (
        <div className="mb-5 rounded-xl border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-accent-green flex gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Cession exonérée</p>
            <p className="text-accent-green/90">
              Le total de tes cessions de l'année ({formatEur(totalCessionsAnnee ?? 0)})
              est inférieur ou égal au seuil de 305 €. Aucun impôt n'est dû sur cette
              vente, mais elle reste à déclarer.
            </p>
          </div>
        </div>
      )}

      {/* Bandeau déficit */}
      {isDeficit && (
        <div className="mb-5 rounded-xl border border-accent-rose/30 bg-accent-rose/10 p-4 text-sm flex gap-3">
          <Info
            className="h-5 w-5 shrink-0 mt-0.5 text-accent-rose"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-accent-rose">Moins-value constatée</p>
            <p className="text-white/80">
              Cette moins-value est imputable uniquement sur les plus-values crypto
              de la <strong>même année</strong>. Pour les particuliers, elle{" "}
              <strong>n'est pas reportable</strong> sur les années suivantes
              (régime du 150 VH bis).
            </p>
          </div>
        </div>
      )}

      <dl className="grid sm:grid-cols-2 gap-4">
        <Tile
          label="Plus-value imposable"
          value={formatEur(result.plusValue)}
          tone={isProfit ? "primary" : isDeficit ? "rose" : "muted"}
          mono
        />
        <Tile
          label="Prix d'acquisition imputé"
          value={formatEur(result.prixAcquisitionImpute)}
          tone="muted"
          mono
          help="acquisitions × montant_vente / valeur_portefeuille"
        />
        <Tile
          label="IR (12,8 %)"
          value={formatEur(flat.montantIR)}
          tone="muted"
          mono
        />
        <Tile
          label="Prélèvements sociaux (17,2 %)"
          value={formatEur(flat.montantPS)}
          tone="muted"
          mono
        />
      </dl>

      <div className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-soft font-semibold">
              Flat tax due (PFU 30 %)
            </p>
            <p className="mt-1 font-mono font-bold text-3xl text-white">
              {formatEur(flat.totalFlatTax)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Net après impôt</p>
            <p
              className={`font-mono font-semibold text-lg ${
                flat.netApresImpot >= 0 ? "text-accent-green" : "text-accent-rose"
              }`}
            >
              {formatEur(flat.netApresImpot)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Bientôt disponible"
          className="btn-ghost opacity-60 cursor-not-allowed"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Télécharge le récap PDF
          <span className="ml-1 text-xs text-muted font-normal">(bientôt)</span>
        </button>
        <a
          href="/blog/declarer-crypto-impots-2086-3916-bis"
          className="btn-primary"
        >
          Comment remplir le 2086 avec ces chiffres ?
        </a>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Calcul indicatif. Vérifie tes déclarations avec un expert-comptable
          ou directement auprès de l'administration fiscale.
        </span>
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  tone = "muted",
  mono = false,
  help,
}: {
  label: string;
  value: string;
  tone?: "primary" | "rose" | "muted";
  mono?: boolean;
  help?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary-soft"
      : tone === "rose"
      ? "text-accent-rose"
      : "text-white";
  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-4">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd
        className={`mt-1 ${mono ? "font-mono" : ""} font-semibold text-lg ${toneClass}`}
      >
        {value}
      </dd>
      {help && (
        <p className="mt-1 text-[11px] text-muted/80 font-mono">{help}</p>
      )}
    </div>
  );
}

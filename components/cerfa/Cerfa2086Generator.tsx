"use client";

/**
 * <Cerfa2086Generator />
 * ----------------------
 * Composant client de l'outil "Génération auto Cerfa 2086 + 3916-bis"
 * (gratuit pour tout le monde — démonétisation juin 2026).
 *
 * Flow utilisateur :
 *  1. Upload CSV (Binance/Coinbase/Bitpanda) ou JSON Waltio
 *     + saisie nom + année fiscale.
 *  2. Client : parse CSV en JSON normalisé.
 *  3. Preview : affiche résumé (n cessions, plus-values, impôt PFU estimé)
 *               via un POST "dry-run" léger (utilise le même endpoint mais
 *               on demande uniquement le PDF — la preview locale lit
 *               les chiffres dans la réponse). En V1, on appelle l'API
 *               qui retourne le PDF + headers de comptage ; on calcule la
 *               preview côté client en parallèle pour l'UX.
 *  4. Téléchargement : blob PDF.
 *
 * Conformité YMYL :
 *  - disclaimer renforcé en haut + en bas du composant
 *  - validation par un fiscaliste recommandée
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CerfaSummary } from "@/lib/cerfa-2086";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types locaux (réplique légère de lib/cerfa-2086.ts pour le client)        */
/* -------------------------------------------------------------------------- */

type CerfaTxType = "buy" | "sell" | "swap" | "transfer" | "fee" | "reward";

interface CerfaTransaction {
  date: string;
  type: CerfaTxType;
  asset: string;
  quantity: number;
  priceEur: number;
  fees: number;
  exchange?: string;
  /** (Vente) Valeur globale du portefeuille au moment de la cession — ligne 212, saisie par l'utilisateur. */
  portfolioValueEur?: number;
}

type State = "idle" | "parsing" | "preview" | "generating" | "success" | "error";

interface Props {
  /** Symbole crypto pré-sélectionné (depuis une fiche). Optionnel. */
  cryptoId?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers parsing CSV (côté client — symétrique du serveur)                 */
/* -------------------------------------------------------------------------- */

const REQUIRED_HEADERS = ["date", "type", "asset", "quantity"]; // priceEur peut être 0
const SUPPORTED_TYPES = new Set(["buy", "sell", "swap", "transfer", "fee", "reward"]);

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (cols[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", ".").trim());
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function csvToTransactions(rows: Array<Record<string, string>>): {
  txs: CerfaTransaction[];
  errors: string[];
} {
  const errors: string[] = [];
  if (rows.length === 0) {
    return { txs: [], errors: ["Fichier CSV vide ou en-têtes manquantes."] };
  }

  const sample = rows[0];
  for (const h of REQUIRED_HEADERS) {
    if (!(h in sample)) {
      errors.push(`Colonne manquante : ${h}. Colonnes attendues : ${REQUIRED_HEADERS.join(", ")}, price_eur (ou priceEur), fees, exchange.`);
      return { txs: [], errors };
    }
  }

  const txs: CerfaTransaction[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const type = (r.type ?? "").toLowerCase();
    if (!SUPPORTED_TYPES.has(type)) {
      errors.push(`Ligne ${i + 2}: type "${type}" non supporté.`);
      continue;
    }
    const date = r.date;
    if (!date || Number.isNaN(new Date(date).getTime())) {
      errors.push(`Ligne ${i + 2}: date invalide.`);
      continue;
    }
    const asset = (r.asset ?? "").toUpperCase();
    if (!asset) {
      errors.push(`Ligne ${i + 2}: actif vide.`);
      continue;
    }
    const quantity = num(r.quantity);
    const priceEur = num(r.priceeur ?? r.price_eur ?? r.price ?? "0");
    const fees = num(r.fees ?? "0");
    if (!Number.isFinite(quantity)) {
      errors.push(`Ligne ${i + 2}: quantité invalide.`);
      continue;
    }
    // Ligne 212 (ventes) : valeur globale du portefeuille au moment de la cession, si l'utilisateur la fournit.
    const pvRaw = r.portfolio_value_eur ?? r.portfoliovalueeur ?? r.valeur_portefeuille_eur ?? "";
    const portfolioValueEur = pvRaw.trim() ? num(pvRaw) : NaN;
    txs.push({
      date,
      type: type as CerfaTxType,
      asset,
      quantity,
      priceEur: Number.isFinite(priceEur) ? priceEur : 0,
      fees: Number.isFinite(fees) ? fees : 0,
      exchange: r.exchange || undefined,
      ...(type === "sell" && Number.isFinite(portfolioValueEur) && portfolioValueEur > 0
        ? { portfolioValueEur }
        : {}),
    });
  }
  return { txs, errors };
}

/* -------------------------------------------------------------------------- */
/*  Aperçu : calculé par le serveur (audit 2026-10-03)                         */
/* -------------------------------------------------------------------------- */
// L'ancien calcul client (prorata par crypto, « dernier prix connu ») n'était
// pas celui du formulaire : l'aperçu divergeait du PDF. Désormais l'aperçu est
// demandé à /api/cerfa-2086 avec `preview: true` : même moteur (lib/cerfa-2086,
// formule de la ligne 224), aucun PDF, pas de compte requis.

function fmtEur(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                       */
/* -------------------------------------------------------------------------- */

export default function Cerfa2086Generator({ cryptoId: _cryptoId }: Props) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<CerfaTransaction[]>([]);
  const [taxYear, setTaxYear] = useState<number>(new Date().getUTCFullYear() - 1);
  const [taxpayerName, setTaxpayerName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<CerfaSummary | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Aperçu serveur : même moteur que le PDF. Relancé à chaque fichier ou
  // changement d'année ; la requête précédente est annulée.
  useEffect(() => {
    if (transactions.length === 0) {
      setPreview(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setPreviewLoading(true);
    setPreviewError(null);
    fetch("/api/cerfa-2086", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview: true, transactions, taxYear }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: string; summary?: CerfaSummary }
          | null;
        if (!res.ok || !body?.ok || !body.summary) {
          throw new Error(body?.error || `Aperçu indisponible (erreur ${res.status}).`);
        }
        setPreview(body.summary);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPreview(null);
        setPreviewError(err instanceof Error ? err.message : "Aperçu indisponible.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setPreviewLoading(false);
      });
    return () => ctrl.abort();
  }, [transactions, taxYear]);

  /* ---------- Handlers fichier ---------- */

  const handleFileText = useCallback(
    async (text: string, sourceName: string) => {
      setState("parsing");
      setErrorMsg(null);
      setParseErrors([]);

      try {
        // Heuristique : JSON Waltio ?
        const trimmed = text.trim();
        let txs: CerfaTransaction[] = [];
        let errors: string[] = [];

        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          // Tentative JSON (Waltio export)
          const json = JSON.parse(trimmed);
          const arr = Array.isArray(json) ? json : Array.isArray(json.transactions) ? json.transactions : null;
          if (!arr) {
            errors.push("JSON détecté mais format inattendu (tableau de transactions requis).");
          } else {
            txs = arr
              .map((row: unknown): CerfaTransaction | null => {
                if (!row || typeof row !== "object") return null;
                const r = row as Record<string, unknown>;
                const type = String(r.type ?? "").toLowerCase();
                if (!SUPPORTED_TYPES.has(type)) return null;
                const q = num(r.quantity ?? r.amount);
                const p = num(r.priceEur ?? r.price_eur ?? r.price);
                const fees = num(r.fees ?? 0);
                const pvj = num(r.portfolioValueEur ?? r.portfolio_value_eur ?? NaN);
                return {
                  date: String(r.date ?? ""),
                  type: type as CerfaTxType,
                  asset: String(r.asset ?? r.symbol ?? "").toUpperCase(),
                  quantity: Number.isFinite(q) ? q : 0,
                  priceEur: Number.isFinite(p) ? p : 0,
                  fees: Number.isFinite(fees) ? fees : 0,
                  exchange:
                    typeof r.exchange === "string" ? r.exchange : undefined,
                  ...(type === "sell" && Number.isFinite(pvj) && pvj > 0
                    ? { portfolioValueEur: pvj }
                    : {}),
                };
              })
              .filter((x: CerfaTransaction | null): x is CerfaTransaction => x !== null);
          }
        } else {
          // CSV
          const rows = parseCsv(text);
          const parsed = csvToTransactions(rows);
          txs = parsed.txs;
          errors = parsed.errors;
        }

        if (txs.length === 0) {
          setParseErrors(
            errors.length > 0
              ? errors
              : [`Aucune transaction valide trouvée dans ${sourceName}.`],
          );
          setState("error");
          setTransactions([]);
          return;
        }

        if (txs.length > 1000) {
          setErrorMsg(
            `Trop de transactions (${txs.length}, max 1000 par PDF). Découpez votre fichier par année.`,
          );
          setState("error");
          setTransactions([]);
          return;
        }

        setTransactions(txs);
        setParseErrors(errors);
        setState("preview");
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? `Erreur de lecture : ${err.message}`
            : "Erreur de lecture du fichier.",
        );
        setState("error");
        setTransactions([]);
      }
    },
    [],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Fichier trop lourd (max 5 MB).");
        setState("error");
        return;
      }
      const text = await file.text();
      await handleFileText(text, file.name);
    },
    [handleFileText],
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      void handleFile(file);
    },
    [handleFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      void handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  /* ---------- Submit ---------- */

  const handleGenerate = useCallback(async () => {
    if (transactions.length === 0) return;
    setState("generating");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/cerfa-2086", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", accept: "application/pdf" },
        body: JSON.stringify({
          transactions,
          taxYear,
          taxpayerName: taxpayerName || undefined,
        }),
      });

      if (res.status === 401) {
        setErrorMsg("Vous devez vous reconnecter pour générer le PDF.");
        setState("error");
        return;
      }
      if (res.status === 429) {
        setErrorMsg(
          "Vous avez atteint la limite de 5 PDFs par jour. Réessayez demain.",
        );
        setState("error");
        return;
      }
      if (!res.ok) {
        let msg = `Erreur ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          /* swallow */
        }
        setErrorMsg(msg);
        setState("error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cryptoreflex-cerfa-2086-${taxYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState("success");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "Erreur réseau lors de la génération.",
      );
      setState("error");
    }
  }, [transactions, taxYear, taxpayerName]);

  const reset = useCallback(() => {
    setTransactions([]);
    setParseErrors([]);
    setErrorMsg(null);
    setState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  /* ---------- Rendu ---------- */

  return (
    <div className="space-y-6">
      {/* Disclaimer YMYL renforcé */}
      <div
        role="note"
        className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-fg/90 flex gap-3"
      >
        <AlertTriangle
          className="h-5 w-5 shrink-0 text-warning-fg mt-0.5"
          aria-hidden="true"
        />
        <p>
          <strong className="text-warning-fg">Outil d'aide à la déclaration :</strong>{" "}
          ce PDF est un récapitulatif généré automatiquement à partir de vos
          données. <strong>La validation par un fiscaliste ou expert-comptable
          spécialisé crypto est fortement recommandée</strong> avant tout dépôt
          officiel sur impots.gouv.fr.
        </p>
      </div>

      {/* À quoi sert le document (demande de Kev, 03/10/2026) : le visiteur doit comprendre
          AVANT d'importer qu'il obtient une feuille de route à recopier, pas un formulaire à envoyer. */}
      <div className="rounded-xl border border-border bg-elevated/40 p-4 text-sm text-fg/85">
        <p className="font-semibold text-fg">Ce que vous obtenez, et ce que vous en faites</p>
        <p className="mt-1">
          Un <strong>récapitulatif ligne par ligne</strong> (lignes 211 à 224 du 2086 pour chaque
          cession, total à reporter en 3AN/3BN) et une <strong>fiche de préparation 3916-bis</strong>{" "}
          par compte étranger. Vous <strong>recopiez</strong> ces chiffres dans votre déclaration en
          ligne sur impots.gouv.fr : le PDF ne se dépose pas et ne se joint pas (le site des impôts
          n&apos;accepte aucun fichier), il vous guide et vous sert de justificatif.
        </p>
      </div>

      {/* Mode "guidé" — 3 étapes visuelles pour rassurer un débutant */}
      <ol className="grid sm:grid-cols-3 gap-3 text-sm">
        {[
          {
            n: "1",
            title: "Exportez votre CSV",
            desc: "Sur Coinbase, Kraken ou Bitpanda : Compte → Historique → Exporter en CSV (vos anciens exports Binance passent aussi).",
            done: transactions.length > 0,
          },
          {
            n: "2",
            title: "Importez-le ici",
            desc: "Glissez-déposez ou cliquez pour parcourir. L'aperçu est calculé ligne par ligne, comme le PDF.",
            done: state === "preview" || state === "success",
          },
          {
            n: "3",
            title: "Téléchargez votre PDF",
            desc: "Vérifiez l'aperçu, téléchargez, puis recopiez les lignes dans votre déclaration en ligne (le PDF ne se dépose pas).",
            done: state === "success",
          },
        ].map((step) => (
          <li
            key={step.n}
            className={`relative rounded-2xl border p-4 transition-colors ${
              step.done
                ? "border-success/40 bg-success/5"
                : "border-border bg-elevated/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step.done
                    ? "bg-success text-background"
                    : "bg-primary/15 text-primary"
                }`}
                aria-hidden="true"
              >
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : step.n}
              </span>
              <h3 className="font-bold text-fg">{step.title}</h3>
            </div>
            <p className="text-xs text-fg/65 leading-relaxed">{step.desc}</p>
          </li>
        ))}
      </ol>

      {/* Tutoriel "Où trouver mon CSV ?" — repliable */}
      <details className="glass rounded-xl p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-fg flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary-soft" aria-hidden="true" />
          Où trouver mon CSV de transactions ? (clique pour voir le pas-à-pas par
          plateforme)
        </summary>
        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
          {[
            {
              name: "Binance (ancien compte)",
              steps: [
                "Connectez-vous sur binance.com",
                "Compte (icône en haut à droite) → Historique de transactions",
                "Sélectionnez la période (toute l'année fiscale)",
                "Cliquez « Exporter rapport CSV » — délai 24-48h, email envoyé",
              ],
            },
            {
              name: "Coinbase",
              steps: [
                "Connectez-vous sur coinbase.com",
                "Profil → Rapports → Générer un rapport",
                "Période : année fiscale complète",
                "Format CSV → Télécharger",
              ],
            },
            {
              name: "Bitpanda",
              steps: [
                "Connectez-vous sur bitpanda.com",
                "Mon profil → Historique → Exporter",
                "Type : Toutes les transactions",
                "Format CSV → Télécharger",
              ],
            },
          ].map((p) => (
            <div key={p.name} className="rounded-lg border border-border/60 bg-elevated/40 p-3">
              <div className="font-bold text-fg mb-2">{p.name}</div>
              <ol className="list-decimal list-inside space-y-1 text-fg/70">
                {p.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-fg/55">
          Vous utilisez un autre exchange ? Importez votre export Waltio (JSON) — c&apos;est
          le format pivot universel pour les déclarants crypto FR.
        </p>
      </details>

      {/* Inputs : nom + année */}
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-semibold text-fg">Année fiscale</span>
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            className="mt-2 w-full rounded-lg border border-border bg-elevated/60 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Sélectionner l'année fiscale"
          >
            {[0, 1, 2, 3].map((delta) => {
              const y = new Date().getUTCFullYear() - 1 - delta;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-fg">
            Nom du contribuable <span className="text-fg/65 font-normal">(optionnel)</span>
          </span>
          <input
            type="text"
            value={taxpayerName}
            onChange={(e) => setTaxpayerName(e.target.value)}
            placeholder="Ex. Dupont Jean"
            maxLength={120}
            className="mt-2 w-full rounded-lg border border-border bg-elevated/60 px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Nom du contribuable, optionnel"
          />
        </label>
      </div>

      {/* Drag & drop + sélection fichier */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
          isDragOver
            ? "border-primary bg-primary/10"
            : "border-border bg-elevated/40 hover:border-primary-soft"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Importer un fichier CSV ou JSON de transactions"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          onChange={onFileInput}
          className="sr-only"
        />
        <Upload
          className="h-10 w-10 mx-auto text-primary-soft"
          aria-hidden="true"
        />
        <p className="mt-3 font-semibold text-fg">
          Déposez votre CSV (Coinbase, Kraken, Bitpanda, anciens exports Binance) ou JSON Waltio
        </p>
        <p className="mt-1 text-xs text-fg/60">
          ou clique pour parcourir — max 5 MB, 1000 lignes
        </p>
        <p className="mt-3 text-[11px] text-fg/55">
          Colonnes attendues :{" "}
          <code className="font-mono">date, type, asset, quantity, price_eur, fees, exchange</code>
          {" "}· sur les ventes, <code className="font-mono">portfolio_value_eur</code> (valeur du
          portefeuille au moment de la vente, ligne 212) si vous la connaissez
        </p>
      </div>

      {/* État : parsing */}
      {state === "parsing" && (
        <div className="flex items-center gap-3 text-sm text-fg/70" aria-live="polite">
          <Loader2 className="h-5 w-5 animate-spin text-primary-soft" aria-hidden="true" />
          Lecture du fichier…
        </div>
      )}

      {/* Parse warnings */}
      {parseErrors.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <div className="flex items-center gap-2 mb-2 text-warning-fg font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {parseErrors.length} ligne(s) ignorée(s) :
          </div>
          <ul className="list-disc pl-5 space-y-1 text-fg/70 max-h-40 overflow-auto">
            {parseErrors.slice(0, 10).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {parseErrors.length > 10 && (
              <li>… et {parseErrors.length - 10} autres.</li>
            )}
          </ul>
        </div>
      )}

      {/* Aperçu (calculé par le serveur avec le moteur du PDF) */}
      {transactions.length > 0 && state !== "parsing" && (
        <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-soft" aria-hidden="true" />
            <h3 className="font-bold text-fg">
              Aperçu des chiffres pour l'année {taxYear}
            </h3>
          </div>

          {previewLoading && (
            <div className="flex items-center gap-2 text-sm text-fg/70" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-primary-soft" aria-hidden="true" />
              Calcul ligne par ligne (formulaire 2086)…
            </div>
          )}

          {!previewLoading && previewError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-fg/85"
            >
              <XCircle className="inline h-4 w-4 mr-1 text-danger-fg" aria-hidden="true" />
              {previewError}
            </div>
          )}

          {!previewLoading && preview && (
            <>
              {preview.calculIncomplet && (
                <div
                  role="alert"
                  className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-fg/90"
                >
                  <AlertTriangle
                    className="inline h-4 w-4 mr-1 text-warning-fg"
                    aria-hidden="true"
                  />
                  <strong>Calcul incomplet :</strong> {preview.nbCessionsACompleter} cession
                  {preview.nbCessionsACompleter > 1 ? "s" : ""} sur {preview.nbCessions} n'
                  {preview.nbCessionsACompleter > 1 ? "ont" : "a"} pas de valeur globale du
                  portefeuille (ligne 212). Les totaux ci-dessous sont partiels : ajoutez la
                  colonne <code className="font-mono">portfolio_value_eur</code> sur ces ventes,
                  ou un prix du jour pour chaque actif détenu.
                </div>
              )}

              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <PreviewRow
                  label="Cessions de l'année"
                  value={
                    preview.calculIncomplet
                      ? `${preview.nbCessions} (dont ${preview.nbCessionsACompleter} à compléter)`
                      : String(preview.nbCessions)
                  }
                />
                <PreviewRow
                  label="Total des prix de cession (l. 213)"
                  value={fmtEur(preview.totalCessionsEur)}
                />
                <PreviewRow
                  label="Plus-values (lignes 224 positives)"
                  value={fmtEur(preview.totalPlusValuesEur)}
                  tone="success"
                />
                <PreviewRow
                  label="Moins-values (lignes 224 négatives)"
                  value={fmtEur(preview.totalMoinsValuesEur)}
                  tone="muted"
                />
                <PreviewRow
                  label={preview.calculIncomplet ? "Plus-value nette (partielle)" : "Plus-value nette"}
                  value={fmtEur(preview.plusValueNetteEur)}
                  tone={preview.plusValueNetteEur >= 0 ? "success" : "danger"}
                  strong
                />
                <PreviewRow
                  label={preview.exonere ? "Impôt PFU 31,4 % (exonéré)" : "Impôt PFU 31,4 % estimé"}
                  value={fmtEur(preview.impotPfuEur)}
                  tone="primary"
                  strong
                />
              </dl>

              {preview.foreignExchanges.length > 0 && (
                <div className="text-xs text-fg/65">
                  <strong className="text-fg/80">Plateformes étrangères détectées :</strong>{" "}
                  {preview.foreignExchanges.join(", ")}
                  <span className="ml-2 text-fg/65">
                    (une fiche de préparation 3916-bis par compte, à recopier dans votre déclaration en ligne)
                  </span>
                </div>
              )}

              {preview.exonere && preview.nbCessions > 0 && (
                <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-xs text-fg/85">
                  <CheckCircle2
                    className="inline h-4 w-4 mr-1 text-success"
                    aria-hidden="true"
                  />
                  Total des prix de cession nets de frais (ligne 218) ≤ 305 € sur l'année :
                  exonération (article 150 VH bis, II-B du CGI). Les lignes restent remplies
                  pour information.
                </div>
              )}

              {preview.avertissements.length > 0 && (
                <details className="text-xs text-fg/75">
                  <summary className="cursor-pointer font-semibold text-fg/85">
                    {preview.avertissements.length} point
                    {preview.avertissements.length > 1 ? "s" : ""} à vérifier avant dépôt
                  </summary>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    {preview.avertissements.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={state === "generating"}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {state === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Génération en cours… (2-5 s)
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Télécharger le PDF
                </>
              )}
            </button>
            <button type="button" onClick={reset} className="btn-ghost">
              Recommencer
            </button>
          </div>
        </div>
      )}

      {/* Erreur */}
      {state === "error" && errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-fg/90 flex gap-3"
        >
          <XCircle
            className="h-5 w-5 shrink-0 text-danger-fg mt-0.5"
            aria-hidden="true"
          />
          <div>
            <strong className="text-danger-fg">Erreur :</strong> {errorMsg}
            <button
              type="button"
              onClick={reset}
              className="block mt-2 text-xs underline text-fg/70 hover:text-fg"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Succès */}
      {state === "success" && (
        <div
          role="status"
          className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm text-fg/90 flex gap-3"
        >
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-success mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <strong className="text-success">PDF téléchargé.</strong> Et maintenant ? Ce PDF
            ne se dépose pas : vous recopiez ses chiffres dans votre déclaration en ligne.
            <ol className="mt-3 list-decimal pl-5 space-y-1.5 text-fg/85">
              <li>
                Sur <strong>impots.gouv.fr</strong> → « Déclarer mes revenus » → cochez la rubrique{" "}
                <strong>« Plus-values et gains divers »</strong> → écran « Plus-values sur actifs
                numériques » → ouvrez l&apos;<strong>Annexe 2086</strong>.
              </li>
              <li>
                Pour chaque cession, recopiez les <strong>lignes 211 à 224</strong> telles qu&apos;elles
                figurent dans le PDF (une colonne « Cession » par vente).
              </li>
              <li>
                Reportez le total des lignes 224 en case <strong>3AN</strong> (plus-value) ou{" "}
                <strong>3BN</strong> (moins-value) de la 2042-C ; <strong>3CN</strong> seulement si vous
                optez pour le barème.
              </li>
              <li>
                Un compte sur une plateforme étrangère = une <strong>annexe 3916-bis</strong> à remplir en
                ligne, à l&apos;aide de la fiche de préparation jointe (une par compte).
              </li>
              <li>Gardez le PDF et vos exports CSV : ce sont vos justificatifs.</li>
            </ol>
            <p className="mt-3 text-xs text-fg/70">
              Pas à pas avec captures d&apos;écran :{" "}
              <a href="/blog/declaration-crypto-cerfa-2086-tutoriel-2026" className="underline hover:text-fg">
                tutoriel Cerfa 2086
              </a>{" "}
              · comptes à déclarer :{" "}
              <a href="/outils/radar-3916-bis" className="underline hover:text-fg">
                radar 3916-bis
              </a>
              . Faites valider par un professionnel avant de valider votre déclaration.
            </p>
            <button
              type="button"
              onClick={reset}
              className="block mt-3 text-xs underline text-fg/70 hover:text-fg"
            >
              Générer un autre PDF
            </button>
          </div>
        </div>
      )}

      {/* Aide format CSV */}
      <details className="glass rounded-xl p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-fg flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary-soft" aria-hidden="true" />
          Format CSV attendu (clique pour voir)
        </summary>
        <div className="mt-3 space-y-2 text-fg/75 text-xs">
          <p>
            Colonnes obligatoires (en-têtes en minuscules) :{" "}
            <code className="font-mono">date, type, asset, quantity</code>.
            Optionnelles : <code className="font-mono">price_eur, fees, exchange, portfolio_value_eur</code>.
          </p>
          <p>
            <code className="font-mono">price_eur</code> est le prix unitaire en euros.{" "}
            <code className="font-mono">portfolio_value_eur</code>, sur une ligne{" "}
            <code className="font-mono">sell</code>, est la valeur en euros de tout votre
            portefeuille crypto au moment de cette vente (ligne 212 du formulaire). Sans elle,
            l'outil la calcule avec les prix du jour qu'il connaît ; s'il en manque un, la
            cession est marquée « à compléter » plutôt qu'estimée.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-elevated/60 p-3 text-[11px] font-mono leading-relaxed">
{`date,type,asset,quantity,price_eur,fees,exchange,portfolio_value_eur
2024-03-15,buy,BTC,0.05,60000,5,Kraken,
2024-09-22,sell,BTC,0.02,58000,3,Kraken,2140
2024-11-10,reward,ETH,0.5,2300,0,Coinbase,`}
          </pre>
          <p>
            Types acceptés : <code className="font-mono">buy</code> (achat),{" "}
            <code className="font-mono">sell</code> (vente, taxable),{" "}
            <code className="font-mono">swap</code> (crypto/crypto, neutre),{" "}
            <code className="font-mono">transfer</code>,{" "}
            <code className="font-mono">fee</code>,{" "}
            <code className="font-mono">reward</code> (staking/airdrop).
          </p>
        </div>
      </details>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sous-composant : ligne de preview                                         */
/* -------------------------------------------------------------------------- */

interface PreviewRowProps {
  label: string;
  value: string;
  tone?: "success" | "danger" | "primary" | "muted" | "default";
  strong?: boolean;
}

function PreviewRow({ label, value, tone = "default", strong = false }: PreviewRowProps) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger-fg"
        : tone === "primary"
          ? "text-primary"
          : tone === "muted"
            ? "text-fg/60"
            : "text-fg";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-elevated/40 px-3 py-2">
      <dt className="text-fg/70">{label}</dt>
      <dd className={`${toneClass} ${strong ? "font-extrabold text-base" : "font-semibold"}`}>
        {value}
      </dd>
    </div>
  );
}

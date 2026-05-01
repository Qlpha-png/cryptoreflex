"use client";

/**
 * <Cerfa2086Generator />
 * ----------------------
 * Composant client de l'outil "Génération auto Cerfa 2086 + 3916-bis"
 * (réservé aux abonnés Soutien / Pro).
 *
 * Flow utilisateur :
 *  1. (Free)  → encart lock + CTA upgrade. Pas d'upload exposé.
 *  2. (Pro)   → upload CSV (Binance/Coinbase/Bitpanda) ou JSON Waltio
 *              + saisie nom + année fiscale.
 *  3. Client : parse CSV en JSON normalisé.
 *  4. Preview : affiche résumé (n cessions, plus-values, impôt PFU estimé)
 *               via un POST "dry-run" léger (utilise le même endpoint mais
 *               on demande uniquement le PDF — la preview locale lit
 *               les chiffres dans la réponse). En V1, on appelle l'API
 *               qui retourne le PDF + headers de comptage ; on calcule la
 *               preview côté client en parallèle pour l'UX.
 *  5. Téléchargement : blob PDF.
 *
 * Conformité YMYL :
 *  - disclaimer renforcé en haut + en bas du composant
 *  - validation par un fiscaliste recommandée
 */

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Crown,
  Download,
  FileText,
  Lock,
  Loader2,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { useUserPlan } from "@/lib/use-user-plan";

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
}

interface PreviewSummary {
  nbCessions: number;
  totalCessions: number;
  totalPV: number;
  totalMV: number;
  plusValueNette: number;
  impotEstime: number;
  exchanges: string[];
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
    txs.push({
      date,
      type: type as CerfaTxType,
      asset,
      quantity,
      priceEur: Number.isFinite(priceEur) ? priceEur : 0,
      fees: Number.isFinite(fees) ? fees : 0,
      exchange: r.exchange || undefined,
    });
  }
  return { txs, errors };
}

/* -------------------------------------------------------------------------- */
/*  Calcul preview (client) — version simplifiée du serveur                   */
/* -------------------------------------------------------------------------- */

/**
 * Calcule un résumé approximatif côté client pour afficher la preview avant
 * envoi serveur. La vérité reste le serveur (qui re-calcule via lib/tax-fr).
 */
function computePreview(txs: CerfaTransaction[], taxYear: number): PreviewSummary {
  const sorted = [...txs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const holdings = new Map<string, { qty: number; totalAcquis: number }>();
  const lastPrice = new Map<string, number>();

  let nb = 0;
  let totalCessions = 0;
  let pv = 0;
  let mv = 0;
  const exchangesSet = new Set<string>();

  for (const tx of sorted) {
    const year = new Date(tx.date).getUTCFullYear();
    if (tx.priceEur > 0) lastPrice.set(tx.asset, tx.priceEur);
    if (tx.exchange) exchangesSet.add(tx.exchange);

    if (tx.type === "buy" || tx.type === "reward") {
      const cur = holdings.get(tx.asset) ?? { qty: 0, totalAcquis: 0 };
      cur.qty += tx.quantity;
      cur.totalAcquis += tx.quantity * tx.priceEur;
      holdings.set(tx.asset, cur);
    } else if (tx.type === "sell") {
      const cur = holdings.get(tx.asset) ?? { qty: 0, totalAcquis: 0 };
      const prixCession = tx.quantity * tx.priceEur;
      let valeurPort = 0;
      let acqTot = 0;
      for (const [a, h] of holdings.entries()) {
        valeurPort += h.qty * (lastPrice.get(a) ?? 0);
        acqTot += h.totalAcquis;
      }
      if (valeurPort < prixCession) valeurPort = prixCession;

      if (year === taxYear && prixCession > 0 && valeurPort > 0) {
        const prixAcqImpute = (acqTot * prixCession) / valeurPort;
        const plusValue = prixCession - prixAcqImpute;
        nb += 1;
        totalCessions += prixCession;
        if (plusValue >= 0) pv += plusValue;
        else mv += Math.abs(plusValue);
      }
      // Maj portefeuille post-cession
      if (cur.qty > 0) {
        const ratio = Math.min(1, tx.quantity / cur.qty);
        cur.totalAcquis = cur.totalAcquis * (1 - ratio);
        cur.qty = Math.max(0, cur.qty - tx.quantity);
        holdings.set(tx.asset, cur);
      }
    }
  }

  const plusValueNette = pv - mv;
  // Impôt PFU 30 % sur base imposable positive (si total > 305 €)
  const exonere = totalCessions <= 305;
  const impotEstime =
    !exonere && plusValueNette > 0 ? plusValueNette * 0.30 : 0;

  return {
    nbCessions: nb,
    totalCessions,
    totalPV: pv,
    totalMV: mv,
    plusValueNette,
    impotEstime,
    exchanges: Array.from(exchangesSet).sort(),
  };
}

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

const monthlyPriceLabel = process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE ?? "2,99 €";

export default function Cerfa2086Generator({ cryptoId: _cryptoId }: Props) {
  const { isPro, loading: planLoading, isAuthenticated } = useUserPlan();

  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<CerfaTransaction[]>([]);
  const [taxYear, setTaxYear] = useState<number>(new Date().getUTCFullYear() - 1);
  const [taxpayerName, setTaxpayerName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const preview = useMemo<PreviewSummary | null>(() => {
    if (transactions.length === 0) return null;
    return computePreview(transactions, taxYear);
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
                return {
                  date: String(r.date ?? ""),
                  type: type as CerfaTxType,
                  asset: String(r.asset ?? r.symbol ?? "").toUpperCase(),
                  quantity: Number.isFinite(q) ? q : 0,
                  priceEur: Number.isFinite(p) ? p : 0,
                  fees: Number.isFinite(fees) ? fees : 0,
                  exchange:
                    typeof r.exchange === "string" ? r.exchange : undefined,
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
            `Trop de transactions (${txs.length}, max 1000 par PDF). Découpe ton fichier par année.`,
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
        setErrorMsg("Tu dois te reconnecter pour générer le PDF.");
        setState("error");
        return;
      }
      if (res.status === 403) {
        setErrorMsg("Cette fonctionnalité est réservée aux abonnés Soutien.");
        setState("error");
        return;
      }
      if (res.status === 429) {
        setErrorMsg(
          "Tu as atteint la limite de 5 PDFs par jour. Réessaie demain.",
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

  if (planLoading) {
    return (
      <div
        className="glass rounded-2xl p-8 min-h-[300px] flex items-center justify-center"
        aria-live="polite"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary-soft" aria-hidden="true" />
        <span className="ml-3 text-sm text-fg/70">Vérification de ton plan…</span>
      </div>
    );
  }

  /* === Cas FREE → encart lock + CTA upgrade === */
  if (!isPro) {
    return (
      <div className="glass rounded-2xl p-6 sm:p-8 border border-warning/40 bg-warning/5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-bold text-gold">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Réservé aux abonnés Soutien
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-fg">
              Génère ton Cerfa 2086 + 3916-bis pré-rempli en 30 secondes
            </h2>
            <p className="mt-2 text-sm text-fg/75 leading-relaxed">
              Importe tes exports Binance, Coinbase ou Bitpanda — le calcul
              officiel <span className="font-semibold">article 150 VH bis du CGI</span>{" "}
              est appliqué automatiquement, et tu reçois un PDF prêt à
              accompagner ta déclaration sur impots.gouv.fr.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-fg/80">
              {[
                "Annexe Cerfa 2086 récapitulative (cessions ligne par ligne)",
                "Annexe 3916-bis automatique pour chaque exchange étranger",
                "Calcul prorata portefeuille (formule 150 VH bis)",
                "5 PDF/jour inclus — couvre toute ta préparation déclarative",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    className="h-4 w-4 mt-0.5 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pro"
                className="btn-primary"
                aria-label="Devenir Soutien pour débloquer la génération auto Cerfa 2086"
              >
                <Crown className="h-4 w-4" aria-hidden="true" />
                Devenir Soutien — {monthlyPriceLabel}/mois
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {!isAuthenticated && (
                <Link href="/connexion?next=/outils/cerfa-2086-auto" className="btn-ghost">
                  J'ai déjà un compte
                </Link>
              )}
            </div>

            <p className="mt-4 text-xs text-fg/55">
              Annulable en 1 clic depuis Stripe Customer Portal. Sans engagement.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* === Cas PRO === */
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
          ce PDF est un récapitulatif généré automatiquement à partir de tes
          données. <strong>La validation par un fiscaliste ou expert-comptable
          spécialisé crypto est fortement recommandée</strong> avant tout dépôt
          officiel sur impots.gouv.fr.
        </p>
      </div>

      {/* Mode "guidé" — 3 étapes visuelles pour rassurer un débutant */}
      <ol className="grid sm:grid-cols-3 gap-3 text-sm">
        {[
          {
            n: "1",
            title: "Exporte ton CSV",
            desc: "Sur Binance/Coinbase/Bitpanda : Compte → Historique → Exporter en CSV.",
            done: transactions.length > 0,
          },
          {
            n: "2",
            title: "Importe-le ici",
            desc: "Glisse-dépose ou clique pour parcourir. Le calcul est instantané.",
            done: state === "preview" || state === "success",
          },
          {
            n: "3",
            title: "Télécharge ton PDF",
            desc: "Vérifie l'aperçu, clique « Télécharger ». Cerfa 2086 + 3916-bis prêts.",
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
              name: "Binance",
              steps: [
                "Connecte-toi sur binance.com",
                "Compte (icône en haut à droite) → Historique de transactions",
                "Sélectionne la période (toute l'année fiscale)",
                "Clique « Exporter rapport CSV » — délai 24-48h, email envoyé",
              ],
            },
            {
              name: "Coinbase",
              steps: [
                "Connecte-toi sur coinbase.com",
                "Profil → Rapports → Générer un rapport",
                "Période : année fiscale complète",
                "Format CSV → Télécharger",
              ],
            },
            {
              name: "Bitpanda",
              steps: [
                "Connecte-toi sur bitpanda.com",
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
          Tu utilises un autre exchange ? Importe ton export Waltio (JSON) — c&apos;est
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
            Nom du contribuable <span className="text-fg/50 font-normal">(optionnel)</span>
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
          Dépose ton CSV (Binance, Coinbase, Bitpanda) ou JSON Waltio
        </p>
        <p className="mt-1 text-xs text-fg/60">
          ou clique pour parcourir — max 5 MB, 1000 lignes
        </p>
        <p className="mt-3 text-[11px] text-fg/55">
          Colonnes attendues :{" "}
          <code className="font-mono">date, type, asset, quantity, price_eur, fees, exchange</code>
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

      {/* Preview */}
      {preview && state !== "parsing" && (
        <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-soft" aria-hidden="true" />
            <h3 className="font-bold text-fg">
              Aperçu des chiffres pour l'année {taxYear}
            </h3>
          </div>

          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <PreviewRow label="Cessions détectées" value={String(preview.nbCessions)} />
            <PreviewRow label="Total des cessions" value={fmtEur(preview.totalCessions)} />
            <PreviewRow
              label="Plus-values brutes"
              value={fmtEur(preview.totalPV)}
              tone="success"
            />
            <PreviewRow
              label="Moins-values"
              value={fmtEur(preview.totalMV)}
              tone="muted"
            />
            <PreviewRow
              label="Plus-value nette"
              value={fmtEur(preview.plusValueNette)}
              tone={preview.plusValueNette >= 0 ? "success" : "danger"}
              strong
            />
            <PreviewRow
              label="Impôt PFU 30 % estimé"
              value={fmtEur(preview.impotEstime)}
              tone="primary"
              strong
            />
          </dl>

          {preview.exchanges.length > 0 && (
            <div className="text-xs text-fg/65">
              <strong className="text-fg/80">Exchanges détectés :</strong>{" "}
              {preview.exchanges.join(", ")}
              <span className="ml-2 text-fg/50">
                (un 3916-bis sera généré pour chaque compte étranger)
              </span>
            </div>
          )}

          {preview.totalCessions <= 305 && preview.nbCessions > 0 && (
            <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-xs text-fg/85">
              <CheckCircle2
                className="inline h-4 w-4 mr-1 text-success"
                aria-hidden="true"
              />
              Total des cessions ≤ 305 € : exonération applicable (article 150 VH bis II du CGI).
            </div>
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
          <div>
            <strong className="text-success">PDF généré et téléchargé !</strong>{" "}
            Vérifie chaque ligne avec ton fiscaliste avant de déposer ta
            déclaration sur impots.gouv.fr.
            <button
              type="button"
              onClick={reset}
              className="block mt-2 text-xs underline text-fg/70 hover:text-fg"
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
            Optionnelles : <code className="font-mono">price_eur, fees, exchange</code>.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-elevated/60 p-3 text-[11px] font-mono leading-relaxed">
{`date,type,asset,quantity,price_eur,fees,exchange
2024-03-15,buy,BTC,0.05,3200,5,Binance
2024-09-22,sell,BTC,0.02,1450,3,Binance
2024-11-10,reward,ETH,0.5,1800,0,Coinbase`}
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

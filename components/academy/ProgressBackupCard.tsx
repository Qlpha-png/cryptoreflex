"use client";

/**
 * <ProgressBackupCard /> — Sauvegarde & restauration de progression (sans compte).
 *
 * Problème résolu : localStorage est lié à UN navigateur / UN appareil.
 * Si l'utilisateur vide son cache ou change de PC/téléphone, sa progression
 * disparaît. Ce composant lui donne un code (base64 opaque) qu'il copie et
 * conserve. Il peut le coller plus tard pour tout restaurer.
 *
 * Flux :
 *   - Exporter : génère un code → affiche dans un textarea → bouton "Copier"
 *   - Importer : colle un code → valide → restaure → recharge la page
 *
 * Aucune donnée personnelle dans le code (slugs + booleans uniquement).
 */

import { useEffect, useRef, useState } from "react";
import { Download, Upload, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import { exportAcademyData, importAcademyData } from "@/lib/academy-progress";

type ExportState =
  | { kind: "idle" }
  | { kind: "shown"; code: string }
  | { kind: "copied" };

type ImportState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; msg: string };

export default function ProgressBackupCard() {
  const [tab, setTab] = useState<"export" | "import">("export");
  const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });
  const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
  const [importCode, setImportCode] = useState("");
  const codeRef = useRef<HTMLTextAreaElement>(null);

  // Reset entre onglets
  useEffect(() => {
    setExportState({ kind: "idle" });
    setImportState({ kind: "idle" });
    setImportCode("");
  }, [tab]);

  function handleExport() {
    const code = exportAcademyData();
    if (!code) {
      setExportState({ kind: "shown", code: "" });
    } else {
      setExportState({ kind: "shown", code });
    }
  }

  async function handleCopy() {
    if (exportState.kind !== "shown" || !exportState.code) return;
    try {
      await navigator.clipboard.writeText(exportState.code);
      setExportState({ kind: "copied" });
      setTimeout(() => setExportState({ kind: "shown", code: exportState.code }), 2000);
    } catch {
      if (codeRef.current) {
        codeRef.current.select();
        document.execCommand("copy");
      }
    }
  }

  function handleImport() {
    if (!importCode.trim()) {
      setImportState({ kind: "error", msg: "Collez votre code de sauvegarde avant de restaurer." });
      return;
    }
    setImportState({ kind: "loading" });
    try {
      const ok = importAcademyData(importCode.trim());
      if (ok) {
        setImportState({ kind: "success" });
        // Recharge après 1s pour que l'UI reflète la progression restaurée
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setImportState({ kind: "error", msg: "Code invalide ou vide — vérifiez que vous n'avez pas tronqué le code." });
      }
    } catch {
      setImportState({ kind: "error", msg: "Erreur lors de la restauration. Code corrompu ?" });
    }
  }

  return (
    <section
      aria-labelledby="backup-h"
      className="mt-10 rounded-2xl border border-border bg-surface/60 p-6 sm:p-8"
    >
      <h2 id="backup-h" className="flex items-center gap-2 text-lg font-bold text-fg">
        Sauvegarder votre progression
      </h2>
      <p className="mt-1 text-sm text-muted">
        Votre progression vit dans votre navigateur. Si vous videz votre cache ou changez
        d&apos;appareil, exportez votre code de sauvegarde — et collez-le sur le nouvel
        appareil pour tout retrouver.
      </p>

      {/* Onglets */}
      <div className="mt-4 flex gap-1 rounded-lg border border-border bg-elevated/40 p-1 w-fit">
        {(["export", "import"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-surface text-fg shadow-sm"
                : "text-muted hover:text-fg"
            }`}
          >
            {t === "export" ? "Exporter" : "Importer"}
          </button>
        ))}
      </div>

      {/* ── EXPORT ── */}
      {tab === "export" && (
        <div className="mt-4">
          {exportState.kind === "idle" && (
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-elevated/60 px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Générer mon code de sauvegarde
            </button>
          )}

          {exportState.kind === "shown" && (
            <div className="space-y-3">
              {exportState.code ? (
                <>
                  <p className="text-xs text-muted">
                    Copiez ce code et conservez-le (notes, email à vous-même, fichier texte).
                  </p>
                  <div className="relative">
                    <textarea
                      ref={codeRef}
                      readOnly
                      value={exportState.code}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-border bg-background/60 p-3 font-mono text-xs text-fg/90 focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Code de sauvegarde"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-elevated"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Copier
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted italic">
                  Aucune progression enregistrée pour l&apos;instant — commencez une leçon pour créer une sauvegarde.
                </p>
              )}
            </div>
          )}

          {exportState.kind === "copied" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-300">
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              Copié ! Conservez ce code en lieu sûr.
            </div>
          )}
        </div>
      )}

      {/* ── IMPORT ── */}
      {tab === "import" && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            Collez ici le code exporté depuis un autre appareil pour restaurer votre progression.
          </p>
          <textarea
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            rows={4}
            placeholder="Collez votre code ici…"
            className="w-full resize-none rounded-xl border border-border bg-background/60 p-3 font-mono text-xs text-fg/90 placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Code de sauvegarde à restaurer"
          />

          {importState.kind === "error" && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {importState.msg}
            </div>
          )}

          {importState.kind === "success" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-300">
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              Progression restaurée ! La page se recharge…
            </div>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={importState.kind === "loading" || importState.kind === "success"}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importState.kind === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            Restaurer ma progression
          </button>
        </div>
      )}
    </section>
  );
}

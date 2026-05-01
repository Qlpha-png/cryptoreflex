"use client";

/**
 * DeleteAccountButton — Bouton DSR RGPD (art. 17) avec double confirmation.
 *
 * Appelle POST /api/account/delete avec body { confirm: "DELETE" }. L'endpoint
 * cancel les subscriptions Stripe + supprime le user Supabase + invalide la
 * session. Au succès, redirect vers la home.
 *
 * UX :
 *  - 1er clic : ouvre une modale de confirmation
 *  - L'user doit taper "SUPPRIMER" en majuscules pour activer le bouton final
 *  - Affichage clair des conséquences (Stripe cancel, perte des données, etc.)
 *  - Loading state pendant l'appel
 *  - Erreur affichée si l'API renvoie autre chose que 200
 */

import { useState } from "react";
import { AlertCircle, X, Trash2 } from "lucide-react";

export default function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReady = typed === "SUPPRIMER";

  const handleDelete = async () => {
    if (!isReady || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          data?.error ??
            `Échec de la suppression (HTTP ${res.status}). Contacte le support.`
        );
        setLoading(false);
        return;
      }
      // Succès → redirige vers la home (cookies session déjà invalidés côté serveur).
      window.location.href = "/?deleted=1";
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Erreur réseau. Réessaie ou contacte le support."
      );
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-danger hover:text-danger inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-danger/40 hover:bg-danger/10 transition-colors min-h-[40px]"
      >
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        Supprimer mon compte
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="glass rounded-2xl p-6 max-w-md w-full border border-danger/40 shadow-e4 relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-elevated/60 text-muted hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
            <h3
              id="delete-title"
              className="text-lg font-extrabold text-danger flex items-center gap-2"
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" />
              Supprimer mon compte (RGPD art. 17)
            </h3>
            <p className="mt-3 text-sm text-fg/80 leading-relaxed">
              Cette action est <strong className="text-fg">irréversible</strong>.
              Elle déclenche :
            </p>
            <ul className="mt-2 space-y-1 text-sm text-fg/75 list-disc pl-5">
              <li>Annulation immédiate de toutes tes souscriptions Stripe</li>
              <li>Suppression de ton profil utilisateur</li>
              <li>
                Anonymisation de tes données associées (alertes, etc.)
              </li>
              <li>
                Conservation des factures Stripe 10 ans (obligation comptable
                art. L123-22 Code de commerce)
              </li>
            </ul>
            <p className="mt-4 text-sm text-fg/80">
              Pour confirmer, tape{" "}
              <code className="rounded bg-elevated px-1.5 py-0.5 text-xs font-bold text-danger">
                SUPPRIMER
              </code>{" "}
              ci-dessous :
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck="false"
              className="mt-2 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm font-mono text-fg focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/40"
              placeholder="SUPPRIMER"
              disabled={loading}
            />
            {error && (
              <p
                role="alert"
                className="mt-3 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg p-3"
              >
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!isReady || loading}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-danger text-white font-semibold px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-danger/90 transition-colors"
              >
                {loading ? (
                  "Suppression en cours…"
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Supprimer définitivement
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="text-sm text-fg/80 hover:text-fg px-3 py-2"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";

/**
 * ManageSubscriptionButton — Redirige vers Stripe Customer Portal.
 *
 * Le portal Stripe permet en 1 clic :
 *  - Mettre à jour la carte
 *  - Télécharger les factures
 *  - Annuler l'abonnement (conforme décret 2022-34, 1 clic max)
 *  - Changer de plan (mensuel ↔ annuel)
 */
export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Impossible d'accéder au portail");
      }

      // Redirect vers Stripe Customer Portal
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn-primary btn-primary-shine min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed inline-flex"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Redirection en cours...
          </>
        ) : (
          <>
            Gérer mon abonnement
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

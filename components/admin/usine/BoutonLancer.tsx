"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { lancerPoste } from "@/app/admin/usine/actions";

/** Bouton « Lancer » d'un poste : appelle l'action serveur (admin seulement) et affiche la réponse de GitHub. */
export default function BoutonLancer({ posteId, nom }: { posteId: string; nom: string }) {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <button
        type="button"
        disabled={enCours}
        onClick={() => {
          if (!window.confirm(`Demander à GitHub de lancer « ${nom} » maintenant ?`)) return;
          setMessage(null);
          demarrer(async () => {
            try {
              const r = await lancerPoste(posteId);
              setMessage({ ok: r.ok, texte: r.message });
            } catch {
              setMessage({ ok: false, texte: "Lancement impossible (erreur réseau ou session expirée)." });
            }
          });
        }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
      >
        <Play className="h-3 w-3" aria-hidden />
        {enCours ? "Demande en cours…" : "Lancer maintenant"}
      </button>
      {message && (
        <p role="status" className={`text-xs ${message.ok ? "text-success-fg" : "text-danger-fg"}`}>
          {message.texte}
        </p>
      )}
    </div>
  );
}

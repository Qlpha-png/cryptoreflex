"use client";

import { useState, useTransition } from "react";
import { GitMerge, Undo2 } from "lucide-react";
import { fusionnerProposition, lancerRetourArriere } from "@/app/admin/usine/actions";

/**
 * Boutons d'action de la ligne de gestion : « Fusionner » une proposition de l'Usine (après lecture de sa carte) et
 * « Retour arrière » (annuler la dernière fusion en cause, recommandé par le garde-fou). Chaque clic demande confirmation
 * et affiche la réponse de GitHub. Réservé aux administrateurs côté serveur.
 */
export function BoutonFusionner({ numero, titre }: { numero: number; titre: string }) {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={enCours}
        onClick={() => {
          if (!window.confirm(`Fusionner la proposition #${numero} « ${titre} » dans main ? Vercel la déploiera.`)) return;
          setMessage(null);
          demarrer(async () => {
            try {
              const r = await fusionnerProposition(numero);
              setMessage({ ok: r.ok, texte: r.message });
            } catch {
              setMessage({ ok: false, texte: "Fusion impossible (erreur réseau ou session expirée)." });
            }
          });
        }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-success-border bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-fg hover:brightness-110 disabled:opacity-50"
      >
        <GitMerge className="h-3 w-3" aria-hidden />
        {enCours ? "Fusion en cours…" : "Fusionner"}
      </button>
      {message && <p role="status" className={`text-xs ${message.ok ? "text-success-fg" : "text-danger-fg"}`}>{message.texte}</p>}
    </div>
  );
}

export function BoutonRetourArriere({ sha }: { sha: string }) {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={enCours}
        onClick={() => {
          if (!window.confirm(`Annuler la fusion ${sha.slice(0, 10)} et redéployer l'état précédent du site ?`)) return;
          setMessage(null);
          demarrer(async () => {
            try {
              const r = await lancerRetourArriere();
              setMessage({ ok: r.ok, texte: r.message });
            } catch {
              setMessage({ ok: false, texte: "Demande impossible (erreur réseau ou session expirée)." });
            }
          });
        }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-warning-border bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-fg hover:brightness-110 disabled:opacity-50"
      >
        <Undo2 className="h-3 w-3" aria-hidden />
        {enCours ? "Demande en cours…" : "Retour arrière"}
      </button>
      {message && <p role="status" className={`text-xs ${message.ok ? "text-success-fg" : "text-danger-fg"}`}>{message.texte}</p>}
    </div>
  );
}

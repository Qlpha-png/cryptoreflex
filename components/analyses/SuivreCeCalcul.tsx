"use client";

import { useState } from "react";
import { Bell, Copy, Link2 } from "lucide-react";

/**
 * « Suivre ce calcul » (lot L2) : la seule rétention proposée sur ces pages (arbitrages du 08/10/2026 : pas de lettre
 * d'information tant qu'elle n'envoie rien). Alerte de prix existante (seuil choisi par le visiteur), copie du lien,
 * copie du résumé daté en texte brut. Aucun compteur, aucun partage vers un réseau.
 */

const NBSP = String.fromCharCode(0x00a0);
const bouton =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-fg hover:border-fg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";

export default function SuivreCeCalcul({ url, resume, alerteHref, libelleAlerte }: { url: string; resume: string; alerteHref: string; libelleAlerte: string }) {
  const [etat, setEtat] = useState<"" | "lien" | "resume" | "echec">("");
  const copier = async (texte: string, quoi: "lien" | "resume") => {
    try {
      await navigator.clipboard.writeText(texte);
      setEtat(quoi);
    } catch {
      setEtat("echec");
    }
  };
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a href={alerteHref} className={bouton}>
          <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
          {libelleAlerte}
        </a>
        <button type="button" className={bouton} onClick={() => copier(url, "lien")}>
          <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Copier le lien
        </button>
        <button type="button" className={bouton} onClick={() => copier(resume, "resume")}>
          <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
          Copier le résumé daté
        </button>
      </div>
      <p className="mt-2 min-h-[1.25rem] text-sm text-fg-2" aria-live="polite">
        {etat === "lien" ? "Lien copié." : etat === "resume" ? "Résumé daté copié." : etat === "echec" ? `Copie impossible${NBSP}: sélectionnez le texte ci-dessous.` : ""}
      </p>
      {etat === "echec" ? (
        <textarea readOnly value={`${resume}`} rows={6} className="mt-1 w-full rounded-lg border border-border bg-surface p-3 text-sm text-fg" />
      ) : null}
    </div>
  );
}

"use client";

/**
 * <CertificateShareButton /> — bouton "Partager mes certificats".
 *
 * Construit un lien public /academie/certificat?d=… encodant les parcours
 * validés (et un prénom OPTIONNEL saisi par l'utilisateur — jamais imposé,
 * aucune PII collectée par défaut). Copie le lien dans le presse-papier.
 */

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { encodeCertShare } from "@/lib/academy-progress";

interface CertificateShareButtonProps {
  certifiedTrackIds: string[];
}

export default function CertificateShareButton({
  certifiedTrackIds,
}: CertificateShareButtonProps) {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  if (certifiedTrackIds.length === 0) return null;

  async function handleShare() {
    const code = encodeCertShare(certifiedTrackIds, name);
    if (!code) return;
    const url = `${window.location.origin}/academie/certificat?d=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copie ce lien de partage :", url);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="Ton prénom (optionnel)"
        aria-label="Prénom optionnel pour le certificat partagé"
        className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-fg/90 placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary sm:max-w-[220px]"
      />
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-primary-glow"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Lien copié !
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Partager mes certificats
          </>
        )}
      </button>
    </div>
  );
}

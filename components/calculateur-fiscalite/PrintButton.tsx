"use client";

/**
 * <PrintButton /> — Bouton flottant qui déclenche window.print().
 *
 * Isolé en Client Component pour permettre à la page preview-pdf d'être
 * rendue côté serveur (lecture KV, noindex, sécurité).
 *
 * Visuel :
 *  - Sticky bottom-right desktop, full-width fixed bottom mobile.
 *  - Marqué `no-print` pour disparaître au moment de l'impression
 *    (cf. PdfPreview.tsx: `@media print { .no-print { display: none } }`).
 */

import { Printer } from "lucide-react";

export default function PrintButton() {
  function handleClick() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div className="no-print fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 font-semibold text-slate-900 shadow-xl ring-2 ring-amber-300 transition-transform hover:scale-105 hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-300/60"
        aria-label="Imprimer ou sauvegarder la simulation en PDF"
      >
        <Printer className="h-5 w-5" aria-hidden="true" />
        Imprimer / Sauvegarder en PDF
      </button>
    </div>
  );
}

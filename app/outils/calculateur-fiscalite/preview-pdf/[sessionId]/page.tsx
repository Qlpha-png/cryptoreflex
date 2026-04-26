/**
 * /outils/calculateur-fiscalite/preview-pdf/[sessionId]
 * -----------------------------------------------------
 * Server Component qui :
 *   1. Lit la session KV via getCalculation(sessionId).
 *   2. Si trouvée + non expirée : rend <PdfPreview /> + <PrintButton />.
 *   3. Si invalide / expirée : message + CTA retour calculateur.
 *
 * SEO :
 *   - noindex/nofollow (page perso, ne doit pas remonter dans Google).
 *   - Pas d'OG : c'est un document personnel.
 *
 * Sécurité :
 *   - sessionId UUID v4 — devinette statistiquement impossible.
 *   - TTL 1h limite la fenêtre d'exposition si jamais l'URL fuit.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import PdfPreview from "@/components/calculateur-fiscalite/PdfPreview";
import PrintButton from "@/components/calculateur-fiscalite/PrintButton";
import { getCalculation } from "@/lib/calculateur-pdf-storage";

export const metadata: Metadata = {
  title: "Aperçu PDF de votre simulation fiscalité crypto — Cryptoreflex",
  description:
    "Aperçu personnel de votre simulation fiscalité crypto, prêt à imprimer ou sauvegarder en PDF.",
  robots: { index: false, follow: false, nocache: true },
};

// Cette page est dynamique par essence (sessionId variable, KV lookup).
export const dynamic = "force-dynamic";

interface PageProps {
  params: { sessionId: string };
}

export default async function PreviewPdfPage({ params }: PageProps) {
  const session = await getCalculation(params.sessionId);

  /* ----------- Cas : session invalide ou expirée ----------- */
  if (!session) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-20 sm:py-28">
        <div className="glass rounded-2xl p-6 sm:p-8 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning-fg">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-xl sm:text-2xl font-bold text-white">
            Cet aperçu n'est plus disponible
          </h1>
          <p className="mt-2 text-sm text-white/75">
            Le lien a expiré (validité 1 heure) ou il est invalide. Refais une
            simulation pour récupérer un nouveau PDF.
          </p>
          <Link
            href="/outils/calculateur-fiscalite"
            className="btn-primary mt-6"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour au calculateur
          </Link>
        </div>
      </section>
    );
  }

  /* ----------- Cas nominal : on rend le PDF preview ----------- */
  return (
    <main className="min-h-screen bg-slate-100 py-6 sm:py-10 print:bg-white print:py-0">
      <PdfPreview
        email={session.email}
        input={session.data.input}
        result={session.data.result}
        calculatedAt={session.calculatedAt}
      />
      <PrintButton />
    </main>
  );
}

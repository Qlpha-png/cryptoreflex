/**
 * /academie/certificat — vue publique d'un certificat partagé (lien encodé).
 *
 * noindex : la page n'a de sens qu'avec un payload ?d= ; rien à indexer.
 * Le rendu réel est délégué au Client Component qui lit l'URL.
 */

import type { Metadata } from "next";
import SharedCertificate from "@/components/academy/SharedCertificate";

export const metadata: Metadata = {
  title: "Certificat Académie Cryptoreflex",
  robots: { index: false, follow: true },
};

export default function CertificatPage() {
  return (
    <main className="py-8 sm:py-12">
      <SharedCertificate />
    </main>
  );
}

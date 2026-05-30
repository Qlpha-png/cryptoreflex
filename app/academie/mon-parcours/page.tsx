/**
 * /academie/mon-parcours — Tableau de bord personnel de l'académie.
 *
 * Server Component léger : métadonnées (noindex, page personnelle) + rendu du
 * <MonParcoursDashboard /> (Client, lit la progression localStorage).
 */

import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";
import MonParcoursDashboard from "@/components/academy/MonParcoursDashboard";

const TITLE = "Mon parcours — Académie crypto Cryptoreflex";
const DESCRIPTION =
  "Ton tableau de bord de l'académie crypto Cryptoreflex : progression, parcours terminés et certificats — suivi localement, sans compte.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: withHreflang(`${BRAND.url}/academie/mon-parcours`),
  // Page personnelle (données 100% locales) → aucune valeur SEO à indexer.
  robots: { index: false, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BRAND.url}/academie/mon-parcours`,
    type: "website",
    siteName: BRAND.name,
    locale: "fr_FR",
  },
};

export default function MonParcoursPage() {
  return (
    <main className="py-0">
      <MonParcoursDashboard />
    </main>
  );
}

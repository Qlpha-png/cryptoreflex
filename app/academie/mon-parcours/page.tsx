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
import Breadcrumbs from "@/components/Breadcrumbs";

const TITLE = "Mon parcours — Académie crypto";
const DESCRIPTION =
  "Votre tableau de bord de l'académie crypto Cryptoreflex : progression, parcours terminés et quiz validés — suivi localement, sans compte.";

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
    <div className="py-0">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <Breadcrumbs chemin="/academie/mon-parcours" />
      </div>
      <MonParcoursDashboard />
    </div>
  );
}

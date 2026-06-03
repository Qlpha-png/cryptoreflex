import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /pack-declaration-crypto-2026/checkout — funnel de paiement SUPPRIMÉ
 * (démonétisation juin 2026).
 *
 * Le Pack Déclaration est désormais une ressource 100 % gratuite : il n'y a
 * plus de checkout Stripe. On conserve la route (pas de 404) mais on redirige
 * proprement vers la page ressource, qui contient les liens vers les outils
 * fiscaux gratuits.
 *
 * Reste noindex (aucune valeur SEO propre).
 */

export const metadata: Metadata = {
  title: "Pack Déclaration Crypto 2026 — désormais gratuit",
  description:
    "Le Pack Déclaration Crypto est désormais gratuit. Vous allez être redirigé vers la ressource et les outils fiscaux gratuits.",
  alternates: withHreflang(`${BRAND.url}/pack-declaration-crypto-2026/checkout`),
  robots: { index: false, follow: true },
};

export default function PackDeclarationCheckoutPage() {
  // La vraie redirection serveur (307) est gérée en amont par next.config.js
  // (redirects(), évaluée avant le routing fichier). Cette page reste un
  // fallback applicatif au cas où la règle config serait retirée.
  redirect("/pack-declaration-crypto-2026");
}

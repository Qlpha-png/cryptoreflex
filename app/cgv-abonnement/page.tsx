import type { Metadata } from "next";
import Link from "next/link";
import { Info, ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { withHreflang } from "@/lib/seo-alternates";

/**
 * /cgv-abonnement — CGV d'abonnement OBSOLÈTES (démonétisation juin 2026).
 *
 * Cryptoreflex ne vend plus aucun abonnement payant : le service est désormais
 * 100 % gratuit. Ces Conditions Générales de Vente n'ont donc plus d'objet.
 *
 * On conserve la route (pas de 404, préserve les liens entrants éventuels) et
 * on affiche une notice courte renvoyant vers les CGU, qui régissent l'usage
 * gratuit du site. Aucune mention légale essentielle n'est supprimée ailleurs
 * (mentions légales, confidentialité, médiateur restent sur leurs pages
 * dédiées).
 */

export const metadata: Metadata = {
  title: "CGV abonnement — service désormais gratuit",
  description:
    "Les abonnements payants Cryptoreflex ont été supprimés : le service est désormais 100 % gratuit. L'usage du site est régi par les CGU.",
  alternates: withHreflang(`${BRAND.url}/cgv-abonnement`),
  robots: { index: true, follow: true },
};

export default function CgvAbonnementPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="text-xs text-muted">
        <Link href="/" className="hover:text-fg">Accueil</Link>
        <span className="mx-2">/</span>
        <span className="text-fg/80">CGV abonnement</span>
      </nav>

      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-fg">
        Conditions Générales de Vente — Abonnement
      </h1>
      <p className="mt-2 text-sm text-muted">Mise à jour : juin 2026</p>

      <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <h2 className="text-lg font-bold flex items-center gap-2 text-fg">
          <Info className="h-5 w-5 text-primary" /> Les abonnements payants ont
          été supprimés
        </h2>
        <p className="mt-4 text-sm text-fg/85 leading-relaxed">
          {BRAND.name} est désormais <strong>100 % gratuit</strong>. Il
          n&apos;existe plus d&apos;abonnement payant, ni de paiement en ligne :
          ces Conditions Générales de Vente n&apos;ont donc plus d&apos;objet et
          ne sont conservées que pour information.
        </p>
        <p className="mt-3 text-sm text-fg/85 leading-relaxed">
          L&apos;utilisation du site et de ses outils est régie par nos
          Conditions Générales d&apos;Utilisation.
        </p>
        <Link
          href="/cgu"
          className="mt-5 btn-primary inline-flex items-center gap-1.5"
        >
          Lire les CGU
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <p className="mt-8 text-sm text-fg/80 leading-relaxed">
        Site édité par Kevin Voisin (Entrepreneur Individuel). Pour toute
        question, contactez{" "}
        <a
          href={`mailto:${BRAND.email}`}
          className="text-primary-soft hover:underline"
        >
          {BRAND.email}
        </a>
        .
      </p>

      {/* Liens utiles */}
      <div className="mt-12 flex flex-wrap gap-4">
        <Link
          href="/outils"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-background hover:bg-primary/90"
        >
          Explorer les outils gratuits
        </Link>
        <Link
          href="/mentions-legales"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-fg hover:border-primary/40"
        >
          Mentions légales
        </Link>
        <Link
          href="/confidentialite"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-fg hover:border-primary/40"
        >
          Politique de confidentialité
        </Link>
      </div>
    </article>
  );
}

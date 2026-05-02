import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Mail, ShieldCheck } from "lucide-react";

import { BRAND } from "@/lib/brand";

/**
 * /pack-declaration-crypto-2026/checkout — page transitionnelle.
 *
 * Le module Stripe Checkout one-shot du Pack 49 € est en cours de
 * branchement (Q3 2026). En attendant, cette page affiche un état
 * d'attente sain (au lieu de 404) + permet de capturer la demande
 * via newsletter early-bird (39 €).
 *
 * IMPORTANT: noindex (page transitionnelle, pas de valeur SEO).
 */

export const metadata: Metadata = {
  title: "Paiement Pack Déclaration Crypto 2026 — En cours de mise en ligne",
  description:
    "Le checkout du Pack Déclaration Crypto 49 € est en cours de finalisation. Inscris-toi pour réserver ton accès early-bird à 39 €.",
  alternates: { canonical: `${BRAND.url}/pack-declaration-crypto-2026/checkout` },
  robots: { index: false, follow: true },
};

export default function PackDeclarationCheckoutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 border border-warning/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning-fg">
          <Clock className="h-3 w-3" aria-hidden /> Lancement imminent
        </span>
        <h1 className="mt-5 text-3xl sm:text-5xl font-extrabold tracking-tight">
          Le checkout du{" "}
          <span className="gradient-text">Pack Déclaration 2026</span>{" "}
          arrive bientôt
        </h1>
        <p className="mt-5 text-base sm:text-lg text-fg/80 leading-relaxed">
          Le module Stripe one-shot 49 € est en cours de finalisation. Pour
          tenir le délai du dépôt 2026, on a sécurisé une liste d&apos;attente
          early-bird à <strong>39 € au lieu de 49 €</strong>.
        </p>
      </div>

      <section className="mt-12 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-10 text-center">
        <Mail className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h2 className="mt-4 text-xl sm:text-2xl font-extrabold">
          Réserve ton accès early-bird (39 € au lieu de 49 €)
        </h2>
        <p className="mt-3 text-sm text-fg/80 max-w-md mx-auto">
          Inscris-toi à la newsletter pour être notifié·e dès l&apos;ouverture
          du checkout. Tu seras prioritaire et bénéficieras du tarif réduit
          pendant 48 h.
        </p>
        <Link
          href="/#cat-informe"
          className="mt-5 btn-primary btn-primary-shine inline-flex"
        >
          Réserver mon accès <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 text-sm text-fg/80">
        <div className="rounded-xl border border-border bg-elevated/40 p-4 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden />
          <p>
            Aucune carte bancaire requise pour la liste d&apos;attente.
            Paiement uniquement à l&apos;ouverture du checkout.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-elevated/40 p-4 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-success mt-0.5 shrink-0" aria-hidden />
          <p>
            Garantie satisfait ou remboursé 14 jours dès la mise en ligne.
            Aucun engagement, aucun abonnement caché.
          </p>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        En attendant, tu peux explorer{" "}
        <Link href="/outils/calculateur-fiscalite" className="text-primary-soft hover:underline">
          le calculateur de fiscalité
        </Link>{" "}
        gratuit ou consulter{" "}
        <Link href="/outils/declaration-fiscale-crypto" className="text-primary-soft hover:underline">
          le comparatif des outils déclaration crypto
        </Link>
        .
      </p>
    </main>
  );
}

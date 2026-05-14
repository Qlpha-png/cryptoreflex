import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";

/**
 * <PackCTABlock /> — Bloc CTA réutilisable vers /pack-declaration-crypto-2026.
 *
 * Inséré sur les pages éditoriales fiscalité pour corriger la perte de
 * conversion identifiée (audit 2026-05-14) : aucune des 9 pages fiscales
 * existantes (étude, guide, calculateur, landing) ne mentionnait le pack
 * payant à 49€. Le maillage interne vers le produit conversion était zéro.
 *
 * Wording validé pour éviter toute interprétation de garantie fiscale :
 * - "rassemble les modèles, checklists et supports utiles" (descriptif)
 * - "préparer votre déclaration" (préparation, pas exécution)
 * - "ne remplace pas l'administration fiscale ni un professionnel" (disclaimer
 *   explicite intégré au CTA pour cohérence avec PSAN policy interne)
 *
 * CTA sobre "Voir le pack 2026" (pas "Acheter maintenant" qui serait
 * trop agressif pour une page éditoriale).
 *
 * Server Component — aucun JS client.
 */

interface Props {
  /**
   * Variante de présentation :
   * - "default" : bloc complet avec icône + titre + description + CTA
   * - "compact" : version condensée pour fin de page courte
   */
  variant?: "default" | "compact";
  /** Source de la page parente, utile pour tracking GSC/Clarity ultérieur. */
  fromPage?: string;
}

export default function PackCTABlock({
  variant = "default",
  fromPage,
}: Props) {
  const href = fromPage
    ? `/pack-declaration-crypto-2026?utm_source=internal&utm_medium=link&utm_campaign=fiscal-cta&utm_content=${encodeURIComponent(fromPage)}`
    : "/pack-declaration-crypto-2026";

  if (variant === "compact") {
    return (
      <div className="not-prose my-8 rounded-xl border border-primary/30 bg-primary/[0.04] p-5">
        <p className="text-sm text-fg/85 leading-relaxed">
          Besoin de regrouper vos informations plus vite ? Le{" "}
          <Link
            href={href}
            className="font-semibold text-primary-soft hover:underline"
          >
            pack Déclaration Crypto 2026
          </Link>{" "}
          rassemble les modèles, checklists et supports utiles pour préparer
          votre déclaration. Il ne remplace pas l&apos;administration fiscale
          ni un professionnel.
        </p>
      </div>
    );
  }

  return (
    <aside className="not-prose my-12 rounded-2xl border border-primary/30 bg-primary/[0.04] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft"
        >
          <FileCheck2 className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-fg">
            Préparer votre déclaration plus vite
          </h3>
          <p className="mt-2 text-sm text-fg/85 leading-relaxed">
            Besoin de regrouper vos informations plus vite ? Le pack
            Déclaration Crypto 2026 rassemble les modèles, checklists et
            supports utiles pour préparer votre déclaration. Il ne remplace
            pas l&apos;administration fiscale ni un professionnel.
          </p>
          <Link
            href={href}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary/15 px-4 py-2 text-sm font-semibold text-primary-soft hover:bg-primary/25 transition"
          >
            Voir le pack 2026
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

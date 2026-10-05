import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getExchangePlatforms } from "@/lib/platforms";

/**
 * Confiance en une ligne (accueil) : la date affichée est la vraie date de dernière vérification des statuts sur les
 * registres officiels (champ mica.lastVerified des plateformes), jamais la date du jour.
 */
export default function HomeTrustLine() {
  const dates = getExchangePlatforms()
    .map((p) => p.mica?.lastVerified)
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const last = dates[dates.length - 1];
  const when = last
    ? new Date(`${last}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  return (
    <section aria-label="Notre engagement" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-fg/80">
        <ShieldCheck className="h-4 w-4 text-success-fg" aria-hidden="true" />
        <span>
          {when ? `Statuts des plateformes vérifiés sur les registres de l'AMF et de l'ESMA le ${when}.` : "Statuts des plateformes vérifiés sur les registres de l'AMF et de l'ESMA."}{" "}
          Chaque lien partenaire rémunéré est signalé.
        </span>
        <Link href="/methodologie" className="font-semibold text-primary-soft underline-offset-4 hover:underline">Notre méthode</Link>
        <span aria-hidden="true">·</span>
        <Link href="/transparence" className="font-semibold text-primary-soft underline-offset-4 hover:underline">Transparence</Link>
      </p>
    </section>
  );
}

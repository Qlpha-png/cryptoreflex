import { avecTypoSync } from "@/components/ui/Typo";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getExchangePlatforms } from "@/lib/platforms";

/**
 * Confiance en une ligne (accueil) : dates réelles de vérification des statuts sur les registres officiels
 * (champ mica.lastVerified des plateformes), jamais la date du jour.
 *
 * 06/10/2026 (audit) : la ligne affichait la date la PLUS RÉCENTE (5 octobre) comme si toutes les plateformes
 * avaient été vérifiées ce jour-là, alors que les relevés vont du 2 au 5 octobre. Elle affiche désormais la plage
 * réelle (ou la date unique si tous les relevés sont du même jour).
 */

/** « 1 octobre » → « 1er octobre » (typographie française). */
const premier = (s: string) => s.replace(/^1 /, "1er ");
const fmt = (iso: string, withYear: boolean) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  });

/** Texte de la période de vérification : « le 5 octobre 2026 » ou « entre le 2 et le 5 octobre 2026 ». */
export function verificationWindow(rawDates: Array<string | null | undefined>): string | null {
  const dates = rawDates
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (dates.length === 0) return null;
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first === last) return `le ${premier(fmt(first, true))}`;
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  const start = sameMonth
    ? String(Number(first.slice(8, 10)) === 1 ? "1er" : Number(first.slice(8, 10)))
    : premier(fmt(first, !sameYear));
  return `entre le ${start} et le ${premier(fmt(last, true))}`;
}

function HomeTrustLine() {
  const when = verificationWindow(getExchangePlatforms().map((p) => p.mica?.lastVerified));
  return (
    <section aria-label="Notre engagement" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-fg/80">
        <ShieldCheck className="h-4 w-4 text-success-fg" aria-hidden="true" />
        <span>
          {when
            ? `Statuts des plateformes vérifiés sur les registres de l'AMF et de l'ESMA ${when}.`
            : "Statuts des plateformes vérifiés sur les registres de l'AMF et de l'ESMA."}{" "}
          Chaque lien partenaire rémunéré est signalé.
        </span>
        <Link href="/methodologie" className="font-semibold text-primary-soft underline-offset-4 hover:underline">Notre méthode</Link>
        <span aria-hidden="true">·</span>
        <Link href="/transparence" className="font-semibold text-primary-soft underline-offset-4 hover:underline">Transparence</Link>
        <span aria-hidden="true">·</span>
        <Link href="/corrections" className="font-semibold text-primary-soft underline-offset-4 hover:underline">Corrections</Link>
      </p>
    </section>
  );
}

export default avecTypoSync(HomeTrustLine);

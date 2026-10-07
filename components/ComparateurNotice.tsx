import type { ReactNode } from "react";
import Link from "next/link";
import { Info } from "lucide-react";

/** Rubrique « Fonctionnement du comparateur » (article D111-7, I, du Code de la consommation). */
export const FONCTIONNEMENT_PATH = "/fonctionnement-du-comparateur";

/**
 * Encadré affiché en haut de chaque résultat de comparaison, avant la liste (article D111-7, II, du Code de la
 * consommation, relu sur Légifrance le 07/10/2026) : critère de classement par défaut et sa définition, caractère
 * exhaustif ou non et nombre de plateformes, caractère payant ou non du référencement. Sans hook : utilisable dans
 * une page serveur comme dans un composant client. Les faits affichés sont vérifiés dans le code (lib/comparateur.ts,
 * lib/platform-filter.ts, lib/scoring.ts ne lisent aucune donnée de partenariat : tests/lib/fonctionnement-comparateur.test.ts).
 */
export default function ComparateurNotice({
  critere,
  perimetre,
  liens,
  className = "",
}: {
  /** critère de classement par défaut et sa définition */
  critere: ReactNode;
  /** nombre de plateformes et caractère non exhaustif */
  perimetre: ReactNode;
  /** phrase sur les liens rémunérés (par défaut : mention « Publicité » sans effet sur l'ordre) */
  liens?: ReactNode;
  className?: string;
}) {
  return (
    <aside
      aria-label="Fonctionnement du comparateur"
      data-testid="comparateur-notice"
      className={`flex items-start gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-fg/75 ${className}`}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-soft" aria-hidden="true" />
      <div className="min-w-0">
        <p>
          <strong className="text-fg">Classement :</strong> {critere}
        </p>
        <p className="mt-1.5">
          <strong className="text-fg">Liste non exhaustive :</strong> {perimetre}
        </p>
        {/* Vrai tant qu'aucun encart sponsorisé de /sponsoring n'est vendu (garde : tests/lib/fonctionnement-comparateur.test.ts). */}
        <p className="mt-1.5">
          <strong className="text-fg">Référencement non payant :</strong> aucune plateforme ne paie pour figurer ici ni
          pour changer de place.{" "}
          {liens ?? (
            <>
              Certains liens du site vers une plateforme sont rémunérés (mention « Publicité ») ; cela ne change ni la
              liste ni l&apos;ordre.
            </>
          )}{" "}
          <Link href={FONCTIONNEMENT_PATH} className="font-semibold text-primary-soft underline hover:text-primary">
            Fonctionnement du comparateur
          </Link>
        </p>
      </div>
    </aside>
  );
}

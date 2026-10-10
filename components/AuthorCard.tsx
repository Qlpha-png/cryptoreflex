/**
 * <AuthorCard /> — bloc auteur E-E-A-T pour articles & pages YMYL.
 *
 * Lot B4 (10/10/2026) : délègue à TrustBox (components/ui/TrustBox.tsx), l'encadré de confiance unique du site.
 *  - "compact" : signature d'en-tête (pastille, nom et rôle, dates) = TrustBox « ligne » ;
 *  - "full"    : encadré de confiance de fin de page = TrustBox « complet » (Rédaction, Dates, Méthode, Sources…).
 *    Sans `remuneration` ni `sources` fournies par la page, ces rubriques ne sont pas affichées : l'encadré n'annonce que
 *    ce que la page a calculé (voir lib/article-confiance.ts).
 * La bio longue, les domaines d'expertise et les liens sociaux restent sur la fiche /auteur/[id], vers laquelle
 * l'encadré renvoie.
 *
 * Utilisation :
 *   <AuthorCard authorId="kevin-voisin" variant="compact" date="2026-04-25" dateModified="2026-10-02" />
 *   <AuthorCard authorId="kevin-voisin" variant="full" date="…" dateModified="…" remuneration={[…]} />
 */

import TrustBox from "@/components/ui/TrustBox";
import type { SourceCitee } from "@/lib/article-confiance";

interface AuthorCardProps {
  authorId?: string;
  variant?: "compact" | "full";
  /** ISO date de publication. */
  date?: string;
  /** Inutilisé (le temps de lecture est affiché par l'en-tête de la page) ; conservé pour les appels existants. */
  readTime?: string;
  /** ISO date de mise à jour. */
  dateModified?: string;
  /** Variante « full » : lignes de la rubrique Rémunération (lignesRemuneration()). */
  remuneration?: string[];
  /** Variante « full » : sources à afficher. */
  sources?: SourceCitee[];
  sourcesTitre?: string;
  titre?: string;
  retour?: { href: string; label: string };
}

export default function AuthorCard({
  authorId,
  variant = "compact",
  date,
  dateModified,
  remuneration,
  sources,
  sourcesTitre,
  titre,
  retour,
}: AuthorCardProps) {
  if (variant === "compact") {
    return <TrustBox variante="ligne" auteur={authorId} publieLe={date} misAJourLe={dateModified} />;
  }
  return (
    <TrustBox
      variante="complet"
      auteur={authorId}
      publieLe={date}
      misAJourLe={dateModified}
      remuneration={remuneration}
      sources={sources}
      sourcesTitre={sourcesTitre}
      titre={titre}
      retour={retour}
    />
  );
}

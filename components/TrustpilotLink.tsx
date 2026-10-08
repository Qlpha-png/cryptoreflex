import { TRUSTPILOT_LINK_LABEL, trustpilotUrlOrNull } from "@/lib/trustpilot";

/**
 * Lien sobre vers la page Trustpilot officielle (08/10/2026, décision de Kev) : les conditions de Trustpilot
 * interdisent de reprendre ses notes, donc aucune note, aucun nombre d'avis ni aucune date n'est affiché.
 * Rien n'est rendu sans adresse fiable. label : libellé court pour une cellule de tableau déjà titrée (comparatif).
 */
export default function TrustpilotLink({ url, className, label }: { url: string | null | undefined; className?: string; label?: string }) {
  const href = trustpilotUrlOrNull(url);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className={className ?? "underline decoration-dotted underline-offset-2 hover:text-fg-max"}
    >
      {label ?? TRUSTPILOT_LINK_LABEL}
    </a>
  );
}

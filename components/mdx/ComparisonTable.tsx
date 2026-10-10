import { avecTypoSync } from "@/components/ui/Typo";
import type { ReactNode } from "react";
import ScrollableTable from "@/components/ui/ScrollableTable";

interface ComparisonTableProps {
  headers: string[];
  /** Tableau 2D : chaque row a `headers.length` cellules. */
  rows: Array<Array<ReactNode>>;
  /** Souligne la première colonne (label) en gras. */
  boldFirstCol?: boolean;
  /** Légende (facultative), affichée au-dessus du tableau, hors de la zone qui défile ; lue aussi comme <caption>. */
  caption?: string;
}

/**
 * ComparisonTable — tableau structuré utilisable dans MDX. Format props
 * (headers + rows) plutôt que markdown brut, pour permettre des nœuds React
 * en cellules (badges, liens, icônes) si besoin.
 *
 * Lot B4 (10/10/2026) — tableau responsive C+ : même cadre que les tableaux GFM de l'article (ScrollableTable : ombres de
 * défilement, zone focusable, première colonne figée), en-tête sunken 14 px graisse 600, chiffres tabulaires. La légende,
 * quand elle existe, est HORS de la zone qui défile (et en <caption> pour les lecteurs d'écran).
 */
function ComparisonTable({
  headers,
  rows,
  boldFirstCol = true,
  caption,
}: ComparisonTableProps) {
  return (
    <div className="not-prose my-6">
      <ScrollableTable
        className="max-w-full rounded-xl border border-border bg-surface"
        label={caption ? `${caption}, tableau défilant horizontalement` : "Tableau comparatif, défilant horizontalement"}
        legende={caption}
        colonneFigee
      >
        <table className="w-full min-w-[480px] border-collapse text-sm break-normal tabular-nums">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-sunken text-left text-[0.875rem] text-muted">
            <tr>
              {headers.map((h, i) => (
                <th key={i} scope="col" className="border-b border-border-strong px-4 py-2.5 !font-sans !font-semibold !text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, ri) => (
              <tr key={ri} className="transition-colors hover:bg-elevated">
                {row.map((cell, ci) => {
                  const entete = boldFirstCol && ci === 0;
                  return entete ? (
                    <th key={ci} scope="row" className="px-4 py-2.5 text-left align-top font-semibold text-fg">
                      {cell}
                    </th>
                  ) : (
                    <td key={ci} className="px-4 py-2.5 align-top text-fg-2">
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </div>
  );
}

export default avecTypoSync(ComparisonTable, { riche: true });

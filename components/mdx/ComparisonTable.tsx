import type { ReactNode } from "react";

interface ComparisonTableProps {
  headers: string[];
  /** Tableau 2D : chaque row a `headers.length` cellules. */
  rows: Array<Array<ReactNode>>;
  /** Souligne la première colonne (label) en gras. */
  boldFirstCol?: boolean;
}

/**
 * ComparisonTable — tableau structuré utilisable dans MDX. Format props
 * (headers + rows) plutôt que markdown brut, pour permettre des nœuds React
 * en cellules (badges, liens, icônes) si besoin.
 */
export default function ComparisonTable({
  headers,
  rows,
  boldFirstCol = true,
}: ComparisonTableProps) {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-elevated text-left text-xs uppercase tracking-wide text-fg/75">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="border-b border-border px-4 py-2.5 font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-elevated/40 transition-colors">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-2.5 align-top text-fg/85 ${
                    boldFirstCol && ci === 0 ? "font-semibold text-fg" : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

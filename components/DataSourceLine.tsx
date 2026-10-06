import { SOURCE_INFO, formatAsOf, sourcesUsed } from "@/lib/data-sources/attribution";
import type { SourceName } from "@/lib/data-sources/priorities";

/**
 * Ligne d'attribution des données de marché (06/10/2026) : cite les sources QUI ONT VRAIMENT SERVI (champ
 * `sources` de chaque ligne), avec leur lien, et l'heure du relevé quand il n'est plus à jour (`stale`).
 * Remplace les « Données : CoinGecko » écrits en dur. Sans hook : utilisable côté serveur comme côté client.
 */
export default function DataSourceLine({
  items,
  className,
  prefix = "Données :",
  suffix = null,
}: {
  items: ReadonlyArray<{ sources?: Partial<Record<string, SourceName>> | null; asOf?: string; stale?: boolean }>;
  className?: string;
  prefix?: string;
  suffix?: React.ReactNode;
}) {
  const used = sourcesUsed(items);
  const stale = items.find((c) => c.stale === true && typeof c.asOf === "string");
  if (used.length === 0 && !stale && !suffix) return null;
  return (
    <p className={className}>
      {used.length > 0 && (
        <>
          {prefix}{" "}
          {used.map((s, i) => {
            const info = SOURCE_INFO[s] ?? { label: s, href: null };
            return (
              <span key={s}>
                {i > 0 ? ", " : ""}
                {info.href ? (
                  <a href={info.href} target="_blank" rel="noopener noreferrer" className="hover:text-fg underline">
                    {info.label}
                  </a>
                ) : (
                  info.label
                )}
              </span>
            );
          })}
        </>
      )}
      {stale?.asOf ? ` — dernier relevé le ${formatAsOf(stale.asOf)} (cours non à jour)` : null}
      {suffix}
    </p>
  );
}

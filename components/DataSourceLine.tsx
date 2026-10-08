import { avecTypoSync } from "@/components/ui/Typo";
import { SOURCE_INFO, formatAsOf, formatReleve, sourcesUsed } from "@/lib/data-sources/attribution";
import type { SourceName } from "@/lib/data-sources/priorities";

/**
 * Ligne d'attribution des données de marché (06/10/2026) : cite les sources QUI ONT VRAIMENT SERVI (champ
 * `sources` de chaque ligne), avec leur lien, et l'heure du relevé quand il n'est plus à jour (`stale`).
 * Remplace les « Données : CoinGecko » écrits en dur. Sans hook : utilisable côté serveur comme côté client.
 */
function DataSourceLine({
  items,
  className,
  prefix = "Données :",
  suffix = null,
  releve = false,
  fields,
}: {
  items: ReadonlyArray<{ sources?: Partial<Record<string, SourceName>> | null; asOf?: string; stale?: boolean }>;
  className?: string;
  prefix?: string;
  suffix?: React.ReactNode;
  /** 08/10/2026 (lot Z2) : ajoute l'heure du relevé à jour (« Cours : CoinMarketCap, relevé à 21:40 »). */
  releve?: boolean;
  /** Champs à citer (par défaut : tous). Ex. ["price"] pour la seule source des cours. */
  fields?: readonly string[];
}) {
  const used = sourcesUsed(items, fields);
  const stale = items.find((c) => c.stale === true && typeof c.asOf === "string");
  const frais = releve && !stale ? items.find((c) => typeof c.asOf === "string")?.asOf : undefined;
  const heure = frais ? formatReleve(frais) : "";
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
      {heure && used.length > 0 ? `, relevé ${heure}` : null}
      {stale?.asOf ? ` — dernier relevé le ${formatAsOf(stale.asOf)} (cours non à jour)` : null}
      {suffix}
    </p>
  );
}

export default avecTypoSync(DataSourceLine);

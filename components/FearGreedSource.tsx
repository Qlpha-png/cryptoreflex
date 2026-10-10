import { avecTypoSync } from "@/components/ui/Typo";
import { FEAR_GREED_INFO } from "@/lib/data-sources/attribution";
import type { SourceName } from "@/lib/data-sources/priorities";

/**
 * Attribution de l'indice peur/avidité (06/10/2026). Conditions d'alternative.me : usage commercial autorisé à
 * condition que l'attribution figure juste à côté de la donnée. À placer collé à chaque affichage de l'indice.
 * Relais CoinMarketCap (06/10/2026) : la source citée est celle qui a VRAIMENT servi (FearGreedData.source).
 */
export const FEAR_GREED_SOURCE_URL = "https://alternative.me/crypto/fear-and-greed-index/";

/** « 06/10 » (fuseau de Paris) d'un horodatage ISO ; null si illisible. */
function jourCourt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(new Date(t));
}

function FearGreedSource({
  className,
  focusable = true,
  source = "alternative-me",
  date = null,
}: {
  className?: string;
  /** false dans une copie décorative (aria-hidden) du bandeau : le lien ne doit pas recevoir le focus. */
  focusable?: boolean;
  /** Source réelle de l'indice (« alternative-me » par défaut, « coinmarketcap » en relais). */
  source?: SourceName | null;
  /** Lot Z4 : horodatage ISO de la valeur affichée (« Source : alternative.me, valeur du JJ/MM ») ; absent = sans date. */
  date?: string | null;
}) {
  const info = (source && FEAR_GREED_INFO[source]) || { label: "alternative.me", href: FEAR_GREED_SOURCE_URL };
  const jour = jourCourt(date);
  return (
    <span className={className}>
      Source :{" "}
      <a
        href={info.href ?? FEAR_GREED_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={focusable ? undefined : -1}
        className="underline underline-offset-2 hover:text-fg"
      >
        {info.label}
      </a>
      {jour ? (
        <>
          , valeur du <time dateTime={date ?? undefined}>{jour}</time>
        </>
      ) : null}
    </span>
  );
}

export default avecTypoSync(FearGreedSource);

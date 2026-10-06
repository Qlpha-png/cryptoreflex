import { FEAR_GREED_INFO } from "@/lib/data-sources/attribution";
import type { SourceName } from "@/lib/data-sources/priorities";

/**
 * Attribution de l'indice peur/avidité (06/10/2026). Conditions d'alternative.me : usage commercial autorisé à
 * condition que l'attribution figure juste à côté de la donnée. À placer collé à chaque affichage de l'indice.
 * Relais CoinMarketCap (06/10/2026) : la source citée est celle qui a VRAIMENT servi (FearGreedData.source).
 */
export const FEAR_GREED_SOURCE_URL = "https://alternative.me/crypto/fear-and-greed-index/";

export default function FearGreedSource({
  className,
  focusable = true,
  source = "alternative-me",
}: {
  className?: string;
  /** false dans une copie décorative (aria-hidden) du bandeau : le lien ne doit pas recevoir le focus. */
  focusable?: boolean;
  /** Source réelle de l'indice (« alternative-me » par défaut, « coinmarketcap » en relais). */
  source?: SourceName | null;
}) {
  const info = (source && FEAR_GREED_INFO[source]) || { label: "alternative.me", href: FEAR_GREED_SOURCE_URL };
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
    </span>
  );
}

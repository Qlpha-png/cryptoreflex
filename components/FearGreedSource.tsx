/**
 * Attribution de l'indice peur/avidité (06/10/2026). Conditions d'alternative.me : usage commercial autorisé à
 * condition que l'attribution figure juste à côté de la donnée. À placer collé à chaque affichage de l'indice.
 */
export const FEAR_GREED_SOURCE_URL = "https://alternative.me/crypto/fear-and-greed-index/";

export default function FearGreedSource({
  className,
  focusable = true,
}: {
  className?: string;
  /** false dans une copie décorative (aria-hidden) du bandeau : le lien ne doit pas recevoir le focus. */
  focusable?: boolean;
}) {
  return (
    <span className={className}>
      Source :{" "}
      <a
        href={FEAR_GREED_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={focusable ? undefined : -1}
        className="underline underline-offset-2 hover:text-fg"
      >
        alternative.me
      </a>
    </span>
  );
}

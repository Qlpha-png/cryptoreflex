import { Fragment } from "react";
import { autoPublicationSources, type AutoSourceFrontmatter } from "@/lib/auto-publication";

/**
 * Ligne discrète des contenus publiés automatiquement (décision D3 de Kev, 06/10/2026) :
 * « Publiée automatiquement à partir de [source, lien] », ou « Publiée automatiquement. » sans source.
 * Remplace la fiche auteur sur /actualites/[slug] et /analyses-techniques/[slug].
 */
export default function AutoPublishedLine({ frontmatter, className = "mt-10" }: { frontmatter: AutoSourceFrontmatter; className?: string }) {
  const sources = autoPublicationSources(frontmatter);
  return (
    <p className={`${className} text-xs text-muted leading-relaxed`} data-auto-published="">
      {sources.length === 0 ? (
        "Publiée automatiquement."
      ) : (
        <>
          Publiée automatiquement à partir de{" "}
          {sources.map((s, i) => (
            <Fragment key={`${s.name}-${i}`}>
              {i > 0 ? (i === sources.length - 1 ? " et " : ", ") : null}
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener nofollow" className="underline hover:text-fg">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </Fragment>
          ))}
          .
        </>
      )}
    </p>
  );
}

import { avecTypoSync } from "@/components/ui/Typo";
import { Fragment } from "react";
import { autoPublicationSources, type AutoSourceFrontmatter } from "@/lib/auto-publication";

/**
 * Ligne discrète des contenus publiés automatiquement (décision D3 de Kev, 06/10/2026) :
 * « Publiée automatiquement à partir de [source, lien] », ou « Publiée automatiquement. » sans source.
 * Remplace la fiche auteur sur /actualites/[slug] et /analyses-techniques/[slug].
 * 07/10/2026 (règlement IA, art. 50(4)) : `redigeeParIA` pour les actualités, rédigées par une IA →
 * « Rédigée par une IA à partir de [source] et publiée automatiquement. » (voir lib/auto-publication.ts).
 */
function AutoPublishedLine({
  frontmatter,
  redigeeParIA = false,
  className = "mt-10",
}: {
  frontmatter: AutoSourceFrontmatter;
  redigeeParIA?: boolean;
  className?: string;
}) {
  const sources = autoPublicationSources(frontmatter);
  const liens = sources.map((s, i) => (
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
  ));
  return (
    <p className={`${className} text-xs text-muted leading-relaxed`} data-auto-published="" data-redigee-par-ia={redigeeParIA ? "" : undefined}>
      {redigeeParIA ? (
        sources.length === 0 ? (
          "Rédigée par une IA et publiée automatiquement."
        ) : (
          <>
            Rédigée par une IA à partir de {liens} et publiée automatiquement.
          </>
        )
      ) : sources.length === 0 ? (
        "Publiée automatiquement."
      ) : (
        <>
          Publiée automatiquement à partir de {liens}.
        </>
      )}
    </p>
  );
}

export default avecTypoSync(AutoPublishedLine);

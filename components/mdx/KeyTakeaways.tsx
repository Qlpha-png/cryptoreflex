import { avecTypoSync } from "@/components/ui/Typo";
import type { ReactNode } from "react";

interface KeyTakeawaysProps {
  children: ReactNode;
  title?: string;
}

/**
 * <KeyTakeaways> — encart « À retenir » de fin de leçon.
 *
 * Une vraie école termine chaque cours par 3-5 points clés. On wrappe une liste markdown (children) : lot B4
 * (10/10/2026), maquette C+ — fond doux or (gold-soft), filet or en haut, points numérotés dans une pastille d'action
 * (compteur CSS : aucun nombre écrit à la main, le MDX n'est pas modifié). Server Component, zéro JS.
 *
 * Usage MDX :
 *   <KeyTakeaways>
 *   - Premier point à retenir
 *   - Deuxième point
 *   </KeyTakeaways>
 */
function KeyTakeaways({
  children,
  title = "À retenir",
}: KeyTakeawaysProps) {
  return (
    <aside
      aria-label={title}
      className="not-prose my-8 rounded-2xl border border-link-line/40 border-t-[3px] border-t-link-line bg-gold-soft p-5 sm:p-6"
    >
      <h3 className="mb-3 text-xl font-semibold leading-tight text-fg">{title}</h3>
      <div
        className={[
          "text-base leading-relaxed text-fg",
          // Liste numérotée par compteur CSS, pastille d'action (encre sur papier, or sur encre)
          "[&_ul]:m-0 [&_ul]:list-none [&_ul]:space-y-3 [&_ul]:pl-0 [&_ul]:[counter-reset:pt]",
          "[&_ol]:m-0 [&_ol]:list-none [&_ol]:space-y-3 [&_ol]:pl-0 [&_ol]:[counter-reset:pt]",
          "[&_li]:relative [&_li]:m-0 [&_li]:pl-9 [&_li]:text-fg [&_li]:[counter-increment:pt]",
          "[&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.15em] [&_li]:before:grid [&_li]:before:h-6 [&_li]:before:w-6",
          "[&_li]:before:place-items-center [&_li]:before:rounded-full [&_li]:before:bg-action [&_li]:before:text-sm",
          "[&_li]:before:font-semibold [&_li]:before:leading-none [&_li]:before:text-on-action [&_li]:before:content-[counter(pt)]",
          "[&_p]:m-0 [&_p]:max-w-none [&_p]:text-fg [&_strong]:font-semibold [&_strong]:text-fg",
          "[&_a]:text-link [&_a]:underline [&_a]:decoration-link-line [&_a]:decoration-2 [&_a]:underline-offset-[0.28em]",
        ].join(" ")}
      >
        {children}
      </div>
    </aside>
  );
}

export default avecTypoSync(KeyTakeaways, { riche: true });

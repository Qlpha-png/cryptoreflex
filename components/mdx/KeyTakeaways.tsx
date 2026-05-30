import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

interface KeyTakeawaysProps {
  children: ReactNode;
  title?: string;
}

/**
 * <KeyTakeaways> — encart « À retenir » de fin de leçon.
 *
 * Une vraie école termine chaque cours par 3-5 points clés. On wrappe une
 * liste markdown (children) et on la stylise en checklist dorée. Server
 * Component (zéro JS) — injecté dans la map MDX de <MdxContent />.
 *
 * Usage MDX :
 *   <KeyTakeaways>
 *   - Premier point à retenir
 *   - Deuxième point
 *   </KeyTakeaways>
 */
export default function KeyTakeaways({
  children,
  title = "À retenir",
}: KeyTakeawaysProps) {
  return (
    <aside
      aria-label={title}
      className="not-prose my-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
    >
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary-soft">
        <Lightbulb className="h-4 w-4" aria-hidden="true" />
        {title}
      </h3>
      <div
        className={[
          "text-sm leading-relaxed text-fg/90",
          // Liste sans puce, avec coche dorée custom
          "[&_ul]:list-none [&_ul]:space-y-2.5 [&_ul]:pl-0 [&_ul]:m-0",
          "[&_ol]:list-none [&_ol]:space-y-2.5 [&_ol]:pl-0 [&_ol]:m-0",
          "[&_li]:relative [&_li]:pl-7 [&_li]:m-0",
          "[&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0",
          "[&_li]:before:content-['✓'] [&_li]:before:font-bold [&_li]:before:text-primary",
          "[&_strong]:text-fg [&_strong]:font-semibold",
          "[&_a]:text-primary-glow [&_a]:underline [&_a]:underline-offset-2",
        ].join(" ")}
      >
        {children}
      </div>
    </aside>
  );
}

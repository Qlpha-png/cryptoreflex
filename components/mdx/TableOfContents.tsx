import type { ReactNode } from "react";
import { List } from "lucide-react";

interface TableOfContentsProps {
  children: ReactNode;
  title?: string;
}

/**
 * TableOfContents — encadré qui wrappe une liste markdown pour la styliser
 * comme un sommaire collé en haut d'un long-form. Le contenu est passé en
 * children (généralement une liste markdown / OL avec liens d'ancre).
 */
export default function TableOfContents({
  children,
  title = "Sommaire",
}: TableOfContentsProps) {
  return (
    <nav
      aria-label={title}
      className="not-prose my-8 rounded-2xl border border-border bg-elevated/30 p-5 sm:p-6"
    >
      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary-soft">
        <List className="h-4 w-4" />
        {title}
      </h2>
      <div className="text-sm text-fg/85 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary-soft [&_a:hover]:text-primary [&_a:hover]:underline">
        {children}
      </div>
    </nav>
  );
}

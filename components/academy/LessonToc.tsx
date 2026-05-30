"use client";

/**
 * <LessonToc /> — table des matières flottante, auto-générée depuis les H2/H3
 * réellement rendus dans l'article (rehype-slug leur a posé un `id`).
 *
 * - Lecture du DOM après montage (les titres existent déjà côté SSR).
 * - IntersectionObserver → surligne la section visible.
 * - Scroll doux au clic, met à jour le hash sans recharger.
 * - Ne s'affiche pas si moins de `minItems` titres (article court).
 *
 * 100% client, aucune dépendance au contenu : marche sur toute page qui
 * contient un `<article>` avec des H2/H3 ancrés.
 */

import { useEffect, useState } from "react";
import { List } from "lucide-react";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface LessonTocProps {
  /** Sélecteur CSS du conteneur où chercher les titres. */
  rootSelector?: string;
  /** Nb minimum de titres pour afficher le sommaire. */
  minItems?: number;
}

export default function LessonToc({
  rootSelector = "article",
  minItems = 3,
}: LessonTocProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const nodes = Array.from(
      root.querySelectorAll("h2[id], h3[id]")
    ) as HTMLElement[];

    const items: Heading[] = nodes.map((n) => ({
      id: n.id,
      text: n.textContent?.trim() ?? "",
      level: n.tagName === "H2" ? 2 : 3,
    }));
    setHeadings(items);

    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [rootSelector]);

  function handleClick(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
    if (typeof history !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  }

  if (headings.length < minItems) return null;

  return (
    <nav
      aria-label="Sur cette page"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary-soft">
        <List className="h-4 w-4" aria-hidden="true" />
        Sur cette page
      </h2>
      <ul className="space-y-0.5 border-l border-border text-sm">
        {headings.map((h) => {
          const active = activeId === h.id;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => handleClick(e, h.id)}
                className={`-ml-px block border-l-2 py-1 transition-colors ${
                  h.level === 3 ? "pl-6" : "pl-3"
                } ${
                  active
                    ? "border-primary font-medium text-primary-glow"
                    : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

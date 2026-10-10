"use client";

import { avecTypoSync } from "@/components/ui/Typo";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, List } from "lucide-react";
import { track } from "@/lib/analytics";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  /**
   * Sélecteur racine où chercher les `<h2>` / `<h3>` (généralement le
   * conteneur `.prose` du MdxContent). Défaut : `article` la plus proche.
   */
  rootSelector?: string;
  /** Slug de l'article — passé dans les events analytics pour mesurer les sections les plus consultées. */
  slug?: string;
  /** Min headings pour afficher le TOC. Défaut : 3. */
  minHeadings?: number;
  /**
   * Ronde 1 du jury B4 : « mobile » (accordéon, placé APRÈS l'en-tête dans la colonne de lecture, avec la barre de progression) ou
   * « bureau » (liste collante de la colonne latérale). Le point de rupture est en em (64 em) : il suit la taille de texte du
   * visiteur, la colonne de lecture ne s'effondre plus à 200 %. Défaut : les deux.
   */
  variante?: "mobile" | "bureau" | "les-deux";
}

/**
 * ArticleToc — Table des matières sticky auto-générée + progress bar de lecture.
 *
 * FIX #3 audit conversion 2026-04-26 : sur articles longs (>1500 mots), 50-65%
 * des visiteurs scrollent < 25% de la page (benchmark Nielsen Norman Group
 * "How Long Do Users Stay on Web Pages"). Un TOC sticky + progress bar :
 *  - réduit l'abandon précoce (l'utilisateur voit la longueur réelle vs perçue)
 *  - augmente la consommation des sections "fiscalité", "où acheter" placées
 *    plus bas — donc booste la conversion affilié downstream
 *  - améliore le SEO (liens d'ancres internes, schema BreadcrumbList implicite)
 *
 * Stack :
 *  - Server-side : aucun rendu (purely client). Le markup MDX a déjà ses `id`
 *    sur les headings via rehype-slug.
 *  - Client-side : on lit le DOM au mount, on observe les headings via
 *    IntersectionObserver pour highlight la section active.
 *  - Track Plausible "Article TOC Jump" + "Article Read Progress" (à 25/50/75/100%).
 *
 * A11y :
 *  - <nav aria-label="Sommaire de l'article">
 *  - aria-current="location" sur l'item actif
 *  - keyboard nav native (liens d'ancre)
 *  - prefers-reduced-motion respecté (smooth scroll désactivable)
 */
function ArticleToc({
  rootSelector,
  slug,
  minHeadings = 3,
  variante = "les-deux",
}: Props) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const reportedDepths = useRef<Set<25 | 50 | 75 | 100>>(new Set());

  /* ----- Extract headings du DOM rendu ----- */
  useEffect(() => {
    const root = rootSelector
      ? document.querySelector(rootSelector)
      : document.querySelector("article");
    if (!root) return;

    const nodes = Array.from(
      root.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]"),
    );
    const items: Heading[] = nodes.map((n) => ({
      id: n.id,
      text: n.textContent?.trim() ?? "",
      level: (n.tagName === "H2" ? 2 : 3) as 2 | 3,
    }));
    setHeadings(items);
  }, [rootSelector]);

  /* ----- IntersectionObserver pour la section active ----- */
  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Sélectionne le 1er heading visible le plus haut.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // Le heading est "actif" quand il franchit la zone 0–40% du viewport.
        rootMargin: "0% 0% -60% 0%",
        threshold: 0,
      },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  /* ----- Progress bar + tracking 25/50/75/100% ----- */
  useEffect(() => {
    if (typeof window === "undefined" || variante === "bureau") return;

    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const ratio = Math.max(0, Math.min(1, doc.scrollTop / total));
      const pct = Math.round(ratio * 100);
      setProgress(pct);

      // Tracking dépth de lecture (1 fois par seuil)
      const depths: (25 | 50 | 75 | 100)[] = [25, 50, 75, 100];
      for (const d of depths) {
        if (pct >= d && !reportedDepths.current.has(d)) {
          reportedDepths.current.add(d);
          track("Article Read Depth", {
            depth: d,
            ...(slug ? { slug } : {}),
          });
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug, variante]);

  /* ----- Click handler : track + smooth scroll ----- */
  function onJump(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    track("Article TOC Jump", {
      target: id,
      ...(slug ? { slug } : {}),
    });
    const el = document.getElementById(id);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  }

  // Hooks must run unconditionally — early return AFTER all useEffect.
  // (No-op render si pas assez de headings pour justifier un TOC.)
  // useMemo placé avant le early return pour respecter rules-of-hooks.
  const items = useMemo(() => headings, [headings]);

  if (items.length < minHeadings) return null;

  const afficheMobile = variante !== "bureau";
  const afficheBureau = variante !== "mobile";

  return (
    <>
      {/* Barre de progression fixe en haut de page (filet or), posée par la variante « mobile » ou « les-deux » */}
      {afficheMobile && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-30 h-0.5 bg-transparent">
          <div
            className="h-full bg-link-line transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* PETIT ÉCRAN (et texte agrandi) : accordéon natif HTML, après l'en-tête de l'article, dans un repère de navigation. */}
      {afficheMobile && (
        <nav aria-label="Sommaire de l'article" className="not-prose mb-6 [@media(min-width:64em)]:hidden">
          <details className="group overflow-hidden rounded-xl border border-border bg-surface">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold text-fg transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <List className="h-4 w-4" aria-hidden="true" />
                Sommaire ({items.length} sections)
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ol className="space-y-1 border-t border-border px-4 py-3 text-base">
              {items.map((h) => (
                <li key={`mobile-${h.id}`} className={h.level === 3 ? "pl-4" : ""}>
                  <a
                    href={`#${h.id}`}
                    onClick={(e) => onJump(e, h.id)}
                    className="block py-1.5 text-fg-2 transition-colors hover:text-fg"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </nav>
      )}

      {/* BUREAU (≥ 64 em) : liste collante dans la colonne latérale */}
      {afficheBureau && (
        <nav
          aria-label="Sommaire de l'article"
          className="not-prose sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 [@media(min-width:64em)]:block"
        >
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted">
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            Dans cet article
          </div>
          <ol className="space-y-1.5 text-base">
            {items.map((h) => {
              const isActive = h.id === activeId;
              return (
                <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                  <a
                    href={`#${h.id}`}
                    onClick={(e) => onJump(e, h.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={`-ml-px block border-l-2 py-1 pl-3 leading-snug transition-colors ${
                      isActive
                        ? "border-link-line font-semibold text-fg"
                        : "border-transparent text-fg-2 hover:border-border-strong hover:text-fg"
                    }`}
                  >
                    {h.text}
                  </a>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-sm text-muted">
            {progress}&nbsp;% lu · {items.length} sections
          </p>
        </nav>
      )}
    </>
  );
}

export default avecTypoSync(ArticleToc);

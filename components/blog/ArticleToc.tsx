"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { List } from "lucide-react";
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
export default function ArticleToc({
  rootSelector,
  slug,
  minHeadings = 3,
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
    if (typeof window === "undefined") return;

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
  }, [slug]);

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

  return (
    <>
      {/* Progress bar fixe en haut de page (gold gradient) */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 z-30 h-0.5 bg-transparent pointer-events-none"
      >
        <div
          className="h-full bg-gradient-to-r from-primary via-primary-glow to-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Audit Mobile UX 26/04/2026 : avant `hidden lg:block` masquait le TOC
          sur mobile alors que les articles font ~12 sections. UX dégradée pour
          70% du trafic. Maintenant : sur mobile, TOC en accordéon collapsable
          (details/summary) ; sur lg+, sticky sidebar comme avant. */}

      {/* MOBILE : accordéon natif HTML (pas de JS) */}
      <details className="lg:hidden not-prose mb-6 rounded-xl border border-border/60 bg-elevated/40 overflow-hidden">
        <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer text-sm font-semibold text-primary-soft hover:bg-elevated transition-colors list-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <List className="h-4 w-4" aria-hidden="true" />
            Sommaire ({items.length} sections)
          </span>
          <span aria-hidden="true" className="text-muted text-xs">▼</span>
        </summary>
        <ol className="space-y-1 text-sm px-4 py-3 border-t border-border/40">
          {items.map((h) => (
            <li key={`mobile-${h.id}`} className={h.level === 3 ? "pl-4" : ""}>
              <a
                href={`#${h.id}`}
                onClick={(e) => onJump(e, h.id)}
                className="block py-1.5 text-fg/80 hover:text-primary-soft transition-colors"
              >
                {h.text}
              </a>
            </li>
          ))}
        </ol>
      </details>

      {/* DESKTOP : sticky sidebar (inchangé) */}
      <nav
        aria-label="Sommaire de l'article"
        className="not-prose hidden lg:block sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2"
      >
        <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary-soft">
          <List className="h-3.5 w-3.5" aria-hidden="true" />
          Dans cet article
        </div>
        <ol className="space-y-1.5 text-sm">
          {items.map((h) => {
            const isActive = h.id === activeId;
            return (
              <li
                key={h.id}
                className={h.level === 3 ? "pl-3" : ""}
                aria-current={isActive ? "location" : undefined}
              >
                <a
                  href={`#${h.id}`}
                  onClick={(e) => onJump(e, h.id)}
                  className={`block leading-snug py-1 border-l-2 pl-3 -ml-px transition-colors ${
                    isActive
                      ? "border-primary text-fg font-semibold"
                      : "border-transparent text-fg/65 hover:text-fg hover:border-border"
                  }`}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-[11px] text-muted">
          {progress}% lu · {items.length} sections
        </p>
      </nav>
    </>
  );
}

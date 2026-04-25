"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";

type Direction = "up" | "down" | "left" | "right";

interface ScrollRevealProps {
  children: ReactNode;
  /** Délai en ms avant déclenchement de la transition (utile pour stagger). */
  delay?: number;
  /** Direction d'apparition. Par défaut "up". */
  direction?: Direction;
  /** Si true (default), n'observe qu'une fois puis disconnect. */
  once?: boolean;
  /** Threshold IntersectionObserver. */
  threshold?: number;
  /** Classe additionnelle sur le wrapper. */
  className?: string;
  /** Tag HTML — div par défaut. */
  as?: "div" | "section" | "article" | "li" | "span";
}

/**
 * ScrollReveal — wrapper qui anime ses enfants à l'entrée dans le viewport.
 *
 * Implémentation : ajoute la classe `.scroll-reveal` (CSS dans globals.css),
 * puis bascule `.in-view` via IntersectionObserver natif quand visible.
 * Aucune dépendance, 100% CSS pour la transition. Respecte
 * `prefers-reduced-motion` (géré dans globals.css).
 *
 * Usage stagger : passer un `delay` croissant (ex. index * 80ms).
 *
 * Note implémentation : on utilise un callback ref + useState pour rester
 * compatible avec n'importe quel `as` polymorphique sans batailler avec les
 * types de ref de React.
 */
export default function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  once = true,
  threshold = 0.15,
  className = "",
  as: Tag = "div",
}: ScrollRevealProps) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const onceRef = useRef(once);
  onceRef.current = once;

  const setRef = useCallback((el: HTMLElement | null) => setNode(el), []);

  useEffect(() => {
    if (!node) return;

    // Si l'utilisateur préfère réduire les mouvements, on rend visible direct.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      node.classList.add("in-view");
      return;
    }

    // SSR fallback — si IO indispo, montrer le contenu.
    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("in-view");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            if (onceRef.current) observer.unobserve(entry.target);
          } else if (!onceRef.current) {
            entry.target.classList.remove("in-view");
          }
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, threshold]);

  const directionClass =
    direction === "up"
      ? ""
      : direction === "down"
      ? "reveal-down"
      : direction === "left"
      ? "reveal-left"
      : "reveal-right";

  const style: CSSProperties = delay > 0
    ? ({ ["--reveal-delay" as string]: `${delay}ms` } as CSSProperties)
    : {};

  // Cast Tag to ElementType pour autoriser un ref polymorphique (div/section/...)
  // sans dupliquer le composant pour chaque variante.
  const Component = Tag as React.ElementType;

  return (
    <Component
      ref={setRef as never}
      className={`scroll-reveal ${directionClass} ${className}`.trim()}
      style={style}
    >
      {children}
    </Component>
  );
}

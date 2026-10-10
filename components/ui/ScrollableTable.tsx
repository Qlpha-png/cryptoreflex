"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * ScrollableTable — conteneur à défilement horizontal pour tableaux larges.
 *
 * Design lot 0 (06/10/2026) — audit : tableaux rognés à droite sur mobile
 * (« Hardwa », « Sauveg ») sans rien qui indique qu'on peut faire défiler.
 * Les calques d'ombre sont en absolute (aucun décalage de mise en page) ; sans JS, simple overflow-x-auto.
 *
 * Lot B4 (10/10/2026) — tableau responsive C+ (spec § 7), ronde 1 du jury :
 *  - indice « Faites glisser le tableau pour voir la suite. » TOUJOURS présent quand le tableau dépasse (avec ou sans
 *    légende), au-dessus du tableau, hors de la zone qui défile. Il est ajouté après l'hydratation : il décale seulement ce
 *    qui est en dessous du tableau, jamais le premier écran (CLS mesuré à 0) ;
 *  - `legende` : texte au-dessus du tableau, hors de la zone qui défile ;
 *  - `colonneFigee` : première colonne collante (sticky) à gauche. La zone défilante reçoit un `scroll-padding-left` égal à
 *    la largeur réelle de cette colonne : un lien qui reçoit le focus au clavier n'est jamais caché dessous (WCAG 2.4.11) ;
 *  - anneau de focus de la zone défilante dessiné sur le CADRE (le cadre rogne ce qui dépasse, l'anneau intérieur ne se
 *    voyait pas : WCAG 2.4.7) ; plus de bouton rond « › » (il chevauchait l'en-tête sur téléphone) ;
 *  - nom de la zone = titre qui précède le tableau (« Tableau comparatif, tableau défilant »), pas le même nom partout ;
 *  - ombres de défilement = jeton scroll-shadow (les deux thèmes).
 */

interface Props {
  children: ReactNode;
  /** Classes du cadre extérieur (marges, bordure, rayon, fond). */
  className?: string;
  /** Inutilisé depuis B4 (les ombres lisent le jeton scroll-shadow) ; conservé pour les appels existants. */
  fadeFrom?: string;
  /** Nom accessible de la zone défilante (lu quand elle reçoit le focus). */
  label?: string;
  /** Légende du tableau, affichée hors de la zone qui défile. */
  legende?: ReactNode;
  /** Première colonne figée à gauche pendant le défilement. */
  colonneFigee?: boolean;
}

const INDICE = "Faites glisser le tableau pour voir la suite.";

export default function ScrollableTable({
  children,
  className = "",
  label = "Tableau défilant horizontalement",
  legende,
  colonneFigee = false,
}: Props) {
  const cadre = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [nom, setNom] = useState(label);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setCanLeft(el.scrollLeft > 2);
      setCanRight(max - el.scrollLeft > 2);
      if (colonneFigee) {
        // largeur réelle de la colonne figée → marge de défilement : le focus ne passe jamais dessous
        const cellule = el.querySelector("tr > :first-child") as HTMLElement | null;
        el.style.scrollPaddingLeft = cellule ? `${cellule.offsetWidth}px` : "";
      }
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    // nom de la zone : le titre (h2, h3) qui précède le tableau
    let n: Element | null = cadre.current;
    for (let i = 0; n && i < 40; i++) {
      n = n.previousElementSibling ?? n.parentElement?.previousElementSibling ?? null;
      if (n && /^H[2-4]$/.test(n.tagName) && n.textContent) {
        setNom(`${n.textContent.trim()}, tableau défilant horizontalement`);
        break;
      }
    }
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, [colonneFigee]);

  const scrollable = canLeft || canRight;

  return (
    <div ref={cadre}>
      {(legende || scrollable) && (
        <p className="mb-2 max-w-none text-base leading-snug text-muted">
          {legende}
          {scrollable && <span className={legende ? "text-fg-4" : ""}>{legende ? " " : ""}{INDICE}</span>}
        </p>
      )}
      <div
        className={`relative overflow-hidden ${className} has-[[role=region]:focus-visible]:outline has-[[role=region]:focus-visible]:outline-[3px] has-[[role=region]:focus-visible]:outline-offset-2 has-[[role=region]:focus-visible]:outline-focus`}
      >
        <div
          ref={ref}
          className={[
            "overflow-x-auto overscroll-x-contain focus:outline-none",
            colonneFigee
              ? "[&_tr>:first-child]:sticky [&_tr>:first-child]:left-0 [&_tr>:first-child]:z-[1] [&_tr>:first-child]:max-w-[11rem] sm:[&_tr>:first-child]:max-w-none [&_tbody_tr>:first-child]:bg-surface [&_thead_tr>:first-child]:bg-sunken"
              : "",
          ].join(" ")}
          {...(scrollable ? { tabIndex: 0, role: "region", "aria-label": nom } : {})}
        >
          {children}
        </div>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 z-[2] w-3 bg-gradient-to-r from-scroll-shadow/25 to-transparent transition-opacity duration-200 ${
            canLeft ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 z-[2] w-6 bg-gradient-to-l from-scroll-shadow/25 to-transparent transition-opacity duration-200 ${
            canRight ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}

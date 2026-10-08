"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type MouseEvent, type SVGProps } from "react";
import { Coins, GalleryVerticalEnd, Menu, TrendingUp, Wrench } from "lucide-react";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";
import { BARRE_BAS, CLE_PARTIE_CARTES, ONGLETS, hrefCartes, nettoyer, ongletDe, type OngletId } from "@/lib/nav-data";

/**
 * components/cplus/BarreBas.tsx — barre du bas du téléphone et de la tablette, sous 1 024 px (lot B3c ; architecture
 * finale § 1 D9, D10, D20 et § 6). Remplace MobileBottomNav.
 *
 * Marché · Cryptos · Outils · Cartes · Menu. Rendu serveur correct dès le premier octet (usePathname) : la case de la
 * rubrique courante est allumée (ongletDe, même règle que l'onglet du bureau et le fil d'Ariane) ; quand la rubrique n'a
 * pas de case (Actus, Plateformes, Impôts, Apprendre), un point or sur « Menu » le signale, avec un texte pour les
 * lecteurs d'écran. Libellés de 14 px sur une ligne dès 320 px, cases de 64 px de haut, zone sûre d'iOS en dessous.
 *
 * Case Cartes (D10) : /cartes/jouer si une partie existe dans ce navigateur (lecture du stockage local, aucune requête),
 * sinon /cartes. Le HTML serveur porte /cartes ; l'adresse change après le montage, sans rien déplacer.
 *
 * Ce composant porte aussi le masquage de l'en-tête compact (components/NavbarCompact.tsx) : caché quand on défile vers
 * le bas, réaffiché quand on remonte, par transform (data-cache), jamais quand le focus y est.
 */

const ICONES: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  marche: TrendingUp,
  cryptos: Coins,
  outils: Wrench,
  cartes: GalleryVerticalEnd,
};
const CARTES_ON = isReflexCardsEnabled();
const CASES = BARRE_BAS.filter((id) => CARTES_ON || id !== "cartes").map((id) => {
  const o = ONGLETS.find((x) => x.id === id)!;
  return { id, href: o.hub, label: o.label };
});

function partieCartesExiste(): boolean {
  try {
    return window.localStorage.getItem(CLE_PARTIE_CARTES) !== null;
  } catch {
    return false;
  }
}

/** Adresse servie hors de l'application (le jeu) : navigation complète. */
export const horsApp = (u: string) => u.startsWith("/cartes/jouer") || u.endsWith(".xml");

export default function BarreBas() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [cartes, setCartes] = useState("/cartes");
  const cur: OngletId | null = ongletDe(pathname);
  const ici = nettoyer(pathname);
  const sansCase = cur && !CASES.some((c) => c.id === cur) ? ONGLETS.find((o) => o.id === cur)?.label ?? "" : "";

  // D10 : relu à chaque page (une partie a pu commencer entre-temps).
  useEffect(() => {
    setCartes(hrefCartes(partieCartesExiste()));
  }, [pathname]);

  // En-tête compact : masqué en descendant, réaffiché en remontant (transform, aucun décalage de mise en page).
  useEffect(() => {
    const h = document.querySelector<HTMLElement>("[data-cr-mh]");
    if (!h) return;
    let avant = window.scrollY;
    let raf = 0;
    const appliquer = () => {
      const y = Math.max(window.scrollY, 0);
      const d = y - avant;
      if (h.contains(document.activeElement) || y < 64) h.removeAttribute("data-cache");
      else if (d > 6) h.setAttribute("data-cache", "");
      else if (d < -6) h.removeAttribute("data-cache");
      if (Math.abs(d) > 6 || y < 64) avant = y;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(appliquer);
    };
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof Node && h.contains(e.target)) h.removeAttribute("data-cache");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);

  // Navigation côté client (comme next/link), sauf le jeu (page servie hors de l'application) et les clics modifiés.
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const href = e.currentTarget.getAttribute("href") ?? "";
    if (!href.startsWith("/") || horsApp(href)) return;
    e.preventDefault();
    router.push(href);
  };

  return (
    <nav className="cr-bb" aria-label="Navigation mobile">
      {CASES.map(({ id, href, label }) => {
        const Icone = ICONES[id];
        const lien = id === "cartes" ? cartes : href;
        const allume = id === cur;
        return (
          <a
            key={id}
            href={lien}
            onClick={onClick}
            aria-current={allume ? (ici === href ? "page" : "true") : undefined}
            data-case={id}
          >
            <Icone aria-hidden="true" strokeWidth={1.75} />
            <span>{label}</span>
          </a>
        );
      })}
      <a
        className="cr-bb-menu"
        href="#menu"
        role="button"
        data-open-menu
        aria-controls="menu"
        aria-expanded="false"
        aria-haspopup="dialog"
        data-ici={sansCase ? "" : undefined}
      >
        <Menu aria-hidden="true" strokeWidth={1.75} />
        <span>Menu</span>
        {sansCase ? <span className="cr-sr"> (rubrique actuelle : {sansCase})</span> : null}
      </a>
    </nav>
  );
}

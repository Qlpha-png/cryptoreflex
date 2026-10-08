"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ongletDe } from "@/lib/nav-data";

/**
 * components/cplus/MegaNavIsland.tsx — le petit îlot client de l'en-tête du bureau (lot B3b).
 *
 * Il ne rend rien lui-même (sauf la recherche, chargée à la demande) : il agit sur le HTML SERVEUR de Navbar.tsx.
 *  - Onglet allumé : ongletDe(chemin) de lib/nav-data.ts → attribut data-current + texte masqué « rubrique actuelle ».
 *  - Onglets et « Mon espace » : liens dans le HTML (repli sans JavaScript), transformés ici en boutons de menu
 *    (role="button", aria-expanded, aria-controls). Ouverture au CLIC (pas au survol), un seul panneau ouvert,
 *    Entrée et Espace basculent, Échap ferme et rend le focus à l'onglet, flèches gauche/droite d'un onglet à l'autre,
 *    flèche bas ouvre et entre dans le panneau ; clic dehors, focus sorti ou changement de page ferment.
 *  - Liens internes de l'en-tête : navigation côté client (router.push), comme next/link.
 *  - Recherche : « / », Ctrl K ou ⌘ K ; le champ de la rangée 1 s'il est visible, sinon le dialogue (loupe de la
 *    rangée 2, quand la rangée 1 est sortie de l'écran). SiteSearch n'est téléchargé qu'à la première utilisation.
 */

const SiteSearch = dynamic(() => import("./SiteSearch"), { ssr: false });

type Mode = null | "champ" | "dialogue";
const SEL_DECLENCHEUR = "a.cr-tab[data-tab], a[data-pop]";

function enSaisie(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

export default function MegaNavIsland() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const actif = !pathname.startsWith("/embed");
  const fermerRecherche = useCallback(() => setMode(null), []);

  // Onglet de la rubrique courante.
  useEffect(() => {
    const cur = ongletDe(pathname);
    document.querySelectorAll<HTMLElement>("[data-cr-hdr] .cr-tab[data-tab]").forEach((a) => {
      const on = a.dataset.tab === cur;
      a.toggleAttribute("data-current", on);
      a.querySelector<HTMLElement>("[data-cur]")?.toggleAttribute("hidden", !on);
    });
  }, [pathname]);

  // Menus, clavier, raccourcis de recherche.
  useEffect(() => {
    if (!actif) return;
    const hdr = document.querySelector<HTMLElement>("[data-cr-hdr]");
    if (!hdr) return;
    const declencheurs = Array.from(hdr.querySelectorAll<HTMLAnchorElement>(SEL_DECLENCHEUR));
    const onglets = declencheurs.filter((t) => t.dataset.tab);
    const panneauDe = (t: HTMLElement) => document.getElementById(t.dataset.tab ? `mp-${t.dataset.tab}` : t.dataset.pop ?? "");
    const zoneDe = (t: HTMLElement) => t.parentElement as HTMLElement; // li de l'onglet ou bloc « Mon espace » : déclencheur + panneau
    for (const t of declencheurs) {
      const p = panneauDe(t);
      if (!p) continue;
      t.setAttribute("role", "button");
      t.setAttribute("aria-expanded", "false");
      t.setAttribute("aria-controls", p.id);
    }

    let ouvert: HTMLAnchorElement | null = null;
    const fermer = (rendreFocus = false) => {
      if (!ouvert) return;
      const t = ouvert;
      ouvert = null;
      t.setAttribute("aria-expanded", "false");
      panneauDe(t)?.setAttribute("hidden", "");
      if (rendreFocus) t.focus();
    };
    const ouvrir = (t: HTMLAnchorElement) => {
      fermer();
      const p = panneauDe(t);
      if (!p) return;
      hdr.style.setProperty("--cr-hdr-bas", `${Math.round(Math.max(0, hdr.getBoundingClientRect().bottom))}px`);
      p.removeAttribute("hidden");
      t.setAttribute("aria-expanded", "true");
      ouvert = t;
    };
    const basculer = (t: HTMLAnchorElement) => (ouvert === t ? fermer() : ouvrir(t));

    const ouvrirRecherche = () => {
      const champ = document.getElementById("cr-q");
      if (champ && champ.offsetParent !== null && champ.getBoundingClientRect().bottom > 0) champ.focus();
      else setMode("dialogue");
    };

    const onClick = (e: MouseEvent) => {
      const cible = e.target as Element | null;
      const t = cible?.closest?.(SEL_DECLENCHEUR) as HTMLAnchorElement | null;
      if (t && hdr.contains(t)) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // nouvel onglet : le lien
        e.preventDefault();
        basculer(t);
        return;
      }
      // Loupe : celle de la rangée 2, de l'en-tête compact ou de la feuille de menu (lot B3c).
      if (cible?.closest?.("[data-open-search]")) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // nouvel onglet : /recherche
        e.preventDefault();
        fermer();
        setMode("dialogue");
        return;
      }
      const lien = cible?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (lien && hdr.contains(lien) && !e.defaultPrevented && e.button === 0 && !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) {
        const url = new URL(lien.href, location.href);
        // Même page avec une ancre (« Tous les duels » depuis /comparatif) : navigation native, pour que l'événement
        // hashchange ouvre le bloc visé (components/OuvrirAncre.tsx).
        const memePageAncre = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && Boolean(url.hash);
        if (memePageAncre) {
          fermer();
          return;
        }
        if (url.origin === location.origin && !lien.target && !lien.hasAttribute("download") && !url.pathname.endsWith(".xml") && !url.pathname.startsWith("/cartes/jouer")) {
          e.preventDefault();
          fermer();
          router.push(url.pathname + url.search + url.hash);
          return;
        }
      }
      if (ouvert && !(cible && zoneDe(ouvert).contains(cible))) fermer();
    };

    const onKey = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.key === "Escape" && ouvert) {
        e.preventDefault();
        fermer(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        fermer();
        ouvrirRecherche();
        return;
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !enSaisie(cible)) {
        e.preventDefault();
        fermer();
        ouvrirRecherche();
        return;
      }
      const t = cible?.matches?.(SEL_DECLENCHEUR) && hdr.contains(cible) ? (cible as HTMLAnchorElement) : null;
      if (!t) return;
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        basculer(t);
      } else if (t.dataset.tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        const i = onglets.indexOf(t);
        const j = (i + (e.key === "ArrowRight" ? 1 : -1) + onglets.length) % onglets.length;
        onglets[j]?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (ouvert !== t) ouvrir(t);
        panneauDe(t)?.querySelector<HTMLElement>("a[href]")?.focus();
      }
    };

    // Rangée 1 (logo, recherche, Soutenir, Mon espace, bouton) : tant que le focus y est, elle redescend (--cr-dy = 0),
    // sinon, page défilée, l'élément focalisé serait hors de l'écran (WCAG 2.4.7 et 2.4.11, jury du 08/10/2026).
    const r1 = hdr.querySelector<HTMLElement>(".cr-r1");
    let focusR1 = false;

    // Le focus sort du panneau ouvert (Tab après le dernier lien, Maj+Tab avant l'onglet) : on ferme.
    const onFocus = (e: FocusEvent) => {
      if (ouvert && e.target instanceof Node && !zoneDe(ouvert).contains(e.target)) fermer();
      if (e.target instanceof HTMLElement && e.target.id === "cr-q") setMode((m) => (m === "champ" ? m : "champ"));
      const dansR1 = Boolean(r1 && e.target instanceof Node && r1.contains(e.target));
      if (dansR1 !== focusR1) {
        focusR1 = dansR1;
        appliquerDefilement();
      }
    };
    // Le focus quitte la page ou l'en-tête sans arriver ailleurs (clic sur du texte) : la rangée reprend sa place.
    const onFocusOut = (e: FocusEvent) => {
      if (!focusR1) return;
      const vers = e.relatedTarget as Node | null;
      if (vers && r1?.contains(vers)) return;
      if (!vers) {
        focusR1 = false;
        appliquerDefilement();
      }
    };

    // Frappe dans le champ après un Échap (la recherche s'était refermée) : on la rouvre.
    const onSaisie = (e: Event) => {
      if (e.target instanceof HTMLElement && e.target.id === "cr-q") setMode((m) => (m === "champ" ? m : "champ"));
    };

    // Défilement : la rangée 1 remonte avec la page (au plus 73 px, transform : aucun décalage de mise en page), la
    // rangée 2 reste en haut ; rangée 1 sortie de l'écran : la loupe apparaît au bout de la rangée 2.
    let raf = 0;
    function appliquerDefilement() {
      const dy = focusR1 ? 0 : Math.min(Math.max(window.scrollY, 0), 73);
      hdr!.style.setProperty("--cr-dy", `${dy}px`);
      hdr!.classList.toggle("is-stuck", dy > 60);
    }
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(appliquerDefilement);
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onSaisie);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (document.activeElement?.id === "cr-q") setMode("champ");
    return () => {
      fermer();
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onSaisie);
      window.removeEventListener("scroll", onScroll);
    };
    // pathname : un changement de page ferme les menus (nettoyage puis réarmement).
  }, [actif, pathname, router]);

  useEffect(() => setMode(null), [pathname]);

  if (!actif || !mode) return null;
  return <SiteSearch mode={mode} onClose={fermerRecherche} />;
}

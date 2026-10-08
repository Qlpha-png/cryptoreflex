"use client";

import { avecTypoSync } from "@/components/ui/Typo";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowRight, Heart, Search, User, X } from "lucide-react";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";
import {
  BANDE_CONFIANCE,
  ENTETE_CTA,
  LIGNE_LEGALE,
  MENU_COMMENCER,
  MENU_SECONDAIRE,
  MON_ESPACE,
  ONGLETS,
  ongletDe,
  type NavLien,
  type Onglet,
} from "@/lib/nav-data";

/**
 * components/cplus/MenuFeuille.tsx — la feuille de menu du téléphone et de la tablette, sous 1 024 px (lot B3c ;
 * architecture finale § 1 D12, D15 et § 6). Remplace BurgerMenu.
 *
 * RENDU SERVEUR : tous les liens sont des <a href> dans le HTML de chaque page (lisibles sans JavaScript et par Google).
 * Module « use client » pour la même raison que MegaPanel : le POIDS (un composant serveur serait recopié dans la charge
 * RSC de chaque page ; ici les données de lib/nav-data.ts arrivent par le JavaScript commun, déjà chargé pour les
 * méga-menus du bureau).
 *
 * Contenu, de haut en bas : recherche (ouvre SiteSearch), « Vérifier une plateforme » (ENTETE_CTA), Mon espace,
 * « Par où commencer ? », les 8 rubriques en accordéons (<details>, natifs et accessibles, tous fermés, la rubrique de
 * la page marquée), chaque tiroir commençant par son hub (D12) puis les mêmes groupes, libellés et phrases que le
 * méga-menu du bureau ; puis ♥ Soutenir, Newsletter (neutre, D15), Qui sommes-nous, Contact, Pour votre site, Plan du
 * site, la bande de confiance et la ligne légale. Aucun choix de thème (lot B11).
 *
 * Sans JavaScript : le bouton « Menu » (lien #menu) ouvre la feuille par :target, la croix (lien #) la ferme.
 * Avec JavaScript : dialogue modal (aria-modal), focus sur la croix à l'ouverture, Tab et Maj+Tab restent dans la
 * feuille, Échap, la croix ou le voile ferment et rendent le focus au bouton qui l'a ouverte ; un lien suivi ferme la
 * feuille (navigation côté client, sauf le jeu).
 */

const CARTES_ON = isReflexCardsEnabled();
const ONGLETS_VISIBLES = ONGLETS.filter((o) => CARTES_ON || o.id !== "cartes");
const LEGAL = LIGNE_LEGALE.filter((l) => l.href !== "/plan-du-site");

const horsApp = (u: string) => u.startsWith("/cartes/jouer") || u.endsWith(".xml");
const SEL_FOCUS = 'a[href], button:not([disabled]), summary, input, [tabindex]:not([tabindex="-1"])';
/** Liens qui jouent le rôle de bouton avec JavaScript (en-tête compact, barre du bas, feuille). */
const SEL_BOUTON_LIEN = 'a[role="button"]';

/** Lien + phrase (fonction et non composant : avecTypoSync doit voir les textes déjà construits). */
function lienMenu(lien: NavLien, cls = "cr-pl") {
  return (
    <a className={cls} href={lien.href}>
      {lien.label}
      {lien.phrase ? <span className="cr-pp">{lien.phrase}</span> : null}
    </a>
  );
}

function tiroir(o: Onglet, courant: boolean) {
  return (
    <details className="cr-macc" key={o.id} data-rub={o.id} data-current={courant ? "" : undefined}>
      <summary>
        <span className="cr-macc-t">
          {o.label}
          {courant ? <span className="cr-macc-cur">rubrique actuelle</span> : null}
        </span>
      </summary>
      <div className="cr-macc-in">
        <a className="cr-hub cr-macc-hub" href={o.toutVoir.href}>
          <span>
            {o.toutVoir.label}
            {o.toutVoir.phrase ? <span className="cr-pp">{o.toutVoir.phrase}</span> : null}
          </span>
          <ArrowRight aria-hidden="true" strokeWidth={1.75} />
        </a>
        {o.groupes.map((g, i) => {
          const id = `ms-${o.id}-${i}`;
          const Liste = g.ordonne ? "ol" : "ul";
          return (
            <div className="cr-pg" key={g.titre}>
              <p className="cr-pgt" id={id}>{g.titre}</p>
              <Liste className={g.ordonne ? "cr-plist cr-ol" : "cr-plist"} aria-labelledby={id}>
                {g.liens.map((l) => (
                  <li key={l.href + l.label}>{lienMenu(l)}</li>
                ))}
              </Liste>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function MenuFeuille() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const racine = useRef<HTMLDivElement>(null);
  const fermerRef = useRef<(rendreFocus?: boolean) => void>(() => undefined);
  const cur = ongletDe(pathname);

  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    const panneau = el.querySelector<HTMLElement>(".cr-ms-panel");
    if (!panneau) return;
    el.setAttribute("data-js", ""); // :target ne sert plus que sans JavaScript (app/styles/mobile.css)
    let ouvreur: HTMLElement | null = null;
    const declencheurs = () => Array.from(document.querySelectorAll<HTMLElement>("[data-open-menu]"));
    const ouvert = () => el.hasAttribute("data-open");

    const ouvrir = (depuis: HTMLElement | null) => {
      ouvreur = depuis;
      el.setAttribute("data-open", "");
      document.documentElement.classList.add("cr-menu-open");
      declencheurs().forEach((d) => d.setAttribute("aria-expanded", "true"));
      panneau.scrollTop = 0;
      panneau.querySelector<HTMLElement>("[data-close-menu]:not(.cr-ms-scrim)")?.focus();
    };
    const fermer = (rendreFocus = false) => {
      if (location.hash === "#menu") history.replaceState(history.state, "", location.pathname + location.search);
      if (!ouvert()) return;
      el.removeAttribute("data-open");
      document.documentElement.classList.remove("cr-menu-open");
      declencheurs().forEach((d) => d.setAttribute("aria-expanded", "false"));
      if (rendreFocus) (ouvreur && ouvreur.getClientRects().length ? ouvreur : declencheurs().find((d) => d.getClientRects().length))?.focus();
      ouvreur = null;
    };
    fermerRef.current = fermer;

    const onClick = (e: MouseEvent) => {
      const cible = e.target as Element | null;
      if (!cible?.closest) return;
      const declencheur = cible.closest<HTMLElement>("[data-open-menu]");
      if (declencheur) {
        e.preventDefault();
        if (ouvert()) fermer(true);
        else ouvrir(declencheur);
        return;
      }
      if (!el.contains(cible)) return;
      if (cible.closest("[data-close-menu]")) {
        e.preventDefault();
        fermer(true);
        return;
      }
      // Recherche : la feuille se ferme (focus rendu au bouton Menu), MegaNavIsland ouvre le dialogue de recherche,
      // qui rendra le focus à ce même bouton.
      if (cible.closest("[data-open-search]")) {
        fermer(true);
        return;
      }
      const lien = cible.closest<HTMLAnchorElement>("a[href]");
      if (!lien || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const url = new URL(lien.href, location.href);
      const memePage = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search;
      if (url.origin !== location.origin || horsApp(url.pathname) || memePage) {
        fermer(false); // navigation native (jeu, ancre de la même page)
        return;
      }
      e.preventDefault();
      fermer(false);
      router.push(url.pathname + url.search + url.hash);
    };

    const onKey = (e: KeyboardEvent) => {
      // Recherche ouverte par-dessus (« / », Ctrl K) : c'est elle qui gère Échap et Tab.
      if (!ouvert() || document.querySelector(".cr-sdlg")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        fermer(true);
        return;
      }
      if (e.key !== "Tab") return;
      const f = Array.from(panneau.querySelectorAll<HTMLElement>(SEL_FOCUS)).filter((x) => x.getClientRects().length > 0);
      if (!f.length) return;
      const premier = f[0];
      const dernier = f[f.length - 1];
      const actif = document.activeElement;
      if (!panneau.contains(actif)) {
        e.preventDefault();
        (e.shiftKey ? dernier : premier).focus();
      } else if (e.shiftKey && actif === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && actif === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };

    // Espace sur les liens à rôle de bouton (Menu de l'en-tête et de la barre, loupe, croix, « Rechercher ») : le rôle
    // button promet Espace (WCAG 2.1.1), un lien ne réagit qu'à Entrée. Espace enfoncé : pas de défilement ; relâché sur
    // le même élément : click(), comme un vrai bouton. Sans JavaScript, ce sont des liens ordinaires (repli inchangé).
    let espaceSur: HTMLElement | null = null;
    const boutonLien = (e: KeyboardEvent) =>
      e.key === " " && !e.altKey && !e.ctrlKey && !e.metaKey
        ? ((e.target as Element | null)?.closest?.<HTMLElement>(SEL_BOUTON_LIEN) ?? null)
        : null;
    const onEspaceBas = (e: KeyboardEvent) => {
      const b = boutonLien(e);
      if (!b) return;
      e.preventDefault();
      if (!e.repeat) espaceSur = b;
    };
    const onEspaceHaut = (e: KeyboardEvent) => {
      const b = boutonLien(e);
      const prevu = espaceSur;
      espaceSur = null;
      if (!b || b !== prevu) return;
      e.preventDefault();
      b.click();
    };

    // Arrivée directe sur …#menu avec JavaScript : la feuille s'ouvre en dialogue.
    if (location.hash === "#menu") ouvrir(declencheurs().find((d) => d.getClientRects().length) ?? null);

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("keydown", onEspaceBas);
    document.addEventListener("keyup", onEspaceHaut);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keydown", onEspaceBas);
      document.removeEventListener("keyup", onEspaceHaut);
      fermer(false);
    };
  }, [router]);

  // Changement de page (lien suivi, retour arrière) : la feuille se ferme. Pas au premier rendu (arrivée sur …#menu).
  const page = useRef(pathname);
  useEffect(() => {
    if (page.current === pathname) return;
    page.current = pathname;
    fermerRef.current(false);
  }, [pathname]);

  return (
    <div className="cr-ms" id="menu" ref={racine}>
      <a className="cr-ms-scrim" href="#" tabIndex={-1} aria-hidden="true" data-close-menu />
      <div className="cr-ms-panel" role="dialog" aria-modal="true" aria-labelledby="cr-ms-t">
        <div className="cr-ms-top">
          <p className="cr-ms-t" id="cr-ms-t">Menu</p>
          <a className="cr-ms-x" href="#" role="button" data-close-menu aria-label="Fermer le menu">
            <X aria-hidden="true" strokeWidth={1.75} />
          </a>
        </div>
        <a className="cr-ms-search" href="/recherche" role="button" data-open-search aria-haspopup="dialog">
          <Search aria-hidden="true" strokeWidth={1.75} />
          <span>Rechercher</span>
          <span className="cr-sr"> une crypto, une plateforme, un outil, un mot</span>
        </a>
        <a className="cr-btn cr-btn-cta cr-ms-cta" href={ENTETE_CTA.href} data-cta="menu-primary">
          {ENTETE_CTA.label}
        </a>
        <details className="cr-macc cr-macc-espace" id="mon-espace">
          <summary>
            <User aria-hidden="true" strokeWidth={1.75} />
            <span className="cr-macc-t">
              Mon espace
              <span className="cr-pp">Se connecter, Ma collection (album), portefeuille, alertes</span>
            </span>
          </summary>
          <div className="cr-macc-in">
            <ul className="cr-plist">
              {MON_ESPACE.invite.map((l) => (
                <li key={l.href + l.label}>{lienMenu(l)}</li>
              ))}
            </ul>
          </div>
        </details>
        <section className="cr-ms-sec" aria-labelledby="cr-ms-start">
          <p className="cr-ms-h" id="cr-ms-start">Par où commencer ?</p>
          <ul className="cr-plist">
            {MENU_COMMENCER.map((l) => (
              <li key={l.href}>{lienMenu(l)}</li>
            ))}
          </ul>
        </section>
        <section className="cr-ms-sec" aria-labelledby="cr-ms-rub">
          <p className="cr-ms-h" id="cr-ms-rub">Les rubriques</p>
          <div>{ONGLETS_VISIBLES.map((o) => tiroir(o, o.id === cur))}</div>
        </section>
        <section className="cr-ms-sec cr-ms-second" aria-label="Le site et vous">
          <ul className="cr-plist">
            {MENU_SECONDAIRE.map((l) =>
              l.href === "/soutenir" ? (
                <li key={l.href}>
                  <a className="cr-pl cr-ms-sup" href={l.href}>
                    <Heart className="cr-heart" aria-hidden="true" strokeWidth={1.75} />
                    <span>
                      {l.label}
                      {l.phrase ? <span className="cr-pp">{l.phrase}</span> : null}
                    </span>
                  </a>
                </li>
              ) : (
                <li key={l.href}>{lienMenu(l)}</li>
              ),
            )}
          </ul>
          <p className="cr-trust">
            <strong>{BANDE_CONFIANCE.texte}</strong>
            {BANDE_CONFIANCE.liens.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </p>
          <nav className="cr-ms-legal" aria-label="Informations légales (menu)">
            {LEGAL.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>
        </section>
      </div>
    </div>
  );
}

export default avecTypoSync(MenuFeuille);

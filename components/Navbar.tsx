import { avecTypoSync } from "@/components/ui/Typo";
import { Heart, Search, User } from "lucide-react";
import Logo from "./Logo";
import NavbarCompact from "./NavbarCompact";
import MegaOnglets, { EspaceListe } from "./cplus/MegaPanel";
import MegaNavIsland from "./cplus/MegaNavIsland";
import { ENTETE_CTA } from "@/lib/nav-data";

/**
 * components/Navbar.tsx — en-tête du site (lot B3b, 08/10/2026 ; architecture finale § 2 à 5).
 *
 * Composant SERVEUR. Deux en-têtes, choisis en CSS (aucun JavaScript, aucun décalage de mise en page) :
 *  - sous 1 024 px : l'en-tête compact actuel (NavbarCompact, téléphone et tablette = lot B3c) ;
 *  - dès 1 024 px : 2 rangées de hauteur fixe (app/styles/entete.css).
 *      Rangée 1 (72 px) : logo · recherche (180 à 400 px, touche « / », Ctrl K) · ♥ Soutenir (bouton secondaire calme,
 *      D8) · Mon espace (icône seule sous 1 280 px) · « Vérifier une plateforme » (bouton secondaire vers le vérificateur MiCA, décision de Kev du 08/10, D7 et
 *      plan SEO § 2.1 : un filtre neutre, jamais une recommandation personnalisée).
 *      Rangée 2 (48 px, collante) : les 8 onglets Marché · Actus · Cryptos · Plateformes · Impôts · Outils · Apprendre ·
 *      Cartes (pastille or), chacun suivi de son méga-menu (components/cplus/MegaPanel.tsx, rendu serveur aussi ; module
 *      « use client » pour que les menus ne soient pas recopiés dans la charge RSC de chaque page : voir son en-tête).
 *
 * Tout est en <a href> dans le HTML : sans JavaScript, chaque onglet mène au hub de sa rubrique, « Mon espace » à
 * /connexion, la recherche à /recherche?q=… ; les liens des panneaux restent lisibles par les robots. L'îlot client
 * MegaNavIsland transforme ensuite les onglets en boutons de menu (aria-expanded, aria-controls, Échap), allume
 * l'onglet de la rubrique courante (ongletDe) et charge la recherche à la demande (components/cplus/SiteSearch.tsx).
 * Le thème clair/sombre n'est pas ici (lot B11).
 */

function Navbar() {
  return (
    <>
      <NavbarCompact />
      <header className="cr-hdr">
        <div className="cr-fixe" data-cr-hdr>
        <div className="cr-wrap cr-r1">
          <a href="/" className="cr-logo" aria-label="Cryptoreflex, accueil">
            <Logo variant="full" height={30} asLink={false} title="Cryptoreflex" />
          </a>
          <form className="cr-search" role="search" action="/recherche" method="get" data-cr-search>
            <label className="cr-sr" htmlFor="cr-q">Rechercher une crypto, un outil, un mot</label>
            <Search className="cr-search-ico" aria-hidden="true" strokeWidth={1.75} />
            <input
              className="cr-search-in"
              id="cr-q"
              name="q"
              type="search"
              placeholder="Rechercher"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              maxLength={80}
              aria-keyshortcuts="/ Control+K Meta+K"
            />
            <kbd className="cr-key" aria-hidden="true">/</kbd>
            <div id="cr-sq-slot" />
          </form>
          <div className="cr-end">
            <a className="cr-btn" href="/soutenir">
              <Heart className="cr-heart" aria-hidden="true" strokeWidth={1.75} />
              Soutenir
            </a>
            <div className="cr-pop-wrap">
              <a className="cr-btn cr-espace" href="/connexion" data-pop="cr-espace" aria-label="Mon espace">
                <User aria-hidden="true" strokeWidth={1.75} />
                <span className="cr-espace-t">Mon espace</span>
              </a>
              <EspaceListe />
            </div>
            <a className="cr-btn cr-btn-cta" href={ENTETE_CTA.href} data-cta="navbar-primary">
              {ENTETE_CTA.label}
            </a>
          </div>
        </div>
        <div className="cr-r2">
          <div className="cr-wrap cr-tabs-row">
            <nav className="cr-nav" aria-label="Rubriques">
              <MegaOnglets />
            </nav>
            <button className="cr-btn cr-r2-loupe" type="button" data-open-search aria-label="Rechercher">
              <Search aria-hidden="true" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        </div>
      </header>
      <MegaNavIsland />
    </>
  );
}

export default avecTypoSync(Navbar);

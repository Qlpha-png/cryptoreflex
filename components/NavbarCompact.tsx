import { Menu, Search } from "lucide-react";
import Logo from "./Logo";

/**
 * components/NavbarCompact.tsx — en-tête du téléphone et de la tablette, sous 1 024 px (lot B3c, 08/10/2026 ;
 * architecture finale § 1 D20 et § 6). Dès 1 024 px, c'est l'en-tête à 2 rangées de components/Navbar.tsx.
 *
 * Composant SERVEUR, sans JavaScript propre : logo (26 px de haut), loupe, bouton « Menu ». Hauteur FIXE (64 px).
 *  - Loupe : lien vers /recherche (repli sans JavaScript) ; l'îlot MegaNavIsland ouvre la recherche (SiteSearch) en
 *    dialogue plein écran sur un clic. role="button" : c'est son rôle avec JavaScript, et ClickFallback ignore ces liens
 *    (sinon, la navigation empêchée passait pour un échec du routeur et rechargeait /recherche après 350 ms).
 *  - Menu : lien vers #menu ; sans JavaScript la feuille s'ouvre par :target (app/styles/mobile.css), avec JavaScript
 *    components/cplus/MenuFeuille.tsx l'ouvre en dialogue (piège à focus, Échap, retour du focus à ce bouton).
 * Collant (position: sticky, possible depuis html, body { overflow-x: clip }) ; il se masque quand on défile vers le bas
 * et revient quand on remonte, par transform seulement (aucun décalage de mise en page) : components/cplus/BarreBas.tsx.
 * ♥ Soutenir est dans la feuille de menu (§ 6 le plaçait dans l'en-tête ; la liste du lot B3c met Menu à sa place).
 */
export default function NavbarCompact() {
  return (
    <header className="cr-mh" data-cr-mh>
      <div className="cr-mh-in">
        <a href="/" className="cr-mh-logo" aria-label="Cryptoreflex, accueil">
          <Logo variant="full" height={26} asLink={false} title="Cryptoreflex" />
        </a>
        <div className="cr-mh-end">
          <a className="cr-mh-btn" href="/recherche" role="button" data-open-search aria-haspopup="dialog" aria-label="Rechercher">
            <Search aria-hidden="true" strokeWidth={1.75} />
          </a>
          <a
            className="cr-mh-btn"
            href="#menu"
            role="button"
            data-open-menu
            aria-controls="menu"
            aria-expanded="false"
            aria-haspopup="dialog"
            aria-label="Menu"
          >
            <Menu aria-hidden="true" strokeWidth={1.75} />
          </a>
        </div>
      </div>
    </header>
  );
}

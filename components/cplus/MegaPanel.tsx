"use client";

import { avecTypoSync } from "@/components/ui/Typo";
import { ArrowRight, ChevronDown } from "lucide-react";
import { isReflexCardsEnabled } from "@/lib/reflex-cards/flag";
import { BANDE_CONFIANCE, MON_ESPACE, ONGLETS, type NavLien, type Onglet } from "@/lib/nav-data";

/**
 * components/cplus/MegaPanel.tsx — les 8 onglets du bureau, leurs méga-menus et la liste « Mon espace » (lot B3b,
 * architecture finale § 3 et 4).
 *
 * RENDU SERVEUR (SSR) : tous les liens sont des <a href> dans le HTML de chaque page (crawlables, lisibles sans
 * JavaScript) ; chaque panneau sort avec l'attribut `hidden`. Ce module est marqué « use client » pour une seule raison,
 * le POIDS : un composant serveur est recopié dans la charge RSC de chaque page (le HTML portait alors les menus deux
 * fois, +16 Ko compressés mesurés au banc, plafond +15 Ko). Ici les données viennent de lib/nav-data.ts par le JavaScript
 * commun, mis en cache une fois pour tout le site ; la charge RSC ne porte qu'une référence. Le composant n'a ni état ni
 * effet : ouvrir et fermer reste le travail de l'îlot MegaNavIsland.
 *
 * Contenu (lib/nav-data.ts, ONGLETS) : groupes titrés, une phrase sous chaque lien, « Tout voir → » en DERNIER (D12),
 * bande de confiance en bas de chaque panneau (« Gratuit et indépendant · Comment nous vérifions · Qui nous rémunère »),
 * groupes « ordonne » en listes numérotées (Impôts > Dans l'ordre).
 */

const CARTES_ON = isReflexCardsEnabled();
const ONGLETS_VISIBLES = ONGLETS.filter((o) => CARTES_ON || o.id !== "cartes");

/** Lien + phrase (fonction et non composant : avecTypoSync doit voir les textes déjà construits). */
function lienMenu(lien: NavLien) {
  return (
    <a className="cr-pl" href={lien.href}>
      {lien.label}
      {lien.phrase ? <span className="cr-pp">{lien.phrase}</span> : null}
    </a>
  );
}

function panneau(o: Onglet) {
  const n = Math.min(o.groupes.length, 5);
  return (
    <div className="cr-panel" id={`mp-${o.id}`} data-panel={o.id} hidden>
      <div className="cr-wrap cr-pin">
        <p className="cr-pintro">{o.intro}</p>
        <div className="cr-pcols" data-n={n}>
          {o.groupes.map((g, i) => {
            const id = `mg-${o.id}-${i}`;
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
        <div className="cr-pfoot">
          <p className="cr-trust">
            <strong>{BANDE_CONFIANCE.texte}</strong>
            {BANDE_CONFIANCE.liens.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </p>
          <a className="cr-hub" href={o.toutVoir.href}>
            <span>
              {o.toutVoir.label}
              {o.toutVoir.phrase ? <span className="cr-pp">{o.toutVoir.phrase}</span> : null}
            </span>
            <ArrowRight aria-hidden="true" strokeWidth={1.75} />
          </a>
        </div>
      </div>
    </div>
  );
}

/** Rangée 2 : les onglets (liens vers les hubs, repli sans JavaScript), chacun suivi de son panneau. */
function MegaOnglets() {
  return (
    <ul className="cr-tabs">
      {ONGLETS_VISIBLES.map((o) => (
        <li className="cr-ti" key={o.id}>
          <a className="cr-tab" id={`mt-${o.id}`} href={o.hub} data-tab={o.id}>
            {o.label}
            {o.id === "cartes" ? (
              <>
                <span className="cr-new" aria-hidden="true" />
                <span className="cr-sr"> (nouveauté)</span>
              </>
            ) : null}
            <span className="cr-sr" data-cur hidden> (rubrique actuelle)</span>
            <ChevronDown className="cr-chev" aria-hidden="true" strokeWidth={1.75} />
          </a>
          {panneau(o)}
        </li>
      ))}
    </ul>
  );
}

/** Menu « Mon espace » (liste « invite », architecture § 4). */
function EspaceListeBrut() {
  return (
    <div className="cr-pop" id="cr-espace" hidden>
      <p className="cr-pop-t">Mon espace</p>
      <ul className="cr-plist">
        {MON_ESPACE.invite.map((l) => (
          <li key={l.href + l.label}>{lienMenu(l)}</li>
        ))}
      </ul>
    </div>
  );
}

export const EspaceListe = avecTypoSync(EspaceListeBrut);
export default avecTypoSync(MegaOnglets);

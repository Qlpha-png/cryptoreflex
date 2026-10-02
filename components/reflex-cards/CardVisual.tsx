import "./reflex-cards.css";
import { backHTMLRaw, cardHTML, forSite, fossilSlotHTMLRaw, odds, slotHTMLRaw } from "@/lib/reflex-cards/render";
import { CARD_ENV, FOSSIL_P, cleanName, slotOdd, todayChance } from "@/lib/reflex-cards/data";
import type { ReflexCard } from "@/lib/reflex-cards/types";
import { RC_FONT_VARS } from "./fonts";

interface Props {
  card: ReflexCard;
  /**
   * card : la carte entière (obtenue ou révélée officiellement) ;
   * slot : la case vide de l'album (sortie, pas obtenue) ;
   * back : le dos (pas encore sortie : rien ne fuite).
   */
  mode?: "card" | "slot" | "back";
  /** jour de saison, pour la chance affichée sur la case vide */
  day?: number;
  /** largeur affichée en px (la carte est dessinée en 240 × 336 puis mise à l'échelle) */
  width?: number;
  /** clé d'instance si la même carte apparaît deux fois dans la page */
  uid?: string;
  className?: string;
}

/**
 * Carte Reflex rendue côté serveur à l'identique de la maquette (lib/reflex-cards/render.ts).
 * Le HTML vient uniquement de nos données (textes échappés à l'export) : pas d'entrée utilisateur.
 */
export default function CardVisual({ card, mode = "card", day = 1, width = 240, uid, className }: Props) {
  const s = width / 240;
  const html =
    mode === "card"
      ? cardHTML(card, CARD_ENV, uid, "1/" + odds(todayChance(card, day)))
      : mode === "slot"
        ? forSite(card.fossil ? fossilSlotHTMLRaw(card, FOSSIL_P) : slotHTMLRaw(card, slotOdd(card, day)))
        : forSite(backHTMLRaw(CARD_ENV, uid ?? card.id));
  const label = mode === "back" ? "Carte Reflex à venir" : mode === "slot" ? `Emplacement de la carte Reflex ${cleanName(card.name)}` : `Carte Reflex ${cleanName(card.name)}`;
  return (
    <div className={`${RC_FONT_VARS} ${className ?? ""}`} style={{ width, height: Math.round(336 * s), position: "relative" }} role="img" aria-label={label}>
      <div
        style={{ width: 240, height: 336, transform: s === 1 ? undefined : `scale(${s})`, transformOrigin: "0 0" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

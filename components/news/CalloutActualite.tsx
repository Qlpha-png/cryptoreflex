import type { ComponentProps, ReactNode } from "react";
import Callout from "@/components/mdx/Callout";

/**
 * Callout des actualités (MDX générés, 80 fichiers) — ronde 1 du jury B4 (10/10/2026).
 *
 * L'avertissement de ces fichiers est écrit au tutoiement (« tu peux perdre tout ou partie du capital investi »,
 * « consulte un conseiller… ») alors que le site vouvoie. Les fichiers content/** ne sont pas modifiés : au rendu, ce
 * texte exact est remplacé par le MÊME texte au vouvoiement (aucune phrase ajoutée ni retirée). Tout autre encadré passe
 * tel quel.
 */

const AVERTISSEMENT_VOUVOYE =
  "Cet article est fourni à titre informatif et pédagogique uniquement. Il ne constitue en aucun cas un conseil en investissement, " +
  "une recommandation d’achat ou de vente de crypto-actifs. Les marchés des crypto-actifs sont hautement volatils et spéculatifs : " +
  "vous pouvez perdre tout ou partie du capital investi. Avant toute décision financière, consultez un conseiller en " +
  "investissements financiers (CIF) agréé par l’AMF.";

/** Texte brut d'un arbre React (chaînes et enfants seulement). */
function texteDe(noeud: ReactNode): string {
  if (typeof noeud === "string" || typeof noeud === "number") return String(noeud);
  if (Array.isArray(noeud)) return noeud.map(texteDe).join("");
  if (noeud && typeof noeud === "object" && "props" in noeud) return texteDe((noeud as { props?: { children?: ReactNode } }).props?.children);
  return "";
}

export default function CalloutActualite(props: ComponentProps<typeof Callout>) {
  if (/\btu peux perdre\b/i.test(texteDe(props.children))) {
    return <Callout {...props}>{AVERTISSEMENT_VOUVOYE}</Callout>;
  }
  return <Callout {...props} />;
}

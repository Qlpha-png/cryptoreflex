import { ImageResponse } from "next/og";
import { IconeMarque } from "@/lib/theme/icone-marque";

/**
 * Icône Apple 180 × 180 — convention Next.js `app/apple-icon.{tsx,png}` (« Ajouter à l'écran d'accueil »).
 *
 * Lot B2 : emblème du kit C+ sur plaque encre pleine (iOS arrondit lui-même les coins : pas d'arrondi ici, sinon
 * des coins transparents apparaîtraient en noir). Dessin unique : lib/theme/icone-marque.tsx.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const runtime = "edge";

export default function AppleIcon() {
  return new ImageResponse(<IconeMarque taille={180} arrondi={false} />, { ...size });
}

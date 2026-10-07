import { ImageResponse } from "next/og";
import { IconeMarque } from "@/lib/theme/icone-marque";

/**
 * Favicon PNG 32 × 32 — convention Next.js `app/icon.{tsx,svg}` (app/icon.svg sert la version vectorielle).
 *
 * Lot B2 : emblème du kit C+ « Papier & Encre » (soleil or sur l'horizon, deux reflets) sur plaque encre, au lieu du
 * « X » bleu Klein de mai 2026. Dessin unique : lib/theme/icone-marque.tsx (aussi utilisé par app/apple-icon.tsx).
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export const runtime = "edge";

export default function Icon() {
  return new ImageResponse(<IconeMarque taille={32} />, { ...size });
}

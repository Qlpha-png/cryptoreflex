import { ImageResponse } from "next/og";

/**
 * Favicon dynamique — Next.js convention `app/icon.{tsx,png,svg}`.
 *
 * Refonte 2026-05-06 : nouveau branding bleu Klein. Le favicon doit être
 * lisible en 16×16 et 32×32 (browser tabs, SERP Google), donc on simplifie :
 * juste un "X" stylisé sur fond noir profond. Le X est l'élément signature
 * du wordmark complet (Cryptorefle**X** où le X est en bleu Klein).
 *
 * En 16×16 le wordmark complet "Cryptoreflex" serait illisible — d'où le
 * choix d'un mark abstrait (le X) qui devient l'identité réduite de la
 * marque. Reconnaissable + différenciant.
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export const runtime = "edge";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0E1A", // Noir profond
          borderRadius: 6,
        }}
      >
        {/* X stylisé : 2 traits diagonaux qui se croisent.
            Bleu Klein #002FA7 → bleu marine #001D6B (gradient).
            Construits via 2 div absolument positionnées en rotation. */}
        <div
          style={{
            position: "relative",
            width: 22,
            height: 22,
          }}
        >
          {/* Trait diagonal "\" (du haut-gauche au bas-droite) */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 28,
              height: 5,
              background: "linear-gradient(90deg, #002FA7, #001D6B)",
              transform: "translate(-50%, -50%) rotate(45deg)",
              borderRadius: 1,
            }}
          />
          {/* Trait diagonal "/" (du bas-gauche au haut-droite) */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 28,
              height: 5,
              background: "linear-gradient(90deg, #001D6B, #002FA7)",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              borderRadius: 1,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}

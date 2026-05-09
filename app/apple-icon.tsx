import { ImageResponse } from "next/og";

/**
 * Apple touch icon — Next.js convention `app/apple-icon.{tsx,png}`.
 *
 * Refonte 2026-05-06 : aligne avec le nouveau branding bleu Klein.
 * Format officiel Apple : 180×180 PNG (iOS Safari "Ajouter à l'écran
 * d'accueil"). Le X stylisé est plus grand que sur le favicon (180×180
 * vs 32×32) pour rester reconnaissable.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const runtime = "edge";

export default function AppleIcon() {
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
          // iOS arrondit auto les apple-icons mais on précise pour Android.
          borderRadius: 36,
        }}
      >
        {/* X stylisé en bleu Klein, version grande pour 180×180.
            display:flex requis par Satori dès qu'un <div> a 2+ enfants
            (même position:absolute) — sinon "Expected <div> to have
            explicit display: flex" en runtime. */}
        <div
          style={{
            position: "relative",
            width: 110,
            height: 110,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 140,
              height: 22,
              background: "linear-gradient(90deg, #002FA7, #001D6B)",
              transform: "translate(-50%, -50%) rotate(45deg)",
              borderRadius: 4,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 140,
              height: 22,
              background: "linear-gradient(90deg, #001D6B, #002FA7)",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              borderRadius: 4,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}

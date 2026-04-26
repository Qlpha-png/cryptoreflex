import { ImageResponse } from "next/og";

/**
 * Apple touch icon — Next.js convention `app/apple-icon.{tsx,png}`.
 *
 * Format officiel Apple : 180×180 PNG (iOS Safari l'utilise pour
 * "Ajouter à l'écran d'accueil"). Plus grand que le favicon classique
 * pour rester net sur l'écran d'accueil iPhone.
 *
 * Cohérent visuellement avec /logo.png et /icon — même cairn, même palette.
 * Remplace progressivement `/icons/apple-touch-icon.svg` qui existait avant
 * (Next.js préfère ce handler convention sur l'asset statique référencé
 * dans metadata.icons.apple — voir app/layout.tsx).
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
          background: "#0B0D10",
          // iOS arrondit auto, mais on précise un radius pour la cohérence
          // sur d'autres surfaces qui rendent le PNG tel quel (Android Home,
          // PWA install prompts).
          borderRadius: 36,
          position: "relative",
        }}
      >
        {/* Cairn — proportions calées sur 180×180, cf. logo-mark.svg
            (3 cercles empilés ascendants) */}
        <div
          style={{
            position: "absolute",
            top: 90,
            width: 64,
            height: 64,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #FCD34D 0%, #F5A524 55%, #B45309 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 48,
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #FBBF24 0%, #D97706 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 14,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#FCD34D",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
